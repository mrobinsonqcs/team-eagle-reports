import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/clients.ts';
import { requireFullAccess, requireCronSecret } from '../_shared/auth.ts';
import { mostRecentSunday } from '../_shared/dates.ts';
import { sendNewsletterNow } from '../_shared/newsletter-send.ts';
import { errorMessage } from '../_shared/errors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createServiceRoleClient();

    const isCron = await requireCronSecret(req, admin);
    if (!isCron) {
      const { authorized } = await requireFullAccess(createUserClient(req));
      if (!authorized) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
    }

    const body = await req.json().catch(() => ({}));
    const weekEndingDate: string = body.week_ending_date ?? mostRecentSunday();

    const result = await sendNewsletterNow(admin, weekEndingDate);

    return jsonResponse(result);
  } catch (error) {
    console.error('distribute-newsletter error:', error);
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
