import { formatDateLong } from './dates.ts';

const NAVY = '#1E2850';
const RED = '#D81F26';
const WHITE = '#FFFFFF';
const GOLD = '#D4AF37';
const SILVER = '#C0C0C0';
const BRONZE = '#CD7F32';

const APP_URL = Deno.env.get('PUBLIC_APP_URL') ?? 'https://app.lonestarhomesafety.com';
const LOGO_URL = `${APP_URL}/email-logo.png`;

export interface LeaderboardEntry {
  name: string;
  subtitle?: string;
  primaryValue: number;
  secondaryValue?: number;
}

export interface NewsletterDraftData {
  divisionTotals: {
    totalUnits: number;
    netInstalledProtections: number;
    appointmentsSet: number;
    demosRan: number;
    recruitsInTraining: number;
    qualifiedRecruits: number;
  };
  officesSubmitted: number;
  officesTotal: number;
  topTeamSales: LeaderboardEntry[];
  topPersonalSales: LeaderboardEntry[];
  topMarketing: LeaderboardEntry[];
  topRookieSales: LeaderboardEntry[];
}

export interface NewsletterHtmlArgs {
  weekEndingDate: string;
  draftData: NewsletterDraftData;
  emailBody: string | null;
  personOfWeekName: string | null;
  personOfWeekBlurb: string | null;
  rookieOfWeekName: string | null;
  rookieOfWeekBlurb: string | null;
  businessBuilderName: string | null;
  businessBuilderBlurb: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function preheader(viewUrl: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td bgcolor="#f4f4f5" style="background-color: #f4f4f5; padding: 8px 20px; text-align: center;">
        <a href="${viewUrl}" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: ${NAVY}; text-decoration: underline;">View in browser &middot; Save as PDF</a>
      </td>
    </tr>
  </table>`;
}

function headerBand(weekEndingDateLong: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td bgcolor="${NAVY}" style="background-color: ${NAVY}; padding: 20px; text-align: center;">
        <img src="${LOGO_URL}" width="180" alt="Team Eagle" style="display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none; max-width: 180px;" />
        <p style="margin: 8px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${WHITE}; opacity: 0.85;">Week Ending ${weekEndingDateLong}</p>
      </td>
    </tr>
  </table>`;
}

function heroStat(label: string, value: number): string {
  return `
    <td bgcolor="${NAVY}" style="background-color: ${NAVY}; text-align: center; padding: 0 4px;">
      <div style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: ${WHITE};">${value}</div>
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 9px; text-transform: uppercase; color: ${WHITE}; opacity: 0.6;">${label}</div>
    </td>`;
}

function heroSection(d: NewsletterDraftData): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td bgcolor="${NAVY}" style="background-color: ${NAVY}; padding: 24px 20px; text-align: center;">
        <p style="margin: 0; font-family: Georgia, serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: ${WHITE}; opacity: 0.7;">Division Total</p>
        <p style="margin: 4px 0 0 0; font-family: Georgia, serif; font-size: 48px; font-weight: bold; color: ${WHITE};">${d.divisionTotals.totalUnits} UNITS</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px;">
          <tr>
            ${heroStat('Appts', d.divisionTotals.appointmentsSet)}
            ${heroStat('Demos', d.divisionTotals.demosRan)}
            ${heroStat('In Training', d.divisionTotals.recruitsInTraining)}
            ${heroStat('Qualified', d.divisionTotals.qualifiedRecruits)}
            ${heroStat('Net Protections', d.divisionTotals.netInstalledProtections)}
          </tr>
        </table>
        <p style="margin: 16px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: ${WHITE}; opacity: 0.7;">${d.officesSubmitted} of ${d.officesTotal} offices submitted</p>
      </td>
    </tr>
  </table>`;
}

function sectionWrapper(title: string, inner: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
    <tr>
      <td bgcolor="${WHITE}" style="background-color: ${WHITE}; padding: 16px 20px;">
        <p style="margin: 0 0 12px 0; font-family: Georgia, serif; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: ${NAVY};">${title}</p>
        <hr style="border: none; border-top: 2px solid ${RED}; margin: 0 0 12px 0;" />
        ${inner}
      </td>
    </tr>
  </table>`;
}

const RANK_COLORS: Record<number, string> = { 1: GOLD, 2: SILVER, 3: BRONZE };

function rankCell(rank: number): string {
  const color = RANK_COLORS[rank];
  if (color) {
    return `<td width="26" style="font-family: Georgia, serif; font-size: 13px; font-weight: bold; color: ${WHITE}; background-color: ${color}; text-align: center; border-radius: 13px; width: 26px; height: 26px; line-height: 26px;">${rank}</td>`;
  }
  return `<td width="26" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY}; opacity: 0.45; text-align: center;">${rank}</td>`;
}

function leaderboardHeaderRow(valueLabels: string[]): string {
  const labelCell = (label: string) =>
    `<td style="padding: 0 8px 6px 8px; text-align: right; font-family: Arial, Helvetica, sans-serif; font-size: 10px; text-transform: uppercase; color: ${NAVY}; opacity: 0.5;">${label}</td>`;
  return `<tr><td></td><td></td>${valueLabels.map(labelCell).join('')}</tr>`;
}

function leaderboardRow(rank: number, entry: LeaderboardEntry, valueLabels: string[]): string {
  const secondaryCell =
    valueLabels.length > 1 && entry.secondaryValue !== undefined
      ? `<td style="padding: 6px 8px; text-align: right; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY}; opacity: 0.7;">${entry.secondaryValue}</td>`
      : '';
  return `
    <tr>
      ${rankCell(rank)}
      <td style="padding: 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: ${NAVY};">
        <strong>${escapeHtml(entry.name)}</strong>${entry.subtitle ? `<br /><span style="font-size: 11px; color: ${NAVY}; opacity: 0.6;">${escapeHtml(entry.subtitle)}</span>` : ''}
      </td>
      <td style="padding: 6px 8px; text-align: right; font-family: Georgia, serif; font-size: 16px; font-weight: bold; color: ${NAVY};">${entry.primaryValue}</td>
      ${secondaryCell}
    </tr>`;
}

function emptyMessage(): string {
  return `<p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY}; opacity: 0.5;">No data yet.</p>`;
}

function leaderboardTable(entries: LeaderboardEntry[], startRank: number, valueLabels: string[]): string {
  if (entries.length === 0) return emptyMessage();
  const rows = entries.map((e, i) => leaderboardRow(startRank + i, e, valueLabels)).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0">${leaderboardHeaderRow(valueLabels)}${rows}</table>`;
}

function leaderboardSection(title: string, entries: LeaderboardEntry[], valueLabels: string[]): string {
  const inner = entries.length === 0 ? emptyMessage() : leaderboardTable(entries, 1, valueLabels);
  return sectionWrapper(title, inner);
}

function personalSalesSection(entries: LeaderboardEntry[]): string {
  if (entries.length === 0) {
    return sectionWrapper('Top 10 Personal Sales', emptyMessage());
  }

  const left = entries.slice(0, 5);
  const right = entries.slice(5, 10);
  const valueLabels = ['Units', 'Net Prot.'];

  const inner = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="stack-col" valign="top" width="50%" style="padding-right: 8px;">${leaderboardTable(left, 1, valueLabels)}</td>
        <td class="stack-col" valign="top" width="50%" style="padding-left: 8px;">${leaderboardTable(right, 6, valueLabels)}</td>
      </tr>
    </table>`;

  return sectionWrapper('Top 10 Personal Sales', inner);
}

function introSection(emailBody: string | null): string {
  if (!emailBody?.trim()) return '';
  const html = escapeHtml(emailBody).replace(/\n/g, '<br />');
  return sectionWrapper(
    'A Note From The Top',
    `<p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: ${NAVY};">${html}</p>`,
  );
}

function shoutoutSection(title: string, name: string | null, blurb: string | null): string {
  if (!name?.trim()) return '';
  const blurbHtml = blurb?.trim()
    ? `<p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: ${NAVY};">${escapeHtml(blurb).replace(/\n/g, '<br />')}</p>`
    : '';
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
    <tr>
      <td bgcolor="${WHITE}" style="background-color: ${WHITE}; border-left: 4px solid ${RED}; padding: 16px 20px;">
        <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${NAVY}; opacity: 0.6;">${title}</p>
        <p style="margin: 0 0 4px 0; font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: ${NAVY};">${escapeHtml(name)}</p>
        ${blurbHtml}
      </td>
    </tr>
  </table>`;
}

function footer(viewUrl: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td bgcolor="${WHITE}" style="background-color: ${WHITE}; padding: 16px 24px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: ${NAVY}; opacity: 0.5;">You are receiving this because you are a member of the Team Eagle sales division.</p>
        <a href="${viewUrl}" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: ${NAVY}; text-decoration: underline;">View in browser &middot; Save as PDF</a>
      </td>
    </tr>
  </table>`;
}

export function newsletterViewUrl(weekEndingDate: string): string {
  return `${APP_URL}/newsletter/${weekEndingDate}/view`;
}

export interface NewsletterRow {
  week_ending_date: string;
  draft_data: NewsletterDraftData | null;
  email_body: string | null;
  person_of_the_week_name: string | null;
  person_of_the_week_blurb: string | null;
  rookie_of_the_week_name: string | null;
  rookie_of_the_week_blurb: string | null;
  business_builder_name: string | null;
  business_builder_blurb: string | null;
}

/** Builds the renderNewsletterHtml args from a weekly_newsletters row. */
export function renderNewsletterFromRow(row: NewsletterRow): string {
  return renderNewsletterHtml({
    weekEndingDate: row.week_ending_date,
    draftData: row.draft_data ?? emptyDraftData(),
    emailBody: row.email_body,
    personOfWeekName: row.person_of_the_week_name,
    personOfWeekBlurb: row.person_of_the_week_blurb,
    rookieOfWeekName: row.rookie_of_the_week_name,
    rookieOfWeekBlurb: row.rookie_of_the_week_blurb,
    businessBuilderName: row.business_builder_name,
    businessBuilderBlurb: row.business_builder_blurb,
  });
}

export function emptyDraftData(): NewsletterDraftData {
  return {
    divisionTotals: {
      totalUnits: 0,
      netInstalledProtections: 0,
      appointmentsSet: 0,
      demosRan: 0,
      recruitsInTraining: 0,
      qualifiedRecruits: 0,
    },
    officesSubmitted: 0,
    officesTotal: 0,
    topTeamSales: [],
    topPersonalSales: [],
    topMarketing: [],
    topRookieSales: [],
  };
}

export function renderNewsletterHtml(args: NewsletterHtmlArgs): string {
  const weekLong = formatDateLong(args.weekEndingDate);
  const viewUrl = newsletterViewUrl(args.weekEndingDate);
  const d = args.draftData;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>Team Eagle Weekly &mdash; Week Ending ${weekLong}</title>
    <style>
      [data-ogsc] body, [data-ogsc] table, [data-ogsc] td, [data-ogsc] p, [data-ogsc] span, [data-ogsc] div {
        background-color: inherit !important;
        color: inherit !important;
      }
      @media (max-width: 480px) {
        .stack-col {
          display: block !important;
          width: 100% !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f5" style="background-color: #f4f4f5;">
      <tr>
        <td align="center" style="padding: 0 0 24px 0;">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
            <tr><td>${preheader(viewUrl)}</td></tr>
            <tr><td>${headerBand(weekLong)}</td></tr>
            <tr><td>${heroSection(d)}</td></tr>
            <tr><td>${introSection(args.emailBody)}</td></tr>
            <tr><td>${leaderboardSection('Top 5 Team Sales', d.topTeamSales, ['Units', 'Net Prot.'])}</td></tr>
            <tr><td>${personalSalesSection(d.topPersonalSales)}</td></tr>
            <tr><td>${leaderboardSection('Top 5 Marketing', d.topMarketing, ['Office Appts'])}</td></tr>
            ${d.topRookieSales.length > 0 ? `<tr><td>${leaderboardSection('Top 5 Rookie Sales', d.topRookieSales, ['Units', 'Net Prot.'])}</td></tr>` : ''}
            <tr><td>${shoutoutSection('Person of the Week', args.personOfWeekName, args.personOfWeekBlurb)}</td></tr>
            <tr><td>${shoutoutSection('Rookie of the Week', args.rookieOfWeekName, args.rookieOfWeekBlurb)}</td></tr>
            <tr><td>${shoutoutSection('Business Builder of the Week', args.businessBuilderName, args.businessBuilderBlurb)}</td></tr>
            <tr><td>${footer(viewUrl)}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
