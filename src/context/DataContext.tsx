import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DEFAULT_DATA } from '../types';
import type { AppData, CalorieEntry, InsightEntry, StreakData } from '../types';

interface DataContextType {
  data: AppData;
  loading: boolean;
  // Habits
  toggleHabitCheck: (date: string, colIdx: number) => Promise<void>;
  addHabitColumn: (name: string) => Promise<void>;
  deleteHabitColumn: (idx: number) => Promise<void>;
  renameHabitColumn: (idx: number, name: string) => Promise<void>;
  toggleColumnVisibility: (idx: number) => Promise<void>;
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

    const [configResult, checksResult, streaksResult, caloriesResult, insightsResult] = await Promise.all([
      supabase.from('habits_config').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('habit_checks').select('*').eq('user_id', uid),
      supabase.from('streaks').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('calorie_entries').select('*').eq('user_id', uid).order('time'),
      supabase.from('daily_insights').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    ]);

    // Build checks: only stored rows are true
    const checks: Record<string, Record<string, boolean>> = {};
    for (const row of (checksResult.data ?? [])) {
      if (!checks[row.date]) checks[row.date] = {};
      checks[row.date][String(row.col_idx)] = true;
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

    const insights: InsightEntry[] = (insightsResult.data ?? []).map(row => ({
      id: row.id,
      type: row.type as 'learning' | 'mistake',
      text: row.text,
      rating: row.rating,
      date: row.date,
      createdAt: row.created_at,
    }));

    setData({
      habits: {
        columns: config?.columns ?? [],
        hiddenColumns: config?.hidden_columns ?? [],
        checks,
      },
      streaks,
      calorieLog,
      insights,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  // ── Habit helpers ──────────────────────────────────────────────────────────

  async function upsertHabitsConfig(columns: string[], hiddenColumns: number[]) {
    await supabase.from('habits_config').upsert({
      user_id: user!.id,
      columns,
      hidden_columns: hiddenColumns,
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
    setData(prev => ({ ...prev, habits: { ...prev.habits, columns: newColumns } }));
    await upsertHabitsConfig(newColumns, data.habits.hiddenColumns);
  }

  async function deleteHabitColumn(idx: number) {
    const uid = user!.id;
    const newColumns = data.habits.columns.filter((_, i) => i !== idx);
    const newHidden = data.habits.hiddenColumns
      .filter(h => h !== idx)
      .map(h => (h > idx ? h - 1 : h));

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
      return { ...prev, habits: { columns: newColumns, hiddenColumns: newHidden, checks: newChecks } };
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

    await upsertHabitsConfig(newColumns, newHidden);
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

  return (
    <DataContext.Provider value={{
      data, loading,
      toggleHabitCheck, addHabitColumn, deleteHabitColumn, renameHabitColumn, toggleColumnVisibility,
      addStreak, deleteStreak, logBreakDate, removeBreakDate,
      logMeal, deleteMeal,
      addInsight, deleteInsight, updateInsightRating,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useAppData() {
  return useContext(DataContext);
}
