import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordPage() {
  const { loading, recoveryMode } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message); return; }
      setSuccess(true);
      // Sign out to clear the recovery session from localStorage so the user
      // can sign in fresh with new credentials without needing to clear cache.
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError((err as Error).message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: 'var(--bg-primary)',
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  if (!recoveryMode) {
    return (
      <div style={pageStyle}>
        <div className="card" style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
          <Dumbbell size={28} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>Invalid or expired link</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            This password reset link is no longer valid. Please request a new one.
          </p>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div className="card" style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <KeyRound size={26} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Set New Password</h1>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.875rem' }}>
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPw ? 'text' : 'password'}
              placeholder="New password (min 6 chars)"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              required
              minLength={6}
              autoComplete="new-password"
              style={{ paddingRight: '2.5rem', width: '100%', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.25rem', display: 'flex' }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <input
            className="input"
            type={showPw ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(null); }}
            required
            minLength={6}
            autoComplete="new-password"
          />

          {error && (
            <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', padding: '0.6rem', background: 'rgba(255,71,87,0.08)', borderRadius: '8px', lineHeight: 1.5 }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', padding: '0.6rem', background: 'rgba(0,255,157,0.08)', borderRadius: '8px', lineHeight: 1.5 }}>
              Password updated! Redirecting to sign in…
            </p>
          )}

          <button
            className="btn-primary"
            type="submit"
            disabled={saving || success}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
          >
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
