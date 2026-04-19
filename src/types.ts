export interface HabitsData {
  columns: string[];
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

export interface AppData {
  habits: HabitsData;
  streaks: StreakData[];
  calorieLog: Record<string, CalorieEntry[]>;
}

export const DEFAULT_DATA: AppData = {
  habits: {
    columns: ['Go Gym', 'Reading'],
    checks: {},
  },
  streaks: [],
  calorieLog: {},
};
