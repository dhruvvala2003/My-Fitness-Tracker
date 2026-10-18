import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  X, Clock, Repeat, ZoomIn, Info, Search, Plus, Check, Trash2,
  Dumbbell, History, Flame, ChevronDown, ChevronUp, RotateCcw, Timer,
} from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import { today, formatFullDate, getPast7Days } from '../utils/dateHelpers';
import { cardioCalories, strengthCalories } from '../utils/calories';
import type { StrengthBreakdown } from '../utils/calories';
import { EXERCISES, IMG, CATEGORIES, CAT_COLOR, DEFAULT_COLOR } from '../data/exercises';
import type { Exercise } from '../data/exercises';
import type { WorkoutExercise, WorkoutSession } from '../types';

// ── Per-card input state ─────────────────────────────────────────────────────
interface ExState {
  mode: 'duration' | 'reps';
  value: string;  // minutes (duration) or reps per set (reps)
  sets: string;   // number of sets
  load: string;   // extra load weight in kg (barbell / dumbbell)
}

interface Estimate {
  calories: number;
  breakdown: StrengthBreakdown | null;
}

function estimate(ex: Exercise, s: ExState, bodyKg: number, restSeconds: number): Estimate | null {
  const v = parseFloat(s.value);
  if (isNaN(v) || v <= 0 || bodyKg <= 0) return null;

  if (s.mode === 'duration' || ex.durationOnly) {
    return { calories: cardioCalories(ex.met, v, bodyKg), breakdown: null };
  }

  const b = strengthCalories({
    met: ex.met,
    sets: parseInt(s.sets) || 1,
    reps: v,
    loadKg: ex.isWeighted ? Math.max(0, parseFloat(s.load) || 0) : 0,
    bodyKg,
    secPerRep: ex.secPerRep,
    restSeconds,
  });
  return b ? { calories: b.calories, breakdown: b } : null;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const { data, addWorkout, deleteWorkout, updateSettings } = useAppData();
  const { user } = useAuth();

  const latestWeight = data.weights[data.weights.length - 1]?.weightKg;

  const [tab, setTab]           = useState<'catalog' | 'history'>('catalog');
  // Body weight / rest: a local edit overrides the profile value, which is
  // prefilled from the Progress log and Settings once they have loaded.
  const [weightEdit, setWeightEdit] = useState<string | null>(null);
  const weight = weightEdit ?? (latestWeight ? String(latestWeight) : '');
  const weightTouched = weightEdit !== null;
  const [restEdit, setRestEdit] = useState<string | null>(null);
  const rest = restEdit ?? String(data.settings.restSeconds);
  const [filter, setFilter]     = useState('All');
  const [search, setSearch]     = useState('');
  const [modalEx, setModalEx]   = useState<Exercise | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [exStates, setExStates] = useState<Record<string, ExState>>({});
  const [session, setSession]   = useState<WorkoutExercise[]>([]);
  const [showFinish, setShowFinish] = useState(false);
  const [showLogin, setShowLogin]   = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const bodyKg = Math.max(1, parseFloat(weight) || 70);
  const restSeconds = Math.max(0, parseInt(rest) || 0);

  function getState(id: string, ex: Exercise): ExState {
    return exStates[id] ?? { mode: ex.durationOnly ? 'duration' : 'reps', value: '', sets: '3', load: '' };
  }
  function patchState(id: string, patch: Partial<ExState>) {
    setExStates(prev => ({ ...prev, [id]: { ...getState(id, EXERCISES.find(e => e.id === id)!), ...patch } }));
  }

  async function commitRest() {
    const v = Math.max(0, Math.min(600, parseInt(rest) || 0));
    setRestEdit(String(v));
    if (user && v !== data.settings.restSeconds) {
      try {
        await updateSettings({ restSeconds: v });
        setRestEdit(null); // follow the saved profile value from now on
      } catch { /* surfaced on the Settings page if the migration is missing */ }
    }
  }

  const filtered = EXERCISES
    .filter(e => filter === 'All' || e.category === filter)
    .filter(e => !search.trim() || e.name.toLowerCase().includes(search.toLowerCase()));

  const sessionCalories = useMemo(
    () => Math.round(session.reduce((s, e) => s + e.calories, 0) * 10) / 10,
    [session],
  );

  const past7 = getPast7Days();
  const weekSessions = data.workouts.filter(w => past7.includes(w.date));
  const weekBurn = Math.round(weekSessions.reduce((s, w) => s + w.totalCalories, 0));

  /* ── Session actions ── */

  function addToSession(ex: Exercise) {
    const s = getState(ex.id, ex);
    const est = estimate(ex, s, bodyKg, restSeconds);
    if (!est) return;

    let sets;
    if (s.mode === 'duration' || ex.durationOnly) {
      sets = [{ reps: 0, weightKg: 0, durationMin: parseFloat(s.value) }];
    } else {
      const nSets = Math.max(1, parseInt(s.sets) || 1);
      const reps = parseInt(s.value) || 0;
      const load = ex.isWeighted ? Math.max(0, parseFloat(s.load) || 0) : 0;
      sets = Array.from({ length: nSets }, () => ({ reps, weightKg: load }));
    }

    setSession(prev => [...prev, { name: ex.name, category: ex.category, sets, calories: est.calories }]);
    patchState(ex.id, { value: '' });
  }

  function removeFromSession(idx: number) {
    setSession(prev => prev.filter((_, i) => i !== idx));
  }

  function repeatWorkout(w: WorkoutSession) {
    setSession(w.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) })));
    setTab('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveSession() {
    if (!user) { setShowLogin(true); return; }
    const s: WorkoutSession = {
      id: uuidv4(),
      date: today(),
      startedAt: new Date().toISOString(),
      exercises: session,
      totalCalories: sessionCalories,
    };
    await addWorkout(s);
    setSession([]);
    setShowFinish(false);
    setTab('history');
  }

  function describeSets(e: WorkoutExercise): string {
    const first = e.sets[0];
    if (!first) return '';
    if (first.durationMin) return `${first.durationMin} min`;
    const load = first.weightKg > 0 ? ` @ ${first.weightKg} kg` : '';
    return `${e.sets.length} × ${first.reps}${load}`;
  }

  return (
    <div className="page">

      {/* ── Full-size image modal ── */}
      {modalEx && (
        <div
          onClick={() => setModalEx(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '740px', width: '100%' }}>
            <button
              onClick={() => setModalEx(null)}
              style={{
                position: 'absolute', top: '-3rem', right: 0,
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%', width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}
            >
              <X size={18} />
            </button>
            <img
              src={IMG(modalEx.imgFolder)}
              alt={modalEx.name}
              style={{ width: '100%', borderRadius: '14px', display: 'block', boxShadow: 'var(--shadow-pop)' }}
              onError={e => {
                const t = e.currentTarget;
                t.style.display = 'none';
                const ph = t.nextElementSibling as HTMLElement | null;
                if (ph) ph.style.display = 'flex';
              }}
            />
            <div style={{
              display: 'none', width: '100%', height: '320px', borderRadius: '14px',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)',
            }}>
              {modalEx.name}
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{modalEx.name}</span>
              <span style={{
                fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 600,
                background: (CAT_COLOR[modalEx.category] ?? DEFAULT_COLOR).bg,
                color:      (CAT_COLOR[modalEx.category] ?? DEFAULT_COLOR).text,
                border:     `1px solid ${(CAT_COLOR[modalEx.category] ?? DEFAULT_COLOR).border}`,
              }}>
                {modalEx.category}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header + tabs ── */}
      <div className="row-between" style={{ flexWrap: 'wrap', marginBottom: '0.35rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Workout</h1>
        <div className="row" style={{ gap: '0.4rem' }}>
          <button className={`chip${tab === 'catalog' ? ' active' : ''}`} onClick={() => setTab('catalog')}>
            <Dumbbell size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Exercises
          </button>
          <button className={`chip${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>
            <History size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />History{data.workouts.length ? ` (${data.workouts.length})` : ''}
          </button>
        </div>
      </div>
      <p className="page-subtitle">
        {tab === 'catalog'
          ? 'Build your session — enter sets & reps, then add each exercise.'
          : 'Your saved workout sessions.'}
      </p>

      {tab === 'history' ? (
        /* ═════════ HISTORY TAB ═════════ */
        <>
          <div className="home-stats" style={{ marginBottom: '1rem' }}>
            <div className="card">
              <div className="card-label">This week</div>
              <div className="card-value">{weekSessions.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>session{weekSessions.length !== 1 ? 's' : ''} in 7 days</div>
            </div>
            <div className="card">
              <div className="card-label">Burned this week</div>
              <div className="card-value" style={{ color: 'var(--accent-warn)' }}>{weekBurn}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>kcal estimated</div>
            </div>
          </div>

          {data.workouts.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon"><History size={22} /></div>
                No workouts saved yet. Build a session in the Exercises tab and hit Finish.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.workouts.map(w => (
                <div key={w.id} className="card">
                  <div className="row-between">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatFullDate(w.date)}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}
                        <span style={{ margin: '0 0.4rem' }}>·</span>
                        <Flame size={12} style={{ display: 'inline', verticalAlign: '-2px', color: 'var(--accent-warn)' }} /> ~{Math.round(w.totalCalories)} kcal
                      </div>
                    </div>
                    <div className="row" style={{ gap: '0.25rem' }}>
                      <button className="icon-btn" onClick={() => repeatWorkout(w)} title="Repeat this workout">
                        <RotateCcw size={15} />
                      </button>
                      <button className="icon-btn" onClick={() => setExpanded(expanded === w.id ? null : w.id)} title="Details">
                        {expanded === w.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button className="icon-btn danger" title="Delete workout"
                        onClick={() => user ? deleteWorkout(w.id) : setShowLogin(true)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {expanded === w.id && (
                    <div style={{ marginTop: '0.875rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {w.exercises.map((e, i) => {
                        const col = CAT_COLOR[e.category] ?? DEFAULT_COLOR;
                        return (
                          <div key={i} className="row-between">
                            <span className="row" style={{ gap: '0.5rem' }}>
                              <span style={{ width: 8, height: 8, borderRadius: 999, background: col.text, flexShrink: 0 }} />
                              <span style={{ fontSize: '0.85rem' }}>{e.name}</span>
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                              {describeSets(e)} · ~{e.calories} kcal
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ═════════ CATALOG TAB ═════════ */
        <>
          {/* ── Search bar ── */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search
              size={15}
              style={{
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-secondary)', pointerEvents: 'none',
              }}
            />
            <input
              className="input"
              type="text"
              placeholder="Search exercises…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem', width: '100%' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                  color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* ── Weight + rest + method info card ── */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <p className="card-label">Your Weight</p>
                <div className="row" style={{ gap: '0.5rem' }}>
                  <input
                    type="number"
                    className="input"
                    min="20"
                    max="300"
                    placeholder="70"
                    value={weight}
                    onChange={e => setWeightEdit(e.target.value)}
                    style={{ width: '80px', textAlign: 'center' }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>kg</span>
                </div>
                {latestWeight !== undefined && !weightTouched && (
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 4 }}>
                    prefilled from Progress
                  </p>
                )}
              </div>

              <div>
                <p className="card-label"><Timer size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Rest between sets</p>
                <div className="row" style={{ gap: '0.5rem' }}>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max="600"
                    step="15"
                    value={rest}
                    onChange={e => setRestEdit(e.target.value)}
                    onBlur={commitRest}
                    style={{ width: '80px', textAlign: 'center' }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>sec</span>
                </div>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 4 }}>
                  {user ? 'saved to your profile' : 'sign in to remember this'}
                </p>
              </div>

              <div style={{ flex: 1, minWidth: '220px' }}>
                <button
                  onClick={() => setShowInfo(s => !s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: showInfo ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
                    marginBottom: '0.4rem', transition: 'color 150ms',
                  }}
                >
                  <Info size={13} />
                  How calories are calculated
                </button>

                {showInfo ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    <p>
                      Everything uses the standard MET formula from the Compendium of Physical Activities:{' '}
                      <span className="mono-num" style={{ fontSize: '0.72rem', color: 'var(--text-primary)' }}>kcal = MET × weight(kg) × hours</span>
                    </p>
                    <p style={{ marginTop: '0.35rem' }}>
                      <strong style={{ color: 'var(--accent-primary)' }}>Cardio / timed:</strong> the minutes you enter go straight into the formula.
                    </p>
                    <p style={{ marginTop: '0.35rem' }}>
                      <strong style={{ color: 'var(--accent-primary)' }}>Strength:</strong> time under tension is estimated from
                      sets × reps × tempo (≈4 s per rep for lifts, ≈2.5 s for bodyweight), plus your rest time between
                      sets at a light “recovery” rate — your heart rate stays elevated while you rest.
                      Heavier loads relative to your body weight raise the intensity.
                    </p>
                    <p style={{ marginTop: '0.35rem', fontSize: '0.72rem' }}>
                      Numbers are gross estimates (they include what you would have burned anyway) and typically match
                      what a smartwatch reports within ±20 %.
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    MET formula · tempo + rest model for lifts ·{' '}
                    <strong style={{ color: 'var(--accent-primary)' }}>{bodyKg} kg</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Category filter pills ── */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {CATEGORIES.map(c => (
              <button key={c} className={`chip${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>
                {c}
              </button>
            ))}
          </div>

          {/* ── No results ── */}
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><Search size={22} /></div>
              No exercises match "{search}"
            </div>
          )}

          {/* ── Exercise grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {filtered.map(ex => {
              const s    = getState(ex.id, ex);
              const est  = estimate(ex, s, bodyKg, restSeconds);
              const col  = CAT_COLOR[ex.category] ?? DEFAULT_COLOR;

              return (
                <div key={ex.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

                  {/* Thumbnail */}
                  <div className="exercise-thumb" onClick={() => setModalEx(ex)} style={{ position: 'relative' }}>
                    <img
                      src={IMG(ex.imgFolder)}
                      alt={ex.name}
                      loading="lazy"
                      style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                      onError={e => {
                        const t = e.currentTarget;
                        t.style.display = 'none';
                        const ph = t.nextElementSibling as HTMLElement | null;
                        if (ph?.dataset.placeholder) ph.style.display = 'flex';
                      }}
                    />
                    <div
                      data-placeholder="1"
                      style={{
                        display: 'none', width: '100%', height: '160px',
                        alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(135deg, ${col.bg}, rgba(0,0,0,0.3))`,
                        fontSize: '0.8rem', fontWeight: 600, color: col.text,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {ex.name}
                    </div>
                    <div className="exercise-zoom-icon">
                      <ZoomIn size={26} color="white" />
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '1rem' }}>

                    <div className="row-between" style={{ marginBottom: '0.875rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ex.name}</span>
                      <span style={{
                        fontSize: '0.65rem', padding: '0.2rem 0.55rem', borderRadius: '999px',
                        whiteSpace: 'nowrap', fontWeight: 600, flexShrink: 0,
                        background: col.bg, color: col.text, border: `1px solid ${col.border}`,
                      }}>
                        {ex.category}
                      </span>
                    </div>

                    {/* Duration / Reps toggle */}
                    {!ex.durationOnly && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {(['reps', 'duration'] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => patchState(ex.id, { mode, value: '' })}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                              padding: '0.35rem 0', borderRadius: '8px', fontSize: '0.78rem',
                              cursor: 'pointer', border: '1px solid', transition: 'all 150ms',
                              fontFamily: 'var(--font-sans)',
                              background:  s.mode === mode ? 'var(--accent-primary-dim)' : 'transparent',
                              borderColor: s.mode === mode ? 'rgba(52,211,153,0.5)' : 'var(--border)',
                              color:       s.mode === mode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              fontWeight:  s.mode === mode ? 600 : 400,
                            }}
                          >
                            {mode === 'duration' ? <Clock size={12} /> : <Repeat size={12} />}
                            {mode === 'duration' ? 'Duration' : 'Reps'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Inputs */}
                    {s.mode === 'duration' || ex.durationOnly ? (
                      <input
                        className="input"
                        type="number"
                        min="1"
                        placeholder="Minutes…"
                        value={s.value}
                        onChange={e => patchState(ex.id, { value: e.target.value })}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sets</p>
                            <input
                              className="input"
                              type="number"
                              min="1"
                              placeholder="3"
                              value={s.sets}
                              onChange={e => patchState(ex.id, { sets: e.target.value })}
                            />
                          </div>
                          <div>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reps / set</p>
                            <input
                              className="input"
                              type="number"
                              min="1"
                              placeholder="10"
                              value={s.value}
                              onChange={e => patchState(ex.id, { value: e.target.value })}
                            />
                          </div>
                        </div>
                        {ex.isWeighted && (
                          <div>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Load (kg) <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional, barbell / dumbbell</span>
                            </p>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              placeholder="e.g. 60"
                              value={s.load}
                              onChange={e => patchState(ex.id, { load: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Calorie result + add to session */}
                    <div style={{ marginTop: '0.75rem', minHeight: '2.5rem' }}>
                      {est ? (
                        <>
                          <div className="row" style={{ gap: '0.5rem' }}>
                            <div style={{
                              flex: 1, padding: '0.5rem 0.875rem', borderRadius: '9px',
                              background: 'var(--accent-primary-dim)', border: '1px solid rgba(52,211,153,0.25)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Est.</span>
                              <span className="mono-num" style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                                ~{est.calories} kcal
                              </span>
                            </div>
                            <button className="btn-primary" style={{ padding: '0.5rem 0.75rem' }}
                              onClick={() => addToSession(ex)} title="Add to session">
                              <Plus size={16} />
                            </button>
                          </div>
                          {est.breakdown && (
                            <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.35rem' }}>
                              ≈ {est.breakdown.workMinutes} min work + {est.breakdown.restMinutes} min rest · {est.breakdown.effectiveMet} MET
                            </p>
                          )}
                        </>
                      ) : (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingTop: '0.5rem' }}>
                          {s.mode === 'duration' || ex.durationOnly
                            ? 'Enter minutes, then add to your session'
                            : 'Enter sets & reps, then add'}
                        </p>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '2rem', textAlign: 'center' }}>
            Exercise images · yuhonas/free-exercise-db (public domain)
          </p>
        </>
      )}

      {/* ── Floating session bar ── */}
      {session.length > 0 && tab === 'catalog' && (
        <div className="session-bar">
          <span style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {session.length} exercise{session.length !== 1 ? 's' : ''}
          </span>
          <span className="mono-num" style={{ fontSize: '0.82rem', color: 'var(--accent-warn)', whiteSpace: 'nowrap' }}>
            <Flame size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> ~{sessionCalories} kcal
          </span>
          <button className="btn-primary" style={{ padding: '0.45rem 1rem' }} onClick={() => setShowFinish(true)}>
            <Check size={15} />Finish
          </button>
        </div>
      )}

      {/* ── Finish session modal ── */}
      {showFinish && (
        <div className="modal-backdrop" onClick={() => setShowFinish(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="row-between" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Today's Session</h2>
              <button className="icon-btn" onClick={() => setShowFinish(false)}><X size={17} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {session.map((e, i) => {
                const col = CAT_COLOR[e.category] ?? DEFAULT_COLOR;
                return (
                  <div key={i} className="row-between" style={{ padding: '0.5rem 0.625rem', borderRadius: 10, background: 'var(--bg-tertiary)' }}>
                    <span className="row" style={{ gap: '0.5rem', minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: col.text, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                    </span>
                    <span className="row" style={{ gap: '0.4rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {describeSets(e)} · ~{e.calories} kcal
                      </span>
                      <button className="icon-btn danger" onClick={() => removeFromSession(i)} title="Remove">
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="row-between" style={{ marginBottom: '1.25rem', padding: '0.75rem 0.875rem', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Total estimated burn</span>
              <span className="mono-num" style={{ fontWeight: 700, color: 'var(--accent-warn)' }}>~{sessionCalories} kcal</span>
            </div>

            <div className="row" style={{ gap: '0.625rem' }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={saveSession} disabled={session.length === 0}>
                <Check size={15} />Save Workout
              </button>
              <button className="btn-secondary" onClick={() => setShowFinish(false)}>Keep Training</button>
            </div>
          </div>
        </div>
      )}

      {showLogin && <LoginPromptModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
