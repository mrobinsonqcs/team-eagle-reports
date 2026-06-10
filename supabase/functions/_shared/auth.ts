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
