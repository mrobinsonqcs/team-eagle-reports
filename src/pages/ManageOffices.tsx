import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/edgeFunctions';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import type { AppRole } from '@/integrations/supabase/types';

interface Office {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  office_id: string | null;
  marketing_director_name: string | null;
  active: boolean;
}

export default function ManageOffices() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<{ name: string; password: string } | null>(
    null,
  );

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: offices } = useQuery({
    queryKey: ['offices-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('offices').select('id, name').order('name');
      if (error) throw error;
      return data as Office[];
    },
  });

  const { data: roleRows } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      return data as { user_id: string; role: AppRole }[];
    },
  });

  const { data: lastSignIns } = useQuery({
    queryKey: ['last-sign-ins', profiles?.map((p) => p.id)],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_last_sign_ins', {
        _user_ids: profiles!.map((p) => p.id),
      });
      if (error) throw error;
      return data as { id: string; last_sign_in_at: string | null }[];
    },
    enabled: !!profiles && profiles.length > 0,
  });

  const officeName = (officeId: string | null) =>
    offices?.find((o) => o.id === officeId)?.name ?? '—';

  const rolesForUser = (userId: string) =>
    roleRows?.filter((r) => r.user_id === userId).map((r) => r.role) ?? [];

  const lastSignInForUser = (userId: string) =>
    lastSignIns?.find((r) => r.id === userId)?.last_sign_in_at ?? null;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['offices-all'] });
    queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
    queryClient.invalidateQueries({ queryKey: ['last-sign-ins'] });
  };

  const inviteMutation = useMutation({
    mutationFn: (input: {
      email: string;
      full_name: string;
      office_name: string;
      marketing_director_name?: string;
    }) => invokeFunction('invite-dealer', input),
    onSuccess: () => {
      toast.success('Invitation sent');
      setInviteOpen(false);
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const editMutation = useMutation({
    mutationFn: (input: {
      user_id: string;
      full_name?: string;
      marketing_director_name?: string;
      office_id?: string;
    }) => invokeFunction('manage-dealer', { action: 'edit', ...input }),
    onSuccess: () => {
      toast.success('Profile updated');
      setEditUser(null);
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setPasswordMutation = useMutation({
    mutationFn: (userId: string) =>
      invokeFunction<{ password: string }>('manage-dealer', {
        action: 'set_password',
        user_id: userId,
      }),
    onSuccess: (data, userId) => {
      const profile = profiles?.find((p) => p.id === userId);
      setGeneratedPassword({
        name: profile?.full_name ?? profile?.email ?? 'User',
        password: data.password,
      });
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendResetLinkMutation = useMutation({
    mutationFn: (userId: string) =>
      invokeFunction('manage-dealer', { action: 'send_reset_link', user_id: userId }),
    onSuccess: () => toast.success('Reset link sent'),
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      invokeFunction('manage-dealer', {
        action: active ? 'reactivate' : 'deactivate',
        user_id: userId,
      }),
    onSuccess: () => {
      toast.success('Updated');
      invalidateAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Manage Offices" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Users &amp; Offices</CardTitle>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger render={<Button className="bg-te-red text-te-white hover:bg-te-red/90" />}>
                Invite User
              </DialogTrigger>
              <InviteDialogContent
                offices={offices ?? []}
                onSubmit={(values) => inviteMutation.mutate(values)}
                isPending={inviteMutation.isPending}
              />
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {!isLoading && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.full_name ?? '—'}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>{officeName(p.office_id)}</TableCell>
                        <TableCell>
                          {rolesForUser(p.id).map((role) => (
                            <Badge key={role} variant="secondary" className="mr-1">
                              {role}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.active ? 'default' : 'destructive'}>
                            {p.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lastSignInForUser(p.id)
                            ? new Date(lastSignInForUser(p.id)!).toLocaleString()
                            : 'Never'}
                        </TableCell>
                        <TableCell className="space-x-2 whitespace-nowrap text-right">
                          <Button variant="outline" size="sm" onClick={() => setEditUser(p)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={setPasswordMutation.isPending}
                            onClick={() => setPasswordMutation.mutate(p.id)}
                          >
                            Set Password
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={sendResetLinkMutation.isPending}
                            onClick={() => sendResetLinkMutation.mutate(p.id)}
                          >
                            Send Reset Link
                          </Button>
                          <Button
                            variant={p.active ? 'destructive' : 'outline'}
                            size="sm"
                            disabled={toggleActiveMutation.isPending}
                            onClick={() =>
                              toggleActiveMutation.mutate({ userId: p.id, active: !p.active })
                            }
                          >
                            {p.active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        {editUser && (
          <EditDialogContent
            user={editUser}
            offices={offices ?? []}
            onSubmit={(values) => editMutation.mutate({ user_id: editUser.id, ...values })}
            isPending={editMutation.isPending}
          />
        )}
      </Dialog>

      <Dialog open={!!generatedPassword} onOpenChange={(open) => !open && setGeneratedPassword(null)}>
        {generatedPassword && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Password for {generatedPassword.name}</DialogTitle>
              <DialogDescription>
                Communicate this password verbally. They&apos;ll be required to set their own on
                next login.
              </DialogDescription>
            </DialogHeader>
            <p className="rounded-md bg-muted px-4 py-3 text-center font-mono text-lg">
              {generatedPassword.password}
            </p>
            <DialogFooter showCloseButton />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function InviteDialogContent({
  offices,
  onSubmit,
  isPending,
}: {
  offices: Office[];
  onSubmit: (values: {
    email: string;
    full_name: string;
    office_name: string;
    marketing_director_name?: string;
  }) => void;
  isPending: boolean;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [marketingDirectorName, setMarketingDirectorName] = useState('');

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Invite User</DialogTitle>
        <DialogDescription>
          Sends an invite email. Type an existing office name to add this user to it, or a new
          name to create that office.
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            email,
            full_name: fullName,
            office_name: officeName,
            marketing_director_name: marketingDirectorName || undefined,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-name">Full Name</Label>
          <Input
            id="invite-name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-office">Office Name</Label>
          <Input
            id="invite-office"
            required
            list="existing-offices"
            value={officeName}
            onChange={(e) => setOfficeName(e.target.value)}
          />
          <datalist id="existing-offices">
            {offices.map((o) => (
              <option key={o.id} value={o.name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-md">Marketing Director Name (optional)</Label>
          <Input
            id="invite-md"
            value={marketingDirectorName}
            onChange={(e) => setMarketingDirectorName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="submit" className="bg-te-red text-te-white hover:bg-te-red/90" disabled={isPending}>
            Send Invite
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditDialogContent({
  user,
  offices,
  onSubmit,
  isPending,
}: {
  user: Profile;
  offices: Office[];
  onSubmit: (values: {
    full_name?: string;
    marketing_director_name?: string;
    office_id?: string;
  }) => void;
  isPending: boolean;
}) {
  const [fullName, setFullName] = useState(user.full_name ?? '');
  const [marketingDirectorName, setMarketingDirectorName] = useState(
    user.marketing_director_name ?? '',
  );
  const [officeId, setOfficeId] = useState(user.office_id ?? '');

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit {user.full_name ?? user.email}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            full_name: fullName,
            marketing_director_name: marketingDirectorName,
            office_id: officeId || undefined,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">Full Name</Label>
          <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-md">Marketing Director Name</Label>
          <Input
            id="edit-md"
            value={marketingDirectorName}
            onChange={(e) => setMarketingDirectorName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Office</Label>
          <Select value={officeId} onValueChange={(value) => setOfficeId(value ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an office" />
            </SelectTrigger>
            <SelectContent>
              {offices.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" className="bg-te-red text-te-white hover:bg-te-red/90" disabled={isPending}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
