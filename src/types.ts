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

export interface AppData {
  habits: HabitsData;
  streaks: StreakData[];
  calorieLog: Record<string, CalorieEntry[]>;
  insights: InsightEntry[];
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
};
