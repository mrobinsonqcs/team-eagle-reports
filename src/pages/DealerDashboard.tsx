import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getWeekEndingDate, formatDateLong } from '@/lib/dates';

interface WeeklyReport {
  id: string;
  week_ending_date: string;
  marketing_director_name: string | null;
  office_appointments_set: number;
  recruits_in_training: number;
  qualified_recruits: number;
  appointments_set: number;
  demos_ran: number;
  total_units: number;
  net_installed_protections: number;
  notes: string | null;
  submitted_by: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
}

interface SaBreakdown {
  id: string;
  weekly_report_id: string;
  safety_advisor_id: string;
  appointments_set: number;
  demos_ran: number;
  total_units: number;
  net_installed_protections: number;
}

export default function DealerDashboard() {
  const { profile } = useAuth();
  const officeId = profile?.office_id ?? null;
  const currentWeek = getWeekEndingDate();

  const { data: history, isLoading } = useQuery({
    queryKey: ['weekly-reports-history', officeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('office_id', officeId!)
        .order('week_ending_date', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as WeeklyReport[];
    },
    enabled: !!officeId,
  });

  const { data: officeProfiles } = useQuery({
    queryKey: ['office-profiles', officeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('office_id', officeId!);
      if (error) throw error;
      return data;
    },
    enabled: !!officeId,
  });

  const nameForUser = (userId: string | null) => {
    if (!userId) return null;
    const p = officeProfiles?.find((p) => p.id === userId);
    return p?.full_name ?? p?.email ?? 'Unknown';
  };

  const thisWeeksReport = history?.find((r) => r.week_ending_date === currentWeek) ?? null;
  const pastReports = history?.filter((r) => r.week_ending_date !== currentWeek) ?? [];

  const { data: advisors } = useQuery({
    queryKey: ['office-safety-advisors', officeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_advisors')
        .select('id, full_name')
        .eq('office_id', officeId!);
      if (error) throw error;
      return data;
    },
    enabled: !!officeId,
  });

  const { data: breakdown } = useQuery({
    queryKey: ['report-breakdown', thisWeeksReport?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_report_sa_breakdown')
        .select('*')
        .eq('weekly_report_id', thisWeeksReport!.id);
      if (error) throw error;
      return data as SaBreakdown[];
    },
    enabled: !!thisWeeksReport,
  });

  const advisorName = (advisorId: string) =>
    advisors?.find((a) => a.id === advisorId)?.full_name ?? advisorId;

  if (!officeId) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Office Dashboard" />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {profile?.full_name ?? profile?.email}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your account isn&apos;t assigned to an office yet.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Office Dashboard" />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>This Week&apos;s Office Report</CardTitle>
            <CardDescription>Week ending {formatDateLong(currentWeek)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!thisWeeksReport && (
              <>
                <p className="text-sm text-muted-foreground">
                  No report submitted yet for this week.
                </p>
                <Button
                  render={<Link to="/dealer/report" />}
                  className="bg-te-red text-te-white hover:bg-te-red/90"
                >
                  Submit My Weekly Report
                </Button>
              </>
            )}
            {thisWeeksReport && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="Total Units" value={thisWeeksReport.total_units} />
                  <Stat
                    label="Net Protections"
                    value={thisWeeksReport.net_installed_protections}
                  />
                  <Stat label="Appointments Set" value={thisWeeksReport.appointments_set} />
                  <Stat label="Demos Ran" value={thisWeeksReport.demos_ran} />
                  <Stat
                    label="Office Appointments"
                    value={thisWeeksReport.office_appointments_set}
                  />
                  <Stat
                    label="Recruits in Training"
                    value={thisWeeksReport.recruits_in_training}
                  />
                  <Stat label="Qualified Recruits" value={thisWeeksReport.qualified_recruits} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Safety Advisor Breakdown
                  </p>
                  {!breakdown && <p className="text-sm">Loading...</p>}
                  {breakdown && breakdown.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No per-advisor numbers reported.
                    </p>
                  )}
                  {breakdown && breakdown.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Safety Advisor</TableHead>
                          <TableHead className="text-right">Appts Set</TableHead>
                          <TableHead className="text-right">Demos</TableHead>
                          <TableHead className="text-right">Total Units</TableHead>
                          <TableHead className="text-right">Net Protections</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {breakdown.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell>{advisorName(b.safety_advisor_id)}</TableCell>
                            <TableCell className="text-right">{b.appointments_set}</TableCell>
                            <TableCell className="text-right">{b.demos_ran}</TableCell>
                            <TableCell className="text-right">{b.total_units}</TableCell>
                            <TableCell className="text-right">
                              {b.net_installed_protections}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                {thisWeeksReport.notes && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Notes
                    </p>
                    <p className="text-sm">{thisWeeksReport.notes}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {thisWeeksReport.submitted_by && (
                    <p>Submitted by {nameForUser(thisWeeksReport.submitted_by)}</p>
                  )}
                  {thisWeeksReport.last_edited_by && thisWeeksReport.last_edited_at && (
                    <p>
                      Last edited by {nameForUser(thisWeeksReport.last_edited_by)} on{' '}
                      {new Date(thisWeeksReport.last_edited_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button render={<Link to="/dealer/report" />} variant="outline">
                  Edit This Week&apos;s Report
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Past Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && pastReports.length === 0 && (
              <p className="text-sm text-muted-foreground">No past reports yet.</p>
            )}
            {pastReports.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week Ending</TableHead>
                    <TableHead className="text-right">Total Units</TableHead>
                    <TableHead className="text-right">Net Protections</TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastReports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDateLong(r.week_ending_date)}</TableCell>
                      <TableCell className="text-right">{r.total_units}</TableCell>
                      <TableCell className="text-right">
                        {r.net_installed_protections}
                      </TableCell>
                      <TableCell className="text-right">{r.appointments_set}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/dealer/report?week=${r.week_ending_date}`}
                          className="text-te-navy underline"
                        >
                          Edit
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-te-navy">{value}</p>
    </div>
  );
}
