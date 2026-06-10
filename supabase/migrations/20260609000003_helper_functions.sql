-- Phase 1: SECURITY DEFINER helper functions used by RLS policies.
--
-- CRITICAL: each of these MUST be granted EXECUTE to `authenticated`, or RLS
-- policies that call them will fail to evaluate (silently denying all rows).
-- Do NOT revoke EXECUTE from authenticated on these functions.

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin');
$$;

create or replace function public.is_division(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'division');
$$;

create or replace function public.is_dealer(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'dealer');
$$;

create or replace function public.is_full_access(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_division(_user_id) or public.is_admin(_user_id);
$$;

create or replace function public.office_id_for_user(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select office_id
  from public.profiles
  where id = _user_id;
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_division(uuid) to authenticated;
grant execute on function public.is_dealer(uuid) to authenticated;
grant execute on function public.is_full_access(uuid) to authenticated;
grant execute on function public.office_id_for_user(uuid) to authenticated;
