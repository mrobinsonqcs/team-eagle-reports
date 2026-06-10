import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/clients.ts';
import { requireFullAccess } from '../_shared/auth.ts';

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

    const { email, full_name, office_name, marketing_director_name } = await req.json();
    if (!email || !full_name || !office_name) {
      return jsonResponse({ error: 'email, full_name, and office_name are required' }, 400);
    }

    const admin = createServiceRoleClient();

    // Find or create the office.
    const { data: existingOffice, error: officeLookupError } = await admin
      .from('offices')
      .select('id, name')
      .ilike('name', office_name)
      .maybeSingle();
    if (officeLookupError) throw officeLookupError;

    let officeId: string;
    if (existingOffice) {
      officeId = existingOffice.id;
    } else {
      const { data: newOffice, error: officeInsertError } = await admin
        .from('offices')
        .insert({ name: office_name })
        .select('id')
        .single();
      if (officeInsertError) throw officeInsertError;
      officeId = newOffice.id;
    }

    // Invite the user. handle_new_user creates the profiles + user_roles
    // ('dealer') rows from this metadata.
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name, office_id: officeId } },
    );
    if (inviteError) throw inviteError;

    const newUserId = inviteData.user.id;

    if (marketing_director_name) {
      const { error: profileUpdateError } = await admin
        .from('profiles')
        .update({ marketing_director_name })
        .eq('id', newUserId);
      if (profileUpdateError) throw profileUpdateError;
    }

    // Auto-create a matching Safety Advisor for this office.
    const { error: saError } = await admin
      .from('safety_advisors')
      .upsert(
        { office_id: officeId, full_name },
        { onConflict: 'office_id,full_name', ignoreDuplicates: true },
      );
    if (saError) throw saError;

    return jsonResponse({ success: true, user_id: newUserId, office_id: officeId });
  } catch (error) {
    console.error('invite-dealer error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
