-- Phase 1: core tables (offices, profiles, user_roles, safety_advisors)

create table public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  office_id uuid references public.offices (id) on delete set null,
  marketing_director_name text,
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table public.safety_advisors (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  full_name text not null,
  active boolean not null default true,
  rookie_until date,
  unique (office_id, full_name)
);

create index idx_profiles_office_id on public.profiles (office_id);
create index idx_user_roles_user_id on public.user_roles (user_id);
create index idx_safety_advisors_office_id on public.safety_advisors (office_id);
