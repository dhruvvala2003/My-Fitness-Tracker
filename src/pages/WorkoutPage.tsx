import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  X, Clock, Repeat, ZoomIn, Info, Search, Plus, Check, Trash2,
  Dumbbell, History, Flame, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import { today, formatFullDate } from '../utils/dateHelpers';
import type { WorkoutExercise, WorkoutSession } from '../types';

// ── Image base URL ──────────────────────────────────────────────────────────
const IMG = (folder: string) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${folder}/0.jpg`;

// ── Category colours (badge/UI colors on the new theme) ─────────────────────
const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio', 'Full Body'];

const CAT_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Chest:       { text: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  Back:        { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)'  },
  Legs:        { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  Arms:        { text: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  Core:        { text: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)' },
  Cardio:      { text: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  'Full Body': { text: '#a3e635', bg: 'rgba(163,230,53,0.12)',  border: 'rgba(163,230,53,0.3)'  },
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
  const sets = Math.max(1, parseFloat(s.sets) || 1);
  const loadKg = ex.isWeighted ? Math.max(0, parseFloat(s.load) || 0) : 0;
  const effectiveKg = ex.bodyFraction * bodyKg + loadKg;
  if (effectiveKg <= 0) return null;
  return Math.round(sets * v * effectiveKg * ex.burnCoeff * 10) / 10;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const { data, addWorkout, deleteWorkout } = useAppData();
  const { user } = useAuth();

  const latestWeight = data.weights[data.weights.length - 1]?.weightKg;

  const [tab, setTab]           = useState<'catalog' | 'history'>('catalog');
  const [weight, setWeight]     = useState<string>(latestWeight ? String(latestWeight) : '70');
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

  function getState(id: string, ex: Exercise): ExState {
    return exStates[id] ?? { mode: ex.durationOnly ? 'duration' : 'reps', value: '', sets: '3', load: '' };
  }
  function patchState(id: string, patch: Partial<ExState>) {
    setExStates(prev => ({ ...prev, [id]: { ...getState(id, EXERCISES.find(e => e.id === id)!), ...patch } }));
  }

  const filtered = EXERCISES
    .filter(e => filter === 'All' || e.category === filter)
    .filter(e => !search.trim() || e.name.toLowerCase().includes(search.toLowerCase()));

  const sessionCalories = useMemo(
    () => Math.round(session.reduce((s, e) => s + e.calories, 0) * 10) / 10,
    [session],
  );

  /* ── Session actions ── */

  function addToSession(ex: Exercise) {
    const s = getState(ex.id, ex);
    const cals = calcCalories(ex, s, bodyKg);
    if (cals === null) return;

    let sets;
    if (s.mode === 'duration' || ex.durationOnly) {
      sets = [{ reps: 0, weightKg: 0, durationMin: parseFloat(s.value) }];
    } else {
      const nSets = Math.max(1, parseInt(s.sets) || 1);
      const reps = parseInt(s.value) || 0;
      const load = ex.isWeighted ? Math.max(0, parseFloat(s.load) || 0) : 0;
      sets = Array.from({ length: nSets }, () => ({ reps, weightKg: load }));
    }

    setSession(prev => [...prev, { name: ex.name, category: ex.category, sets, calories: cals }]);
    patchState(ex.id, { value: '' });
  }

  function removeFromSession(idx: number) {
    setSession(prev => prev.filter((_, i) => i !== idx));
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
        data.workouts.length === 0 ? (
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
                      <Flame size={12} style={{ display: 'inline', verticalAlign: '-2px', color: 'var(--accent-warn)' }} /> ~{w.totalCalories} kcal
                    </div>
                  </div>
                  <div className="row" style={{ gap: '0.25rem' }}>
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
        )
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

          {/* ── Weight + method info card ── */}
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
                    onChange={e => setWeight(e.target.value)}
                    style={{ width: '80px', textAlign: 'center' }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>kg</span>
                </div>
                {latestWeight !== undefined && (
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 4 }}>
                    prefilled from Progress
                  </p>
                )}
              </div>

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

                {showInfo ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    <p>
                      <strong style={{ color: 'var(--accent-primary)' }}>Strength (Reps mode):</strong>{' '}
                      <span className="mono-num" style={{ fontSize: '0.72rem' }}>sets × reps × load(kg) × coeff</span>
                    </p>
                    <p style={{ marginTop: '0.2rem', fontSize: '0.72rem' }}>
                      Based on mechanical work studies (Robergs et al., ACSM). Counts only actual
                      lifting time — rest periods between sets are correctly excluded.
                    </p>
                    <p style={{ marginTop: '0.35rem' }}>
                      <strong style={{ color: 'var(--accent-primary)' }}>Cardio (Duration mode):</strong>{' '}
                      <span className="mono-num" style={{ fontSize: '0.72rem' }}>MET × weight(kg) × (min ÷ 60)</span>
                    </p>
                    <p style={{ marginTop: '0.2rem', fontSize: '0.72rem' }}>
                      Standard formula from the Compendium of Physical Activities — accurate for
                      continuous movement with no rest breaks.
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Strength: mechanical-work model · Cardio: MET formula ·{' '}
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
              const cals = calcCalories(ex, s, bodyKg);
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

                    {/* Calorie result + add to session */}
                    <div style={{ marginTop: '0.75rem', minHeight: '2.5rem' }}>
                      {cals !== null ? (
                        <div className="row" style={{ gap: '0.5rem' }}>
                          <div style={{
                            flex: 1, padding: '0.5rem 0.875rem', borderRadius: '9px',
                            background: 'var(--accent-primary-dim)', border: '1px solid rgba(52,211,153,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Est.</span>
                            <span className="mono-num" style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                              ~{cals} kcal
                            </span>
                          </div>
                          <button className="btn-primary" style={{ padding: '0.5rem 0.75rem' }}
                            onClick={() => addToSession(ex)} title="Add to session">
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingTop: '0.5rem' }}>
                          {s.mode === 'duration' || ex.durationOnly
                            ? 'Enter minutes, then add to your session'
                            : ex.isWeighted
                              ? 'Enter sets, reps & load, then add'
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
