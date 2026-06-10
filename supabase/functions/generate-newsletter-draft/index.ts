import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/clients.ts';
import { requireFullAccess, requireCronSecret } from '../_shared/auth.ts';
import { mostRecentSunday } from '../_shared/dates.ts';
import { errorMessage } from '../_shared/errors.ts';
import type { LeaderboardEntry, NewsletterDraftData } from '../_shared/newsletter-html.ts';

interface ReportRow {
  id: string;
  office_id: string;
  marketing_director_name: string | null;
  office_appointments_set: number;
  recruits_in_training: number;
  qualified_recruits: number;
  appointments_set: number;
  demos_ran: number;
  total_units: number;
  net_installed_protections: number;
}

interface BreakdownRow {
  appointments_set: number;
  demos_ran: number;
  total_units: number;
  net_installed_protections: number;
  safety_advisors: {
    full_name: string;
    office_id: string;
    rookie_until: string | null;
  } | null;
}

function topN(entries: LeaderboardEntry[], n: number): LeaderboardEntry[] {
  return [...entries].sort((a, b) => b.primaryValue - a.primaryValue).slice(0, n);
}

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
    const force: boolean = body.force === true;

    const { data: existing, error: existingError } = await admin
      .from('weekly_newsletters')
      .select('*')
      .eq('week_ending_date', weekEndingDate)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing && existing.status !== 'draft' && !force) {
      return jsonResponse({ newsletter: existing, regenerated: false });
    }

    const { data: offices, error: officesError } = await admin
      .from('offices')
      .select('id, name');
    if (officesError) throw officesError;

    const officeNames = new Map((offices ?? []).map((o) => [o.id, o.name]));

    const { data: reports, error: reportsError } = await admin
      .from('weekly_reports')
      .select('*')
      .eq('week_ending_date', weekEndingDate);
    if (reportsError) throw reportsError;

    const reportRows = (reports ?? []) as ReportRow[];
    const reportIds = reportRows.map((r) => r.id);

    let breakdownRows: BreakdownRow[] = [];
    if (reportIds.length > 0) {
      const { data: breakdown, error: breakdownError } = await admin
        .from('weekly_report_sa_breakdown')
        .select(
          'appointments_set, demos_ran, total_units, net_installed_protections, safety_advisors(full_name, office_id, rookie_until)',
        )
        .in('weekly_report_id', reportIds);
      if (breakdownError) throw breakdownError;
      breakdownRows = (breakdown ?? []) as unknown as BreakdownRow[];
    }

    const divisionTotals = reportRows.reduce(
      (acc, r) => ({
        totalUnits: acc.totalUnits + r.total_units,
        netInstalledProtections: acc.netInstalledProtections + r.net_installed_protections,
        appointmentsSet: acc.appointmentsSet + r.appointments_set,
        demosRan: acc.demosRan + r.demos_ran,
        recruitsInTraining: acc.recruitsInTraining + r.recruits_in_training,
        qualifiedRecruits: acc.qualifiedRecruits + r.qualified_recruits,
      }),
      {
        totalUnits: 0,
        netInstalledProtections: 0,
        appointmentsSet: 0,
        demosRan: 0,
        recruitsInTraining: 0,
        qualifiedRecruits: 0,
      },
    );

    const topTeamSales = topN(
      reportRows.map((r) => ({
        name: officeNames.get(r.office_id) ?? 'Unknown Office',
        primaryValue: r.total_units,
        secondaryValue: r.net_installed_protections,
      })),
      5,
    );

    const topMarketing = topN(
      reportRows.map((r) => ({
        name: officeNames.get(r.office_id) ?? 'Unknown Office',
        subtitle: r.marketing_director_name ?? undefined,
        primaryValue: r.office_appointments_set,
      })),
      5,
    );

    const personalSalesEntries = breakdownRows
      .filter((b) => b.safety_advisors)
      .map((b) => ({
        name: b.safety_advisors!.full_name,
        subtitle: officeNames.get(b.safety_advisors!.office_id) ?? undefined,
        primaryValue: b.total_units,
        secondaryValue: b.net_installed_protections,
        rookieUntil: b.safety_advisors!.rookie_until,
      }));

    const topPersonalSales = topN(personalSalesEntries, 10);

    const topRookieSales = topN(
      personalSalesEntries.filter(
        (e) => e.rookieUntil !== null && e.rookieUntil >= weekEndingDate,
      ),
      5,
    );

    const draftData: NewsletterDraftData = {
      divisionTotals,
      officesSubmitted: reportRows.length,
      officesTotal: (offices ?? []).length,
      topTeamSales,
      topPersonalSales: topPersonalSales.map(({ name, subtitle, primaryValue, secondaryValue }) => ({
        name,
        subtitle,
        primaryValue,
        secondaryValue,
      })),
      topMarketing,
      topRookieSales: topRookieSales.map(({ name, subtitle, primaryValue, secondaryValue }) => ({
        name,
        subtitle,
        primaryValue,
        secondaryValue,
      })),
    };

    let newsletter;
    if (!existing) {
      const { data, error } = await admin
        .from('weekly_newsletters')
        .insert({ week_ending_date: weekEndingDate, status: 'draft', draft_data: draftData })
        .select()
        .single();
      if (error) throw error;
      newsletter = data;
    } else {
      const { data, error } = await admin
        .from('weekly_newsletters')
        .update({ draft_data: draftData })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      newsletter = data;
    }

    return jsonResponse({ newsletter, regenerated: true });
  } catch (error) {
    console.error('generate-newsletter-draft error:', error);
    return jsonResponse({ error: errorMessage(error) }, 500);
  }
});
