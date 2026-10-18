import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ADMIN_EMAIL, checkUserApproval, fetchVideoPermissions } from '../lib/auth';
import { ALL_VIDEO_PERMISSIONS, NO_VIDEO_PERMISSIONS } from '../types';
import type { VideoPermissions } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  recoveryMode: boolean;
  authError: string | null;
  isAdmin: boolean;
  videoPerms: VideoPermissions;
  refreshVideoPerms: () => Promise<void>;
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
  // Permissions are remembered together with the user they belong to, so a
  // different account never briefly sees the previous account's rights.
  const [permState, setPermState]     = useState<{ uid: string; perms: VideoPermissions } | null>(null);

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

  const uid = user?.id ?? null;
  const email = user?.email ?? '';
  const isAdmin = email === ADMIN_EMAIL;

  // Load video rights whenever the signed-in account changes.
  useEffect(() => {
    if (!uid) return;
    let active = true;
    fetchVideoPermissions(uid, email)
      .then(perms => { if (active) setPermState({ uid, perms }); })
      .catch(err => {
        console.error('Could not load video permissions:', err);
        if (active) setPermState({ uid, perms: NO_VIDEO_PERMISSIONS });
      });
    return () => { active = false; };
  }, [uid, email]);

  const refreshVideoPerms = useCallback(async () => {
    if (!uid) return;
    const perms = await fetchVideoPermissions(uid, email);
    setPermState({ uid, perms });
  }, [uid, email]);

  const videoPerms: VideoPermissions = !uid
    ? NO_VIDEO_PERMISSIONS
    : isAdmin
      ? ALL_VIDEO_PERMISSIONS
      : permState?.uid === uid ? permState.perms : NO_VIDEO_PERMISSIONS;

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{
      user, session, loading, recoveryMode, authError,
      isAdmin, videoPerms, refreshVideoPerms,
      clearAuthError, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
