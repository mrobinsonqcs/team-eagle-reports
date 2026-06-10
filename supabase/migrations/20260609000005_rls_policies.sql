-- Phase 1: Row-Level Security
--
-- Two access patterns: full access (division/admin see everything) and
-- dealer-self (an office sees its own data).
--
-- RLS policies only narrow rows; the `authenticated` role also needs the
-- underlying table-level GRANT or every query is rejected before policies
-- are even evaluated. Without this, the client gets an empty result set
-- (not an error), which looks identical to "RLS denied everything".
grant select on public.offices, public.profiles, public.user_roles, public.safety_advisors
  to authenticated;

-- Several policies below are `for all` (full-access) or `for update`
-- (self-profile), so authenticated also needs write-level grants. RLS still
-- restricts which rows each role can actually touch.
grant insert, update, delete
  on public.offices, public.profiles, public.user_roles, public.safety_advisors
  to authenticated;

alter table public.offices enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.safety_advisors enable row level security;

-- offices
create policy "Full access manage offices"
  on public.offices
  for all
  using (public.is_full_access(auth.uid()))
  with check (public.is_full_access(auth.uid()));

create policy "Dealers view own office"
  on public.offices
  for select
  using (id = public.office_id_for_user(auth.uid()));

-- profiles
create policy "Full access manage profiles"
  on public.profiles
  for all
  using (public.is_full_access(auth.uid()))
  with check (public.is_full_access(auth.uid()));

create policy "Users view own profile"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "Users update own profile"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- user_roles
create policy "Full access manage user_roles"
  on public.user_roles
  for all
  using (public.is_full_access(auth.uid()))
  with check (public.is_full_access(auth.uid()));

create policy "Users view own roles"
  on public.user_roles
  for select
  using (user_id = auth.uid());

-- safety_advisors
create policy "Full access manage safety_advisors"
  on public.safety_advisors
  for all
  using (public.is_full_access(auth.uid()))
  with check (public.is_full_access(auth.uid()));

create policy "Dealers manage own office safety advisors"
  on public.safety_advisors
  for all
  using (office_id = public.office_id_for_user(auth.uid()))
  with check (office_id = public.office_id_for_user(auth.uid()));
