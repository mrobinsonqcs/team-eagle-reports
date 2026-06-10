import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/edgeFunctions';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateLong } from '@/lib/dates';
import {
  NEWSLETTER_STATUS_BADGE_VARIANT,
  NEWSLETTER_STATUS_LABELS,
  type LeaderboardEntry,
  type NewsletterDraftData,
} from '@/lib/newsletter';
import type { Database } from '@/integrations/supabase/types';

type NewsletterRow = Database['public']['Tables']['weekly_newsletters']['Row'];

export default function NewsletterEditor() {
  const { weekEndingDate } = useParams<{ weekEndingDate: string }>();
  const queryClient = useQueryClient();

  const { data: newsletter, isLoading } = useQuery({
    queryKey: ['weekly-newsletter', weekEndingDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_newsletters')
        .select('*')
        .eq('week_ending_date', weekEndingDate!)
        .maybeSingle();
      if (error) throw error;
      return data as NewsletterRow | null;
    },
    enabled: !!weekEndingDate,
  });

  const [emailBody, setEmailBody] = useState('');
  const [personName, setPersonName] = useState('');
  const [personBlurb, setPersonBlurb] = useState('');
  const [rookieName, setRookieName] = useState('');
  const [rookieBlurb, setRookieBlurb] = useState('');
  const [bbName, setBbName] = useState('');
  const [bbBlurb, setBbBlurb] = useState('');

  // Sync local form state from the loaded newsletter row. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass.
  const [loadedNewsletterId, setLoadedNewsletterId] = useState<string | null>(null);
  if (newsletter && newsletter.id !== loadedNewsletterId) {
    setLoadedNewsletterId(newsletter.id);
    setEmailBody(newsletter.email_body ?? '');
    setPersonName(newsletter.person_of_the_week_name ?? '');
    setPersonBlurb(newsletter.person_of_the_week_blurb ?? '');
    setRookieName(newsletter.rookie_of_the_week_name ?? '');
    setRookieBlurb(newsletter.rookie_of_the_week_blurb ?? '');
    setBbName(newsletter.business_builder_name ?? '');
    setBbBlurb(newsletter.business_builder_blurb ?? '');
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['weekly-newsletter', weekEndingDate] });
    queryClient.invalidateQueries({ queryKey: ['weekly-newsletters'] });
  };

  const generateMutation = useMutation({
    mutationFn: (force: boolean) =>
      invokeFunction('generate-newsletter-draft', {
        week_ending_date: weekEndingDate,
        force,
      }),
    onSuccess: () => {
      toast.success('Draft data refreshed');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      invokeFunction('complete-newsletter', {
        week_ending_date: weekEndingDate,
        email_body: emailBody || null,
        person_of_the_week_name: personName || null,
        person_of_the_week_blurb: personBlurb || null,
        rookie_of_the_week_name: rookieName || null,
        rookie_of_the_week_blurb: rookieBlurb || null,
        business_builder_name: bbName || null,
        business_builder_blurb: bbBlurb || null,
      }),
    onSuccess: () => {
      toast.success('Saved and marked ready');
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendTestMutation = useMutation({
    mutationFn: () =>
      invokeFunction<{ sentTo: string }>('send-newsletter-test', {
        week_ending_date: weekEndingDate,
      }),
    onSuccess: (data) => toast.success(`Test email sent to ${data.sentTo}`),
    onError: (error: Error) => toast.error(error.message),
  });

  const sendNowMutation = useMutation({
    mutationFn: () =>
      invokeFunction<{ recipientCount: number; alreadySent: boolean }>('send-newsletter-now', {
        week_ending_date: weekEndingDate,
      }),
    onSuccess: (data) => {
      if (data.alreadySent) {
        toast.info('Newsletter was already sent');
      } else {
        toast.success(
          `Sent to ${data.recipientCount} recipient${data.recipientCount === 1 ? '' : 's'}`,
        );
      }
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!weekEndingDate) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Newsletter" />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Newsletter" />
        <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Week Ending {formatDateLong(weekEndingDate)}</CardTitle>
              <CardDescription>
                No newsletter has been generated for this week yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="bg-te-red text-te-white hover:bg-te-red/90"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate(false)}
              >
                Generate Draft
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const draft = newsletter.draft_data as unknown as NewsletterDraftData | null;
  const isSent = newsletter.status === 'sent';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Newsletter" />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <CardTitle>Week Ending {formatDateLong(newsletter.week_ending_date)}</CardTitle>
              <Badge variant={NEWSLETTER_STATUS_BADGE_VARIANT[newsletter.status]}>
                {NEWSLETTER_STATUS_LABELS[newsletter.status]}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                render={<Link to={`/newsletter/${newsletter.week_ending_date}/view`} target="_blank" />}
                variant="outline"
                size="sm"
              >
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate(true)}
              >
                Refresh Data
              </Button>
            </div>
          </CardHeader>
        </Card>

        {draft && <NewsletterStatsCard draft={draft} />}

        <Card>
          <CardHeader>
            <CardTitle>Newsletter Content</CardTitle>
            <CardDescription>
              Shown in the newsletter email and on the public view page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="email-body">A Note From The Top</Label>
              <Textarea
                id="email-body"
                rows={4}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                disabled={isSent}
              />
            </div>

            <Separator />

            <ShoutoutFields
              prefix="person"
              title="Person of the Week"
              name={personName}
              setName={setPersonName}
              blurb={personBlurb}
              setBlurb={setPersonBlurb}
              disabled={isSent}
            />

            <Separator />

            <ShoutoutFields
              prefix="rookie"
              title="Rookie of the Week"
              name={rookieName}
              setName={setRookieName}
              blurb={rookieBlurb}
              setBlurb={setRookieBlurb}
              disabled={isSent}
            />

            <Separator />

            <ShoutoutFields
              prefix="bb"
              title="Business Builder of the Week"
              name={bbName}
              setName={setBbName}
              blurb={bbBlurb}
              setBlurb={setBbBlurb}
              disabled={isSent}
            />
          </CardContent>
        </Card>

        {!isSent && (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                className="bg-te-red text-te-white hover:bg-te-red/90"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate()}
              >
                Save &amp; Mark Ready
              </Button>
              <Button
                variant="outline"
                disabled={sendTestMutation.isPending}
                onClick={() => sendTestMutation.mutate()}
              >
                Send Test Email to Me
              </Button>
              <Button
                variant="destructive"
                disabled={sendNowMutation.isPending}
                onClick={() => {
                  if (confirm('Send this newsletter to all recipients now? This cannot be undone.')) {
                    sendNowMutation.mutate();
                  }
                }}
              >
                Send Now
              </Button>
            </CardContent>
          </Card>
        )}

        {isSent && (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                This newsletter was sent
                {newsletter.sent_at ? ` on ${new Date(newsletter.sent_at).toLocaleString()}` : ''}.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function ShoutoutFields({
  prefix,
  title,
  name,
  setName,
  blurb,
  setBlurb,
  disabled,
}: {
  prefix: string;
  title: string;
  name: string;
  setName: (value: string) => void;
  blurb: string;
  setBlurb: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-name`}>Name</Label>
          <Input
            id={`${prefix}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-blurb`}>Blurb</Label>
          <Textarea
            id={`${prefix}-blurb`}
            rows={2}
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="font-serif text-2xl font-bold text-te-navy">{value}</p>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

function LeaderboardList({
  title,
  entries,
  valueLabels,
}: {
  title: string;
  entries: LeaderboardEntry[];
  valueLabels: string[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      {entries.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
      {entries.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Name</TableHead>
              {valueLabels.map((label) => (
                <TableHead key={label} className="text-right">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, i) => (
              <TableRow key={`${entry.name}-${i}`}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  {entry.name}
                  {entry.subtitle && (
                    <span className="ml-1 text-xs text-muted-foreground">({entry.subtitle})</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{entry.primaryValue}</TableCell>
                {valueLabels.length > 1 && (
                  <TableCell className="text-right">{entry.secondaryValue ?? '—'}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function NewsletterStatsCard({ draft }: { draft: NewsletterDraftData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Division Snapshot</CardTitle>
        <CardDescription>
          {draft.officesSubmitted} of {draft.officesTotal} offices submitted
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatBox label="Total Units" value={draft.divisionTotals.totalUnits} />
          <StatBox label="Net Protections" value={draft.divisionTotals.netInstalledProtections} />
          <StatBox label="Appts Set" value={draft.divisionTotals.appointmentsSet} />
          <StatBox label="Demos Ran" value={draft.divisionTotals.demosRan} />
          <StatBox label="In Training" value={draft.divisionTotals.recruitsInTraining} />
          <StatBox label="Qualified" value={draft.divisionTotals.qualifiedRecruits} />
        </div>
        <LeaderboardList
          title="Top 5 Team Sales"
          entries={draft.topTeamSales}
          valueLabels={['Units', 'Net Prot.']}
        />
        <LeaderboardList
          title="Top 10 Personal Sales"
          entries={draft.topPersonalSales}
          valueLabels={['Units', 'Net Prot.']}
        />
        <LeaderboardList
          title="Top 5 Marketing"
          entries={draft.topMarketing}
          valueLabels={['Office Appts']}
        />
        {draft.topRookieSales.length > 0 && (
          <LeaderboardList
            title="Top 5 Rookie Sales"
            entries={draft.topRookieSales}
            valueLabels={['Units', 'Net Prot.']}
          />
        )}
      </CardContent>
    </Card>
  );
}
