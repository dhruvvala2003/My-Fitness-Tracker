import { useState, useEffect, useRef } from 'react';
import { Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, checkUserApproval, ADMIN_EMAIL } from '../context/AuthContext';

export default function AuthPage() {
  const { authError, clearAuthError } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  // Tracks when signup just completed so we don't show the AuthContext
  // "pending approval" error on top of the success message.
  const justSignedUp = useRef(false);

  // Pick up approval/deactivation errors set by AuthContext (e.g. on page load)
  useEffect(() => {
    if (authError) {
      if (!justSignedUp.current) {
        setError(authError);
      }
      justSignedUp.current = false;
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpErr, data } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;

        // Create pending approval record while user is still authenticated
        if (data.user) {
          const { error: upsertErr } = await supabase.from('user_approvals').upsert({
            user_id: data.user.id,
            email: email.toLowerCase().trim(),
            status: 'pending',
            requested_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
          if (upsertErr) console.error('Approval record insert failed:', upsertErr);
        }

        // Sign back out immediately so they must wait for admin approval.
        justSignedUp.current = true; // suppress the upcoming authError from AuthContext
        if (data.session) await supabase.auth.signOut();

        setSuccess(
          'Account created! Your request is pending admin approval. ' +
          'You will be able to sign in once the admin approves your account.',
        );
      } else {
        const { error: signInErr, data } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;

        // Approval gate — check immediately so the user gets instant feedback
        const u = data.user;
        if (u && u.email !== ADMIN_EMAIL) {
          const { allowed, message } = await checkUserApproval(u.id, u.email ?? '');
          if (!allowed) {
            await supabase.auth.signOut();
            throw new Error(message);
          }
        }
        // If approved, onAuthStateChange in AuthContext sets user → App navigates to "/"
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      background: 'var(--bg-primary)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <Dumbbell size={28} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>FitTrack</h1>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>
          {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            required
            autoComplete="email"
          />
          <input
            className="input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          {error && (
            <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', padding: '0.6rem', background: 'rgba(255,71,87,0.08)', borderRadius: '8px', lineHeight: 1.5 }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', padding: '0.6rem', background: 'rgba(0,255,157,0.08)', borderRadius: '8px', lineHeight: 1.5 }}>
              {success}
            </p>
          )}

          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.875rem' }}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
