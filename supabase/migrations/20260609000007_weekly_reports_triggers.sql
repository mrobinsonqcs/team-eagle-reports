-- Phase 2: triggers for weekly_reports / weekly_report_sa_breakdown

-- set_weekly_report_audit_fields: stamps submitted_by/submitted_at on
-- insert, and last_edited_by/last_edited_at on every insert or update so
-- multi-user offices can see who last touched a report.
create or replace function public.set_weekly_report_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.submitted_by := coalesce(new.submitted_by, auth.uid());
    new.submitted_at := coalesce(new.submitted_at, now());
  end if;

  new.last_edited_by := auth.uid();
  new.last_edited_at := now();

  return new;
end;
$$;

create trigger set_weekly_report_audit_fields
before insert or update on public.weekly_reports
for each row
execute function public.set_weekly_report_audit_fields();

create trigger touch_weekly_reports_updated_at
before update on public.weekly_reports
for each row
execute function public.touch_updated_at();

-- recompute_weekly_report_totals: keeps the parent weekly_reports row's
-- aggregated SA totals in sync with the sum of its breakdown rows.
-- SECURITY DEFINER so the aggregation update is not subject to RLS on
-- weekly_reports for the triggering user.
create or replace function public.recompute_weekly_report_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _report_id uuid := coalesce(new.weekly_report_id, old.weekly_report_id);
begin
  update public.weekly_reports
  set
    appointments_set = coalesce((
      select sum(appointments_set) from public.weekly_report_sa_breakdown
      where weekly_report_id = _report_id
    ), 0),
    demos_ran = coalesce((
      select sum(demos_ran) from public.weekly_report_sa_breakdown
      where weekly_report_id = _report_id
    ), 0),
    total_units = coalesce((
      select sum(total_units) from public.weekly_report_sa_breakdown
      where weekly_report_id = _report_id
    ), 0),
    net_installed_protections = coalesce((
      select sum(net_installed_protections) from public.weekly_report_sa_breakdown
      where weekly_report_id = _report_id
    ), 0)
  where id = _report_id;

  return coalesce(new, old);
end;
$$;

create trigger recompute_weekly_report_totals
after insert or update or delete on public.weekly_report_sa_breakdown
for each row
execute function public.recompute_weekly_report_totals();
