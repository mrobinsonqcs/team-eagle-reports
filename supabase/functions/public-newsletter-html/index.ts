import { corsHeaders, jsonResponse, htmlResponse } from '../_shared/cors.ts';
import { createServiceRoleClient } from '../_shared/clients.ts';
import { renderNewsletterFromRow } from '../_shared/newsletter-html.ts';
import { errorMessage } from '../_shared/errors.ts';

/**
 * Fully public (verify_jwt = false): backs the "View in browser" link in the
 * newsletter email and the public /newsletter/:weekEndingDate/view route.
 * Only ever serves newsletters with status = sent.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const weekEndingDate = new URL(req.url).searchParams.get('week_ending_date');
    if (!weekEndingDate) {
      return jsonResponse({ error: 'week_ending_date is required' }, 400);
    }

    const admin = createServiceRoleClient();
    const { data: newsletter, error } = await admin
      .from('weekly_newsletters')
      .select('*')
      .eq('week_ending_date', weekEndingDate)
      .eq('status', 'sent')
      .maybeSingle();
    if (error) throw error;
    if (!newsletter) {
      return jsonResponse({ error: 'Newsletter not found' }, 404);
    }

    return htmlResponse(renderNewsletterFromRow(newsletter));
  } catch (error) {
    console.error('public-newsletter-html error:', error);
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
