/**
 * Calorie maths shared by the Workout, Calories, Home and Progress pages.
 *
 * ── Energy burned ──────────────────────────────────────────────────
 * Everything is built on the MET (Metabolic Equivalent of Task) formula
 * from the Compendium of Physical Activities:
 *
 *     kcal = MET × bodyKg × hours
 *
 * Cardio / timed exercises use it directly.
 *
 * Strength exercises used to be estimated from "mechanical work"
 * (sets × reps × load × coefficient), which produced numbers 3–5× lower
 * than every fitness tracker because the human body is only ~20–25 %
 * efficient and the model ignored the rest periods where your heart rate
 * stays elevated. The strength model below instead:
 *   1. estimates the time under tension  = sets × reps × secPerRep
 *   2. estimates the rest time           = (sets − 1) × restSeconds
 *   3. applies the exercise MET during work and a light "recovery" MET
 *      (standing, breathing hard) during rest
 *   4. nudges the work MET up when the external load is heavy relative
 *      to body weight.
 *
 * ── Energy needed ──────────────────────────────────────────────────
 * BMR via Mifflin-St Jeor, TDEE via activity multipliers, then a goal
 * adjustment. These are the same formulas MyFitnessPal / Cronometer use.
 */

import type { ActivityLevel, Goal, Sex, UserSettings } from '../types';

/* ── Burn ─────────────────────────────────────────────────────────── */

export const REST_MET = 1.8; // light recovery between sets

export function cardioCalories(met: number, minutes: number, bodyKg: number): number {
  if (!(minutes > 0) || !(bodyKg > 0)) return 0;
  return round1(met * bodyKg * (minutes / 60));
}

export interface StrengthInput {
  met: number;         // Compendium MET for the movement
  sets: number;
  reps: number;
  loadKg: number;      // external load (barbell / dumbbell); 0 for bodyweight
  bodyKg: number;
  secPerRep: number;   // tempo
  restSeconds: number; // rest between sets
}

export interface StrengthBreakdown {
  calories: number;
  workMinutes: number;
  restMinutes: number;
  effectiveMet: number;
}

export function strengthCalories(i: StrengthInput): StrengthBreakdown | null {
  const sets = Math.max(1, Math.floor(i.sets || 0));
  const reps = Math.max(0, i.reps || 0);
  if (reps <= 0 || !(i.bodyKg > 0)) return null;

  const workSec = sets * reps * i.secPerRep;
  const restSec = Math.max(0, sets - 1) * Math.max(0, i.restSeconds);

  // Heavy external load raises intensity: +25 % per body-weight of load, capped at 2× BW.
  const relLoad = Math.min(2, Math.max(0, i.loadKg) / i.bodyKg);
  const effectiveMet = i.met * (1 + 0.25 * relLoad);

  const work = effectiveMet * i.bodyKg * (workSec / 3600);
  const rest = REST_MET * i.bodyKg * (restSec / 3600);

  return {
    calories: round1(work + rest),
    workMinutes: round1(workSec / 60),
    restMinutes: round1(restSec / 60),
    effectiveMet: round1(effectiveMet),
  };
}

/* ── Needs ────────────────────────────────────────────────────────── */

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentary:   { label: 'Sedentary',   hint: 'Desk job, little exercise' },
  light:       { label: 'Light',       hint: '1–3 workouts / week' },
  moderate:    { label: 'Moderate',    hint: '3–5 workouts / week' },
  active:      { label: 'Active',      hint: '6–7 workouts / week' },
  very_active: { label: 'Very active', hint: 'Physical job + daily training' },
};

export const GOAL_ADJUST: Record<Goal, number> = { lose: -500, maintain: 0, gain: 300 };
export const GOAL_LABELS: Record<Goal, string> = { lose: 'Lose fat', maintain: 'Maintain', gain: 'Build muscle' };

export function calcBMR(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78; // midpoint when not specified
}

export interface CalorieTarget {
  target: number;                       // kcal / day to eat
  bmr: number | null;
  tdee: number | null;
  source: 'override' | 'profile' | 'none';
  missing: string[];                    // what the profile still needs
}

/** Daily intake target from the profile. `weightKg` is the latest logged weight. */
export function calcCalorieTarget(s: UserSettings, weightKg: number | null | undefined): CalorieTarget {
  const missing: string[] = [];
  if (!weightKg) missing.push('weight (log it on Progress)');
  if (!s.heightCm) missing.push('height');
  if (!s.birthYear) missing.push('birth year');
  if (!s.sex) missing.push('sex');

  let bmr: number | null = null;
  let tdee: number | null = null;
  if (missing.length === 0) {
    const age = Math.max(10, new Date().getFullYear() - (s.birthYear as number));
    bmr = Math.round(calcBMR(weightKg as number, s.heightCm as number, age, s.sex as Sex));
    tdee = Math.round(bmr * ACTIVITY_FACTORS[s.activityLevel]);
  }

  if (s.calorieTargetOverride) {
    return { target: s.calorieTargetOverride, bmr, tdee, source: 'override', missing };
  }
  if (tdee !== null) {
    const target = Math.max(1200, Math.round((tdee + GOAL_ADJUST[s.goal]) / 10) * 10);
    return { target, bmr, tdee, source: 'profile', missing };
  }
  return { target: 0, bmr: null, tdee: null, source: 'none', missing };
}

/* ── Small helpers ────────────────────────────────────────────────── */

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Trailing moving average; returns null where fewer than `window` points exist. */
export function movingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return round1(slice.reduce((a, b) => a + b, 0) / slice.length);
  });
}
