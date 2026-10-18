import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import { Scale, Zap, Dumbbell, CalendarCheck, Plus, Trash2, ChevronLeft, ChevronRight, TrendingUp, Flame, Target } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import {
  today, formatDisplayDate, formatFullDate, getMonthDays, getMonthLabel, getPast7Days,
} from '../utils/dateHelpers';
import { calcCalorieTarget, movingAverage } from '../utils/calories';
import type { StreakData } from '../types';

/* Chart colors — validated for CVD + contrast on the dark surface (#12151d) */
const CHART = {
  grid: 'rgba(255,255,255,0.06)',
  axis: '#8b93a7',
  blue: '#0284c7',    // weight series
  blueSoft: '#7dd3fc',// weight 7-day average
  green: '#059669',   // calories eaten
  amber: '#d97706',   // calories burned
  purple: '#a78bfa',  // workouts
  surface: '#12151d',
};

/* Sequential emerald ramp for the habit heatmap (low → high) */
const HEAT_RAMP = ['#123f2f', '#166448', '#1e8f63', '#2bbd84', '#4ce0a4'];

const RANGES = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: 'all', label: 'All', days: Infinity },
] as const;

const CAL_RANGES = [7, 30, 90] as const;

function pastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    const pad = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}

function currentStreakDays(s: StreakData): number {
  const t = today();
  if (!s.breakDates.length) return Math.max(0, Math.floor((new Date(t).getTime() - new Date(s.startDate).getTime()) / 86400000));
  const last = [...s.breakDates].sort().slice(-1)[0];
  return Math.max(0, Math.floor((new Date(t).getTime() - new Date(last).getTime()) / 86400000));
}

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: { value: number; name?: string; color?: string }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 10,
      padding: '0.5rem 0.75rem',
      fontSize: '0.8rem',
      boxShadow: 'var(--shadow-pop)',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
      {payload.filter(p => p.value !== null && p.value !== undefined).map((p, i) => (
        <div key={i} style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: p.color }}>
          {payload.length > 1 && p.name ? `${p.name}: ` : ''}{p.value} {unit}
        </div>
      ))}
    </div>
  );
}

export default function ProgressPage() {
  const { data, loading, logWeight, deleteWeight } = useAppData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showLogin, setShowLogin] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(today());
  const [range, setRange] = useState<typeof RANGES[number]['key']>('90');
  const [calRange, setCalRange] = useState<typeof CAL_RANGES[number]>(30);
  const [heatSource, setHeatSource] = useState<'main' | 'core'>('main');

  const now = new Date();
  const [heatYear, setHeatYear] = useState(now.getFullYear());
  const [heatMonth, setHeatMonth] = useState(now.getMonth());

  const todayStr = today();
  const heatHabits = heatSource === 'main' ? data.habits : data.coreHabits;
  const visibleCols = heatHabits.columns
    .map((_, i) => i)
    .filter(i => !(heatHabits.hiddenColumns ?? []).includes(i));

  /* ── Derived stats ── */

  const sortedWeights = data.weights; // already sorted asc by date
  const latestWeight = sortedWeights[sortedWeights.length - 1];
  const prevWeight = sortedWeights[sortedWeights.length - 2];
  const weightDelta = latestWeight && prevWeight
    ? latestWeight.weightKg - prevWeight.weightKg
    : null;
  const targetWeight = data.settings.targetWeightKg;
  const toGoal = latestWeight && targetWeight ? Math.round((latestWeight.weightKg - targetWeight) * 10) / 10 : null;

  const calTarget = calcCalorieTarget(data.settings, latestWeight?.weightKg);

  const past7 = getPast7Days();
  const avgCal7 = useMemo(() => {
    const totals = past7.map(d => (data.calorieLog[d] ?? []).reduce((s, e) => s + e.calories, 0));
    const daysWithData = totals.filter(t => t > 0);
    if (!daysWithData.length) return 0;
    return Math.round(daysWithData.reduce((s, t) => s + t, 0) / daysWithData.length);
  }, [data.calorieLog, past7]);

  const workouts7 = data.workouts.filter(w => past7.includes(w.date));
  const burned7 = Math.round(workouts7.reduce((s, w) => s + w.totalCalories, 0));

  const monthDays = getMonthDays(heatYear, heatMonth);
  const monthConsistency = useMemo(() => {
    if (!visibleCols.length) return 0;
    const pastDaysInMonth = monthDays.filter(d => d <= todayStr);
    if (!pastDaysInMonth.length) return 0;
    let done = 0;
    for (const d of pastDaysInMonth) {
      for (const i of visibleCols) {
        if (heatHabits.checks[d]?.[String(i)]) done++;
      }
    }
    return Math.round((done / (pastDaysInMonth.length * visibleCols.length)) * 100);
  }, [monthDays, todayStr, visibleCols, heatHabits.checks]);

  /* ── Chart data ── */

  const weightSeries = useMemo(() => {
    const days = RANGES.find(r => r.key === range)!.days;
    const avg = movingAverage(sortedWeights.map(w => w.weightKg), 7);
    const withAvg = sortedWeights.map((w, i) => ({ label: formatDisplayDate(w.date), date: w.date, kg: w.weightKg, avg: avg[i] }));
    if (days === Infinity) return withAvg;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return withAvg.filter(w => new Date(w.date) >= cutoff);
  }, [sortedWeights, range]);

  const calorieSeries = useMemo(() =>
    pastDays(calRange).map(d => ({
      label: formatDisplayDate(d),
      eaten: (data.calorieLog[d] ?? []).reduce((s, e) => s + e.calories, 0),
      burned: Math.round(data.workouts.filter(w => w.date === d).reduce((s, w) => s + w.totalCalories, 0)),
    })), [data.calorieLog, data.workouts, calRange]);

  const hasCalorieData = calorieSeries.some(d => d.eaten > 0 || d.burned > 0);

  const weeklyWorkouts = useMemo(() => {
    // last 8 weeks, Monday-based buckets
    const weeks: { label: string; sessions: number; kcal: number; start: string }[] = [];
    const base = new Date();
    const dow = (base.getDay() + 6) % 7; // 0 = Monday
    base.setDate(base.getDate() - dow);
    for (let i = 7; i >= 0; i--) {
      const start = new Date(base);
      start.setDate(base.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const pad = (x: number) => String(x).padStart(2, '0');
      const s = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const e = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
      const inWeek = data.workouts.filter(w => w.date >= s && w.date <= e);
      weeks.push({
        label: formatDisplayDate(s),
        sessions: inWeek.length,
        kcal: Math.round(inWeek.reduce((a, w) => a + w.totalCalories, 0)),
        start: s,
      });
    }
    return weeks;
  }, [data.workouts]);
  const hasWorkoutData = weeklyWorkouts.some(w => w.sessions > 0);

  /* ── Heatmap helpers ── */

  function dayCompletion(date: string): number | null {
    if (date > todayStr || !visibleCols.length) return null;
    const done = visibleCols.filter(i => heatHabits.checks[date]?.[String(i)]).length;
    return done / visibleCols.length;
  }

  function heatColor(frac: number | null): string {
    if (frac === null) return 'transparent';
    if (frac === 0) return 'var(--bg-tertiary)';
    const idx = Math.min(HEAT_RAMP.length - 1, Math.floor(frac * HEAT_RAMP.length));
    return HEAT_RAMP[idx];
  }

  const atCurrentMonth = heatYear === now.getFullYear() && heatMonth === now.getMonth();
  function moveMonth(dir: -1 | 1) {
    let m = heatMonth + dir, y = heatYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setHeatMonth(m); setHeatYear(y);
  }

  // leading blanks so the grid aligns to weekday columns (Mon-first)
  const firstDow = (new Date(heatYear, heatMonth, 1).getDay() + 6) % 7;

  /* ── Actions ── */

  async function handleLogWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setShowLogin(true); return; }
    const kg = parseFloat(weightInput);
    if (!kg || kg <= 0 || kg > 400) return;
    await logWeight({ id: uuidv4(), date: dateInput, weightKg: Math.round(kg * 10) / 10 });
    setWeightInput('');
    setDateInput(today());
  }

  if (loading) {
    return <div className="page"><p style={{ color: 'var(--text-secondary)' }}>Loading…</p></div>;
  }

  const sortedStreaks = [...data.streaks].sort((a, b) => currentStreakDays(b) - currentStreakDays(a));

  return (
    <div className="page">
      <h1 className="page-title">Progress</h1>
      <p className="page-subtitle">Your body, nutrition, training and consistency — all in one place.</p>

      {/* ── Stat tiles ── */}
      <div className="home-stats" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-label"><Scale size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Weight</div>
          <div className="card-value">{latestWeight ? `${latestWeight.weightKg}` : '—'}<span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}> {latestWeight ? 'kg' : ''}</span></div>
          {weightDelta !== null && (
            <div style={{ fontSize: '0.75rem', marginTop: 4, color: weightDelta <= 0 ? 'var(--accent-primary)' : 'var(--accent-warn)', fontVariantNumeric: 'tabular-nums' }}>
              {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg since last entry
            </div>
          )}
          {toGoal !== null && (
            <div style={{ fontSize: '0.72rem', marginTop: 2, color: 'var(--text-secondary)' }}>
              <Target size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />
              {toGoal === 0 ? 'At your goal weight!' : `${Math.abs(toGoal)} kg to ${toGoal > 0 ? 'lose' : 'gain'} · goal ${targetWeight} kg`}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-label"><Zap size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Avg Intake (7d)</div>
          <div className="card-value">{avgCal7 || '—'}</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-secondary)' }}>
            {calTarget.target ? `target ${calTarget.target} kcal` : 'kcal / day logged'}
          </div>
        </div>
        <div className="card">
          <div className="card-label"><Dumbbell size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Workouts (7d)</div>
          <div className="card-value">{workouts7.length}</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-secondary)' }}>
            <Flame size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3, color: 'var(--accent-warn)' }} />~{burned7} kcal burned
          </div>
        </div>
        <div className="card">
          <div className="card-label"><CalendarCheck size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Habit Consistency</div>
          <div className="card-value">{monthConsistency}%</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-secondary)' }}>{getMonthLabel(heatYear, heatMonth)} · {heatSource}</div>
        </div>
      </div>

      {/* ── Weight tracking ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="row-between" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Body Weight</div>
          <div className="row" style={{ gap: '0.4rem' }}>
            {RANGES.map(r => (
              <button key={r.key} className={`chip${range === r.key ? ' active' : ''}`} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* log form */}
        <form onSubmit={handleLogWeight} className="row" style={{ flexWrap: 'wrap', marginBottom: weightSeries.length ? '1.25rem' : 0 }}>
          <input
            className="input"
            style={{ width: 130 }}
            type="number"
            step="0.1"
            min="20"
            max="400"
            placeholder="Weight (kg)"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            required
          />
          <input
            className="input-date"
            type="date"
            value={dateInput}
            max={todayStr}
            onChange={e => setDateInput(e.target.value)}
          />
          <button className="btn-primary" type="submit"><Plus size={15} />Log</button>
        </form>

        {weightSeries.length >= 2 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weightSeries} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} minTickGap={28} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                <Tooltip content={<ChartTooltip unit="kg" />} cursor={{ stroke: CHART.grid }} />
                {targetWeight && (
                  <ReferenceLine y={targetWeight} stroke="var(--accent-primary)" strokeDasharray="4 4" label={{ value: `goal ${targetWeight}`, fill: '#34d399', fontSize: 10, position: 'insideTopRight' }} />
                )}
                <Line type="monotone" dataKey="avg" name="7-day avg" stroke={CHART.blueSoft} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
                <Line
                  type="monotone"
                  dataKey="kg"
                  name="Weight"
                  stroke={CHART.blue}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART.blue, stroke: CHART.surface, strokeWidth: 2 }}
                  activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: 4 }}>
              Dashed line = 7-entry moving average (ignores daily water fluctuation){targetWeight ? ' · green line = your goal from Settings' : ''}.
            </p>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><TrendingUp size={22} /></div>
            {weightSeries.length === 1
              ? 'One entry logged — add another to see your trend.'
              : 'Log your weight to start tracking your trend.'}
          </div>
        )}

        {/* recent entries (also the accessible table view) */}
        {sortedWeights.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            {[...sortedWeights].reverse().slice(0, 5).map(w => (
              <div key={w.id} className="row-between" style={{ padding: '0.35rem 0' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatFullDate(w.date)}
                </span>
                <span className="row" style={{ gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{w.weightKg} kg</span>
                  <button className="icon-btn danger" title="Delete entry"
                    onClick={() => user ? deleteWeight(w.id) : setShowLogin(true)}>
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Calories in vs out ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="row-between" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Calories — eaten vs burned</div>
          <div className="row" style={{ gap: '0.4rem' }}>
            {CAL_RANGES.map(r => (
              <button key={r} className={`chip${calRange === r ? ' active' : ''}`} onClick={() => setCalRange(r)}>{r} days</button>
            ))}
          </div>
        </div>
        {hasCalorieData ? (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={calorieSeries} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={2}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} minTickGap={28} />
                <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                <Tooltip content={<ChartTooltip unit="kcal" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: CHART.axis }} iconType="circle" iconSize={8} />
                {calTarget.target > 0 && (
                  <ReferenceLine y={calTarget.target} stroke="#34d399" strokeDasharray="4 4" label={{ value: `target ${calTarget.target}`, fill: '#34d399', fontSize: 10, position: 'insideTopRight' }} />
                )}
                <Bar dataKey="eaten" name="Eaten" fill={CHART.green} radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="burned" name="Burned (workouts)" fill={CHART.amber} radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
            {!calTarget.target && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>
                Add your height, age and goal in <button className="link-btn" onClick={() => navigate('/settings')}>Settings</button> to see your target line here.
              </p>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><Zap size={22} /></div>
            No meals or workouts logged in this period. Log food on the Calories page and sessions on the Workout page.
          </div>
        )}
      </div>

      {/* ── Workouts per week ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="section-label">Workouts per week — last 8 weeks</div>
        {hasWorkoutData ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyWorkouts} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} />
              <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as { sessions: number; kcal: number };
                  return (
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.8rem', boxShadow: 'var(--shadow-pop)' }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: 2 }}>week of {label}</div>
                      <div style={{ fontWeight: 600 }}>{p.sessions} session{p.sessions !== 1 ? 's' : ''} · ~{p.kcal} kcal</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="sessions" fill={CHART.purple} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><Dumbbell size={22} /></div>
            No workouts in the last 8 weeks. Save a session on the Workout page.
          </div>
        )}
      </div>

      {/* ── Habit heatmap ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="row-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="row" style={{ gap: '0.5rem' }}>
            <div className="section-label" style={{ marginBottom: 0 }}>Habit Consistency</div>
            <button className={`chip${heatSource === 'main' ? ' active' : ''}`} onClick={() => setHeatSource('main')}>Habits</button>
            <button className={`chip${heatSource === 'core' ? ' active' : ''}`} onClick={() => setHeatSource('core')}>Core</button>
          </div>
          <div className="row" style={{ gap: '0.35rem' }}>
            <button className="icon-btn" onClick={() => moveMonth(-1)} title="Previous month"><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, minWidth: 110, textAlign: 'center' }}>
              {getMonthLabel(heatYear, heatMonth)}
            </span>
            <button className="icon-btn" onClick={() => moveMonth(1)} disabled={atCurrentMonth}
              style={{ opacity: atCurrentMonth ? 0.3 : 1 }} title="Next month">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {visibleCols.length ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, maxWidth: 420 }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-faint)', padding: '2px 0' }}>{d}</div>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} />)}
              {monthDays.map(d => {
                const frac = dayCompletion(d);
                const dayNum = Number(d.slice(-2));
                const isToday = d === todayStr;
                const bright = frac !== null && frac >= 0.6;
                return (
                  <div
                    key={d}
                    title={frac === null ? formatFullDate(d) : `${formatFullDate(d)} — ${Math.round(frac * 100)}% done`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 7,
                      background: heatColor(frac),
                      border: isToday ? '1.5px solid var(--accent-primary)' : '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.68rem',
                      fontVariantNumeric: 'tabular-nums',
                      color: frac === null ? 'var(--text-faint)' : bright ? '#06251a' : 'var(--text-secondary)',
                      fontWeight: isToday ? 700 : 500,
                      opacity: frac === null && d > todayStr ? 0.35 : 1,
                    }}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>

            {/* legend */}
            <div className="row" style={{ marginTop: '0.875rem', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              Less
              <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }} />
              {HEAT_RAMP.map(c => (
                <span key={c} style={{ width: 14, height: 14, borderRadius: 4, background: c }} />
              ))}
              More
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><CalendarCheck size={22} /></div>
            {heatSource === 'main' ? 'Add habit columns in Settings to see your consistency map.' : 'Add core habits on the Core Habits page.'}
          </div>
        )}
      </div>

      {/* ── Streaks overview ── */}
      <div className="card">
        <div className="row-between" style={{ marginBottom: '0.75rem' }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Streaks</div>
          <button className="link-btn" onClick={() => navigate('/streaks')}>Manage</button>
        </div>
        {sortedStreaks.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No streaks yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedStreaks.map(s => {
              const d = currentStreakDays(s);
              const max = Math.max(1, ...sortedStreaks.map(currentStreakDays));
              return (
                <div key={s.id} className="row" style={{ gap: '0.75rem' }}>
                  <Flame size={14} color="var(--accent-warn)" />
                  <span style={{ width: 140, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <div className="progress-bar" style={{ flex: 1, marginTop: 0 }}>
                    <div className="progress-fill" style={{ width: `${(d / max) * 100}%`, background: 'var(--accent-warn)' }} />
                  </div>
                  <span className="mono-num" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-warn)', width: 48, textAlign: 'right' }}>{d} d</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showLogin && <LoginPromptModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
