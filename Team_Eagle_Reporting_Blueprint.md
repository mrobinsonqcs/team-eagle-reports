# Team Eagle Weekly Reporting + Branded Newsletter App: Build Blueprint

A complete spec for building a weekly reporting and Monday newsletter app for the Team Eagle sales division. Designed to be handed to Claude Code (or any AI coding agent) and executed in phases. Hosted on Vercel + Supabase.

This is adapted from a working production system built for a similar direct-sales fire/safety org. The data model and email logic already fit how a GHS-style division operates (Safety Advisors, demos, installs, appointments). This version is simplified to a flat division structure: one division leader at the top, offices below, Safety Advisors inside each office. No middle-management tier.

**Your specifics, baked in:**
- Org: flat. You (the division leader) sit at the top with full access. Offices submit. Safety Advisors are the individual contributors.
- Brand: Team Eagle. Navy `#1E2850`, Red `#D81F26`, White `#FFFFFF`.
- Domain: `lonestarhomesafety.com`. App at `app.lonestarhomesafety.com`, sending from a `send.lonestarhomesafety.com` subdomain via Resend.
- Shoutouts kept as Person / Rookie / Business Builder of the Week.

---

## 1. What this app does

**The problem:** A sales division with a leader and individual offices needs to collect weekly performance numbers from each office and distribute a branded leaderboard newsletter to the team every Monday. Today this happens over email, text, and phone tag. Numbers get lost, leaderboards get assembled by hand, and nobody can see real-time team performance.

**The solution:**
- Each office submits a single weekly report (numbers plus a free-form note to the division leader).
- You see all submissions in a real-time dashboard.
- Every Monday morning a branded HTML newsletter auto-generates from the week's data with leaderboards, division totals, and three editable narrative shoutouts.
- You curate the shoutouts, mark the newsletter complete, and at 11 AM ET it distributes to the entire team.

## 2. Tech stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui (Radix primitives) + react-router + react-hook-form + @tanstack/react-query
- **Backend:** Supabase (Postgres + Auth + Edge Functions on Deno) + pg_cron + vault for secrets
- **Email (notifications):** Resend, verified custom subdomain, for newsletter plus report-submitted alerts
- **Email (auth):** mostly bypassed via an admin "Set Temp Password" flow (see section 10). Optional Resend SMTP on a subdomain if you want email-based recovery later.
- **Hosting:** Vercel (serves the static Vite build)
- **DNS:** Namecheap (custom subdomain plus DKIM/SPF/DMARC records for Resend)
- **Repo:** GitHub (private)

## 3. Organizational structure (flat)

Three roles in a Postgres enum (`app_role`):

| Role | Who | Access |
|------|-----|--------|
| `division` | You, the division leader (top of the pyramid) | Full access to all data |
| `admin` | System administrator / builder | Full access (same as division) |
| `dealer` | Individual office submitters | See their own office only |

Structure: **Division (you) > Office > Safety Advisor (individual contributors).** Each office can have multiple users (co-owners). Each Safety Advisor is associated with one office.

What was removed from the original multi-tier system: the mid-level `division` group-leader role, the legacy `director` role, the `division_tier` enum, the `divisions` grouping table, and all division-scoped permission logic. With a flat org there is no middle layer to scope, which makes RLS and the build noticeably simpler.

Note on naming: the original system called the top role `region`. Here it is renamed `division` because you are one division, not a region. Throughout the codebase, anything that said "Region" now reads "Division" (for example, the newsletter hero is "Division Total," not "Region Total").

## 4. Database schema

### Core tables

**offices** (the original called these "dealerships"; name the table `offices` or keep `dealerships`, your call, but be consistent)
- `id` (uuid, pk)
- `name` (text)
- `created_at` (timestamptz)

No `division_id` column is needed since there is no grouping layer. Every office belongs to the one division (the whole app).

**profiles** (one row per auth user, FK to `auth.users`)
- `id` (uuid, pk, FK to auth.users.id)
- `full_name` (text)
- `email` (text)
- `office_id` (uuid, FK to offices, nullable, ON DELETE SET NULL)
- `marketing_director_name` (text, nullable, for report pre-fill)
- `active` (boolean, default true)
- `must_change_password` (boolean, default false, forces user to set a new password on next login)
- `created_at`, `updated_at` (timestamptz)

The optional `position_label` "Manager" badge from the original is dropped to keep things lean. Add it back later if you want a cosmetic title badge.

**user_roles** (one row per user/role pair, multi-role supported)
- `id` (uuid, pk)
- `user_id` (uuid, FK to auth.users.id)
- `role` (enum app_role)
- UNIQUE on (user_id, role)

**safety_advisors** (individual contributors per office)
- `id` (uuid, pk)
- `office_id` (uuid, FK to offices, ON DELETE CASCADE)
- `full_name` (text)
- `active` (boolean, default true)
- `rookie_until` (date, nullable. When set in the future, the SA counts as a rookie for newsletter rankings)
- UNIQUE on (office_id, full_name)

**weekly_reports** (one row per office per week)
- `id` (uuid, pk)
- `office_id` (uuid, FK to offices, ON DELETE CASCADE)
- `submitted_by` (uuid, FK to profiles, ON DELETE SET NULL, credit row)
- `last_edited_by`, `last_edited_at` (audit trail when multi-user offices share editing)
- `week_ending_date` (date, always a Sunday)
- `marketing_director_name` (text)
- `office_appointments_set` (int, default 0, manually entered office-level number)
- `recruits_in_training`, `qualified_recruits` (int, default 0, office-level counts)
- `appointments_set`, `demos_ran`, `total_units`, `net_installed_protections` (int, default 0, auto-aggregated from the SA breakdown via trigger)
- `notes` (text, nullable, free-form message to you)
- `submitted_at`, `updated_at` (timestamptz)
- UNIQUE on (office_id, week_ending_date), one report per office per week

**weekly_report_sa_breakdown** (per-SA contribution to a report)
- `id` (uuid, pk)
- `weekly_report_id` (uuid, FK to weekly_reports, ON DELETE CASCADE)
- `safety_advisor_id` (uuid, FK to safety_advisors, ON DELETE CASCADE)
- `appointments_set`, `demos_ran`, `total_units`, `net_installed_protections` (int, default 0)
- UNIQUE on (weekly_report_id, safety_advisor_id)

**weekly_newsletters** (one row per published week)
- `id` (uuid, pk)
- `week_ending_date` (date, unique)
- `status` (enum newsletter_status: draft | ready | sent | skipped)
- `email_body` (text, your free-form intro message)
- `person_of_the_week_name`, `person_of_the_week_blurb` (text)
- `rookie_of_the_week_name`, `rookie_of_the_week_blurb` (text)
- `business_builder_name`, `business_builder_blurb` (text)
- `draft_data` (jsonb, snapshot of computed leaderboards at draft time)
- `completed_at`, `sent_at`, `created_at`, `updated_at` (timestamptz)

**newsletter_subscribers** (CC recipients who are not app users)
- `id` (uuid, pk)
- `email` (text, unique)
- `name`, `notes` (text)
- `active` (boolean, default true)

### Enums

```sql
CREATE TYPE app_role AS ENUM ('division', 'admin', 'dealer');
CREATE TYPE newsletter_status AS ENUM ('draft', 'ready', 'sent', 'skipped');
```

(No `division_tier` and no `position_label` enums in this version.)

### Critical triggers

- **recompute_weekly_report_totals**: AFTER INSERT/UPDATE/DELETE on `weekly_report_sa_breakdown`, recomputes the parent `weekly_reports` row's aggregated fields (`appointments_set`, `demos_ran`, `total_units`, `net_installed_protections`) as the sum of all its breakdown rows.
- **handle_new_user**: AFTER INSERT on `auth.users`, creates a `profiles` row from invite metadata (full_name, office_id, default role = dealer). CRITICAL: this trigger must IGNORE any role-related fields in `raw_user_meta_data` to prevent privilege escalation via signup metadata. Hardcode role to `dealer` regardless of metadata.
- **guard_profile_self_update**: BEFORE UPDATE on `profiles`, blocks users from changing their own role / office / email / active. Allow only `full_name`, `marketing_director_name`, and `must_change_password` (true to false only, for the password-change exit path). Admins and division bypass this guard.
- **touch_updated_at**: generic BEFORE UPDATE trigger to bump `updated_at` on any row update.

### Helper SQL functions (SECURITY DEFINER)

These bypass RLS internally and are called by RLS policies on other tables. They MUST have `GRANT EXECUTE TO authenticated` (not just service_role) or RLS evaluation will fail silently.

- `has_role(_user_id, _role)`: boolean check
- `is_admin(_user_id)`, `is_division(_user_id)`, `is_dealer(_user_id)`: role wrappers
- `is_full_access(_user_id)`: returns division OR admin
- `office_id_for_user(_user_id)`: returns profiles.office_id
- `current_rookie_season_end(_today)`: returns the date a new rookie flag should expire (date math for seasonal cycles)
- `complete_password_change()`: SECURITY DEFINER, called from the SetPassword page to clear `must_change_password` on the calling user's profile (bypasses the self-update guard)
- `get_user_last_sign_ins(_user_ids uuid[])`: returns `last_sign_in_at` from auth.users for a list of user IDs (gated internally to is_full_access)
- `get_cron_invoke_secret()`: SECURITY DEFINER, returns the stable cron-invocation secret from vault (called only by cron-invoked edge functions)

Removed from the original: `is_region`, `division_id_for_user`, `is_dealership_in_user_division`. None are needed without a middle tier.

## 5. Row-Level Security (RLS)

Every public table has RLS enabled. With a flat org there are only two access patterns: full access (division and admin see everything) and dealer-self (an office sees its own data).

| Table | Self-access (dealer) | Full-access (division / admin) |
|-------|---------------------|-------------------------------|
| profiles | own row | yes |
| offices | own office | yes |
| safety_advisors | own office's SAs | yes |
| weekly_reports | own office's reports | yes |
| weekly_report_sa_breakdown | own office's | yes |
| user_roles | own roles | yes |
| weekly_newsletters | none | full-access only |
| newsletter_subscribers | none | full-access only |

**Critical rule:** every RLS policy that calls a SECURITY DEFINER helper requires that helper to have `GRANT EXECUTE TO authenticated`. Do not blanket-revoke. The original project had production outages from this exact mistake. Revoking from anon/public is fine; keep authenticated.

## 6. Edge functions (Deno on Supabase)

| Function | Auth | Purpose |
|----------|------|---------|
| auth-email-hook | service-role / no JWT | Hook called by Supabase Auth on signup/invite/recovery emails |
| invite-dealer | is_full_access | Invite a new office user; creates or looks up the office, sends invite email, auto-creates a Safety Advisor matching the user's name |
| manage-dealer | is_full_access | Admin actions on existing users: set_password (phone-friendly generator), send_reset_link, deactivate, reactivate, edit |
| current-user-role | authenticated | Returns the logged-in user's role(s); called by the auth hook |
| notify-director | service-role (called from client after report insert) | Sends a Resend email to division and admin users; includes office stats, SA breakdown, and notes |
| generate-newsletter-draft | cron-secret header OR is_full_access | Computes `draft_data` jsonb (leaderboards, division totals) from the week's reports; idempotent unless `force: true` |
| complete-newsletter | is_full_access | Saves narrative edits, sets status = ready, sends an archive copy to you |
| send-newsletter-now | is_full_access | Immediate distribution to all active users plus newsletter_subscribers (manual override of the scheduled cron) |
| send-newsletter-test | is_full_access | Sends rendered HTML to a hardcoded admin email for testing |
| preview-newsletter | is_full_access | Returns rendered HTML for any newsletter (any status, since admin-gated); used by the editor preview button |
| public-newsletter-html | no JWT (verify_jwt = false) | Public read endpoint; only serves newsletters with status = sent; returns 404 for drafts |
| distribute-newsletter | cron-secret header | Cron handler, status-aware: distributes if ready, reminds you if draft, no-op if sent |
| send-weekly-reminders | cron-secret header | Sunday cron, emails a reminder to offices that have not submitted yet |
| process-email-queue | service-role | Queue-worker pattern for retry-able outbound emails |

The original `notify-director-approval` function (public-signup approval flow) is omitted since you will invite offices directly rather than running a public signup.

**Shared template module:** `supabase/functions/_shared/newsletter-html.ts` exports `renderNewsletterHtml(args)` returning a complete `<!DOCTYPE html>` string. Inline styles, table-based layout, email-client-safe. See section 8.

### Important architectural rules for edge functions

1. Pin `@supabase/supabase-js` to >= 2.95.x. Earlier versions silently fail `auth.getUser()` after Supabase rotates JWT signing keys to ES256. This caused a multi-hour outage in the original project.
2. Cron-invoked functions MUST use shared-secret header authentication. Do not rely on service-role JWT validation, which can drift when keys rotate. Pattern: store a stable random secret in vault (`cron_invoke_secret`); pg_cron jobs pass it as an `x-cron-secret` header when calling functions via pg_net.http_post; each cron-invoked function checks the header matches via the `get_cron_invoke_secret()` RPC.
3. Notification emails (newsletter, report submitted) MUST go through the Resend SDK directly, NOT through any auth-email-hook layer. That layer auto-prepends a branded header that conflicts with the custom newsletter design.
4. Public functions (like public-newsletter-html) set `verify_jwt = false` in `supabase/config.toml`. Internal is_full_access checks happen inside the function body.

## 7. Frontend pages and routes

| Path | Page | Access |
|------|------|--------|
| /login | Email + password login | unauthenticated |
| /set-password | Set/reset password (forced when must_change_password = true) | invited users / recovery link |
| /setup-director | Promote the first user to division leader (initial bootstrap only) | unauth, only if no division leader exists |
| / | Index router, redirects by role | authenticated |
| /dealer | Office dashboard (own office's submission history plus a "This Week's Report" card showing co-submitters' work) | any authenticated user with a role |
| /dealer/report | Submit / edit a weekly report (per-SA breakdown plus office-level fields plus notes textarea) | any user with an office_id |
| /director | Staff dashboard (you see all data) with date-range filter, office filter, search, CSV export, and an expanded row showing SA breakdown plus notes | division, admin |
| /director/dealers | Manage Offices (invite, edit, set temp password, send reset link, deactivate, Last Login column) | division, admin |
| /safety-advisors | Manage SAs at the user's office; checkbox for "Rookie" with season-aware expiry | any user with an office_id |
| /newsletter | Newsletter index, this week's status card plus history table | division, admin |
| /newsletter/:weekEndingDate/edit | Editor: email body textarea, three editable shoutouts, read-only data preview, Save Draft / Mark Complete / Send Now / Send Test / Preview buttons | division, admin |
| /newsletter/:weekEndingDate/view | Public standalone "View in browser" plus Print/Save as PDF | public for status = sent; admin fallback for drafts |
| * | NotFound | any |

Since the org is flat, the dashboard's group/division dropdown from the original is removed. Keep the office filter, date-range filter, search, and CSV export.

### Layout / theme

- Team Eagle palette: navy `#1E2850`, red `#D81F26`, white `#FFFFFF`. Use navy as the primary surface/header color, red as the accent (dividers, CTAs, active states), white for cards and text on navy.
- Tailwind + shadcn/ui for everything.
- Mobile-first responsive. Offices submit reports from phones between appointments.
- Big tap targets, minimal chrome, a clear "Submit My Weekly Report" CTA on the office dashboard.

### Critical UX patterns

1. **localStorage draft persistence** on ReportForm.tsx AND NewsletterEditor.tsx. Persist on every change, restore on mount AFTER the initial DB load, flush on `visibilitychange` (browsers may discard idle tabs under memory pressure). Use a per-(office, week) key for new reports; a per-editId key for edits.
2. **Do not trigger re-renders on TOKEN_REFRESHED.** In the `useAuth.ts` onAuthStateChange handler, skip `applySession()` entirely when the user identity is unchanged. Token refreshes fire on tab focus and would otherwise cascade re-renders, reset forms, and feel like a page reload.
3. **Force password change on first login.** When `profiles.must_change_password = true`, the auth hook redirects to /set-password regardless of role. After a successful change, call the `complete_password_change()` RPC (SECURITY DEFINER, bypasses the self-update guard) to clear the flag.
4. **Admin can set passwords directly** via a button in Manage Offices, bypassing email entirely. Generate phone-friendly passwords (adjective-noun-NN format like `fire-eagle-47`). Communicate them verbally. Auto-set `must_change_password = true` so the user is forced to pick their own.
5. **Multi-user offices:** show a "This Week's Office Report" card on the office dashboard so co-submitters can see what their partner already entered. Track `last_edited_by` for audit clarity.

## 8. Newsletter HTML template

The branded email is a 600px-wide table-based HTML email rendered server-side by `renderNewsletterHtml()` in `supabase/functions/_shared/newsletter-html.ts`.

### Brand tokens

```
Navy   #1E2850   (header band, section headers, body text)
Red    #D81F26   (dividers, accent rules, shoutout left-border, CTA)
White  #FFFFFF   (card backgrounds)
Rank badges: gold #D4AF37 / silver #C0C0C0 / bronze #CD7F32 for ranks 1/2/3
```

The original used a gold accent. Here the accent rules and the shoutout callout borders switch to Team Eagle red. Keep the metallic gold/silver/bronze medal badges for the top three ranks, since those read as medals against navy and red.

### Email-client-safe rules

- TABLE-based layout (no flex/grid).
- All styles INLINE (no `<style>` tags or CSS classes, except minimal media-query support inside `<head>` for mobile).
- 600px max-width wrapper.
- Web-safe fonts only (Georgia for display headers, Arial/Helvetica for body).
- No SVG, no custom fonts, no background-images.
- Logo as an `<img>` pointing at `https://app.lonestarhomesafety.com/email-logo.png` (must be publicly accessible; drop the Team Eagle PNG into the app's public folder).
- `<meta name="color-scheme" content="light only">` plus `[data-ogsc]` selectors to defeat Gmail's aggressive dark-mode color inversion.
- Explicit `bgcolor` on every section. Outlook iOS inherits a parent bgcolor when child cells do not override.

### Section structure (top to bottom)

1. **Preheader:** small text, "View in browser, Save as PDF" link.
2. **Header band:** navy background, Team Eagle logo banner, week-ending date subtitle.
3. **Hero, Division Total:** the massive number (for example "735 UNITS"), a mini stats row (Appts / Demos / In Training / Qualified / Net Protections), and an "X of Y offices submitted" caption.
4. **Your intro message:** the free-form `email_body` text (render only if non-empty).
5. **Top 5 Team Sales:** per-office leaderboard, Units + Net Protections columns, gold/silver/bronze rank badges.
6. **Top 10 Personal Sales:** per-SA leaderboard, split into two 5-row tables on desktop.
7. **Top 5 Marketing:** per-office (NOT per-SA) ranked by `office_appointments_set`, shows Marketing Director name plus office.
8. **Top 5 Rookie Sales:** per-SA leaderboard filtered to active rookies (`rookie_until` > today). Section omitted if no active rookies.
9. **Shoutouts** (render each only if its name is non-empty): Person of the Week, Rookie of the Week, Business Builder of the Week, as red left-border callout blocks.
10. **Footer:** copyright, a "you are receiving this because..." line, and the View in browser / Save as PDF link.

Removed from the original: the "Division Totals" cards section and the "Team Leaders" list, both of which depended on the multi-tier structure you no longer have.

### Sample HTML pattern (one leaderboard)

```html
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 16px 20px;">
      <p style="margin: 0 0 12px 0; font-family: Georgia, serif; font-size: 14px; text-transform: uppercase; color: #1E2850;">
        TOP 5 TEAM SALES
      </p>
      <hr style="border: none; border-top: 2px solid #D81F26; margin: 0 0 12px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <!-- one row per ranked entry, gold/silver/bronze badge on rank 1/2/3 -->
      </table>
    </td>
  </tr>
</table>
```

## 9. Crons / scheduled jobs

Stored in pg_cron. Each fires via `pg_net.http_post` with an `x-cron-secret` header. UTC times shown, with US Eastern equivalents (adjust for daylight time as needed).

| Job | Schedule (UTC) | Local (US Eastern) | Function |
|-----|----------------|--------------------|----------|
| generate-newsletter-draft-weekly | `0 4 * * 1` | ~12:00 AM ET Monday | generate-newsletter-draft |
| refresh-newsletter-data-weekly | `30 14 * * 1` | ~10:30 AM ET Monday | generate-newsletter-draft with force: true |
| distribute-newsletter-weekly | `0 15 * * 1` | ~11:00 AM ET Monday | distribute-newsletter |
| weekly-office-reminders | `0 22 * * 0` | ~6:00 PM ET Sunday | send-weekly-reminders |
| process-email-queue | every 5 sec | continuous | process-email-queue |

### pg_cron + pg_net setup pattern

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'distribute-newsletter-weekly',
  '0 15 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/distribute-newsletter',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_invoke_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 10. Email delivery (Resend, free tier)

You can run this without paying for email hosting. The app only needs to SEND; receiving is optional.

- **Sending domain:** verify `send.lonestarhomesafety.com` in Resend (add DKIM, SPF, DMARC TXT records at Namecheap). Using a subdomain isolates sending reputation and avoids an SPF conflict with any forwarding you set on the root domain.
- **Sender for notifications:** `reports@send.lonestarhomesafety.com`
- **Sender for the newsletter:** `newsletter@send.lonestarhomesafety.com`
- **API key:** store as the Supabase env secret `RESEND_API_KEY`.
- **Resend free tier:** 3,000 emails/month, 100/day, one verified domain. A weekly newsletter to a sales team plus per-report alerts stays well inside this.

**Optional, receiving replies:** Namecheap includes free email forwarding with domains on their DNS. If you want replies to land in your existing inbox, set a forwarder on the root domain (for example `reports@lonestarhomesafety.com` to your Gmail). Keep this on the root, not the sending subdomain, so the SPF records do not collide. A domain may only have one SPF record; if both Namecheap forwarding and Resend tried to add SPF to the same name, mail would break.

**Critical:** some recipient mail servers silently drop email from new sender domains for 24 to 72 hours (Yahoo especially). Workaround: for auth flows, use the admin "Set Temp Password" UI that bypasses email entirely. Generate phone-friendly passwords (`fire-eagle-47`), communicate verbally.

## 11. Deployment

### Supabase setup

1. Create a Supabase project.
2. Run all migrations in order (`supabase db push` or via the dashboard SQL editor).
3. Enable the pg_cron and pg_net extensions.
4. Generate and store the cron secret in vault:
   `SELECT vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'cron_invoke_secret', 'cron invocation secret');`
5. Set Supabase Auth URL configuration:
   - Site URL: `https://app.lonestarhomesafety.com`
   - Allowed Redirect URLs: `https://app.lonestarhomesafety.com/**`
6. Deploy all edge functions (`supabase functions deploy --no-verify-jwt` for public ones; leave the default for auth-gated ones).
7. Set environment secrets via the dashboard: `RESEND_API_KEY`, plus the auto-provided `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL`.

### Vercel setup

1. Connect the GitHub repo to Vercel.
2. Set environment variables (Vite reads these at build time):
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable (anon) key
3. Vercel auto-detects Vite, builds with `vite build`, and deploys the static output from `dist/`.
4. Configure the custom domain `app.lonestarhomesafety.com` in Vercel.
5. Add a CNAME record at Namecheap pointing the `app` subdomain to Vercel.

### DNS records at Namecheap

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | app | (your Vercel target) | Custom domain for the app |
| TXT | send | `v=spf1 include:_spf.resend.com ~all` | SPF for Resend (on the sending subdomain) |
| TXT | resend._domainkey.send | (DKIM key from Resend) | DKIM signing |
| TXT | _dmarc.send | `v=DMARC1; p=quarantine; rua=mailto:reports@lonestarhomesafety.com` | DMARC policy |

Follow the exact host/value strings Resend shows you when you add the `send.lonestarhomesafety.com` domain; the table above is the shape, not the literal copy.

## 12. Phased build plan

Do not build everything at once. Send Claude Code these phases in order, and verify each before proceeding.

**Phase 1, Foundation (~2 hours)**
- Init Vite + React + TS + Tailwind + shadcn/ui.
- Supabase client setup.
- Create enums (`app_role`, `newsletter_status`).
- Create `offices`, `profiles`, `user_roles`, `safety_advisors` tables.
- Create RLS helper functions (`is_admin`, `is_division`, `is_dealer`, `is_full_access`, `office_id_for_user`).
- Create RLS policies for the above (full-access for division/admin, self for dealer).
- Create `handle_new_user` and `guard_profile_self_update` triggers.
- Create Login + SetPassword + Index router pages.
- Confirm: admin can log in, see their profile, and role enforcement works.

**Phase 2, Report submission (~3 hours)**
- Create `weekly_reports`, `weekly_report_sa_breakdown` tables.
- Create the `recompute_weekly_report_totals` trigger.
- Create RLS policies for the above.
- Build the SafetyAdvisors page (add/edit/deactivate, rookie checkbox).
- Build ReportForm (per-SA inputs, office-level fields, notes textarea, localStorage draft persistence).
- Build the office dashboard (history list, "This Week's Office Report" card).
- Build the staff dashboard skeleton (table, date filter, office filter, CSV export).
- Build the `notify-director` edge function (Resend integration).
- Build Manage Offices (admin set password, send reset link, deactivate, Last Login column).
- Confirm: an office can submit a weekly report from a phone, you see it on the dashboard, and the notification email sends.

**Phase 3, Newsletter (~3 hours)**
- Create `weekly_newsletters`, `newsletter_subscribers` tables.
- Build `_shared/newsletter-html.ts` with the Team Eagle brand tokens.
- Build `generate-newsletter-draft` (computes leaderboards from reports plus breakdown).
- Build `preview-newsletter`, `send-newsletter-test`, `complete-newsletter`, `send-newsletter-now`, `distribute-newsletter`, `public-newsletter-html`.
- Build the Newsletter index, Editor, and View pages.
- Schedule the four crons in pg_cron with the shared-secret header pattern.
- Confirm: the cron generates a draft Sunday night, you edit Monday morning, distribute fires at 11 AM Monday, all team members receive.

**Phase 4, Polish and edge cases (~2 hours)**
- Force password change flow plus the `complete_password_change()` RPC.
- Cron secret rotation via vault.
- Newsletter dark-mode protection (color-scheme meta tags, bgcolor on every section).
- localStorage draft persistence on the Newsletter Editor.
- Skip applySession on TOKEN_REFRESHED in useAuth.
- Manage Offices Last Login column (the `get_user_last_sign_ins` RPC).
- Confirm: edge cases work and real users can use the app from phones without losing data.

**Phase 5, Deployment and onboarding (~1 hour)**
- Verify DNS and the Resend sending subdomain.
- Deploy edge functions to Supabase.
- Deploy the frontend to Vercel.
- Seed the initial offices.
- Bulk-create user accounts via admin SQL (set a temp password, `must_change_password = true`).
- Send the launch message to the team with the login URL, temp password, and email roster.

## 13. Critical lessons / do NOT do this

These bit the original project hard. They are universal, so they apply to your build too.

1. Do not blanket REVOKE EXECUTE from `authenticated` on SECURITY DEFINER helper functions used by RLS policies. The policy expressions need EXECUTE permission to evaluate. Revoking from anon/public is fine; keep authenticated.
2. Triggers fire inside SECURITY DEFINER functions. When a function needs to UPDATE a guarded table, carve out the specific allowed transitions in the trigger rather than trying to bypass triggers from inside the function.
3. Keep `@supabase/supabase-js` pinned to >= 2.95.x. Older versions silently fail `auth.getUser()` after Supabase rotates JWT signing keys to ES256.
4. Yahoo silently drops email from new sender domains for 24 to 72 hours. iMessage and Outlook scanners pre-fetch links and consume one-time auth tokens. For auth, build the admin Set Temp Password UI and bypass email.
5. Phone-friendly passwords beat random alphanumeric. Word-word-number (`fire-eagle-47`) survives verbal transcription; random complex passwords cause hours of "can you read that again."
6. Gmail dark mode inverts colors aggressively. Defend with `<meta name="color-scheme" content="light only">`, `[data-ogsc]` selectors, and explicit bgcolor on every section.
7. TOKEN_REFRESHED events fire on tab focus and cause re-render cascades that wipe form state. Skip setSession in the auth handler when user identity is unchanged.
8. Do not queue all "important security warnings" for batch fixes without triaging each one. The default Supabase advisor recommendations include "revoke EXECUTE from public," which breaks RLS; a blanket "fix all" cascaded into multiple production outages.
9. Use shared-secret header auth for cron-invoked edge functions instead of service-role JWT. Vault drift breaks the JWT pattern silently; a shared secret with vault rotation is more robust.
10. localStorage persistence is not enough by itself. Without filtering TOKEN_REFRESHED events, the page re-renders before localStorage gets a chance to save. Fix both.

## 14. Final advice

Do not try to build all five phases in one Claude Code session. Each phase is roughly 30 to 50 turns of back-and-forth. Send the phase, verify it end-to-end, commit to git, then move to the next.

Keep Claude Code's CLAUDE.md updated with the org structure, role definitions, and business rules so the assistant always has the right context loaded.

Test each phase on real mobile devices, not just desktop. Half the bugs in the original project surfaced on iPhone Safari first.

When something breaks in production, do not start changing code until you have identified the actual root cause. The pattern of "approve all the fixes" leads to over-corrections that cascade. Diagnose first, fix surgically.

Total estimated build time: 7 to 10 active hours across two or three days. With Claude Code agentic mode plus the Supabase MCP and good test coverage, that drops to 5 to 7 hours. Token cost is likely in the low tens of dollars for the full build.

---

## Phase 1 kickoff prompt for Claude Code

Paste the block below into a fresh Claude Code session in an empty project folder to start Phase 1. Attach this whole blueprint file as context first.

```
I'm building the app described in the attached Team Eagle blueprint. We'll work in
the 5 phases it defines. Do Phase 1 only, then stop so I can verify before Phase 2.

Phase 1, Foundation:
- Init Vite + React 18 + TypeScript + Tailwind + shadcn/ui. Set up the Supabase client
  (read VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from env).
- Create the Postgres enums app_role ('division','admin','dealer') and
  newsletter_status ('draft','ready','sent','skipped').
- Create the tables: offices, profiles, user_roles, safety_advisors, exactly per the
  schema in section 4.
- Create the SECURITY DEFINER helper functions is_admin, is_division, is_dealer,
  is_full_access, office_id_for_user. GRANT EXECUTE on each to authenticated.
- Create RLS policies: division and admin have full access; a dealer sees only their
  own office's rows. Enable RLS on every table.
- Create the handle_new_user trigger (hardcode role = dealer, ignore any role field in
  signup metadata) and the guard_profile_self_update trigger.
- Build the Login page, the SetPassword page, and the Index router that redirects by role.
- Use the Team Eagle palette: navy #1E2850, red #D81F26, white #FFFFFF.

When done, give me the exact steps to run the migrations and a quick checklist to confirm
an admin can log in, see their profile, and that a dealer cannot read another office's data.
Do not start Phase 2.
```

---

*Adapted for Team Eagle / lonestarhomesafety.com from a live production reporting codebase. The architecture is the value; metrics and org structure are easily swapped.*
