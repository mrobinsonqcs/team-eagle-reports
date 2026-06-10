-- Diagnostic: run in the Supabase SQL editor, replace the email below.
-- This checks for the most common causes of "no role assigned" despite a
-- division row existing in user_roles: a user_id mismatch, a missing
-- profiles row, missing helper-function grants, or a misapplied RLS policy.

-- 1. Find the auth user and confirm the id matches the user_roles row.
select id, email
from auth.users
where email = 'YOUR_EMAIL_HERE';

-- 2. Confirm user_roles has a row with that exact user_id.
select *
from public.user_roles
where user_id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');

-- 3. Confirm a profiles row exists for that user.
select *
from public.profiles
where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');

-- 4. Confirm the helper functions exist and have EXECUTE granted to authenticated.
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in (
    'has_role', 'is_admin', 'is_division', 'is_dealer',
    'is_full_access', 'office_id_for_user'
  )
order by routine_name, grantee;

-- 5. Confirm RLS is enabled and policies exist on user_roles.
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'user_roles';

select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'user_roles';

-- 6. Simulate is_full_access for that user directly (runs as postgres,
--    bypasses RLS, but exercises the same function logic).
select public.is_full_access((select id from auth.users where email = 'YOUR_EMAIL_HERE'));
select public.has_role((select id from auth.users where email = 'YOUR_EMAIL_HERE'), 'division');
