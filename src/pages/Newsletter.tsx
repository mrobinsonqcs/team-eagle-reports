import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/edgeFunctions';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateLong, mostRecentSunday } from '@/lib/dates';
import {
  NEWSLETTER_STATUS_BADGE_VARIANT,
  NEWSLETTER_STATUS_LABELS,
  type NewsletterDraftData,
} from '@/lib/newsletter';
import type { Database } from '@/integrations/supabase/types';

type NewsletterRow = Database['public']['Tables']['weekly_newsletters']['Row'];

export default function Newsletter() {
  const queryClient = useQueryClient();
  const currentWeek = mostRecentSunday();

  const { data: newsletters, isLoading } = useQuery({
    queryKey: ['weekly-newsletters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_newsletters')
        .select('*')
        .order('week_ending_date', { ascending: false });
      if (error) throw error;
      return data as NewsletterRow[];
    },
  });

  const generateMutation = useMutation({
    mutationFn: (weekEndingDate: string) =>
      invokeFunction('generate-newsletter-draft', { week_ending_date: weekEndingDate }),
    onSuccess: () => {
      toast.success('Draft generated');
      queryClient.invalidateQueries({ queryKey: ['weekly-newsletters'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const hasCurrentWeek = newsletters?.some((n) => n.week_ending_date === currentWeek);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Newsletter" />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Weekly Newsletters</CardTitle>
            {!hasCurrentWeek && (
              <Button
                className="bg-te-red text-te-white hover:bg-te-red/90"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate(currentWeek)}
              >
                Generate Draft for {formatDateLong(currentWeek)}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && (!newsletters || newsletters.length === 0) && (
              <p className="text-sm text-muted-foreground">No newsletters yet.</p>
            )}
            {!isLoading && newsletters && newsletters.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week Ending</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Units</TableHead>
                      <TableHead className="text-right">Offices Submitted</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newsletters.map((n) => {
                      const draft = n.draft_data as unknown as NewsletterDraftData | null;
                      return (
                        <TableRow key={n.id}>
                          <TableCell>{formatDateLong(n.week_ending_date)}</TableCell>
                          <TableCell>
                            <Badge variant={NEWSLETTER_STATUS_BADGE_VARIANT[n.status]}>
                              {NEWSLETTER_STATUS_LABELS[n.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {draft?.divisionTotals.totalUnits ?? '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {draft ? `${draft.officesSubmitted} / ${draft.officesTotal}` : '—'}
                          </TableCell>
                          <TableCell className="space-x-2 whitespace-nowrap text-right">
                            <Button
                              render={<Link to={`/newsletter/${n.week_ending_date}/edit`} />}
                              variant="outline"
                              size="sm"
                            >
                              Edit
                            </Button>
                            {n.status === 'sent' && (
                              <Button
                                render={
                                  <Link
                                    to={`/newsletter/${n.week_ending_date}/view`}
                                    target="_blank"
                                  />
                                }
                                variant="outline"
                                size="sm"
                              >
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
