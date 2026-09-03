import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DEFAULT_DATA } from '../types';
import type { AppData, CalorieEntry, InsightEntry, StreakData, WeightEntry, WorkoutSession } from '../types';

interface DataContextType {
  data: AppData;
  loading: boolean;
  // Habits
  toggleHabitCheck: (date: string, colIdx: number) => Promise<void>;
  addHabitColumn: (name: string) => Promise<void>;
  deleteHabitColumn: (idx: number) => Promise<void>;
  renameHabitColumn: (idx: number, name: string) => Promise<void>;
  toggleColumnVisibility: (idx: number) => Promise<void>;
  toggleOverallColumn: (idx: number) => Promise<void>;
  toggleCoreHabitCheck: (date: string, colIdx: number) => Promise<void>;
  addCoreHabitColumn: (name: string) => Promise<void>;
  deleteCoreHabitColumn: (idx: number) => Promise<void>;
  renameCoreHabitColumn: (idx: number, name: string) => Promise<void>;
  toggleCoreColumnVisibility: (idx: number) => Promise<void>;
  toggleCoreOverallColumn: (idx: number) => Promise<void>;
  // Streaks
  addStreak: (streak: StreakData) => Promise<void>;
  deleteStreak: (id: string) => Promise<void>;
  logBreakDate: (streakId: string, date: string) => Promise<void>;
  removeBreakDate: (streakId: string, date: string) => Promise<void>;
  // Calories
  logMeal: (entry: CalorieEntry, date: string) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  // Insights
  addInsight: (entry: InsightEntry) => Promise<void>;
  deleteInsight: (id: string) => Promise<void>;
  updateInsightRating: (id: string, rating: number) => Promise<void>;
  updateInsight: (id: string, updates: { type?: InsightEntry['type']; text?: string; date?: string }) => Promise<void>;
  // Weight
  logWeight: (entry: WeightEntry) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
  // Workouts
  addWorkout: (session: WorkoutSession) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    if (!user) { setData(DEFAULT_DATA); setLoading(false); return; }
    setLoading(true);
    const uid = user.id;

    const [configResult, checksResult, coreConfigResult, coreChecksResult, streaksResult, caloriesResult, insightsResult, weightsResult, workoutsResult] = await Promise.all([
      supabase.from('habits_config').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('habit_checks').select('*').eq('user_id', uid),
      supabase.from('core_habits_config').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('core_habit_checks').select('*').eq('user_id', uid),
      supabase.from('streaks').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('calorie_entries').select('*').eq('user_id', uid).order('time'),
      supabase.from('daily_insights').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('weight_entries').select('*').eq('user_id', uid).order('date'),
      supabase.from('workout_sessions').select('*').eq('user_id', uid).order('started_at', { ascending: false }),
    ]);

    // Build checks: only stored rows are true
    const checks: Record<string, Record<string, boolean>> = {};
    for (const row of (checksResult.data ?? [])) {
      if (!checks[row.date]) checks[row.date] = {};
      checks[row.date][String(row.col_idx)] = true;
    }

    const coreChecks: Record<string, Record<string, boolean>> = {};
    for (const row of (coreChecksResult.data ?? [])) {
      if (!coreChecks[row.date]) coreChecks[row.date] = {};
      coreChecks[row.date][String(row.col_idx)] = true;
    }

    // Build calorie log grouped by date
    const calorieLog: Record<string, CalorieEntry[]> = {};
    for (const row of (caloriesResult.data ?? [])) {
      if (!calorieLog[row.date]) calorieLog[row.date] = [];
      calorieLog[row.date].push({ id: row.id, name: row.name, amount: row.amount, calories: row.calories, time: row.time });
    }

    const streaks: StreakData[] = (streaksResult.data ?? []).map(row => ({
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      breakDates: row.break_dates ?? [],
    }));

    const config = configResult.data;
    const configColumns: string[] = config?.columns ?? [];
    const configuredOverall: number[] = config?.overall_columns ?? [];
    const coreConfig = coreConfigResult.data;
    const coreColumns: string[] = coreConfig?.columns ?? [];
    const coreOverall: number[] = coreConfig?.overall_columns ?? [];

    const weights: WeightEntry[] = (weightsResult.data ?? []).map(row => ({
      id: row.id,
      date: row.date,
      weightKg: Number(row.weight_kg),
      note: row.note ?? undefined,
    }));

    const workouts: WorkoutSession[] = (workoutsResult.data ?? []).map(row => ({
      id: row.id,
      date: row.date,
      startedAt: row.started_at,
      exercises: row.exercises ?? [],
      totalCalories: Number(row.total_calories ?? 0),
    }));

    const insights: InsightEntry[] = (insightsResult.data ?? []).map(row => ({
      id: row.id,
      type: row.type as 'learning' | 'mistake' | 'good' | 'bad',
      text: row.text,
      rating: row.rating,
      date: row.date,
      createdAt: row.created_at,
    }));

    setData({
      habits: {
        columns: configColumns,
        hiddenColumns: config?.hidden_columns ?? [],
        overallColumns: configuredOverall.length > 0 ? configuredOverall : configColumns.map((_, i) => i),
        checks,
      },
      coreHabits: {
        columns: coreColumns,
        hiddenColumns: coreConfig?.hidden_columns ?? [],
        overallColumns: coreOverall.length > 0 ? coreOverall : coreColumns.map((_, i) => i),
        checks: coreChecks,
      },
      streaks,
      calorieLog,
      insights,
      weights,
      workouts,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // ── Habit helpers ──────────────────────────────────────────────────────────

  async function upsertHabitsConfig(columns: string[], hiddenColumns: number[], overallColumns = data.habits.overallColumns) {
    await supabase.from('habits_config').upsert({
      user_id: user!.id,
      columns,
      hidden_columns: hiddenColumns,
      overall_columns: overallColumns,
      updated_at: new Date().toISOString(),
    });
  }

  async function toggleHabitCheck(date: string, colIdx: number) {
    const uid = user!.id;
    const isChecked = !!data.habits.checks[date]?.[String(colIdx)];

    // Optimistic update
    setData(prev => {
      const dayChecks = { ...(prev.habits.checks[date] ?? {}) };
      if (isChecked) delete dayChecks[String(colIdx)];
      else dayChecks[String(colIdx)] = true;
      return { ...prev, habits: { ...prev.habits, checks: { ...prev.habits.checks, [date]: dayChecks } } };
    });

    if (isChecked) {
      await supabase.from('habit_checks').delete()
        .eq('user_id', uid).eq('date', date).eq('col_idx', colIdx);
    } else {
      await supabase.from('habit_checks').upsert({ user_id: uid, date, col_idx: colIdx });
    }
  }

  async function addHabitColumn(name: string) {
    const newColumns = [...data.habits.columns, name];
    const newOverall = [...data.habits.overallColumns, data.habits.columns.length];
    setData(prev => ({ ...prev, habits: { ...prev.habits, columns: newColumns, overallColumns: newOverall } }));
    await upsertHabitsConfig(newColumns, data.habits.hiddenColumns, newOverall);
  }

  async function deleteHabitColumn(idx: number) {
    const uid = user!.id;
    const newColumns = data.habits.columns.filter((_, i) => i !== idx);
    const newHidden = data.habits.hiddenColumns
      .filter(h => h !== idx)
      .map(h => (h > idx ? h - 1 : h));
    const newOverall = data.habits.overallColumns
      .filter(i => i !== idx)
      .map(i => (i > idx ? i - 1 : i));

    setData(prev => {
      // Rebuild checks with shifted indices
      const newChecks: Record<string, Record<string, boolean>> = {};
      for (const [date, dayChecks] of Object.entries(prev.habits.checks)) {
        const updated: Record<string, boolean> = {};
        for (const [ci, val] of Object.entries(dayChecks)) {
          const n = Number(ci);
          if (n < idx) updated[ci] = val;
          else if (n > idx) updated[String(n - 1)] = val;
        }
        newChecks[date] = updated;
      }
      return { ...prev, habits: { columns: newColumns, hiddenColumns: newHidden, overallColumns: newOverall, checks: newChecks } };
    });

    // 1. Delete the column's check rows
    await supabase.from('habit_checks').delete().eq('user_id', uid).eq('col_idx', idx);

    // 2. Shift col_idx > idx down by 1 (fetch → delete → re-insert)
    const { data: affected } = await supabase
      .from('habit_checks').select('date, col_idx').eq('user_id', uid).gt('col_idx', idx);

    if (affected && affected.length > 0) {
      await supabase.from('habit_checks').delete().eq('user_id', uid).gt('col_idx', idx);
      await supabase.from('habit_checks').insert(
        affected.map(row => ({ user_id: uid, date: row.date, col_idx: row.col_idx - 1 }))
      );
    }

    await upsertHabitsConfig(newColumns, newHidden, newOverall);
  }

  async function renameHabitColumn(idx: number, name: string) {
    const newColumns = data.habits.columns.map((c, i) => (i === idx ? name : c));
    setData(prev => ({ ...prev, habits: { ...prev.habits, columns: newColumns } }));
    await upsertHabitsConfig(newColumns, data.habits.hiddenColumns);
  }

  async function toggleColumnVisibility(idx: number) {
    const cur = data.habits.hiddenColumns;
    const newHidden = cur.includes(idx) ? cur.filter(h => h !== idx) : [...cur, idx];
    setData(prev => ({ ...prev, habits: { ...prev.habits, hiddenColumns: newHidden } }));
    await upsertHabitsConfig(data.habits.columns, newHidden);
  }

  async function toggleOverallColumn(idx: number) {
    const cur = data.habits.overallColumns;
    if (cur.length === 1 && cur.includes(idx)) return;
    const newOverall = cur.includes(idx) ? cur.filter(i => i !== idx) : [...cur, idx];
    setData(prev => ({ ...prev, habits: { ...prev.habits, overallColumns: newOverall } }));
    await upsertHabitsConfig(data.habits.columns, data.habits.hiddenColumns, newOverall);
  }

  async function upsertCoreHabitsConfig(columns: string[], hiddenColumns: number[], overallColumns: number[]) {
    await supabase.from('core_habits_config').upsert({
      user_id: user!.id, columns, hidden_columns: hiddenColumns, overall_columns: overallColumns,
      updated_at: new Date().toISOString(),
    });
  }

  async function toggleCoreHabitCheck(date: string, colIdx: number) {
    const uid = user!.id;
    const isChecked = !!data.coreHabits.checks[date]?.[String(colIdx)];
    setData(prev => {
      const dayChecks = { ...(prev.coreHabits.checks[date] ?? {}) };
      if (isChecked) delete dayChecks[String(colIdx)]; else dayChecks[String(colIdx)] = true;
      return { ...prev, coreHabits: { ...prev.coreHabits, checks: { ...prev.coreHabits.checks, [date]: dayChecks } } };
    });
    if (isChecked) await supabase.from('core_habit_checks').delete().eq('user_id', uid).eq('date', date).eq('col_idx', colIdx);
    else await supabase.from('core_habit_checks').upsert({ user_id: uid, date, col_idx: colIdx });
  }

  async function addCoreHabitColumn(name: string) {
    const newColumns = [...data.coreHabits.columns, name];
    const newOverall = [...data.coreHabits.overallColumns, data.coreHabits.columns.length];
    setData(prev => ({ ...prev, coreHabits: { ...prev.coreHabits, columns: newColumns, overallColumns: newOverall } }));
    await upsertCoreHabitsConfig(newColumns, data.coreHabits.hiddenColumns, newOverall);
  }

  async function deleteCoreHabitColumn(idx: number) {
    const uid = user!.id;
    const newColumns = data.coreHabits.columns.filter((_, i) => i !== idx);
    const newHidden = data.coreHabits.hiddenColumns.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
    const newOverall = data.coreHabits.overallColumns.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
    setData(prev => {
      const newChecks: Record<string, Record<string, boolean>> = {};
      for (const [date, dayChecks] of Object.entries(prev.coreHabits.checks)) {
        const updated: Record<string, boolean> = {};
        for (const [ci, value] of Object.entries(dayChecks)) {
          const columnIndex = Number(ci);
          if (columnIndex < idx) updated[ci] = value;
          else if (columnIndex > idx) updated[String(columnIndex - 1)] = value;
        }
        newChecks[date] = updated;
      }
      return { ...prev, coreHabits: { columns: newColumns, hiddenColumns: newHidden, overallColumns: newOverall, checks: newChecks } };
    });
    await supabase.from('core_habit_checks').delete().eq('user_id', uid).eq('col_idx', idx);
    const { data: affected } = await supabase.from('core_habit_checks').select('date, col_idx').eq('user_id', uid).gt('col_idx', idx);
    if (affected && affected.length > 0) {
      await supabase.from('core_habit_checks').delete().eq('user_id', uid).gt('col_idx', idx);
      await supabase.from('core_habit_checks').insert(affected.map(row => ({ user_id: uid, date: row.date, col_idx: row.col_idx - 1 })));
    }
    await upsertCoreHabitsConfig(newColumns, newHidden, newOverall);
  }

  async function renameCoreHabitColumn(idx: number, name: string) {
    const newColumns = data.coreHabits.columns.map((column, i) => i === idx ? name : column);
    setData(prev => ({ ...prev, coreHabits: { ...prev.coreHabits, columns: newColumns } }));
    await upsertCoreHabitsConfig(newColumns, data.coreHabits.hiddenColumns, data.coreHabits.overallColumns);
  }

  async function toggleCoreColumnVisibility(idx: number) {
    const current = data.coreHabits.hiddenColumns;
    const newHidden = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
    setData(prev => ({ ...prev, coreHabits: { ...prev.coreHabits, hiddenColumns: newHidden } }));
    await upsertCoreHabitsConfig(data.coreHabits.columns, newHidden, data.coreHabits.overallColumns);
  }

  async function toggleCoreOverallColumn(idx: number) {
    const current = data.coreHabits.overallColumns;
    if (current.length === 1 && current.includes(idx)) return;
    const newOverall = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
    setData(prev => ({ ...prev, coreHabits: { ...prev.coreHabits, overallColumns: newOverall } }));
    await upsertCoreHabitsConfig(data.coreHabits.columns, data.coreHabits.hiddenColumns, newOverall);
  }

  // ── Streak helpers ─────────────────────────────────────────────────────────

  async function addStreak(streak: StreakData) {
    setData(prev => ({ ...prev, streaks: [...prev.streaks, streak] }));
    await supabase.from('streaks').insert({
      id: streak.id,
      user_id: user!.id,
      name: streak.name,
      start_date: streak.startDate,
      break_dates: streak.breakDates,
    });
  }

  async function deleteStreak(id: string) {
    setData(prev => ({ ...prev, streaks: prev.streaks.filter(s => s.id !== id) }));
    await supabase.from('streaks').delete().eq('user_id', user!.id).eq('id', id);
  }

  async function logBreakDate(streakId: string, date: string) {
    const streak = data.streaks.find(s => s.id === streakId);
    if (!streak || streak.breakDates.includes(date)) return;
    const newBreaks = [...streak.breakDates, date];
    setData(prev => ({
      ...prev,
      streaks: prev.streaks.map(s => s.id === streakId ? { ...s, breakDates: newBreaks } : s),
    }));
    await supabase.from('streaks').update({ break_dates: newBreaks })
      .eq('user_id', user!.id).eq('id', streakId);
  }

  async function removeBreakDate(streakId: string, date: string) {
    const streak = data.streaks.find(s => s.id === streakId);
    if (!streak) return;
    const newBreaks = streak.breakDates.filter(d => d !== date);
    setData(prev => ({
      ...prev,
      streaks: prev.streaks.map(s => s.id === streakId ? { ...s, breakDates: newBreaks } : s),
    }));
    await supabase.from('streaks').update({ break_dates: newBreaks })
      .eq('user_id', user!.id).eq('id', streakId);
  }

  // ── Calorie helpers ────────────────────────────────────────────────────────

  async function logMeal(entry: CalorieEntry, date: string) {
    setData(prev => ({
      ...prev,
      calorieLog: { ...prev.calorieLog, [date]: [...(prev.calorieLog[date] ?? []), entry] },
    }));
    await supabase.from('calorie_entries').insert({
      id: entry.id,
      user_id: user!.id,
      date,
      name: entry.name,
      amount: entry.amount,
      calories: entry.calories,
      time: entry.time,
    });
  }

  async function deleteMeal(id: string) {
    setData(prev => {
      const newLog = { ...prev.calorieLog };
      for (const date of Object.keys(newLog)) {
        newLog[date] = newLog[date].filter(e => e.id !== id);
      }
      return { ...prev, calorieLog: newLog };
    });
    await supabase.from('calorie_entries').delete().eq('user_id', user!.id).eq('id', id);
  }

  // ── Insight helpers ────────────────────────────────────────────────────────

  async function addInsight(entry: InsightEntry) {
    setData(prev => ({ ...prev, insights: [entry, ...prev.insights] }));
    await supabase.from('daily_insights').insert({
      id: entry.id,
      user_id: user!.id,
      type: entry.type,
      text: entry.text,
      rating: entry.rating,
      date: entry.date,
      created_at: entry.createdAt,
    });
  }

  async function deleteInsight(id: string) {
    setData(prev => ({ ...prev, insights: prev.insights.filter(e => e.id !== id) }));
    await supabase.from('daily_insights').delete().eq('user_id', user!.id).eq('id', id);
  }

  async function updateInsightRating(id: string, rating: number) {
    setData(prev => ({
      ...prev,
      insights: prev.insights.map(e => e.id === id ? { ...e, rating } : e),
    }));
    await supabase.from('daily_insights').update({ rating }).eq('user_id', user!.id).eq('id', id);
  }

  async function updateInsight(id: string, updates: { type?: InsightEntry['type']; text?: string; date?: string }) {
    setData(prev => ({
      ...prev,
      insights: prev.insights.map(e => e.id === id ? { ...e, ...updates } : e),
    }));
    await supabase.from('daily_insights').update(updates).eq('user_id', user!.id).eq('id', id);
  }

  // ── Weight helpers ─────────────────────────────────────────────────────────

  async function logWeight(entry: WeightEntry) {
    setData(prev => {
      // one entry per day: replace any existing entry for the same date
      const rest = prev.weights.filter(w => w.date !== entry.date);
      const weights = [...rest, entry].sort((a, b) => a.date.localeCompare(b.date));
      return { ...prev, weights };
    });
    await supabase.from('weight_entries').upsert({
      id: entry.id,
      user_id: user!.id,
      date: entry.date,
      weight_kg: entry.weightKg,
      note: entry.note ?? null,
    }, { onConflict: 'user_id,date' });
  }

  async function deleteWeight(id: string) {
    setData(prev => ({ ...prev, weights: prev.weights.filter(w => w.id !== id) }));
    await supabase.from('weight_entries').delete().eq('user_id', user!.id).eq('id', id);
  }

  // ── Workout helpers ────────────────────────────────────────────────────────

  async function addWorkout(session: WorkoutSession) {
    setData(prev => ({ ...prev, workouts: [session, ...prev.workouts] }));
    await supabase.from('workout_sessions').insert({
      id: session.id,
      user_id: user!.id,
      date: session.date,
      started_at: session.startedAt,
      exercises: session.exercises,
      total_calories: session.totalCalories,
    });
  }

  async function deleteWorkout(id: string) {
    setData(prev => ({ ...prev, workouts: prev.workouts.filter(w => w.id !== id) }));
    await supabase.from('workout_sessions').delete().eq('user_id', user!.id).eq('id', id);
  }

  return (
    <DataContext.Provider value={{
      data, loading,
      toggleHabitCheck, addHabitColumn, deleteHabitColumn, renameHabitColumn, toggleColumnVisibility, toggleOverallColumn,
      toggleCoreHabitCheck, addCoreHabitColumn, deleteCoreHabitColumn, renameCoreHabitColumn, toggleCoreColumnVisibility, toggleCoreOverallColumn,
      addStreak, deleteStreak, logBreakDate, removeBreakDate,
      logMeal, deleteMeal,
      addInsight, deleteInsight, updateInsightRating, updateInsight,
      logWeight, deleteWeight,
      addWorkout, deleteWorkout,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useAppData() {
  return useContext(DataContext);
}
