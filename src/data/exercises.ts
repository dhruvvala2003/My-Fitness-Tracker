/**
 * Exercise catalog used by the Workout page.
 *
 * MET values come from the Compendium of Physical Activities (2011/2024):
 *   weight lifting, vigorous ........ 6.0      calisthenics, vigorous ...... 8.0
 *   weight lifting, light/moderate .. 3.5      calisthenics, moderate ...... 3.8
 *   isolation / machine work ........ 3.5–4.5  explosive / plyometric ...... 8.0–10.0
 *
 * secPerRep = typical tempo (controlled lifts ≈ 4 s, bodyweight ≈ 2.5 s,
 * fast/explosive ≈ 1.5 s). It only drives the time-under-tension estimate.
 */
export interface Exercise {
  id: string;
  name: string;
  category: string;
  imgFolder: string;
  met: number;
  isWeighted: boolean;     // show a "load (kg)" input
  secPerRep: number;
  durationOnly?: boolean;  // time-based movement (plank, cardio) — no reps input
}

export const IMG = (folder: string) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${folder}/0.jpg`;

export const CATEGORIES = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio', 'Full Body'];

export const CAT_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  Chest:       { text: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  Back:        { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)'  },
  Legs:        { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  Arms:        { text: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  Core:        { text: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)' },
  Cardio:      { text: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  'Full Body': { text: '#a3e635', bg: 'rgba(163,230,53,0.12)',  border: 'rgba(163,230,53,0.3)'  },
};
export const DEFAULT_COLOR = CAT_COLOR.Chest;

const LIFT = 4;      // controlled barbell / dumbbell tempo
const BODY = 2.5;    // bodyweight calisthenics
const FAST = 1.5;    // explosive / plyometric

export const EXERCISES: Exercise[] = [
  // ── Chest ──
  { id: 'pushups',        name: 'Push-ups',            category: 'Chest', imgFolder: 'Pushups',                                   met: 8.0, isWeighted: false, secPerRep: BODY },
  { id: 'bench-press',    name: 'Bench Press',          category: 'Chest', imgFolder: 'Barbell_Bench_Press_-_Medium_Grip',         met: 6.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'incline-bench',  name: 'Incline Bench Press',  category: 'Chest', imgFolder: 'Barbell_Incline_Bench_Press_-_Medium_Grip', met: 6.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'decline-pushup', name: 'Decline Push-Up',      category: 'Chest', imgFolder: 'Decline_Push-Up',                          met: 8.0, isWeighted: false, secPerRep: BODY },
  { id: 'db-flyes',       name: 'Dumbbell Flyes',       category: 'Chest', imgFolder: 'Dumbbell_Flyes',                           met: 4.5, isWeighted: true,  secPerRep: LIFT },
  { id: 'chest-dips',     name: 'Chest Dips',           category: 'Chest', imgFolder: 'Dips_-_Chest_Version',                     met: 8.0, isWeighted: true,  secPerRep: BODY },
  // ── Back ──
  { id: 'chin-up',        name: 'Pull-ups',             category: 'Back',  imgFolder: 'Chin-Up',                                  met: 8.0, isWeighted: true,  secPerRep: BODY },
  { id: 'deadlift',       name: 'Deadlift',             category: 'Back',  imgFolder: 'Barbell_Deadlift',                         met: 6.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'bent-row',       name: 'Bent-over Row',        category: 'Back',  imgFolder: 'Bent_Over_Barbell_Row',                    met: 6.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'lat-pulldown',   name: 'Lat Pulldown',         category: 'Back',  imgFolder: 'Wide-Grip_Lat_Pulldown',                   met: 5.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'rdl',            name: 'Romanian Deadlift',    category: 'Back',  imgFolder: 'Romanian_Deadlift',                        met: 6.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'face-pull',      name: 'Face Pulls',           category: 'Back',  imgFolder: 'Face_Pull',                                met: 3.5, isWeighted: true,  secPerRep: LIFT },
  // ── Legs ──
  { id: 'squats',         name: 'Squats',               category: 'Legs',  imgFolder: 'Bodyweight_Squat',                         met: 6.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'lunges',         name: 'Lunges',               category: 'Legs',  imgFolder: 'Barbell_Walking_Lunge',                    met: 5.5, isWeighted: true,  secPerRep: BODY },
  { id: 'leg-press',      name: 'Leg Press',            category: 'Legs',  imgFolder: 'Leg_Press',                                met: 5.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'leg-extension',  name: 'Leg Extension',        category: 'Legs',  imgFolder: 'Leg_Extensions',                           met: 3.5, isWeighted: true,  secPerRep: LIFT },
  { id: 'leg-curl',       name: 'Leg Curl',             category: 'Legs',  imgFolder: 'Lying_Leg_Curls',                          met: 3.5, isWeighted: true,  secPerRep: LIFT },
  { id: 'calf-raise',     name: 'Calf Raises',          category: 'Legs',  imgFolder: 'Standing_Calf_Raises',                     met: 3.5, isWeighted: true,  secPerRep: BODY },
  { id: 'hip-thrust',     name: 'Hip Thrust',           category: 'Legs',  imgFolder: 'Barbell_Hip_Thrust',                       met: 5.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'glute-bridge',   name: 'Glute Bridge',         category: 'Legs',  imgFolder: 'Barbell_Glute_Bridge',                     met: 3.8, isWeighted: true,  secPerRep: BODY },
  { id: 'sumo-squat',     name: 'Sumo Squat',           category: 'Legs',  imgFolder: 'Plie_Dumbbell_Squat',                      met: 6.0, isWeighted: true,  secPerRep: LIFT },
  // ── Arms & shoulders ──
  { id: 'bicep-curl',     name: 'Bicep Curls',          category: 'Arms',  imgFolder: 'Barbell_Curl',                             met: 3.5, isWeighted: true,  secPerRep: LIFT },
  { id: 'hammer-curl',    name: 'Hammer Curls',         category: 'Arms',  imgFolder: 'Hammer_Curls',                             met: 3.5, isWeighted: true,  secPerRep: LIFT },
  { id: 'tricep-push',    name: 'Tricep Pushdown',      category: 'Arms',  imgFolder: 'Triceps_Pushdown',                         met: 3.5, isWeighted: true,  secPerRep: LIFT },
  { id: 'skull-crusher',  name: 'Skull Crushers',       category: 'Arms',  imgFolder: 'EZ-Bar_Skullcrusher',                      met: 3.5, isWeighted: true,  secPerRep: LIFT },
  { id: 'tricep-dip',     name: 'Tricep Dips',          category: 'Arms',  imgFolder: 'Dips_-_Triceps_Version',                   met: 8.0, isWeighted: true,  secPerRep: BODY },
  { id: 'shoulder-press', name: 'Shoulder Press',       category: 'Arms',  imgFolder: 'Dumbbell_Shoulder_Press',                  met: 5.0, isWeighted: true,  secPerRep: LIFT },
  { id: 'lateral-raise',  name: 'Lateral Raises',       category: 'Arms',  imgFolder: 'Side_Lateral_Raise',                       met: 3.5, isWeighted: true,  secPerRep: LIFT },
  { id: 'arnold-press',   name: 'Arnold Press',         category: 'Arms',  imgFolder: 'Arnold_Dumbbell_Press',                    met: 5.0, isWeighted: true,  secPerRep: LIFT },
  // ── Core ──
  { id: 'plank',          name: 'Plank',                category: 'Core',  imgFolder: 'Plank',                                    met: 3.8, isWeighted: false, secPerRep: BODY, durationOnly: true },
  { id: 'side-plank',     name: 'Side Plank',           category: 'Core',  imgFolder: 'Side_Bridge',                              met: 3.5, isWeighted: false, secPerRep: BODY, durationOnly: true },
  { id: 'crunches',       name: 'Crunches',             category: 'Core',  imgFolder: 'Crunches',                                 met: 3.8, isWeighted: false, secPerRep: 2 },
  { id: 'bicycle-crunch', name: 'Bicycle Crunches',     category: 'Core',  imgFolder: 'Cross-Body_Crunch',                        met: 5.0, isWeighted: false, secPerRep: FAST },
  { id: 'russian-twist',  name: 'Russian Twists',       category: 'Core',  imgFolder: 'Russian_Twist',                            met: 4.5, isWeighted: true,  secPerRep: FAST },
  { id: 'leg-raise',      name: 'Hanging Leg Raises',   category: 'Core',  imgFolder: 'Hanging_Leg_Raise',                        met: 5.0, isWeighted: false, secPerRep: BODY },
  { id: 'v-ups',          name: 'V-Ups',                category: 'Core',  imgFolder: 'Jackknife_Sit-Up',                         met: 5.5, isWeighted: false, secPerRep: 2 },
  { id: 'ab-wheel',       name: 'Ab Wheel Rollout',     category: 'Core',  imgFolder: 'Ab_Roller',                                met: 5.5, isWeighted: false, secPerRep: 3 },
  { id: 'mtn-climbers',   name: 'Mountain Climbers',    category: 'Core',  imgFolder: 'Mountain_Climbers',                        met: 8.0, isWeighted: false, secPerRep: 1 },
  // ── Cardio (time based) ──
  { id: 'walking',        name: 'Walking',              category: 'Cardio', imgFolder: 'Walking_Treadmill',                       met: 3.5,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'brisk-walk',     name: 'Brisk Walking',        category: 'Cardio', imgFolder: 'Walking_Treadmill',                       met: 4.8,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'hiking',         name: 'Hiking',               category: 'Cardio', imgFolder: 'Trail_Running_Walking',                   met: 6.0,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'jogging',        name: 'Jogging',              category: 'Cardio', imgFolder: 'Jogging_Treadmill',                       met: 7.0,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'running',        name: 'Running',              category: 'Cardio', imgFolder: 'Running_Treadmill',                       met: 9.8,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'cycling',        name: 'Cycling',              category: 'Cardio', imgFolder: 'Bicycling_Stationary',                    met: 6.8,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'swimming',       name: 'Swimming',             category: 'Cardio', imgFolder: 'Butterfly',                               met: 7.0,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'elliptical',     name: 'Elliptical',           category: 'Cardio', imgFolder: 'Elliptical_Trainer',                      met: 5.0,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'rowing-machine', name: 'Rowing Machine',       category: 'Cardio', imgFolder: 'Rowing_Stationary',                       met: 7.0,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'stair-climb',    name: 'Stair Climbing',       category: 'Cardio', imgFolder: 'Stairmaster',                             met: 9.0,  isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'battle-ropes',   name: 'Battle Ropes',         category: 'Cardio', imgFolder: 'Battling_Ropes',                          met: 10.0, isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'jump-rope',      name: 'Jump Rope',            category: 'Cardio', imgFolder: 'Rope_Jumping',                            met: 11.8, isWeighted: false, secPerRep: 0, durationOnly: true },
  { id: 'star-jump',      name: 'Star Jumps',           category: 'Cardio', imgFolder: 'Star_Jump',                               met: 8.0,  isWeighted: false, secPerRep: 1 },
  // ── Full body ──
  { id: 'burpees',        name: 'Burpees',              category: 'Full Body', imgFolder: 'Plyo_Push-up',                         met: 10.0, isWeighted: false, secPerRep: 3 },
  { id: 'box-jump',       name: 'Box Jump',             category: 'Full Body', imgFolder: 'Box_Jump_Multiple_Response',           met: 8.0,  isWeighted: false, secPerRep: 2 },
  { id: 'kettlebell-swing', name: 'Kettlebell Swings',  category: 'Full Body', imgFolder: 'One-Arm_Kettlebell_Swings',            met: 9.0,  isWeighted: true,  secPerRep: FAST },
  { id: 'thruster',       name: 'Thrusters',            category: 'Full Body', imgFolder: 'Kettlebell_Thruster',                  met: 8.0,  isWeighted: true,  secPerRep: 3 },
  { id: 'clean-jerk',     name: 'Clean & Jerk',         category: 'Full Body', imgFolder: 'Clean_and_Jerk',                       met: 8.0,  isWeighted: true,  secPerRep: 4 },
  { id: 'turkish-getup',  name: 'Turkish Get-Up',       category: 'Full Body', imgFolder: 'Kettlebell_Turkish_Get-Up_Lunge_style', met: 6.0,  isWeighted: true,  secPerRep: 8 },
];
