export interface HabitsData {
  columns: string[];
  descriptions: string[];   // optional hover text/description for each habit column
  hiddenColumns: number[];   // indices of columns hidden from habits table & all calculations
  overallColumns: number[];  // indices included in the overall progress calculation
  noteColumns: number[];     // indices of columns that have notes enabled
  checks: Record<string, Record<string, boolean>>;
  notes: Record<string, Record<string, string>>;
}

export type CoreHabitsData = HabitsData;

export interface StreakData {
  id: string;
  name: string;
  startDate: string;
  breakDates: string[];
}

export interface CalorieEntry {
  id: string;
  name: string;
  amount: number;     // grams (or ml)
  calories: number;
  time: string;       // HH:MM
}

export interface InsightEntry {
  id: string;
  type: 'learning' | 'mistake' | 'good' | 'bad';
  text: string;
  rating: number; // 1–5
  date: string;   // YYYY-MM-DD
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  date: string;   // YYYY-MM-DD (one entry per day)
  weightKg: number;
  note?: string;
}

export interface WorkoutSet {
  reps: number;
  weightKg: number;   // 0 for bodyweight
  durationMin?: number; // for cardio/duration exercises
}

export interface WorkoutExercise {
  name: string;
  category: string;
  sets: WorkoutSet[];
  calories: number; // estimated for this exercise
}

export interface WorkoutSession {
  id: string;
  date: string;       // YYYY-MM-DD
  startedAt: string;  // ISO
  exercises: WorkoutExercise[];
  totalCalories: number;
}

/* ── Profile & preferences (stored in user_settings) ───────────── */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Sex = 'male' | 'female' | 'other';

export interface UserSettings {
  popupMessage: string;
  heightCm: number | null;
  birthYear: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel;
  goal: Goal;
  targetWeightKg: number | null;
  calorieTargetOverride: number | null; // manual daily target; null → computed from profile
  waterGoal: number;                    // glasses per day
  restSeconds: number;                  // rest between sets, used by the burn estimate
}

export const DEFAULT_SETTINGS: UserSettings = {
  popupMessage: '',
  heightCm: null,
  birthYear: null,
  sex: null,
  activityLevel: 'moderate',
  goal: 'maintain',
  targetWeightKg: null,
  calorieTargetOverride: null,
  waterGoal: 8,
  restSeconds: 90,
};

/* ── Video library permissions (granted by the admin) ──────────── */
export interface VideoPermissions {
  canUpload: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const NO_VIDEO_PERMISSIONS: VideoPermissions = { canUpload: false, canEdit: false, canDelete: false };
export const ALL_VIDEO_PERMISSIONS: VideoPermissions = { canUpload: true, canEdit: true, canDelete: true };

export interface AppData {
  habits: HabitsData;
  coreHabits: CoreHabitsData;
  streaks: StreakData[];
  calorieLog: Record<string, CalorieEntry[]>;
  insights: InsightEntry[];
  weights: WeightEntry[];
  workouts: WorkoutSession[];
  water: Record<string, number>;   // date → glasses
  settings: UserSettings;
}

export const DEFAULT_DATA: AppData = {
  habits: {
    columns: ['Go Gym', 'Reading'],
    descriptions: ['', ''],
    hiddenColumns: [],
    overallColumns: [],
    noteColumns: [],
    checks: {},
    notes: {},
  },
  coreHabits: {
    columns: [],
    descriptions: [],
    hiddenColumns: [],
    overallColumns: [],
    noteColumns: [],
    checks: {},
    notes: {},
  },
  streaks: [],
  calorieLog: {},
  insights: [],
  weights: [],
  workouts: [],
  water: {},
  settings: DEFAULT_SETTINGS,
};
