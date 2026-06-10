import { Resend } from 'https://esm.sh/resend@4.0.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/clients.ts';
import { requireFullAccess } from '../_shared/auth.ts';
import { generatePhoneFriendlyPassword } from '../_shared/password-generator.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userClient = createUserClient(req);
    const { authorized } = await requireFullAccess(userClient);
    if (!authorized) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const body = await req.json();
    const { action, user_id } = body;
    if (!action || !user_id) {
      return jsonResponse({ error: 'action and user_id are required' }, 400);
    }

    const admin = createServiceRoleClient();

    switch (action) {
      case 'set_password': {
        const password = generatePhoneFriendlyPassword();

        const { error: authError } = await admin.auth.admin.updateUserById(user_id, {
          password,
        });
        if (authError) throw authError;

        const { error: profileError } = await admin
          .from('profiles')
          .update({ must_change_password: true })
          .eq('id', user_id);
        if (profileError) throw profileError;

        return jsonResponse({ success: true, password });
      }

      case 'send_reset_link': {
        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .select('email')
          .eq('id', user_id)
          .single();
        if (profileError) throw profileError;
        if (!profile.email) {
          return jsonResponse({ error: 'User has no email on file' }, 400);
        }

        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: profile.email,
        });
        if (linkError) throw linkError;

        const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
        const from =
          Deno.env.get('RESEND_FROM_EMAIL') ?? 'Team Eagle Reports <reports@lonestarhomesafety.com>';

        const { error: sendError } = await resend.emails.send({
          from,
          to: profile.email,
          subject: 'Reset your Team Eagle Reporting password',
          html: `<p>Click the link below to reset your Team Eagle Reporting password:</p><p><a href="${linkData.properties.action_link}">Reset Password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
        });
        if (sendError) throw sendError;

        return jsonResponse({ success: true });
      }

      case 'deactivate':
      case 'reactivate': {
        const active = action === 'reactivate';

        const { error: profileError } = await admin
          .from('profiles')
          .update({ active })
          .eq('id', user_id);
        if (profileError) throw profileError;

        const { error: authError } = await admin.auth.admin.updateUserById(user_id, {
          ban_duration: active ? 'none' : '876000h',
        });
        if (authError) throw authError;

        return jsonResponse({ success: true });
      }

      case 'edit': {
        const { full_name, marketing_director_name, office_id } = body;
        const updates: Record<string, unknown> = {};
        if (full_name !== undefined) updates.full_name = full_name;
        if (marketing_director_name !== undefined) {
          updates.marketing_director_name = marketing_director_name;
        }
        if (office_id !== undefined) updates.office_id = office_id;

        if (Object.keys(updates).length === 0) {
          return jsonResponse({ error: 'No fields to update' }, 400);
        }

        const { error: profileError } = await admin
          .from('profiles')
          .update(updates)
          .eq('id', user_id);
        if (profileError) throw profileError;

        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('manage-dealer error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
