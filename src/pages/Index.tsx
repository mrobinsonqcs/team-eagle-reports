import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { session, profile, roles, isFullAccess, isDealer, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.must_change_password) {
    return <Navigate to="/set-password" replace />;
  }

  if (isFullAccess) {
    return <Navigate to="/director" replace />;
  }

  if (isDealer) {
    return <Navigate to="/dealer" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-te-navy">No role assigned</h1>
        <p className="mt-2 text-muted-foreground">
          Your account ({profile?.email}) doesn&apos;t have a role yet ({roles.length} roles
          found). Contact your division administrator.
        </p>
      </div>
    </div>
  );
}
