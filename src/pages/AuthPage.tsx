import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError((e as Error).message);
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
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          {error && (
            <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', padding: '0.6rem', background: 'rgba(255,71,87,0.08)', borderRadius: '8px' }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', padding: '0.6rem', background: 'rgba(0,255,157,0.08)', borderRadius: '8px' }}>
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
