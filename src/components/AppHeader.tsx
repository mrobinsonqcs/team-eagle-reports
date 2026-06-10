import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export function AppHeader({ title }: { title: string }) {
  const { profile, roles, signOut } = useAuth();

  return (
    <header className="bg-te-navy text-te-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-te-white/60">Team Eagle</p>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <p className="font-medium">{profile?.full_name ?? profile?.email}</p>
            <p className="text-xs text-te-white/60">{roles.join(', ') || 'no role'}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-te-white/30 bg-transparent text-te-white hover:bg-te-white/10"
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
