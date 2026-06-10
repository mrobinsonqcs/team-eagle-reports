# Team Eagle Reporting App

Weekly reporting + Monday newsletter app for the Team Eagle sales division.
Full spec: `Team_Eagle_Reporting_Blueprint.md`. Build proceeds in 5 phases — see
section 12. **Phases 1, 2, and 3 are complete.** Do not start later phases
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

Vite + React 19 + TS + Tailwind v4 + shadcn/ui (Base UI primitives) +
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
  from false to true. division/admin bypass this guard, and so do
  service-role requests (`auth.uid() is null`) — required for the
  `manage-dealer` edge function to edit/deactivate profiles.
- Every table needs an explicit `grant select, insert, update, delete on
  public.<table> to authenticated;` **and** `... to service_role;` (RLS
  policies alone aren't enough — the role also needs the table-level
  privilege, or PostgREST/edge functions return "permission denied for table
  ..."; `service_role`'s RLS bypass does not imply table grants).
  `20260610000001_table_grants.sql` (authenticated) and
  `20260610000002_service_role_table_grants.sql` (service_role) grant this
  for all Phase 1/2 tables and add `alter default privileges in schema public
  grant select, insert, update, delete on tables to <role>;` so new tables
  inherit it automatically — but add the explicit grants for any new table in
  its own migration too, for self-documentation and in case default
  privileges ever get reset.

## Edge Functions (`supabase/functions/`)

- `notify-director`: emails division/admin when an office submits its first
  weekly report for a week (fire-and-forget from `ReportForm`). Uses Resend.
- `invite-dealer`: full-access only. Invites a new dealer user, finds/creates
  their office by name, and auto-creates a matching `safety_advisors` row.
- `manage-dealer`: full-access only. Actions: `set_password` (generates a
  phone-friendly password, sets `must_change_password`), `send_reset_link`
  (Resend, not the auth email hook), `deactivate`/`reactivate` (sets
  `profiles.active` + 100-year auth ban as a "permanent" ban), `edit`
  (full_name/marketing_director_name/office_id).
- Shared helpers in `supabase/functions/_shared/`: `cors.ts`, `clients.ts`
  (service-role vs. user-JWT clients), `auth.ts` (`requireFullAccess`),
  `password-generator.ts`, `notify-director-email.ts`.
- Frontend calls go through `src/lib/edgeFunctions.ts`'s `invokeFunction()`,
  which surfaces the function's `{ error: "..." }` body as a thrown `Error`.
- All three require `RESEND_API_KEY` (and optionally `RESEND_FROM_EMAIL`) set
  as Supabase function secrets, and `verify_jwt = true` (see
  `supabase/config.toml`).
- `_shared/errors.ts` exports `errorMessage(error)` — use this in every
  catch block that might see a Resend SDK error. The Resend SDK rejects with
  plain `{statusCode, name, message}` objects that are **not**
  `instanceof Error`, so `error instanceof Error ? error.message : 'Unknown
  error'` silently swallows the real reason (e.g. "domain not verified").

## Newsletter system (Phase 3)

- Tables: `weekly_newsletters` (one row per `week_ending_date`, `status` enum
  `draft|ready|sent|skipped`, `draft_data` jsonb computed by
  `generate-newsletter-draft`, plus editable narrative fields — `email_body`
  and Person/Rookie/Business-Builder-of-the-Week name+blurb pairs) and
  `newsletter_subscribers` (extra recipients beyond `profiles`). Both
  full-access-only RLS (`20260610000003/4_newsletter_*.sql`).
- Shared template: `_shared/newsletter-html.ts`'s `renderNewsletterFromRow()`
  builds the full inline-styled HTML email from a `weekly_newsletters` row
  (table-based, `color-scheme: light only`, explicit `bgcolor`, per critical
  lesson #6). `_shared/newsletter-recipients.ts` resolves recipient lists
  (`getFullAccessEmails` for the archive copy, `getAllRecipientEmails` for
  full distribution — active `profiles` + active `newsletter_subscribers`,
  deduped). `_shared/newsletter-send.ts`'s `sendNewsletterNow()` is shared by
  `send-newsletter-now` and `distribute-newsletter`; it's idempotent — a
  no-op if `status` is already `sent`.
- Seven edge functions: `generate-newsletter-draft` (cron-secret OR
  full-access, idempotent unless `force: true`, `verify_jwt = false`),
  `preview-newsletter`, `send-newsletter-test`, `complete-newsletter` (saves
  edits, sets `status = ready`, sends a non-fatal "fire-and-forget" archive
  copy to division/admin — a Resend failure here is logged but does not fail
  the request, matching `notify-director`'s pattern), `send-newsletter-now`,
  `distribute-newsletter` (cron-secret OR full-access, `verify_jwt = false`),
  `public-newsletter-html` (fully public, `verify_jwt = false`, only ever
  serves `status = sent`, 404 otherwise).
- Frontend: `/newsletter` (index, full-access only), `/newsletter/:date/edit`
  (editor, full-access only), `/newsletter/:date/view` (public — tries
  `public-newsletter-html` first, falls back to `preview-newsletter` for
  full-access users viewing a draft).
- Cron jobs (`20260610000006_newsletter_crons.sql`, pg_cron + pg_net):
  `generate-newsletter-draft-weekly` (Mon 04:00 UTC),
  `refresh-newsletter-data-weekly` (Mon 14:30 UTC, `force: true`),
  `distribute-newsletter-weekly` (Mon 15:00 UTC). All three pass
  `x-cron-secret: public.get_cron_invoke_secret()`. `weekly-office-reminders`
  and `process-email-queue` (blueprint section 9) are deferred to Phase 4.
- **Deployment prerequisites not yet satisfied** (pre-existing, not
  Phase-3-specific code bugs):
  - The Resend sender domain `lonestarhomesafety.com` (hardcoded fallback for
    `RESEND_FROM_EMAIL` across `notify-director`, `manage-dealer`, and all
    newsletter-sending functions) is **not verified in Resend** — all
    newsletter sends (and `manage-dealer`'s `send_reset_link`) currently fail
    with a `validation_error` until the domain is verified or
    `RESEND_FROM_EMAIL` is set to a verified sender.
  - `public/email-logo.png`, referenced by `_shared/newsletter-html.ts`'s
    `LOGO_URL`, does not exist — newsletter emails will show a broken image
    where the logo should be until this asset is added.
  - `PUBLIC_APP_URL` secret is not set, so `_shared/newsletter-html.ts` falls
    back to `https://app.lonestarhomesafety.com` for the "View in browser"
    link — set this once the app's real production domain is known.

## Draft persistence (ReportForm)

`src/pages/ReportForm.tsx` persists in-progress reports to `localStorage`
(key `report-draft-${officeId}-${weekEndingDate}` or
`report-draft-edit-${reportId}` when editing) on every form change and on
`visibilitychange`, restores on mount, and clears on successful submit. This
is a load-bearing UX requirement — sales reps fill these out on phones with
flaky connections.

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
   credentials — implemented in `manage-dealer`'s `set_password` action.
6. Newsletter HTML (later phase) must be table-based, inline-styled,
   `color-scheme: light only`, explicit `bgcolor` everywhere (Gmail dark
   mode).

## Migrations

SQL migrations live in `supabase/migrations/`, applied in filename order via
the Supabase SQL editor or `supabase db push`. The project is linked to the
remote Supabase project (`qllmzkhryjsyvcuhltty`, see `supabase/config.toml`
and `.env.local`) via `supabase link`; all migrations through
`20260610000006` are applied to that remote database. Edge functions
(`notify-director`, `invite-dealer`, `manage-dealer`, and the seven
newsletter functions) must be deployed separately via
`supabase functions deploy` (requires `SUPABASE_ACCESS_TOKEN` set in the
environment for `npx supabase functions deploy ...` to work without an
interactive login).
