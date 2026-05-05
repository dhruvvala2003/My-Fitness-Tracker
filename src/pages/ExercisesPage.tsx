import { useState } from 'react';
import { X, Clock, Repeat, ZoomIn, Info } from 'lucide-react';

// ── Image base URL ──────────────────────────────────────────────────────────
// Source: https://github.com/yuhonas/free-exercise-db (public domain)
const IMG = (folder: string) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${folder}/0.jpg`;

// ── Category colours ────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio', 'Full Body'];

const CAT_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Chest:       { text: '#00ff9d', bg: 'rgba(0,255,157,0.12)',  border: 'rgba(0,255,157,0.3)'  },
  Back:        { text: '#00d4ff', bg: 'rgba(0,212,255,0.12)',  border: 'rgba(0,212,255,0.3)'  },
  Legs:        { text: '#ffa502', bg: 'rgba(255,165,2,0.12)',  border: 'rgba(255,165,2,0.3)'  },
  Arms:        { text: '#7c3aed', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)' },
  Core:        { text: '#ff6b9d', bg: 'rgba(255,107,157,0.12)',border: 'rgba(255,107,157,0.3)'},
  Cardio:      { text: '#ff4757', bg: 'rgba(255,71,87,0.12)',  border: 'rgba(255,71,87,0.3)'  },
  'Full Body': { text: '#a3e635', bg: 'rgba(163,230,53,0.12)', border: 'rgba(163,230,53,0.3)' },
};
const DEFAULT_COLOR = CAT_COLOR.Chest;

// ── Exercise data ───────────────────────────────────────────────────────────
// met: Metabolic Equivalent of Task (from Compendium of Physical Activities)
// calsPerRep: estimated kcal per rep at 70 kg — scaled by actual weight at runtime
interface Exercise {
  id: string;
  name: string;
  category: string;
  imgFolder: string;
  met: number;
  calsPerRep: number;
}

const EXERCISES: Exercise[] = [
  // ── Chest ──
  { id: 'pushups',        name: 'Push-ups',        category: 'Chest',     imgFolder: 'Pushups',                             met: 3.8,  calsPerRep: 0.32 },
  { id: 'bench-press',    name: 'Bench Press',      category: 'Chest',     imgFolder: 'Barbell_Bench_Press_-_Medium_Grip',   met: 5.0,  calsPerRep: 0.45 },
  { id: 'decline-pushup', name: 'Decline Push-Up',  category: 'Chest',     imgFolder: 'Decline_Push-Up',                    met: 4.0,  calsPerRep: 0.35 },
  // ── Back ──
  { id: 'chin-up',        name: 'Pull-ups',         category: 'Back',      imgFolder: 'Chin-Up',                             met: 8.0,  calsPerRep: 0.65 },
  { id: 'deadlift',       name: 'Deadlift',         category: 'Back',      imgFolder: 'Barbell_Deadlift',                    met: 6.0,  calsPerRep: 0.5  },
  { id: 'bent-row',       name: 'Bent-over Row',    category: 'Back',      imgFolder: 'Bent_Over_Barbell_Row',               met: 5.0,  calsPerRep: 0.4  },
  // ── Legs ──
  { id: 'squats',         name: 'Squats',           category: 'Legs',      imgFolder: 'Bodyweight_Squat',                    met: 5.0,  calsPerRep: 0.32 },
  { id: 'lunges',         name: 'Lunges',           category: 'Legs',      imgFolder: 'Barbell_Walking_Lunge',               met: 4.0,  calsPerRep: 0.25 },
  { id: 'leg-press',      name: 'Leg Press',        category: 'Legs',      imgFolder: 'Leg_Press',                           met: 5.0,  calsPerRep: 0.35 },
  // ── Arms ──
  { id: 'bicep-curl',     name: 'Bicep Curls',      category: 'Arms',      imgFolder: 'Barbell_Curl',                        met: 3.0,  calsPerRep: 0.2  },
  { id: 'tricep-push',    name: 'Tricep Pushdown',  category: 'Arms',      imgFolder: 'Triceps_Pushdown',                    met: 3.5,  calsPerRep: 0.25 },
  { id: 'shoulder-press', name: 'Shoulder Press',   category: 'Arms',      imgFolder: 'Dumbbell_Shoulder_Press',             met: 3.5,  calsPerRep: 0.35 },
  // ── Core ──
  { id: 'plank',          name: 'Plank',            category: 'Core',      imgFolder: 'Plank',                               met: 3.8,  calsPerRep: 0.08 },
  { id: 'crunches',       name: 'Crunches',         category: 'Core',      imgFolder: 'Crunches',                            met: 3.8,  calsPerRep: 0.15 },
  { id: 'russian-twist',  name: 'Russian Twists',   category: 'Core',      imgFolder: 'Russian_Twist',                       met: 4.0,  calsPerRep: 0.15 },
  { id: 'mtn-climbers',   name: 'Mountain Climbers',category: 'Core',      imgFolder: 'Mountain_Climbers',                   met: 8.0,  calsPerRep: 0.1  },
  // ── Cardio ──
  { id: 'running',        name: 'Running',          category: 'Cardio',    imgFolder: 'Running_Treadmill',                   met: 9.8,  calsPerRep: 0.05 },
  { id: 'star-jump',      name: 'Star Jumps',       category: 'Cardio',    imgFolder: 'Star_Jump',                           met: 8.0,  calsPerRep: 0.2  },
  { id: 'jump-rope',      name: 'Jump Rope',        category: 'Cardio',    imgFolder: 'Rope_Jumping',                        met: 11.8, calsPerRep: 0.15 },
  // ── Full Body ──
  { id: 'box-jump',       name: 'Box Jump',         category: 'Full Body', imgFolder: 'Box_Jump_Multiple_Response',          met: 8.0,  calsPerRep: 0.5  },
  { id: 'clean-jerk',     name: 'Clean & Jerk',     category: 'Full Body', imgFolder: 'Clean_and_Jerk',                      met: 8.0,  calsPerRep: 0.6  },
];

// ── Calorie calculation ──────────────────────────────────────────────────────
// Duration:  MET × weight(kg) × time(h)         — standard exercise science formula
// Reps:      calsPerRep × (weight / 70) × reps  — scales linearly with body weight
interface ExState { mode: 'duration' | 'reps'; value: string; }

function calcCalories(ex: Exercise, s: ExState, weightKg: number): number | null {
  const v = parseFloat(s.value);
  if (isNaN(v) || v <= 0 || weightKg <= 0) return null;
  const w = weightKg;
  if (s.mode === 'duration') return Math.round(ex.met * w * (v / 60) * 10) / 10;
  return Math.round(ex.calsPerRep * (w / 70) * v * 10) / 10;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ExercisesPage() {
  const [weight, setWeight]     = useState<string>('70');
  const [filter, setFilter]     = useState('All');
  const [modalEx, setModalEx]   = useState<Exercise | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [exStates, setExStates] = useState<Record<string, ExState>>({});

  const weightKg = Math.max(1, parseFloat(weight) || 70);

  function getState(id: string): ExState { return exStates[id] ?? { mode: 'duration', value: '' }; }
  function patchState(id: string, patch: Partial<ExState>) {
    setExStates(prev => ({ ...prev, [id]: { ...getState(id), ...patch } }));
  }

  const filtered = filter === 'All' ? EXERCISES : EXERCISES.filter(e => e.category === filter);

  return (
    <div className="page">

      {/* ── Full-size image modal ── */}
      {modalEx && (
        <div
          onClick={() => setModalEx(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)',
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
              style={{ width: '100%', borderRadius: '14px', display: 'block', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            />
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

      {/* ── Page header ── */}
      <h1 className="page-title">Exercises</h1>

      {/* ── Weight + formula card ── */}
      <div className="card" style={{ marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Weight input */}
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '0.4rem' }}>
              Your Weight
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                className="input"
                min="20"
                max="300"
                placeholder="70"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                style={{ width: '80px', textAlign: 'center' }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>kg</span>
            </div>
          </div>

          {/* Formula explanation */}
          <div style={{ flex: 1, minWidth: '200px' }}>
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
            {showInfo && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                <p><strong style={{ color: 'var(--text-primary)' }}>Duration mode:</strong>{' '}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem' }}>
                    MET × weight(kg) × (min ÷ 60)
                  </span>
                </p>
                <p style={{ marginTop: '0.25rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Reps mode:</strong>{' '}
                  kcal/rep rate × (your weight ÷ 70) × reps
                </p>
                <p style={{ marginTop: '0.35rem', fontSize: '0.72rem' }}>
                  MET (Metabolic Equivalent of Task) is a peer-reviewed intensity scale from the
                  Compendium of Physical Activities — the same standard used by fitness trackers
                  and gym equipment.
                </p>
              </div>
            )}
            {!showInfo && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Using <strong style={{ color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{weightKg} kg</strong> · MET formula · scales with your weight
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Category filter pills ── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              padding: '0.3rem 0.75rem', borderRadius: '999px',
              border: '1px solid', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
              background:  filter === c ? 'var(--accent-secondary)' : 'transparent',
              borderColor: filter === c ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              color:       filter === c ? '#fff' : 'var(--text-secondary)',
              fontWeight:  filter === c ? 700 : 400,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ── Exercise grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {filtered.map(ex => {
          const s    = getState(ex.id);
          const cals = calcCalories(ex, s, weightKg);
          const col  = CAT_COLOR[ex.category] ?? DEFAULT_COLOR;

          return (
            <div key={ex.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Thumbnail — click to open full-size modal */}
              <div className="exercise-thumb" onClick={() => setModalEx(ex)}>
                <img
                  src={IMG(ex.imgFolder)}
                  alt={ex.name}
                  style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                />
                <div className="exercise-zoom-icon">
                  <ZoomIn size={26} color="white" />
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '1rem' }}>

                {/* Name + category badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ex.name}</span>
                  <span style={{
                    fontSize: '0.65rem', padding: '0.2rem 0.55rem', borderRadius: '999px',
                    whiteSpace: 'nowrap', fontWeight: 600, flexShrink: 0,
                    background: col.bg, color: col.text, border: `1px solid ${col.border}`,
                  }}>
                    {ex.category}
                  </span>
                </div>

                {/* Duration / Reps toggle */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {(['duration', 'reps'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => patchState(ex.id, { mode, value: '' })}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                        padding: '0.35rem 0', borderRadius: '7px', fontSize: '0.78rem',
                        cursor: 'pointer', border: '1px solid', transition: 'all 150ms',
                        background:  s.mode === mode ? 'rgba(0,255,157,0.1)' : 'transparent',
                        borderColor: s.mode === mode ? 'var(--accent-primary)' : 'var(--border)',
                        color:       s.mode === mode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight:  s.mode === mode ? 600 : 400,
                      }}
                    >
                      {mode === 'duration' ? <Clock size={12} /> : <Repeat size={12} />}
                      {mode === 'duration' ? 'Duration' : 'Reps'}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder={s.mode === 'duration' ? 'Minutes...' : 'Repetitions...'}
                  value={s.value}
                  onChange={e => patchState(ex.id, { value: e.target.value })}
                />

                {/* Calorie result */}
                <div style={{ marginTop: '0.75rem', minHeight: '2.5rem', display: 'flex', alignItems: 'center' }}>
                  {cals !== null ? (
                    <div style={{
                      width: '100%', padding: '0.55rem 0.875rem', borderRadius: '8px',
                      background: 'rgba(0,255,157,0.06)', border: '1px solid rgba(0,255,157,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Est. calories</span>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                        color: 'var(--accent-primary)', fontSize: '1.05rem',
                        textShadow: '0 0 16px rgba(0,255,157,0.4)',
                      }}>
                        ~{cals} kcal
                      </span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Enter {s.mode === 'duration' ? 'minutes' : 'reps'} to calculate
                    </p>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2rem', textAlign: 'center', opacity: 0.6 }}>
        Exercise images · yuhonas/free-exercise-db (public domain)
      </p>
    </div>
  );
}
