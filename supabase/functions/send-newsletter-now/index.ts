import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/clients.ts';
import { requireFullAccess } from '../_shared/auth.ts';
import { sendNewsletterNow } from '../_shared/newsletter-send.ts';
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
    const { week_ending_date } = body;
    if (!week_ending_date) {
      return jsonResponse({ error: 'week_ending_date is required' }, 400);
    }

    const admin = createServiceRoleClient();
    const result = await sendNewsletterNow(admin, week_ending_date);

    return jsonResponse(result);
  } catch (error) {
    console.error('send-newsletter-now error:', error);
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
