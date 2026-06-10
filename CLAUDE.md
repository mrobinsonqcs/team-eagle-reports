# Team Eagle Reporting App

Weekly reporting + Monday newsletter app for the Team Eagle sales division.
Full spec: `Team_Eagle_Reporting_Blueprint.md`. Build proceeds in 5 phases — see
section 12. **Phase 1 (Foundation) is complete.** Do not start later phases
unless asked.

## Org structure (flat)

Division (you, top) > Office > Safety Advisor (individual contributor).
Three roles in `app_role` enum: `division`, `admin` (both = full access to
everything), `dealer` (sees only their own office). No middle tier.

## Brand

Navy `#1E2850` (primary), Red `#D81F26` (accent/destructive), White
`#FFFFFF`. Tailwind tokens: `bg-te-navy`, `bg-te-red`, `text-te-navy`, etc.
(defined in `src/index.css`).

## Stack

Vite + React 18 + TS + Tailwind v4 + shadcn/ui (Base UI primitives) +
react-router + react-hook-form + zod + @tanstack/react-query. Backend:
Supabase (Postgres + Auth + Edge Functions). Path alias `@/*` -> `src/*`.

## Database / RLS conventions

- Every table has RLS enabled. Two patterns only: full-access
  (`is_full_access(auth.uid())` = division or admin) and dealer-self
  (`office_id = office_id_for_user(auth.uid())` or `id = auth.uid()`).
- SECURITY DEFINER helpers (`is_admin`, `is_division`, `is_dealer`,
  `is_full_access`, `office_id_for_user`, `has_role`) live in
  `supabase/migrations/20260609000003_helper_functions.sql`. **Never revoke
  EXECUTE from `authenticated` on these** — RLS policies call them and will
  silently fail closed if revoked. Revoking from anon/public is fine.
- `handle_new_user` trigger hardcodes new signups to role `dealer`,
  ignoring any role field in `raw_user_meta_data` (privilege escalation
  guard).
- `guard_profile_self_update` trigger blocks self-updates to
  `office_id`/`email`/`active` and blocks flipping `must_change_password`
  from false to true. division/admin bypass this guard.

## Critical lessons (see blueprint section 13 for full list)

1. Never blanket-revoke EXECUTE on SECURITY DEFINER RLS helpers from
   `authenticated`.
2. Keep `@supabase/supabase-js` >= 2.95.x (currently `^2.108.1`).
3. Cron-invoked edge functions (future phases) use a shared-secret
   `x-cron-secret` header, not service-role JWT.
4. Skip `applySession` on `TOKEN_REFRESHED` when the user identity is
   unchanged (`src/hooks/useAuth.tsx`) — prevents re-render cascades that
   wipe form state.
5. Phone-friendly temp passwords (`fire-eagle-47` style) for admin-issued
   credentials — added in a later phase.
6. Newsletter HTML (later phase) must be table-based, inline-styled,
   `color-scheme: light only`, explicit `bgcolor` everywhere (Gmail dark
   mode).

## Migrations

SQL migrations live in `supabase/migrations/`, applied in filename order via
the Supabase SQL editor or `supabase db push`. No Supabase project is linked
yet — see the Phase 1 verification checklist for setup steps.
