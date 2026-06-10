import { corsHeaders, jsonResponse, htmlResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/clients.ts';
import { requireFullAccess } from '../_shared/auth.ts';
import { renderNewsletterFromRow } from '../_shared/newsletter-html.ts';
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

    let weekEndingDate: string | null;
    if (req.method === 'GET') {
      weekEndingDate = new URL(req.url).searchParams.get('week_ending_date');
    } else {
      const body = await req.json().catch(() => ({}));
      weekEndingDate = body.week_ending_date ?? null;
    }
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

    return htmlResponse(renderNewsletterFromRow(newsletter));
  } catch (error) {
    console.error('preview-newsletter error:', error);
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
