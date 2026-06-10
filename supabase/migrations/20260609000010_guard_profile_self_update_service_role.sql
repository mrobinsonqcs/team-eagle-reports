-- Phase 2: allow service-role-driven profile updates (manage-dealer edge
-- function) through guard_profile_self_update.
--
-- auth.uid() is NULL when a request is authenticated with the service-role
-- key (no JWT `sub` claim), so the existing is_full_access(auth.uid()) check
-- evaluated to false for those requests and blocked admin actions like
-- deactivating a user or moving them to a different office. Service-role
-- requests already bypass RLS entirely, so it's consistent to also bypass
-- this guard for them.

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_full_access(auth.uid()) then
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
