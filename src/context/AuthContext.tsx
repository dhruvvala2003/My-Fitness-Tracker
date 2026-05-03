import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export const ADMIN_EMAIL = 'dkvala2003@gmail.com';

export async function checkUserApproval(
  userId: string,
  email: string,
): Promise<{ allowed: boolean; message?: string }> {
  if (email === ADMIN_EMAIL) return { allowed: true };

  const { data } = await supabase
    .from('user_approvals')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return {
    allowed: false,
    message: 'Your account is pending admin approval. Please wait — you will be able to sign in once the admin approves your request.',
  };
  if (data.status === 'approved') return { allowed: true };
  if (data.status === 'pending') {
    return {
      allowed: false,
      message: 'Your account is pending admin approval. Please wait — you will be able to sign in once the admin approves your request.',
    };
  }
  return {
    allowed: false,
    message: 'Your account has been deactivated. Please contact the admin.',
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  recoveryMode: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [session, setSession]         = useState<Session | null>(null);
  const [loading, setLoading]         = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [authError, setAuthError]     = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          // Password reset link clicked — bypass approval gate, enter recovery UI
          if (_event === 'PASSWORD_RECOVERY') {
            setRecoveryMode(true);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            return;
          }

          // USER_UPDATED fires when updateUser() is called (e.g. password change).
          // TOKEN_REFRESHED fires on silent token renewal.
          // Both events mean the user was already approved at sign-in — running the
          // approval gate here would call signOut() mid-operation and cause the
          // updateUser() promise to hang forever, freezing the UI on "Updating…".
          if (_event === 'USER_UPDATED' || _event === 'TOKEN_REFRESHED') {
            setRecoveryMode(false);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            return;
          }

          setRecoveryMode(false);
          const u = session?.user ?? null;

          if (u) {
            // ── Approval gate ──────────────────────────────────────────────
            // Only runs on SIGNED_IN / INITIAL_SESSION — actual new sign-ins.
            const { allowed, message } = await checkUserApproval(u.id, u.email ?? '');
            if (!allowed) {
              setAuthError(message ?? 'Access denied.');
              setLoading(false);
              supabase.auth.signOut(); // triggers SIGNED_OUT → sets user null
              return;
            }
          }

          setSession(session);
          setUser(u);
          setLoading(false);
        } catch (err) {
          // Any unexpected error must still resolve loading so the app never freezes.
          console.error('Auth state change error:', err);
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, recoveryMode, authError, clearAuthError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
