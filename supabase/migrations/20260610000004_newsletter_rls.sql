-- Phase 3: RLS for weekly_newsletters and newsletter_subscribers
--
-- Both tables are full-access only (division/admin) per blueprint section 5.
-- Dealers have no policy on either table, so RLS denies all access by
-- default.

alter table public.weekly_newsletters enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "Full access manage weekly_newsletters"
  on public.weekly_newsletters
  for all
  using (public.is_full_access(auth.uid()))
  with check (public.is_full_access(auth.uid()));

create policy "Full access manage newsletter_subscribers"
  on public.newsletter_subscribers
  for all
  using (public.is_full_access(auth.uid()))
  with check (public.is_full_access(auth.uid()));
