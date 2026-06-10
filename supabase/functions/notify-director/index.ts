import { Resend } from 'https://esm.sh/resend@4.0.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/clients.ts';
import { renderNotifyDirectorEmail } from '../_shared/notify-director-email.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weekly_report_id } = await req.json();
    if (!weekly_report_id || typeof weekly_report_id !== 'string') {
      return jsonResponse({ error: 'weekly_report_id is required' }, 400);
    }

    // Respect RLS: only proceed if the caller can see this report
    // (their own office, or division/admin).
    const userClient = createUserClient(req);
    const { data: report, error: reportError } = await userClient
      .from('weekly_reports')
      .select('*')
      .eq('id', weekly_report_id)
      .maybeSingle();

    if (reportError) throw reportError;
    if (!report) {
      return jsonResponse({ error: 'Report not found' }, 404);
    }

    const admin = createServiceRoleClient();

    const [officeRes, breakdownRes, roleRowsRes] = await Promise.all([
      admin.from('offices').select('id, name').eq('id', report.office_id).single(),
      admin
        .from('weekly_report_sa_breakdown')
        .select('*, safety_advisors(full_name)')
        .eq('weekly_report_id', report.id),
      admin.from('user_roles').select('user_id').in('role', ['division', 'admin']),
    ]);

    if (officeRes.error) throw officeRes.error;
    if (breakdownRes.error) throw breakdownRes.error;
    if (roleRowsRes.error) throw roleRowsRes.error;

    const userIds = [...new Set((roleRowsRes.data ?? []).map((r) => r.user_id as string))];

    let recipientEmails: string[] = [];
    if (userIds.length > 0) {
      const { data: recipientProfiles, error: profilesError } = await admin
        .from('profiles')
        .select('email, active')
        .in('id', userIds);
      if (profilesError) throw profilesError;

      recipientEmails = (recipientProfiles ?? [])
        .filter((p) => p.active && p.email)
        .map((p) => p.email as string);
    }

    if (recipientEmails.length === 0) {
      return jsonResponse({ skipped: true, reason: 'No active division/admin recipients' });
    }

    const breakdown = (breakdownRes.data ?? []).map((row) => ({
      full_name: (row.safety_advisors as { full_name: string } | null)?.full_name ?? 'Unknown',
      appointments_set: row.appointments_set as number,
      demos_ran: row.demos_ran as number,
      total_units: row.total_units as number,
      net_installed_protections: row.net_installed_protections as number,
    }));

    const html = renderNotifyDirectorEmail({
      officeName: officeRes.data.name,
      weekEndingDate: report.week_ending_date,
      marketingDirectorName: report.marketing_director_name,
      officeAppointmentsSet: report.office_appointments_set,
      recruitsInTraining: report.recruits_in_training,
      qualifiedRecruits: report.qualified_recruits,
      appointmentsSet: report.appointments_set,
      demosRan: report.demos_ran,
      totalUnits: report.total_units,
      netInstalledProtections: report.net_installed_protections,
      notes: report.notes,
      breakdown,
    });

    const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
    const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Team Eagle Reports <reports@lonestarhomesafety.com>';

    const { error: sendError } = await resend.emails.send({
      from,
      to: recipientEmails,
      subject: `Weekly Report: ${officeRes.data.name} - Week Ending ${report.week_ending_date}`,
      html,
    });

    if (sendError) throw sendError;

    return jsonResponse({ success: true, recipients: recipientEmails.length });
  } catch (error) {
    console.error('notify-director error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
