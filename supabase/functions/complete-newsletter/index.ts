import { Resend } from 'https://esm.sh/resend@4.0.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/clients.ts';
import { requireFullAccess } from '../_shared/auth.ts';
import { renderNewsletterFromRow } from '../_shared/newsletter-html.ts';
import { getFullAccessEmails } from '../_shared/newsletter-recipients.ts';
import { errorMessage } from '../_shared/errors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authorized } = await requireFullAccess(createUserClient(req));
    if (!authorized) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const body = await req.json();
    const {
      week_ending_date,
      email_body,
      person_of_the_week_name,
      person_of_the_week_blurb,
      rookie_of_the_week_name,
      rookie_of_the_week_blurb,
      business_builder_name,
      business_builder_blurb,
    } = body;

    if (!week_ending_date) {
      return jsonResponse({ error: 'week_ending_date is required' }, 400);
    }

    const admin = createServiceRoleClient();

    const { data: existing, error: existingError } = await admin
      .from('weekly_newsletters')
      .select('id')
      .eq('week_ending_date', week_ending_date)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return jsonResponse({ error: 'Newsletter not found. Generate a draft first.' }, 404);
    }

    const { data: newsletter, error: updateError } = await admin
      .from('weekly_newsletters')
      .update({
        email_body: email_body ?? null,
        person_of_the_week_name: person_of_the_week_name ?? null,
        person_of_the_week_blurb: person_of_the_week_blurb ?? null,
        rookie_of_the_week_name: rookie_of_the_week_name ?? null,
        rookie_of_the_week_blurb: rookie_of_the_week_blurb ?? null,
        business_builder_name: business_builder_name ?? null,
        business_builder_blurb: business_builder_blurb ?? null,
        status: 'ready',
        completed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (updateError) throw updateError;

    try {
      const recipients = await getFullAccessEmails(admin);
      if (recipients.length > 0) {
        const html = renderNewsletterFromRow(newsletter);
        const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
        const from =
          Deno.env.get('RESEND_FROM_EMAIL') ?? 'Team Eagle Reports <reports@lonestarhomesafety.com>';

        const { error: sendError } = await resend.batch.send(
          recipients.map((to) => ({
            from,
            to,
            subject: `Newsletter Ready for Review — Week Ending ${week_ending_date}`,
            html,
          })),
        );
        if (sendError) throw sendError;
      }
    } catch (sendError) {
      console.error('complete-newsletter: archive email failed (non-fatal):', sendError);
    }

    return jsonResponse({ newsletter });
  } catch (error) {
    console.error('complete-newsletter error:', error);
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
