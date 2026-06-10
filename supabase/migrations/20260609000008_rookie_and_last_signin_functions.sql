-- Phase 2: current_rookie_season_end and get_user_last_sign_ins helpers

-- current_rookie_season_end: returns the date a newly-flagged rookie's
-- "rookie" status should expire. Team Eagle's rookie season is calendar-year
-- based, so a rookie flagged at any point in a year stays a rookie through
-- December 31 of that year. Adjust here if the division's season boundary
-- changes (e.g. to a fiscal year).
create or replace function public.current_rookie_season_end(_today date default current_date)
returns date
language sql
stable
as $$
  select make_date(extract(year from _today)::int, 12, 31);
$$;

grant execute on function public.current_rookie_season_end(date) to authenticated;

-- get_user_last_sign_ins: returns auth.users.last_sign_in_at for the given
-- user ids. Internally gated to is_full_access — non-full-access callers get
-- an empty result rather than an error.
create or replace function public.get_user_last_sign_ins(_user_ids uuid[])
returns table (id uuid, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.last_sign_in_at
  from auth.users u
  where u.id = any(_user_ids)
    and public.is_full_access(auth.uid());
$$;

grant execute on function public.get_user_last_sign_ins(uuid[]) to authenticated;
