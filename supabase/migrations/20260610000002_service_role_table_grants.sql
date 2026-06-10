-- Explicit table-level grants for the service_role role.
--
-- service_role bypasses RLS but still needs the underlying
-- SELECT/INSERT/UPDATE/DELETE table privilege to operate at all -
-- BYPASSRLS doesn't imply table grants. Without this, the manage-dealer
-- and invite-dealer edge functions (which use the service-role client to
-- read/update profiles, offices, and safety_advisors) fail with
-- "permission denied for table ...".

grant select, insert, update, delete on
  public.offices,
  public.profiles,
  public.safety_advisors,
  public.user_roles,
  public.weekly_reports,
  public.weekly_report_sa_breakdown
to service_role;

-- Apply the same grants to any tables created by future migrations.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
