-- Phase 2: RLS for weekly_reports / weekly_report_sa_breakdown

grant select, insert, update, delete
  on public.weekly_reports, public.weekly_report_sa_breakdown
  to authenticated;

alter table public.weekly_reports enable row level security;
alter table public.weekly_report_sa_breakdown enable row level security;

-- weekly_reports
create policy "Full access manage weekly_reports"
  on public.weekly_reports
  for all
  using (public.is_full_access(auth.uid()))
  with check (public.is_full_access(auth.uid()));

create policy "Dealers manage own office weekly_reports"
  on public.weekly_reports
  for all
  using (office_id = public.office_id_for_user(auth.uid()))
  with check (office_id = public.office_id_for_user(auth.uid()));

-- weekly_report_sa_breakdown
create policy "Full access manage weekly_report_sa_breakdown"
  on public.weekly_report_sa_breakdown
  for all
  using (public.is_full_access(auth.uid()))
  with check (public.is_full_access(auth.uid()));

create policy "Dealers manage own office sa_breakdown"
  on public.weekly_report_sa_breakdown
  for all
  using (
    weekly_report_id in (
      select id from public.weekly_reports
      where office_id = public.office_id_for_user(auth.uid())
    )
  )
  with check (
    weekly_report_id in (
      select id from public.weekly_reports
      where office_id = public.office_id_for_user(auth.uid())
    )
  );
