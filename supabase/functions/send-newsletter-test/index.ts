import { Resend } from 'https://esm.sh/resend@4.0.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/clients.ts';
import { requireFullAccess } from '../_shared/auth.ts';
import { renderNewsletterFromRow } from '../_shared/newsletter-html.ts';
import { errorMessage } from '../_shared/errors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authorized, user } = await requireFullAccess(createUserClient(req));
    if (!authorized || !user) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }
    if (!user.email) {
      return jsonResponse({ error: 'Your account has no email on file' }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const weekEndingDate: string | undefined = body.week_ending_date;
    if (!weekEndingDate) {
      return jsonResponse({ error: 'week_ending_date is required' }, 400);
    }

    const admin = createServiceRoleClient();
    const { data: newsletter, error } = await admin
      .from('weekly_newsletters')
      .select('*')
      .eq('week_ending_date', weekEndingDate)
      .maybeSingle();
    if (error) throw error;
    if (!newsletter) {
      return jsonResponse({ error: 'Newsletter not found' }, 404);
    }

    const html = renderNewsletterFromRow(newsletter);

    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    const from =
      Deno.env.get('RESEND_FROM_EMAIL') ?? 'Team Eagle Reports <reports@lonestarhomesafety.com>';

    const { error: sendError } = await resend.emails.send({
      from,
      to: user.email,
      subject: `[TEST] Team Eagle Weekly — Week Ending ${weekEndingDate}`,
      html,
    });
    if (sendError) throw sendError;

    return jsonResponse({ success: true, sentTo: user.email });
  } catch (error) {
    console.error('send-newsletter-test error:', error);
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
