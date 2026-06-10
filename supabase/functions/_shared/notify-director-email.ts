interface SaBreakdownRow {
  full_name: string;
  appointments_set: number;
  demos_ran: number;
  total_units: number;
  net_installed_protections: number;
}

interface NotifyDirectorEmailArgs {
  officeName: string;
  weekEndingDate: string;
  marketingDirectorName: string | null;
  officeAppointmentsSet: number;
  recruitsInTraining: number;
  qualifiedRecruits: number;
  appointmentsSet: number;
  demosRan: number;
  totalUnits: number;
  netInstalledProtections: number;
  notes: string | null;
  breakdown: SaBreakdownRow[];
}

const NAVY = '#1E2850';
const RED = '#D81F26';
const WHITE = '#FFFFFF';

function statCell(label: string, value: number): string {
  return `
    <td bgcolor="${WHITE}" style="background-color: ${WHITE}; padding: 8px 12px; text-align: center;">
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; text-transform: uppercase; color: ${NAVY}; opacity: 0.6;">${label}</div>
      <div style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: ${NAVY};">${value}</div>
    </td>
  `;
}

function breakdownRow(row: SaBreakdownRow): string {
  return `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY};">${row.full_name}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY}; text-align: right;">${row.appointments_set}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY}; text-align: right;">${row.demos_ran}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY}; text-align: right;">${row.total_units}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY}; text-align: right;">${row.net_installed_protections}</td>
    </tr>
  `;
}

export function renderNotifyDirectorEmail(args: NotifyDirectorEmailArgs): string {
  const breakdownTable = args.breakdown.length
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 8px;">
        <tr>
          <td style="padding: 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; text-transform: uppercase; color: ${NAVY}; opacity: 0.6;">Safety Advisor</td>
          <td style="padding: 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; text-transform: uppercase; color: ${NAVY}; opacity: 0.6; text-align: right;">Appts</td>
          <td style="padding: 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; text-transform: uppercase; color: ${NAVY}; opacity: 0.6; text-align: right;">Demos</td>
          <td style="padding: 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; text-transform: uppercase; color: ${NAVY}; opacity: 0.6; text-align: right;">Units</td>
          <td style="padding: 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; text-transform: uppercase; color: ${NAVY}; opacity: 0.6; text-align: right;">Net Prot.</td>
        </tr>
        ${args.breakdown.map(breakdownRow).join('')}
      </table>
    `
    : `<p style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY}; opacity: 0.6;">No per-advisor numbers reported.</p>`;

  const notesSection = args.notes
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px;">
        <tr>
          <td bgcolor="${WHITE}" style="background-color: ${WHITE}; border-left: 4px solid ${RED}; padding: 12px 16px;">
            <p style="margin: 0 0 4px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; text-transform: uppercase; color: ${NAVY}; opacity: 0.6;">Notes</p>
            <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: ${NAVY};">${args.notes}</p>
          </td>
        </tr>
      </table>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>Weekly Report Submitted</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f5" style="background-color: #f4f4f5;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
            <tr>
              <td bgcolor="${NAVY}" style="background-color: ${NAVY}; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                <p style="margin: 0; font-family: Georgia, serif; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: ${WHITE}; opacity: 0.7;">Team Eagle</p>
                <h1 style="margin: 4px 0 0 0; font-family: Georgia, serif; font-size: 22px; color: ${WHITE};">Weekly Report Submitted</h1>
                <p style="margin: 4px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${WHITE}; opacity: 0.85;">${args.officeName} &middot; Week ending ${args.weekEndingDate}</p>
              </td>
            </tr>
            <tr>
              <td bgcolor="${WHITE}" style="background-color: ${WHITE}; padding: 20px 24px;">
                ${args.marketingDirectorName ? `<p style="margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: ${NAVY};"><strong>Marketing Director:</strong> ${args.marketingDirectorName}</p>` : ''}
                <hr style="border: none; border-top: 2px solid ${RED}; margin: 0 0 16px 0;" />
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    ${statCell('Total Units', args.totalUnits)}
                    ${statCell('Net Protections', args.netInstalledProtections)}
                    ${statCell('Appts Set', args.appointmentsSet)}
                    ${statCell('Demos Ran', args.demosRan)}
                  </tr>
                  <tr>
                    ${statCell('Office Appts', args.officeAppointmentsSet)}
                    ${statCell('Recruits Training', args.recruitsInTraining)}
                    ${statCell('Qualified Recruits', args.qualifiedRecruits)}
                    <td bgcolor="${WHITE}" style="background-color: ${WHITE};"></td>
                  </tr>
                </table>
                ${notesSection}
                <div style="margin-top: 16px;">
                  <p style="margin: 0 0 4px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; text-transform: uppercase; color: ${NAVY}; opacity: 0.6;">Safety Advisor Breakdown</p>
                  ${breakdownTable}
                </div>
              </td>
            </tr>
            <tr>
              <td bgcolor="${WHITE}" style="background-color: ${WHITE}; padding: 16px 24px; border-radius: 0 0 8px 8px;">
                <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: ${NAVY}; opacity: 0.5;">Team Eagle Reporting &mdash; automated notification.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
