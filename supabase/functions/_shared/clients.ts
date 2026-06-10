import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';

/**
 * Service-role client: bypasses RLS entirely. Only use for data the function
 * has already authorized via a user-context check.
 */
export function createServiceRoleClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

/**
 * User-context client: forwards the caller's JWT so RLS applies exactly as
 * it would for the calling user.
 */
export function createUserClient(req: Request) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    },
  );
}
