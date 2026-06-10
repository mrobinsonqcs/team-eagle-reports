import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getWeekEndingDate, formatDateLong } from '@/lib/dates';

const saRowSchema = z.object({
  safety_advisor_id: z.string(),
  full_name: z.string(),
  appointments_set: z.number().int().min(0),
  demos_ran: z.number().int().min(0),
  total_units: z.number().int().min(0),
  net_installed_protections: z.number().int().min(0),
});

const formSchema = z.object({
  marketing_director_name: z.string(),
  office_appointments_set: z.number().int().min(0),
  recruits_in_training: z.number().int().min(0),
  qualified_recruits: z.number().int().min(0),
  notes: z.string(),
  sa_breakdown: z.array(saRowSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface SafetyAdvisor {
  id: string;
  office_id: string;
  full_name: string;
  active: boolean;
  rookie_until: string | null;
}

function buildDefaultValues(
  report: {
    marketing_director_name: string | null;
    office_appointments_set: number;
    recruits_in_training: number;
    qualified_recruits: number;
    notes: string | null;
  } | null,
  advisors: SafetyAdvisor[],
  breakdown: Map<string, { appointments_set: number; demos_ran: number; total_units: number; net_installed_protections: number }>,
  fallbackMarketingDirectorName: string | null,
): FormValues {
  return {
    marketing_director_name:
      report?.marketing_director_name ?? fallbackMarketingDirectorName ?? '',
    office_appointments_set: report?.office_appointments_set ?? 0,
    recruits_in_training: report?.recruits_in_training ?? 0,
    qualified_recruits: report?.qualified_recruits ?? 0,
    notes: report?.notes ?? '',
    sa_breakdown: advisors
      .filter((sa) => sa.active || breakdown.has(sa.id))
      .map((sa) => {
        const b = breakdown.get(sa.id);
        return {
          safety_advisor_id: sa.id,
          full_name: sa.full_name,
          appointments_set: b?.appointments_set ?? 0,
          demos_ran: b?.demos_ran ?? 0,
          total_units: b?.total_units ?? 0,
          net_installed_protections: b?.net_installed_protections ?? 0,
        };
      }),
  };
}

function mergeDraft(defaults: FormValues, draft: Partial<FormValues>): FormValues {
  const merged: FormValues = { ...defaults, ...draft };
  if (Array.isArray(draft.sa_breakdown)) {
    merged.sa_breakdown = defaults.sa_breakdown.map((row) => {
      const draftRow = draft.sa_breakdown?.find(
        (r) => r.safety_advisor_id === row.safety_advisor_id,
      );
      return draftRow ? { ...row, ...draftRow } : row;
    });
  }
  return merged;
}

export default function ReportForm() {
  const { profile } = useAuth();
  const officeId = profile?.office_id ?? null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);

  const weekParam = searchParams.get('week');
  const weekEndingDate = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
    ? weekParam
    : getWeekEndingDate();

  const draftKeyBase = `report-draft-${officeId ?? 'none'}-${weekEndingDate}`;

  const { data, isLoading } = useQuery({
    queryKey: ['report-form', officeId, weekEndingDate],
    queryFn: async () => {
      const [advisorsRes, reportRes] = await Promise.all([
        supabase
          .from('safety_advisors')
          .select('*')
          .eq('office_id', officeId!)
          .order('full_name'),
        supabase
          .from('weekly_reports')
          .select('*')
          .eq('office_id', officeId!)
          .eq('week_ending_date', weekEndingDate)
          .maybeSingle(),
      ]);

      if (advisorsRes.error) throw advisorsRes.error;
      if (reportRes.error) throw reportRes.error;

      let breakdownRows: {
        safety_advisor_id: string;
        appointments_set: number;
        demos_ran: number;
        total_units: number;
        net_installed_protections: number;
      }[] = [];

      if (reportRes.data) {
        const { data: breakdown, error: breakdownError } = await supabase
          .from('weekly_report_sa_breakdown')
          .select('*')
          .eq('weekly_report_id', reportRes.data.id);
        if (breakdownError) throw breakdownError;
        breakdownRows = breakdown ?? [];
      }

      return {
        advisors: (advisorsRes.data ?? []) as SafetyAdvisor[],
        report: reportRes.data,
        breakdownRows,
      };
    },
    enabled: !!officeId,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marketing_director_name: '',
      office_appointments_set: 0,
      recruits_in_training: 0,
      qualified_recruits: 0,
      notes: '',
      sa_breakdown: [],
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: 'sa_breakdown' });

  const reportId = data?.report?.id ?? null;
  const draftKey = reportId ? `report-draft-edit-${reportId}` : draftKeyBase;

  // Restore on mount AFTER the initial DB load completes.
  useEffect(() => {
    if (!data) return;

    const breakdownMap = new Map(
      data.breakdownRows.map((row) => [row.safety_advisor_id, row]),
    );
    const defaults = buildDefaultValues(
      data.report,
      data.advisors,
      breakdownMap,
      profile?.marketing_director_name ?? null,
    );

    const draftRaw = localStorage.getItem(draftKey);
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as Partial<FormValues>;
        form.reset(mergeDraft(defaults, draft));
        toast.info('Restored your unsaved draft for this report.');
      } catch {
        form.reset(defaults);
      }
    } else {
      form.reset(defaults);
    }

    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, draftKey]);

  // Persist on every change.
  useEffect(() => {
    if (!ready) return;
    const subscription = form.watch((values) => {
      localStorage.setItem(draftKey, JSON.stringify(values));
    });
    return () => subscription.unsubscribe();
  }, [ready, draftKey, form]);

  // Flush on visibilitychange (browsers may discard idle tabs under memory pressure).
  useEffect(() => {
    if (!ready) return;
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem(draftKey, JSON.stringify(form.getValues()));
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [ready, draftKey, form]);

  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const isNew = !data?.report;

      const { data: savedReport, error: reportError } = await supabase
        .from('weekly_reports')
        .upsert(
          {
            office_id: officeId!,
            week_ending_date: weekEndingDate,
            marketing_director_name: values.marketing_director_name || null,
            office_appointments_set: values.office_appointments_set,
            recruits_in_training: values.recruits_in_training,
            qualified_recruits: values.qualified_recruits,
            notes: values.notes || null,
          },
          { onConflict: 'office_id,week_ending_date' },
        )
        .select()
        .single();
      if (reportError) throw reportError;

      if (values.sa_breakdown.length > 0) {
        const breakdownRows = values.sa_breakdown.map((sa) => ({
          weekly_report_id: savedReport.id,
          safety_advisor_id: sa.safety_advisor_id,
          appointments_set: sa.appointments_set,
          demos_ran: sa.demos_ran,
          total_units: sa.total_units,
          net_installed_protections: sa.net_installed_protections,
        }));

        const { error: breakdownError } = await supabase
          .from('weekly_report_sa_breakdown')
          .upsert(breakdownRows, { onConflict: 'weekly_report_id,safety_advisor_id' });
        if (breakdownError) throw breakdownError;
      }

      return { reportId: savedReport.id as string, isNew };
    },
    onSuccess: ({ reportId: savedId, isNew }) => {
      localStorage.removeItem(draftKey);
      queryClient.invalidateQueries({ queryKey: ['report-form'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-reports-history'] });
      queryClient.invalidateQueries({ queryKey: ['this-weeks-report'] });
      toast.success(isNew ? 'Report submitted!' : 'Report updated!');

      if (isNew) {
        supabase.functions
          .invoke('notify-director', { body: { weekly_report_id: savedId } })
          .catch((err) => console.error('notify-director failed', err));
      }

      navigate('/dealer');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!officeId) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Submit Weekly Report" />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-muted-foreground">
            Your account isn&apos;t assigned to an office, so there&apos;s no report to submit.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Submit Weekly Report" />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-24">
        <div>
          <Link to="/dealer" className="text-sm text-te-navy underline">
            &larr; Back to dashboard
          </Link>
          <h2 className="mt-2 text-xl font-semibold text-te-navy">
            Week ending {formatDateLong(weekEndingDate)}
          </h2>
          {data?.report && (
            <p className="text-sm text-muted-foreground">
              You&apos;re editing an existing report. Saving will update it.
            </p>
          )}
        </div>

        {(isLoading || !ready) && <p className="text-muted-foreground">Loading...</p>}

        {ready && (
          <form
            className="space-y-6"
            onSubmit={form.handleSubmit((values) => submitMutation.mutate(values))}
          >
            <Card>
              <CardHeader>
                <CardTitle>Office Totals</CardTitle>
                <CardDescription>
                  These numbers are for your office overall, not tied to a specific Safety
                  Advisor.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="marketing_director_name">Marketing Director Name</Label>
                  <Input
                    id="marketing_director_name"
                    {...form.register('marketing_director_name')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="office_appointments_set">Office Appointments Set</Label>
                  <Input
                    id="office_appointments_set"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    {...form.register('office_appointments_set', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recruits_in_training">Recruits in Training</Label>
                  <Input
                    id="recruits_in_training"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    {...form.register('recruits_in_training', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qualified_recruits">Qualified Recruits</Label>
                  <Input
                    id="qualified_recruits"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    {...form.register('qualified_recruits', { valueAsNumber: true })}
                  />
                </div>
              </CardContent>
            </Card>

            {fields.length === 0 && (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  You don&apos;t have any Safety Advisors yet.{' '}
                  <Link to="/safety-advisors" className="text-te-navy underline">
                    Add one
                  </Link>{' '}
                  to report individual numbers.
                </CardContent>
              </Card>
            )}

            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardHeader>
                  <CardTitle className="text-base">{field.full_name}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`sa_breakdown.${index}.appointments_set`}>
                      Appointments Set
                    </Label>
                    <Input
                      id={`sa_breakdown.${index}.appointments_set`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      {...form.register(`sa_breakdown.${index}.appointments_set`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`sa_breakdown.${index}.demos_ran`}>Demos Ran</Label>
                    <Input
                      id={`sa_breakdown.${index}.demos_ran`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      {...form.register(`sa_breakdown.${index}.demos_ran`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`sa_breakdown.${index}.total_units`}>Total Units</Label>
                    <Input
                      id={`sa_breakdown.${index}.total_units`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      {...form.register(`sa_breakdown.${index}.total_units`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`sa_breakdown.${index}.net_installed_protections`}>
                      Net Installed Protections
                    </Label>
                    <Input
                      id={`sa_breakdown.${index}.net_installed_protections`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      {...form.register(`sa_breakdown.${index}.net_installed_protections`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>
                  Anything you want the division office to know about this week.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea rows={4} {...form.register('notes')} />
              </CardContent>
            </Card>

            <div className="sticky bottom-0 -mx-4 border-t bg-background px-4 py-3">
              <Button
                type="submit"
                size="lg"
                className="w-full bg-te-red text-te-white hover:bg-te-red/90"
                disabled={submitMutation.isPending}
              >
                {data?.report ? 'Save Changes' : 'Submit My Weekly Report'}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
