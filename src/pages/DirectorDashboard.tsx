import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateLong } from '@/lib/dates';

interface Office {
  id: string;
  name: string;
}

interface WeeklyReport {
  id: string;
  office_id: string;
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

function toCsvValue(value: string | number | null): string {
  const str = value === null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function DirectorDashboard() {
  const { profile, roles } = useAuth();

  const [officeFilter, setOfficeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: offices } = useQuery({
    queryKey: ['offices-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('offices').select('id, name').order('name');
      if (error) throw error;
      return data as Office[];
    },
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ['director-reports', officeFilter, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('weekly_reports')
        .select('*')
        .order('week_ending_date', { ascending: false });

      if (officeFilter !== 'all') query = query.eq('office_id', officeFilter);
      if (startDate) query = query.gte('week_ending_date', startDate);
      if (endDate) query = query.lte('week_ending_date', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data as WeeklyReport[];
    },
  });

  const { data: allAdvisors } = useQuery({
    queryKey: ['all-safety-advisors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('safety_advisors').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: breakdown } = useQuery({
    queryKey: ['report-breakdown', expandedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_report_sa_breakdown')
        .select('*')
        .eq('weekly_report_id', expandedId!);
      if (error) throw error;
      return data as SaBreakdown[];
    },
    enabled: !!expandedId,
  });

  const officeName = (officeId: string) =>
    offices?.find((o) => o.id === officeId)?.name ?? officeId;

  const advisorName = (advisorId: string) =>
    allAdvisors?.find((a) => a.id === advisorId)?.full_name ?? advisorId;

  const filteredReports = useMemo(() => {
    if (!reports) return [];
    const term = search.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((r) => {
      const office = officeName(r.office_id).toLowerCase();
      const director = (r.marketing_director_name ?? '').toLowerCase();
      const notes = (r.notes ?? '').toLowerCase();
      return office.includes(term) || director.includes(term) || notes.includes(term);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, search, offices]);

  const exportCsv = () => {
    const headers = [
      'Office',
      'Week Ending',
      'Marketing Director',
      'Office Appointments',
      'Recruits in Training',
      'Qualified Recruits',
      'Appointments Set',
      'Demos Ran',
      'Total Units',
      'Net Installed Protections',
      'Notes',
    ];

    const rows = filteredReports.map((r) => [
      officeName(r.office_id),
      r.week_ending_date,
      r.marketing_director_name ?? '',
      r.office_appointments_set,
      r.recruits_in_training,
      r.qualified_recruits,
      r.appointments_set,
      r.demos_ran,
      r.total_units,
      r.net_installed_protections,
      r.notes ?? '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(toCsvValue).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Division Dashboard" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {profile?.full_name ?? profile?.email}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <p>Roles: {roles.join(', ')}</p>
            <Button render={<Link to="/director/dealers" />} variant="outline" size="sm">
              Manage Offices
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Office</Label>
                <Select
                  value={officeFilter}
                  onValueChange={(value) => setOfficeFilter(value ?? 'all')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Offices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {offices?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start-date">Week Ending From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date">Week Ending To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Office, director, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredReports.length} report{filteredReports.length === 1 ? '' : 's'}
              </p>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                Export CSV
              </Button>
            </div>

            {isLoading && <p className="text-muted-foreground">Loading...</p>}

            {!isLoading && filteredReports.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Office</TableHead>
                      <TableHead>Week Ending</TableHead>
                      <TableHead>Marketing Director</TableHead>
                      <TableHead className="text-right">Office Appts</TableHead>
                      <TableHead className="text-right">Recruits</TableHead>
                      <TableHead className="text-right">Qualified</TableHead>
                      <TableHead className="text-right">Appts Set</TableHead>
                      <TableHead className="text-right">Demos</TableHead>
                      <TableHead className="text-right">Total Units</TableHead>
                      <TableHead className="text-right">Net Protections</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((r) => (
                      <Fragment key={r.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        >
                          <TableCell>{officeName(r.office_id)}</TableCell>
                          <TableCell>{formatDateLong(r.week_ending_date)}</TableCell>
                          <TableCell>{r.marketing_director_name ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            {r.office_appointments_set}
                          </TableCell>
                          <TableCell className="text-right">{r.recruits_in_training}</TableCell>
                          <TableCell className="text-right">{r.qualified_recruits}</TableCell>
                          <TableCell className="text-right">{r.appointments_set}</TableCell>
                          <TableCell className="text-right">{r.demos_ran}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {r.total_units}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {r.net_installed_protections}
                          </TableCell>
                        </TableRow>
                        {expandedId === r.id && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-muted/30">
                              <div className="space-y-3 p-2">
                                {r.notes && (
                                  <div>
                                    <p className="text-xs font-medium uppercase text-muted-foreground">
                                      Notes
                                    </p>
                                    <p className="text-sm">{r.notes}</p>
                                  </div>
                                )}
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
                                          <TableHead className="text-right">
                                            Appts Set
                                          </TableHead>
                                          <TableHead className="text-right">Demos</TableHead>
                                          <TableHead className="text-right">
                                            Total Units
                                          </TableHead>
                                          <TableHead className="text-right">
                                            Net Protections
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {breakdown.map((b) => (
                                          <TableRow key={b.id}>
                                            <TableCell>
                                              {advisorName(b.safety_advisor_id)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {b.appointments_set}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {b.demos_ran}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {b.total_units}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {b.net_installed_protections}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!isLoading && filteredReports.length === 0 && (
              <p className="text-sm text-muted-foreground">No reports match these filters.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
