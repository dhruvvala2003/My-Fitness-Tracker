import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Eye, EyeOff, LogOut, LogIn, KeyRound } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const { data, addHabitColumn, deleteHabitColumn, renameHabitColumn, toggleColumnVisibility } = useAppData();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [newCol, setNewCol] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Change password state
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const columns = data.habits.columns;
  const hiddenColumns: number[] = data.habits.hiddenColumns ?? [];

  function isHidden(idx: number) { return hiddenColumns.includes(idx); }

  function requireAuth(action: () => void) {
    if (!user) { setShowLoginPrompt(true); return; }
    action();
  }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    setPwSuccess(true);
    setNewPw('');
    setConfirmPw('');
    setTimeout(() => { setPwSuccess(false); setShowChangePw(false); }, 2500);
  }

  async function handleAddColumn() {
    if (!user) { setShowLoginPrompt(true); return; }
    const name = newCol.trim();
    if (!name || columns.length >= 4) return;
    await addHabitColumn(name);
    setNewCol('');
  }

  return (
    <div className="page">
      {showLoginPrompt && (
        <LoginPromptModal
          message="You need to be signed in to manage your settings. Sign in to customise your habit columns and preferences!"
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      <h1 className="page-title">Settings</h1>

      {/* ── Habit Columns ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Habit Columns</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Up to 4 columns. Toggle the eye icon to hide/show a column — hidden columns are excluded
          from the table and all progress calculations, but their data is preserved.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {columns.map((col, i) => {
            const hidden = isHidden(i);
            return (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

                {/* Visibility toggle */}
                <button
                  onClick={() => requireAuth(() => toggleColumnVisibility(i))}
                  title={hidden ? 'Show column' : 'Hide column'}
                  style={{
                    flexShrink: 0,
                    width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: hidden ? 'rgba(255,71,87,0.08)' : 'rgba(0,255,157,0.08)',
                    border: `1px solid ${hidden ? 'rgba(255,71,87,0.3)' : 'rgba(0,255,157,0.25)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: hidden ? 'var(--accent-danger)' : 'var(--accent-primary)',
                    transition: 'all 160ms',
                  }}
                >
                  {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>

                {/* Name input */}
                <input
                  className="input"
                  value={col}
                  onChange={e => requireAuth(() => renameHabitColumn(i, e.target.value))}
                  maxLength={30}
                  style={{ opacity: hidden ? 0.45 : 1, transition: 'opacity 160ms' }}
                />

                {/* Hidden badge */}
                {hidden && (
                  <span style={{
                    flexShrink: 0, fontSize: '0.65rem', fontWeight: 700,
                    color: 'var(--accent-danger)', background: 'rgba(255,71,87,0.1)',
                    border: '1px solid rgba(255,71,87,0.25)',
                    borderRadius: 20, padding: '0.15rem 0.5rem',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    hidden
                  </span>
                )}

                {/* Delete */}
                <button
                  className="btn-danger"
                  style={{ padding: '0.5rem', flexShrink: 0 }}
                  onClick={() => requireAuth(() => deleteHabitColumn(i))}
                  title="Permanently delete column"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
          {columns.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {user ? 'No columns. Add one below.' : 'Sign in to create and manage your habit columns.'}
            </p>
          )}
        </div>

        {columns.length < 4 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder='e.g. "Meditation"'
              value={newCol}
              onChange={e => setNewCol(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
              maxLength={30}
            />
            <button className="btn-primary" onClick={handleAddColumn} style={{ flexShrink: 0 }}>
              <Plus size={15} /> Add
            </button>
          </div>
        )}
        {columns.length >= 4 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Maximum 4 columns reached.</p>
        )}
      </div>

      {/* ── Account ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Account</p>
        {user ? (
          <>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Signed in as <span style={{ color: 'var(--text-primary)' }}>{user.email}</span>.
              Your data syncs automatically across all devices.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={signOut}>
                <LogOut size={15} /> Sign Out
              </button>
              <button
                className="btn-secondary"
                onClick={() => { setShowChangePw(v => !v); setPwError(null); setPwSuccess(false); }}
              >
                <KeyRound size={15} /> {showChangePw ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {/* Change password inline form */}
            {showChangePw && (
              <form onSubmit={handleChangePw} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  className="input"
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setPwError(null); }}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setPwError(null); }}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                {pwError && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--accent-danger)', padding: '0.5rem', background: 'rgba(255,71,87,0.08)', borderRadius: '8px', lineHeight: 1.5 }}>
                    {pwError}
                  </p>
                )}
                {pwSuccess && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', padding: '0.5rem', background: 'rgba(0,255,157,0.08)', borderRadius: '8px' }}>
                    Password updated successfully.
                  </p>
                )}
                <button className="btn-primary" type="submit" disabled={pwLoading} style={{ alignSelf: 'flex-start' }}>
                  <KeyRound size={14} /> {pwLoading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              You are not signed in. Sign in to save your data and sync across all devices.
            </p>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              <LogIn size={15} /> Sign In
            </button>
          </>
        )}
      </div>

      {/* ── Danger zone ── */}
      <div className="card" style={{ borderColor: 'rgba(255,71,87,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <AlertTriangle size={16} color="var(--accent-danger)" />
          <p style={{ fontWeight: 600, color: 'var(--accent-danger)' }}>Danger Zone</p>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Delete all habit columns permanently. This cannot be undone.
        </p>
        {confirmClear ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Are you sure?</span>
            <button
              className="btn-danger"
              onClick={() => requireAuth(async () => {
                for (let i = columns.length - 1; i >= 0; i--) await deleteHabitColumn(i);
                setConfirmClear(false);
              })}
            >
              Yes, delete all
            </button>
            <button className="btn-secondary" onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn-danger" onClick={() => requireAuth(() => setConfirmClear(true))}>
            <Trash2 size={15} /> Delete All Columns
          </button>
        )}
      </div>
    </div>
  );
}
