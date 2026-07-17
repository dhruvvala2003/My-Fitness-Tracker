export interface HabitsData {
  columns: string[];
  hiddenColumns: number[];   // indices of columns hidden from habits table & all calculations
  checks: Record<string, Record<string, boolean>>;
}

export interface StreakData {
  id: string;
  name: string;
  startDate: string;
  breakDates: string[];
}

export interface CalorieEntry {
  id: string;
  name: string;
  amount: number;
  calories: number;
  time: string;
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

export interface AppData {
  habits: HabitsData;
  streaks: StreakData[];
  calorieLog: Record<string, CalorieEntry[]>;
  insights: InsightEntry[];
  weights: WeightEntry[];
  workouts: WorkoutSession[];
}

export const DEFAULT_DATA: AppData = {
  habits: {
    columns: ['Go Gym', 'Reading'],
    hiddenColumns: [],
    checks: {},
  },
  streaks: [],
  calorieLog: {},
  insights: [],
  weights: [],
  workouts: [],
};
