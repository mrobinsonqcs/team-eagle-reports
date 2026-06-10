import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireFullAccess?: boolean;
}

export function ProtectedRoute({ children, requireFullAccess }: ProtectedRouteProps) {
  const { session, profile, isFullAccess, loading } = useAuth();

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

  if (requireFullAccess && !isFullAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
