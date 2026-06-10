-- Phase 3: weekly_newsletters and newsletter_subscribers

create table public.weekly_newsletters (
  id uuid primary key default gen_random_uuid(),
  week_ending_date date not null unique,
  status public.newsletter_status not null default 'draft',
  email_body text,
  person_of_the_week_name text,
  person_of_the_week_blurb text,
  rookie_of_the_week_name text,
  rookie_of_the_week_blurb text,
  business_builder_name text,
  business_builder_blurb text,
  draft_data jsonb,
  completed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_weekly_newsletters_week_ending_date on public.weekly_newsletters (week_ending_date);

create trigger touch_weekly_newsletters_updated_at
before update on public.weekly_newsletters
for each row
execute function public.touch_updated_at();

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  notes text,
  active boolean not null default true
);

-- Explicit table grants per CLAUDE.md convention (covered by the
-- alter default privileges in 20260610000001/20260610000002, but added here
-- for self-documentation).
grant select, insert, update, delete on
  public.weekly_newsletters,
  public.newsletter_subscribers
to authenticated;

grant select, insert, update, delete on
  public.weekly_newsletters,
  public.newsletter_subscribers
to service_role;
