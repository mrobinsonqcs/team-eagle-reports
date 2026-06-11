-- Phase 4: allow rotating the shared cron-invoke secret via vault.
--
-- Cron jobs read public.get_cron_invoke_secret() at execution time
-- (20260610000005_cron_invoke_secret.sql), so rotating the underlying vault
-- secret value here takes effect for the next scheduled run with no need to
-- re-create or re-schedule any cron jobs.

create or replace function public.rotate_cron_invoke_secret()
returns void
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  _secret_id uuid;
begin
  if not public.is_full_access(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  select id into _secret_id from vault.secrets where name = 'cron_invoke_secret';

  if _secret_id is null then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'cron_invoke_secret',
      'Shared secret for cron-invoked edge functions (x-cron-secret header).'
    );
  else
    perform vault.update_secret(_secret_id, encode(extensions.gen_random_bytes(32), 'hex'));
  end if;
end;
$$;

revoke all on function public.rotate_cron_invoke_secret() from public, anon;
grant execute on function public.rotate_cron_invoke_secret() to authenticated;
