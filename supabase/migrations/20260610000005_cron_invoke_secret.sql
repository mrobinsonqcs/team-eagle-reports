-- Phase 3: shared secret for cron-invoked edge functions.
--
-- Cron-invoked functions (generate-newsletter-draft, distribute-newsletter)
-- authenticate pg_cron's pg_net.http_post calls via a stable shared secret
-- sent as the `x-cron-secret` header, rather than a service-role JWT (see
-- CLAUDE.md critical lesson #3 / blueprint section 6 architectural rules).

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_invoke_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'cron_invoke_secret',
      'Shared secret for cron-invoked edge functions (x-cron-secret header).'
    );
  end if;
end $$;

-- get_cron_invoke_secret: returns the shared secret value. SECURITY DEFINER
-- so it can read vault.decrypted_secrets, which is only readable by
-- privileged roles. EXECUTE is intentionally restricted to service_role only
-- — this returns a secret value, so authenticated users must never be able
-- to call it.
create or replace function public.get_cron_invoke_secret()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cron_invoke_secret';
$$;

revoke all on function public.get_cron_invoke_secret() from public, authenticated, anon;
grant execute on function public.get_cron_invoke_secret() to service_role;
