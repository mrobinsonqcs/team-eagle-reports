import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';

/**
 * Resolves the calling user from their JWT and checks is_full_access
 * (division or admin) via the existing SECURITY DEFINER helper.
 */
export async function requireFullAccess(userClient: SupabaseClient) {
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return { authorized: false as const, user: null };
  }

  const { data: isFullAccess, error: rpcError } = await userClient.rpc('is_full_access', {
    _user_id: user.id,
  });

  if (rpcError || !isFullAccess) {
    return { authorized: false as const, user };
  }

  return { authorized: true as const, user };
}

/**
 * Checks the `x-cron-secret` header against the shared secret stored in
 * vault (via the service-role-only get_cron_invoke_secret RPC). Used by
 * cron-invoked edge functions instead of service-role JWT validation (see
 * CLAUDE.md critical lesson #3).
 */
export async function requireCronSecret(req: Request, adminClient: SupabaseClient) {
  const provided = req.headers.get('x-cron-secret');
  if (!provided) return false;

  const { data: expected, error } = await adminClient.rpc('get_cron_invoke_secret');
  if (error || !expected) return false;

  return provided === expected;
}
