import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';

/**
 * user_roles.user_id and profiles.id both reference auth.users.id
 * independently (no direct FK between the two tables), so this can't be a
 * single PostgREST embed query — it's two queries joined in JS.
 */
export async function getFullAccessEmails(admin: SupabaseClient): Promise<string[]> {
  const { data: roles, error: rolesError } = await admin
    .from('user_roles')
    .select('user_id')
    .in('role', ['division', 'admin']);
  if (rolesError) throw rolesError;

  const userIds = (roles ?? []).map((r) => r.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('email')
    .in('id', userIds)
    .eq('active', true);
  if (profilesError) throw profilesError;

  return (profiles ?? [])
    .map((p) => p.email)
    .filter((email): email is string => !!email);
}

/** All active profile emails plus all active newsletter_subscribers emails, deduplicated. */
export async function getAllRecipientEmails(admin: SupabaseClient): Promise<string[]> {
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('email')
    .eq('active', true);
  if (profilesError) throw profilesError;

  const { data: subscribers, error: subscribersError } = await admin
    .from('newsletter_subscribers')
    .select('email')
    .eq('active', true);
  if (subscribersError) throw subscribersError;

  const emails = new Set<string>();
  for (const p of profiles ?? []) {
    if (p.email) emails.add(p.email);
  }
  for (const s of subscribers ?? []) {
    if (s.email) emails.add(s.email);
  }
  return [...emails];
}
