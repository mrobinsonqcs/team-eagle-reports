-- Phase 1: triggers

-- touch_updated_at: generic BEFORE UPDATE trigger to bump updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

-- handle_new_user: AFTER INSERT on auth.users, creates a profiles row from
-- invite metadata. CRITICAL: hardcode role to 'dealer' regardless of any
-- role-related fields in raw_user_meta_data, to prevent privilege escalation
-- via signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, office_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    nullif(new.raw_user_meta_data ->> 'office_id', '')::uuid
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'dealer');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- guard_profile_self_update: BEFORE UPDATE on profiles, blocks users from
-- changing their own office_id / email / active. The only mutable fields for
-- a self-update are full_name, marketing_director_name, and
-- must_change_password (true -> false only, for the password-change exit
-- path). division/admin bypass this guard entirely.
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_full_access(auth.uid()) then
    return new;
  end if;

  if new.office_id is distinct from old.office_id
     or new.email is distinct from old.email
     or new.active is distinct from old.active then
    raise exception 'You are not allowed to change office, email, or active status.';
  end if;

  if old.must_change_password = false and new.must_change_password = true then
    raise exception 'You are not allowed to set must_change_password to true.';
  end if;

  return new;
end;
$$;

create trigger guard_profile_self_update
before update on public.profiles
for each row
execute function public.guard_profile_self_update();
