import { Resend } from 'https://esm.sh/resend@4.0.1';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.1';
import { renderNewsletterFromRow } from './newsletter-html.ts';
import { getAllRecipientEmails } from './newsletter-recipients.ts';

const RESEND_BATCH_LIMIT = 100;

/**
 * Renders and sends the newsletter for a given week to all recipients
 * (active profiles + active newsletter_subscribers), then marks it sent.
 * Idempotent: if the newsletter is already status=sent, this is a no-op.
 */
export async function sendNewsletterNow(admin: SupabaseClient, weekEndingDate: string) {
  const { data: newsletter, error } = await admin
    .from('weekly_newsletters')
    .select('*')
    .eq('week_ending_date', weekEndingDate)
    .maybeSingle();
  if (error) throw error;
  if (!newsletter) {
    throw new Error(`No newsletter found for week ending ${weekEndingDate}`);
  }
  if (newsletter.status === 'sent') {
    return { newsletter, alreadySent: true, recipientCount: 0 };
  }

  const html = renderNewsletterFromRow(newsletter);
  const recipients = await getAllRecipientEmails(admin);

  const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
  const from =
    Deno.env.get('RESEND_FROM_EMAIL') ?? 'Team Eagle Reports <reports@lonestarhomesafety.com>';
  const subject = `Team Eagle Weekly — Week Ending ${weekEndingDate}`;

  for (let i = 0; i < recipients.length; i += RESEND_BATCH_LIMIT) {
    const batch = recipients.slice(i, i + RESEND_BATCH_LIMIT);
    const { error: sendError } = await resend.batch.send(
      batch.map((to) => ({ from, to, subject, html })),
    );
    if (sendError) throw sendError;
  }

  const { data: updated, error: updateError } = await admin
    .from('weekly_newsletters')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', newsletter.id)
    .select()
    .single();
  if (updateError) throw updateError;

  return { newsletter: updated, alreadySent: false, recipientCount: recipients.length };
}
