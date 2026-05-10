import { useState } from 'react';
import { X, Clock, Repeat, ZoomIn, Info, Search } from 'lucide-react';

// ── Image base URL ──────────────────────────────────────────────────────────
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
//
// Calorie model for REPS mode (strength training):
//   kcal = sets × reps × (bodyFraction × bodyKg + loadKg) × burnCoeff
//
//   burnCoeff is derived from mechanical work studies (Robergs et al., ACSM):
//     compound lifts  ≈ 0.005  (bench, squat, deadlift, rows, pull-ups)
//     isolation lifts ≈ 0.003  (curls, tricep pushdown)
//     explosive/full  ≈ 0.006+ (clean & jerk, box jump)
//
//   bodyFraction = portion of body weight actually moved against gravity
//   isWeighted   = show a "load (kg)" input so the barbell/dumbbell weight is counted
//   durationOnly = exercise is time-based (running, jump rope, plank) — hide reps toggle
//
// Calorie model for DURATION mode (cardio):
//   kcal = MET × bodyKg × (minutes / 60)  — standard exercise-science formula, accurate
//   for continuous movement (no rest periods), from Compendium of Physical Activities.

interface Exercise {
  id: string;
  name: string;
  category: string;
  imgFolder: string;
  met: number;
  bodyFraction: number;
  isWeighted: boolean;
  burnCoeff: number;
  durationOnly?: boolean;
}

const EXERCISES: Exercise[] = [
  // ── Chest ──
  { id: 'pushups',          name: 'Push-ups',           category: 'Chest',     imgFolder: 'Pushups',                                   met: 3.8,  bodyFraction: 0.64, isWeighted: false, burnCoeff: 0.005 },
  { id: 'bench-press',      name: 'Bench Press',         category: 'Chest',     imgFolder: 'Barbell_Bench_Press_-_Medium_Grip',         met: 5.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.005 },
  { id: 'incline-bench',    name: 'Incline Bench Press', category: 'Chest',     imgFolder: 'Barbell_Incline_Bench_Press_-_Medium_Grip', met: 5.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.005 },
  { id: 'decline-pushup',   name: 'Decline Push-Up',     category: 'Chest',     imgFolder: 'Decline_Push-Up',                          met: 4.0,  bodyFraction: 0.70, isWeighted: false, burnCoeff: 0.005 },
  { id: 'db-flyes',         name: 'Dumbbell Flyes',      category: 'Chest',     imgFolder: 'Dumbbell_Flyes',                           met: 4.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.004 },
  { id: 'chest-dips',       name: 'Chest Dips',          category: 'Chest',     imgFolder: 'Dips_-_Chest_Version',                     met: 6.0,  bodyFraction: 0.8,  isWeighted: false, burnCoeff: 0.005 },
  // ── Back ──
  { id: 'chin-up',          name: 'Pull-ups',             category: 'Back',      imgFolder: 'Chin-Up',                                  met: 8.0,  bodyFraction: 1.0,  isWeighted: false, burnCoeff: 0.005 },
  { id: 'deadlift',         name: 'Deadlift',             category: 'Back',      imgFolder: 'Barbell_Deadlift',                         met: 6.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.006 },
  { id: 'bent-row',         name: 'Bent-over Row',        category: 'Back',      imgFolder: 'Bent_Over_Barbell_Row',                    met: 5.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.005 },
  { id: 'lat-pulldown',     name: 'Lat Pulldown',         category: 'Back',      imgFolder: 'Wide-Grip_Lat_Pulldown',                   met: 5.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.005 },
  { id: 'rdl',              name: 'Romanian Deadlift',    category: 'Back',      imgFolder: 'Romanian_Deadlift',                        met: 5.5,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.005 },
  { id: 'face-pull',        name: 'Face Pulls',           category: 'Back',      imgFolder: 'Face_Pull',                                met: 3.5,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.003 },
  // ── Legs ──
  { id: 'squats',           name: 'Squats',               category: 'Legs',      imgFolder: 'Bodyweight_Squat',                         met: 5.0,  bodyFraction: 0.56, isWeighted: true,  burnCoeff: 0.005 },
  { id: 'lunges',           name: 'Lunges',               category: 'Legs',      imgFolder: 'Barbell_Walking_Lunge',                    met: 4.0,  bodyFraction: 0.56, isWeighted: true,  burnCoeff: 0.004 },
  { id: 'leg-press',        name: 'Leg Press',            category: 'Legs',      imgFolder: 'Leg_Press',                                met: 5.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.004 },
  { id: 'leg-extension',    name: 'Leg Extension',        category: 'Legs',      imgFolder: 'Leg_Extensions',                           met: 3.5,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.003 },
  { id: 'leg-curl',         name: 'Leg Curl',             category: 'Legs',      imgFolder: 'Lying_Leg_Curls',                          met: 3.5,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.003 },
  { id: 'calf-raise',       name: 'Calf Raises',          category: 'Legs',      imgFolder: 'Standing_Calf_Raises',                     met: 3.0,  bodyFraction: 1.0,  isWeighted: true,  burnCoeff: 0.002 },
  { id: 'hip-thrust',       name: 'Hip Thrust',           category: 'Legs',      imgFolder: 'Barbell_Hip_Thrust',                       met: 4.5,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.005 },
  { id: 'glute-bridge',     name: 'Glute Bridge',         category: 'Legs',      imgFolder: 'Barbell_Glute_Bridge',                     met: 3.5,  bodyFraction: 0.65, isWeighted: false, burnCoeff: 0.004 },
  { id: 'sumo-squat',       name: 'Sumo Squat',           category: 'Legs',      imgFolder: 'Plie_Dumbbell_Squat',                      met: 5.0,  bodyFraction: 0.56, isWeighted: true,  burnCoeff: 0.005 },
  // ── Arms ──
  { id: 'bicep-curl',       name: 'Bicep Curls',          category: 'Arms',      imgFolder: 'Barbell_Curl',                             met: 3.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.003 },
  { id: 'hammer-curl',      name: 'Hammer Curls',         category: 'Arms',      imgFolder: 'Hammer_Curls',                             met: 3.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.003 },
  { id: 'tricep-push',      name: 'Tricep Pushdown',      category: 'Arms',      imgFolder: 'Triceps_Pushdown',                         met: 3.5,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.003 },
  { id: 'skull-crusher',    name: 'Skull Crushers',       category: 'Arms',      imgFolder: 'EZ-Bar_Skullcrusher',                      met: 3.5,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.003 },
  { id: 'tricep-dip',       name: 'Tricep Dips',          category: 'Arms',      imgFolder: 'Dips_-_Triceps_Version',                   met: 6.0,  bodyFraction: 0.8,  isWeighted: false, burnCoeff: 0.005 },
  { id: 'shoulder-press',   name: 'Shoulder Press',       category: 'Arms',      imgFolder: 'Dumbbell_Shoulder_Press',                  met: 3.5,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.004 },
  { id: 'lateral-raise',    name: 'Lateral Raises',       category: 'Arms',      imgFolder: 'Side_Lateral_Raise',                       met: 3.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.003 },
  { id: 'arnold-press',     name: 'Arnold Press',         category: 'Arms',      imgFolder: 'Arnold_Dumbbell_Press',                    met: 3.5,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.004 },
  // ── Core ──
  { id: 'plank',            name: 'Plank',                category: 'Core',      imgFolder: 'Plank',                                    met: 3.8,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'side-plank',       name: 'Side Plank',           category: 'Core',      imgFolder: 'Side_Bridge',                              met: 3.0,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'crunches',         name: 'Crunches',             category: 'Core',      imgFolder: 'Crunches',                                 met: 3.8,  bodyFraction: 0.3,  isWeighted: false, burnCoeff: 0.003 },
  { id: 'bicycle-crunch',   name: 'Bicycle Crunches',     category: 'Core',      imgFolder: 'Cross-Body_Crunch',                        met: 5.0,  bodyFraction: 0.35, isWeighted: false, burnCoeff: 0.003 },
  { id: 'russian-twist',    name: 'Russian Twists',       category: 'Core',      imgFolder: 'Russian_Twist',                            met: 4.0,  bodyFraction: 0.3,  isWeighted: false, burnCoeff: 0.003 },
  { id: 'leg-raise',        name: 'Hanging Leg Raises',   category: 'Core',      imgFolder: 'Hanging_Leg_Raise',                        met: 4.5,  bodyFraction: 0.6,  isWeighted: false, burnCoeff: 0.004 },
  { id: 'v-ups',            name: 'V-Ups',                category: 'Core',      imgFolder: 'Jackknife_Sit-Up',                         met: 5.0,  bodyFraction: 0.5,  isWeighted: false, burnCoeff: 0.004 },
  { id: 'ab-wheel',         name: 'Ab Wheel Rollout',     category: 'Core',      imgFolder: 'Ab_Roller',                                met: 5.0,  bodyFraction: 0.5,  isWeighted: false, burnCoeff: 0.005 },
  { id: 'mtn-climbers',     name: 'Mountain Climbers',    category: 'Core',      imgFolder: 'Mountain_Climbers',                        met: 8.0,  bodyFraction: 0.5,  isWeighted: false, burnCoeff: 0.004 },
  // ── Cardio ──
  { id: 'walking',          name: 'Walking',              category: 'Cardio',    imgFolder: 'Walking_Treadmill',                        met: 3.5,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'brisk-walk',       name: 'Brisk Walking',        category: 'Cardio',    imgFolder: 'Walking_Treadmill',                        met: 4.3,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'hiking',           name: 'Hiking',               category: 'Cardio',    imgFolder: 'Trail_Running_Walking',                    met: 5.3,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'running',          name: 'Running',              category: 'Cardio',    imgFolder: 'Running_Treadmill',                        met: 9.8,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'jogging',          name: 'Jogging',              category: 'Cardio',    imgFolder: 'Jogging_Treadmill',                        met: 7.0,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'cycling',          name: 'Cycling',              category: 'Cardio',    imgFolder: 'Bicycling_Stationary',                     met: 7.0,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'swimming',         name: 'Swimming',             category: 'Cardio',    imgFolder: 'Butterfly',                                met: 7.0,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'elliptical',       name: 'Elliptical',           category: 'Cardio',    imgFolder: 'Elliptical_Trainer',                       met: 5.0,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'rowing-machine',   name: 'Rowing Machine',       category: 'Cardio',    imgFolder: 'Rowing_Stationary',                        met: 7.0,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'stair-climb',      name: 'Stair Climbing',       category: 'Cardio',    imgFolder: 'Stairmaster',                              met: 9.0,  bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'battle-ropes',     name: 'Battle Ropes',         category: 'Cardio',    imgFolder: 'Battling_Ropes',                           met: 10.0, bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  { id: 'star-jump',        name: 'Star Jumps',           category: 'Cardio',    imgFolder: 'Star_Jump',                                met: 8.0,  bodyFraction: 0.8,  isWeighted: false, burnCoeff: 0.004 },
  { id: 'jump-rope',        name: 'Jump Rope',            category: 'Cardio',    imgFolder: 'Rope_Jumping',                             met: 11.8, bodyFraction: 0.0,  isWeighted: false, burnCoeff: 0.0,   durationOnly: true },
  // ── Full Body ──
  { id: 'burpees',          name: 'Burpees',              category: 'Full Body', imgFolder: 'Plyo_Push-up',                             met: 8.0,  bodyFraction: 0.9,  isWeighted: false, burnCoeff: 0.006 },
  { id: 'box-jump',         name: 'Box Jump',             category: 'Full Body', imgFolder: 'Box_Jump_Multiple_Response',               met: 8.0,  bodyFraction: 1.0,  isWeighted: false, burnCoeff: 0.006 },
  { id: 'kettlebell-swing', name: 'Kettlebell Swings',    category: 'Full Body', imgFolder: 'One-Arm_Kettlebell_Swings',                met: 9.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.007 },
  { id: 'thruster',         name: 'Thrusters',            category: 'Full Body', imgFolder: 'Kettlebell_Thruster',                      met: 8.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.006 },
  { id: 'clean-jerk',       name: 'Clean & Jerk',         category: 'Full Body', imgFolder: 'Clean_and_Jerk',                           met: 8.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.007 },
  { id: 'turkish-getup',    name: 'Turkish Get-Up',       category: 'Full Body', imgFolder: 'Kettlebell_Turkish_Get-Up_Lunge_style',    met: 5.0,  bodyFraction: 0.0,  isWeighted: true,  burnCoeff: 0.006 },
];

// ── Calorie calculation ──────────────────────────────────────────────────────
interface ExState {
  mode: 'duration' | 'reps';
  value: string;  // minutes (duration) or reps per set (reps)
  sets: string;   // number of sets
  load: string;   // extra load weight in kg (barbell / dumbbell)
}

function calcCalories(ex: Exercise, s: ExState, bodyKg: number): number | null {
  const v = parseFloat(s.value);
  if (isNaN(v) || v <= 0 || bodyKg <= 0) return null;

  if (s.mode === 'duration') {
    // MET formula — accurate for continuous-movement cardio (no rest periods)
    return Math.round(ex.met * bodyKg * (v / 60) * 10) / 10;
  }

  // Reps mode — mechanical work model (more accurate for gym strength training)
  // Based on: work = sets × reps × load × g × ROM, divided by ~25% mechanical efficiency
  // Simplified to: sets × reps × effectiveKg × burnCoeff  (coeff derived from lab studies)
  const sets = Math.max(1, parseFloat(s.sets) || 1);
  const loadKg = ex.isWeighted ? Math.max(0, parseFloat(s.load) || 0) : 0;
  const effectiveKg = ex.bodyFraction * bodyKg + loadKg;
  if (effectiveKg <= 0) return null;
  return Math.round(sets * v * effectiveKg * ex.burnCoeff * 10) / 10;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ExercisesPage() {
  const [weight, setWeight]     = useState<string>('70');
  const [filter, setFilter]     = useState('All');
  const [search, setSearch]     = useState('');
  const [modalEx, setModalEx]   = useState<Exercise | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [exStates, setExStates] = useState<Record<string, ExState>>({});

  const bodyKg = Math.max(1, parseFloat(weight) || 70);

  function getState(id: string, ex: Exercise): ExState {
    return exStates[id] ?? { mode: ex.durationOnly ? 'duration' : 'reps', value: '', sets: '3', load: '' };
  }
  function patchState(id: string, patch: Partial<ExState>) {
    setExStates(prev => ({ ...prev, [id]: { ...getState(id, EXERCISES.find(e => e.id === id)!), ...patch } }));
  }

  const filtered = EXERCISES
    .filter(e => filter === 'All' || e.category === filter)
    .filter(e => !search.trim() || e.name.toLowerCase().includes(search.toLowerCase()));

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

      {/* ── Page header ── */}
      <h1 className="page-title">Exercises</h1>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative', marginBottom: '1rem', marginTop: '-0.25rem' }}>
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

      {/* ── Weight + method info card ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
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

          {/* Method explanation */}
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
                <p>
                  <strong style={{ color: 'var(--accent-primary)' }}>Strength (Reps mode):</strong>{' '}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem' }}>
                    sets × reps × load(kg) × coeff
                  </span>
                </p>
                <p style={{ marginTop: '0.2rem', fontSize: '0.72rem' }}>
                  Based on mechanical work studies (Robergs et al., ACSM). Counts only actual
                  lifting time — rest periods between sets are correctly excluded, which is why
                  this gives a much lower, more realistic number than MET × duration.
                </p>
                <p style={{ marginTop: '0.35rem' }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>Cardio (Duration mode):</strong>{' '}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem' }}>
                    MET × weight(kg) × (min ÷ 60)
                  </span>
                </p>
                <p style={{ marginTop: '0.2rem', fontSize: '0.72rem' }}>
                  Standard formula from the Compendium of Physical Activities — accurate for
                  continuous movement (running, jump rope, etc.) with no rest breaks.
                </p>
              </div>
            )}

            {!showInfo && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Strength: mechanical-work model · Cardio: MET formula ·{' '}
                <strong style={{ color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{bodyKg} kg</strong>
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

      {/* ── No results ── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          <Search size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.875rem' }}>No exercises match "{search}"</p>
        </div>
      )}

      {/* ── Exercise grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {filtered.map(ex => {
          const s    = getState(ex.id, ex);
          const cals = calcCalories(ex, s, bodyKg);
          const col  = CAT_COLOR[ex.category] ?? DEFAULT_COLOR;

          return (
            <div key={ex.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* Thumbnail */}
              <div className="exercise-thumb" onClick={() => setModalEx(ex)} style={{ position: 'relative' }}>
                <img
                  src={IMG(ex.imgFolder)}
                  alt={ex.name}
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

                {/* Duration / Reps toggle (hidden for duration-only exercises) */}
                {!ex.durationOnly && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {(['reps', 'duration'] as const).map(mode => (
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
                )}

                {/* Inputs */}
                {s.mode === 'duration' || ex.durationOnly ? (
                  /* Duration: single minutes input */
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="Minutes…"
                    value={s.value}
                    onChange={e => patchState(ex.id, { value: e.target.value })}
                  />
                ) : (
                  /* Reps: sets + reps per set + (optional) load */
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
                          Load (kg) <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— barbell / dumbbell</span>
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
                      {s.mode === 'duration' || ex.durationOnly
                        ? 'Enter minutes to calculate'
                        : ex.isWeighted
                          ? 'Enter sets, reps & load to calculate'
                          : 'Enter sets & reps to calculate'}
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
