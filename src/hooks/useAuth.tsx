import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/integrations/supabase/types';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  office_id: string | null;
  marketing_director_name: string | null;
  active: boolean;
  must_change_password: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isFullAccess: boolean;
  isDealer: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Tracks the currently-applied user id so we can ignore
  // TOKEN_REFRESHED events that don't actually change identity.
  const appliedUserId = useRef<string | null>(null);

  const loadProfileAndRoles = async (userId: string) => {
    const [
      { data: profileData, error: profileError },
      { data: roleRows, error: rolesError },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    if (profileError) {
      console.error('Failed to load profile:', profileError);
      toast.error(`Failed to load profile: ${profileError.message}`);
    }

    if (rolesError) {
      console.error('Failed to load roles:', rolesError);
      toast.error(`Failed to load roles: ${rolesError.message}`);
    }

    setProfile(profileData ?? null);
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
  };

  const applySession = async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    appliedUserId.current = newSession?.user?.id ?? null;

    if (newSession?.user) {
      await loadProfileAndRoles(newSession.user.id);
    } else {
      setProfile(null);
      setRoles([]);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      applySession(initialSession).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Token refreshes fire on tab focus. If the signed-in user hasn't
      // changed, skip re-applying the session to avoid re-render cascades
      // that wipe in-progress form state.
      if (event === 'TOKEN_REFRESHED' && newSession?.user?.id === appliedUserId.current) {
        setSession(newSession);
        return;
      }

      applySession(newSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfileAndRoles(user.id);
    }
  };

  const isFullAccess = roles.includes('division') || roles.includes('admin');
  const isDealer = roles.includes('dealer');

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        loading,
        isFullAccess,
        isDealer,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
