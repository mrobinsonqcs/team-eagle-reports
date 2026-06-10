-- Phase 2: weekly_reports and weekly_report_sa_breakdown

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  submitted_by uuid references public.profiles (id) on delete set null,
  last_edited_by uuid references public.profiles (id) on delete set null,
  last_edited_at timestamptz,
  week_ending_date date not null,
  marketing_director_name text,
  office_appointments_set integer not null default 0,
  recruits_in_training integer not null default 0,
  qualified_recruits integer not null default 0,
  appointments_set integer not null default 0,
  demos_ran integer not null default 0,
  total_units integer not null default 0,
  net_installed_protections integer not null default 0,
  notes text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (office_id, week_ending_date)
);

create table public.weekly_report_sa_breakdown (
  id uuid primary key default gen_random_uuid(),
  weekly_report_id uuid not null references public.weekly_reports (id) on delete cascade,
  safety_advisor_id uuid not null references public.safety_advisors (id) on delete cascade,
  appointments_set integer not null default 0,
  demos_ran integer not null default 0,
  total_units integer not null default 0,
  net_installed_protections integer not null default 0,
  unique (weekly_report_id, safety_advisor_id)
);

create index idx_weekly_reports_office_id on public.weekly_reports (office_id);
create index idx_weekly_reports_week_ending_date on public.weekly_reports (week_ending_date);
create index idx_weekly_report_sa_breakdown_report_id on public.weekly_report_sa_breakdown (weekly_report_id);
create index idx_weekly_report_sa_breakdown_sa_id on public.weekly_report_sa_breakdown (safety_advisor_id);
