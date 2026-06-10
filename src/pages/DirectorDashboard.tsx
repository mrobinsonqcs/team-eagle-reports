import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DirectorDashboard() {
  const { profile, roles } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Division Dashboard" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {profile?.full_name ?? profile?.email}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Email: {profile?.email}</p>
            <p>Roles: {roles.join(', ')}</p>
            <p className="pt-4 text-te-navy">
              Office reports and the staff dashboard are coming in Phase 2.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
