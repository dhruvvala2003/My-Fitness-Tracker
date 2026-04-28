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

  if (!data) return { allowed: true }; // No record = pre-existing user = allow
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
  authError: string | null;
  clearAuthError: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [session, setSession]     = useState<Session | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;

        if (u) {
          // ── Approval gate ──────────────────────────────────────────────
          // IMPORTANT: setUser is NOT called until this check passes.
          // This prevents navigation to "/" before we know the user is allowed.
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
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, authError, clearAuthError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
