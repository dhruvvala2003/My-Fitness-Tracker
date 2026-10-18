import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Eye, EyeOff, LogOut, LogIn, KeyRound, UserRound, Download, Save } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { exportData } from '../utils/dataExport';
import { calcCalorieTarget, ACTIVITY_LABELS, GOAL_LABELS } from '../utils/calories';
import type { ActivityLevel, Goal, Sex, UserSettings } from '../types';

interface ProfileForm {
  heightCm: string;
  birthYear: string;
  sex: Sex | '';
  activityLevel: ActivityLevel;
  goal: Goal;
  targetWeightKg: string;
  calorieTargetOverride: string;
  waterGoal: string;
  restSeconds: string;
}

function toForm(s: UserSettings): ProfileForm {
  return {
    heightCm: s.heightCm ? String(s.heightCm) : '',
    birthYear: s.birthYear ? String(s.birthYear) : '',
    sex: s.sex ?? '',
    activityLevel: s.activityLevel,
    goal: s.goal,
    targetWeightKg: s.targetWeightKg ? String(s.targetWeightKg) : '',
    calorieTargetOverride: s.calorieTargetOverride ? String(s.calorieTargetOverride) : '',
    waterGoal: String(s.waterGoal),
    restSeconds: String(s.restSeconds),
  };
}

function fromForm(f: ProfileForm, base: UserSettings): UserSettings {
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  return {
    ...base,
    heightCm: num(f.heightCm),
    birthYear: num(f.birthYear),
    sex: f.sex === '' ? null : f.sex,
    activityLevel: f.activityLevel,
    goal: f.goal,
    targetWeightKg: num(f.targetWeightKg),
    calorieTargetOverride: num(f.calorieTargetOverride),
    waterGoal: Math.max(1, Math.min(30, Number(f.waterGoal) || 8)),
    restSeconds: Math.max(0, Math.min(600, Number(f.restSeconds) || 0)),
  };
}

export default function SettingsPage() {
  const { data, addHabitColumn, deleteHabitColumn, renameHabitColumn, toggleColumnVisibility, toggleNoteColumn, updatePopupMessage, updateSettings } = useAppData();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [newCol, setNewCol] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  // Popup message: a local edit overrides the saved value until it is saved.
  const [popupEdit, setPopupEdit] = useState<string | null>(null);
  const popupMsg = popupEdit ?? data.settings.popupMessage ?? '';
  const setPopupMsg = setPopupEdit;

  // Profile form: local edits override the saved profile until saved.
  const savedSettings = data.settings;
  const [formEdits, setFormEdits] = useState<ProfileForm | null>(null);
  const form = formEdits ?? toForm(savedSettings);
  const setForm = (update: (f: ProfileForm) => ProfileForm) =>
    setFormEdits(prev => update(prev ?? toForm(savedSettings)));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const latestWeight = data.weights[data.weights.length - 1]?.weightKg;
  const preview = calcCalorieTarget(fromForm(form, data.settings), latestWeight);

  // Change password state
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const columns = data.habits.columns;
  const hiddenColumns: number[] = data.habits.hiddenColumns ?? [];
  const noteColumns: number[] = data.habits.noteColumns ?? [];

  function isHidden(idx: number) { return hiddenColumns.includes(idx); }
  function isNoteEnabled(idx: number) { return noteColumns.includes(idx); }

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

  async function saveProfile() {
    if (!user) { setShowLoginPrompt(true); return; }
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const next = fromForm(form, data.settings);
      await updateSettings({
        heightCm: next.heightCm,
        birthYear: next.birthYear,
        sex: next.sex,
        activityLevel: next.activityLevel,
        goal: next.goal,
        targetWeightKg: next.targetWeightKg,
        calorieTargetOverride: next.calorieTargetOverride,
        waterGoal: next.waterGoal,
        restSeconds: next.restSeconds,
      });
      setFormEdits(null); // follow the saved profile again
      setProfileMsg({ ok: true, text: 'Profile saved.' });
    } catch (err) {
      setProfileMsg({ ok: false, text: `${(err as Error).message} — make sure supabase-migration-v2.sql has been run in your Supabase project.` });
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePopup(message: string) {
    try {
      await updatePopupMessage(message);
      setPopupEdit(null);
    } catch (err) {
      setProfileMsg({ ok: false, text: (err as Error).message });
    }
  }

  const thisYear = new Date().getFullYear();

  return (
    <div className="page">
      {showLoginPrompt && (
        <LoginPromptModal
          message="You need to be signed in to manage your settings. Sign in to customise your habit columns and preferences!"
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Profile, goals, habit columns and account.</p>

      {/* ── Profile & goals ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="row" style={{ gap: '0.5rem', marginBottom: '0.25rem' }}>
          <UserRound size={16} color="var(--accent-primary)" />
          <p style={{ fontWeight: 600 }}>Profile & daily calorie target</p>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Used to work out how much you should eat each day (Mifflin-St Jeor BMR × activity, adjusted for your goal).
          Your weight comes from the latest entry on the Progress page{latestWeight ? ` (${latestWeight} kg)` : ' — log it there first'}.
        </p>

        <div className="profile-grid">
          <div>
            <p className="field-label">Height (cm)</p>
            <input className="input" type="number" min="100" max="250" placeholder="e.g. 175" value={form.heightCm}
              onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))} />
          </div>
          <div>
            <p className="field-label">Birth year</p>
            <input className="input" type="number" min={thisYear - 100} max={thisYear - 10} placeholder="e.g. 2003" value={form.birthYear}
              onChange={e => setForm(f => ({ ...f, birthYear: e.target.value }))} />
          </div>
          <div>
            <p className="field-label">Sex</p>
            <select className="input" value={form.sex} onChange={e => setForm(f => ({ ...f, sex: e.target.value as Sex | '' }))}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / prefer not to say</option>
            </select>
          </div>
          <div>
            <p className="field-label">Activity level</p>
            <select className="input" value={form.activityLevel} onChange={e => setForm(f => ({ ...f, activityLevel: e.target.value as ActivityLevel }))}>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(k => (
                <option key={k} value={k}>{ACTIVITY_LABELS[k].label} — {ACTIVITY_LABELS[k].hint}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="field-label">Goal</p>
            <select className="input" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value as Goal }))}>
              {(Object.keys(GOAL_LABELS) as Goal[]).map(k => (
                <option key={k} value={k}>{GOAL_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="field-label">Target weight (kg)</p>
            <input className="input" type="number" min="30" max="300" step="0.5" placeholder="optional" value={form.targetWeightKg}
              onChange={e => setForm(f => ({ ...f, targetWeightKg: e.target.value }))} />
          </div>
          <div>
            <p className="field-label">Custom calorie target</p>
            <input className="input" type="number" min="800" max="10000" step="50" placeholder="leave empty = auto" value={form.calorieTargetOverride}
              onChange={e => setForm(f => ({ ...f, calorieTargetOverride: e.target.value }))} />
          </div>
          <div>
            <p className="field-label">Water goal (glasses / day)</p>
            <input className="input" type="number" min="1" max="30" value={form.waterGoal}
              onChange={e => setForm(f => ({ ...f, waterGoal: e.target.value }))} />
          </div>
          <div>
            <p className="field-label">Rest between sets (sec)</p>
            <input className="input" type="number" min="0" max="600" step="15" value={form.restSeconds}
              onChange={e => setForm(f => ({ ...f, restSeconds: e.target.value }))} />
          </div>
        </div>

        {/* Live preview */}
        <div className="target-preview">
          <div>
            <div className="card-label">BMR</div>
            <div className="cal-stat-value">{preview.bmr ?? '—'}</div>
          </div>
          <div>
            <div className="card-label">Maintenance</div>
            <div className="cal-stat-value">{preview.tdee ?? '—'}</div>
          </div>
          <div>
            <div className="card-label">Daily target</div>
            <div className="cal-stat-value" style={{ color: 'var(--accent-primary)' }}>{preview.target || '—'}</div>
          </div>
          <div style={{ flex: 1, minWidth: 180, fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
            {preview.source === 'override' && 'Using your custom target.'}
            {preview.source === 'profile' && `Computed from your profile (${GOAL_LABELS[form.goal].toLowerCase()}).`}
            {preview.source === 'none' && `Still needed: ${preview.missing.join(', ')}.`}
          </div>
        </div>

        <div className="row" style={{ gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={saveProfile} disabled={profileSaving}>
            <Save size={15} /> {profileSaving ? 'Saving…' : 'Save profile'}
          </button>
          {profileMsg && (
            <span style={{ fontSize: '0.78rem', color: profileMsg.ok ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
              {profileMsg.text}
            </span>
          )}
        </div>
      </div>

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
                    background: hidden ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)',
                    border: `1px solid ${hidden ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.25)'}`,
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
                    color: 'var(--accent-danger)', background: 'rgba(248,113,113,0.1)',
                    border: '1px solid rgba(248,113,113,0.25)',
                    borderRadius: 20, padding: '0.15rem 0.5rem',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    hidden
                  </span>
                )}

                {/* Enable Notes toggle */}
                <button
                  className={isNoteEnabled(i) ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '0.5rem', flexShrink: 0 }}
                  onClick={() => requireAuth(() => toggleNoteColumn(i))}
                  title={isNoteEnabled(i) ? 'Notes enabled' : 'Enable notes'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>

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

      {/* ── Homepage Popup Message ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📢</span>
          <p style={{ fontWeight: 600 }}>Homepage Popup Message</p>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Set a message that will appear as an animated popup when you open the homepage.
          Leave empty to disable the popup.
        </p>
        <textarea
          className="input"
          value={popupMsg}
          onChange={e => setPopupMsg(e.target.value)}
          placeholder="Enter your motivational message, reminder, or announcement here..."
          rows={4}
          style={{
            resize: 'vertical',
            minHeight: '100px',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9rem',
            lineHeight: 1.6,
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn-primary"
            onClick={() => requireAuth(() => savePopup(popupMsg))}
            style={{ flexShrink: 0 }}
          >
            💾 Save Message
          </button>
          {popupMsg && (
            <button
              className="btn-danger"
              onClick={() => requireAuth(() => { setPopupMsg(''); savePopup(''); })}
              style={{ flexShrink: 0 }}
            >
              Clear
            </button>
          )}
          {data.settings.popupMessage === popupMsg && popupMsg && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>✓ Saved</span>
          )}
        </div>
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
              <button className="btn-secondary" onClick={() => exportData(data)} title="Download all your data as JSON">
                <Download size={15} /> Export my data
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
                  <p style={{ fontSize: '0.78rem', color: 'var(--accent-danger)', padding: '0.5rem', background: 'rgba(248,113,113,0.08)', borderRadius: '8px', lineHeight: 1.5 }}>
                    {pwError}
                  </p>
                )}
                {pwSuccess && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', padding: '0.5rem', background: 'rgba(52,211,153,0.08)', borderRadius: '8px' }}>
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
      <div className="card" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
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
