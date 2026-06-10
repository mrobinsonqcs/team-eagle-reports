import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { toDateString } from '@/lib/dates';

interface SafetyAdvisor {
  id: string;
  office_id: string;
  full_name: string;
  active: boolean;
  rookie_until: string | null;
}

function isRookie(rookieUntil: string | null): boolean {
  if (!rookieUntil) return false;
  return rookieUntil >= toDateString(new Date());
}

export default function SafetyAdvisors() {
  const { profile } = useAuth();
  const officeId = profile?.office_id ?? null;
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: advisors, isLoading } = useQuery({
    queryKey: ['safety-advisors', officeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_advisors')
        .select('*')
        .eq('office_id', officeId!)
        .order('full_name');
      if (error) throw error;
      return data as SafetyAdvisor[];
    },
    enabled: !!officeId,
  });

  const addAdvisor = useMutation({
    mutationFn: async (fullName: string) => {
      const { error } = await supabase
        .from('safety_advisors')
        .insert({ office_id: officeId!, full_name: fullName });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName('');
      queryClient.invalidateQueries({ queryKey: ['safety-advisors', officeId] });
      toast.success('Safety advisor added');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('safety_advisors')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-advisors', officeId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleRookie = useMutation({
    mutationFn: async ({ id, makeRookie }: { id: string; makeRookie: boolean }) => {
      let rookieUntil: string | null = null;
      if (makeRookie) {
        const { data, error: rpcError } = await supabase.rpc('current_rookie_season_end', {});
        if (rpcError) throw rpcError;
        rookieUntil = data as unknown as string;
      }
      const { error } = await supabase
        .from('safety_advisors')
        .update({ rookie_until: rookieUntil })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-advisors', officeId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const renameAdvisor = useMutation({
    mutationFn: async ({ id, fullName }: { id: string; fullName: string }) => {
      const { error } = await supabase
        .from('safety_advisors')
        .update({ full_name: fullName })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-advisors', officeId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!officeId) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Safety Advisors" />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-muted-foreground">
            Your account isn&apos;t assigned to an office, so there are no Safety Advisors to
            manage here.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Safety Advisors" />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Add a Safety Advisor</CardTitle>
            <CardDescription>
              Add anyone whose individual numbers you&apos;ll report each week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) addAdvisor.mutate(newName.trim());
              }}
            >
              <Input
                placeholder="Full name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button
                type="submit"
                className="bg-te-red text-te-white hover:bg-te-red/90 sm:w-auto"
                disabled={addAdvisor.isPending || !newName.trim()}
              >
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Safety Advisors</CardTitle>
            <CardDescription>
              Toggle Rookie for new hires (expires at the end of the current season) and
              deactivate anyone who has left.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && (!advisors || advisors.length === 0) && (
              <p className="text-muted-foreground">No safety advisors yet.</p>
            )}
            {advisors && advisors.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Rookie</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advisors.map((sa) => (
                    <TableRow key={sa.id}>
                      <TableCell>
                        <Input
                          defaultValue={sa.full_name}
                          className="h-8 max-w-[220px] border-transparent bg-transparent px-1 hover:border-input focus-visible:border-input"
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value && value !== sa.full_name) {
                              renameAdvisor.mutate({ id: sa.id, fullName: value });
                            }
                          }}
                        />
                        {isRookie(sa.rookie_until) && (
                          <Badge variant="secondary" className="ml-2 align-middle">
                            Rookie until {sa.rookie_until}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isRookie(sa.rookie_until)}
                          onCheckedChange={(checked) =>
                            toggleRookie.mutate({ id: sa.id, makeRookie: checked === true })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={sa.active}
                          onCheckedChange={(checked) =>
                            toggleActive.mutate({ id: sa.id, active: checked === true })
                          }
                        />
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
