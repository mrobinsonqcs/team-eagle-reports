-- Explicit table-level grants for the authenticated role.
--
-- RLS policies (20260609000005, 20260609000009) control row-level access,
-- but the role also needs the underlying SELECT/INSERT/UPDATE/DELETE
-- privilege on each table to attempt the operation at all, or PostgREST
-- returns "permission denied for table ...". Hosted Supabase projects
-- normally pick this up via platform-level default privileges, but make it
-- explicit here so it doesn't depend on that and survives a from-scratch
-- `supabase db reset`.

grant select, insert, update, delete on
  public.offices,
  public.profiles,
  public.safety_advisors,
  public.user_roles,
  public.weekly_reports,
  public.weekly_report_sa_breakdown
to authenticated;

-- Apply the same grants to any tables created by future migrations.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
