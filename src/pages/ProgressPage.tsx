import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Scale, Zap, Dumbbell, CalendarCheck, Plus, Trash2, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import {
  today, formatDisplayDate, formatFullDate, getMonthDays, getMonthLabel, getPast7Days, getPast30Days,
} from '../utils/dateHelpers';

/* Chart colors — validated for CVD + contrast on the dark surface (#12151d) */
const CHART = {
  grid: 'rgba(255,255,255,0.06)',
  axis: '#8b93a7',
  blue: '#0284c7',   // weight series
  green: '#059669',  // calories series
  surface: '#12151d',
};

/* Sequential emerald ramp for the habit heatmap (low → high) */
const HEAT_RAMP = ['#123f2f', '#166448', '#1e8f63', '#2bbd84', '#4ce0a4'];

const RANGES = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: 'all', label: 'All', days: Infinity },
] as const;

function ChartTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: { value: number }[];
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
      <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {payload[0].value} {unit}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { data, loading, logWeight, deleteWeight } = useAppData();
  const { user } = useAuth();

  const [showLogin, setShowLogin] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(today());
  const [range, setRange] = useState<typeof RANGES[number]['key']>('90');

  const now = new Date();
  const [heatYear, setHeatYear] = useState(now.getFullYear());
  const [heatMonth, setHeatMonth] = useState(now.getMonth());

  const todayStr = today();
  const visibleCols = data.habits.columns
    .map((_, i) => i)
    .filter(i => !data.habits.hiddenColumns.includes(i));

  /* ── Derived stats ── */

  const sortedWeights = data.weights; // already sorted asc by date
  const latestWeight = sortedWeights[sortedWeights.length - 1];
  const prevWeight = sortedWeights[sortedWeights.length - 2];
  const weightDelta = latestWeight && prevWeight
    ? latestWeight.weightKg - prevWeight.weightKg
    : null;

  const past7 = getPast7Days();
  const avgCal7 = useMemo(() => {
    const totals = past7.map(d => (data.calorieLog[d] ?? []).reduce((s, e) => s + e.calories, 0));
    const daysWithData = totals.filter(t => t > 0);
    if (!daysWithData.length) return 0;
    return Math.round(daysWithData.reduce((s, t) => s + t, 0) / daysWithData.length);
  }, [data.calorieLog, past7]);

  const workouts7 = data.workouts.filter(w => past7.includes(w.date)).length;

  const monthDays = getMonthDays(heatYear, heatMonth);
  const monthConsistency = useMemo(() => {
    if (!visibleCols.length) return 0;
    const pastDays = monthDays.filter(d => d <= todayStr);
    if (!pastDays.length) return 0;
    let done = 0;
    for (const d of pastDays) {
      for (const i of visibleCols) {
        if (data.habits.checks[d]?.[String(i)]) done++;
      }
    }
    return Math.round((done / (pastDays.length * visibleCols.length)) * 100);
  }, [monthDays, todayStr, visibleCols, data.habits.checks]);

  /* ── Chart data ── */

  const weightSeries = useMemo(() => {
    const days = RANGES.find(r => r.key === range)!.days;
    const entries = days === Infinity
      ? sortedWeights
      : sortedWeights.filter(w => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          return new Date(w.date) >= cutoff;
        });
    return entries.map(w => ({ label: formatDisplayDate(w.date), kg: w.weightKg }));
  }, [sortedWeights, range]);

  const calorieSeries = useMemo(() =>
    getPast30Days().map(d => ({
      label: formatDisplayDate(d),
      kcal: (data.calorieLog[d] ?? []).reduce((s, e) => s + e.calories, 0),
    })), [data.calorieLog]);

  const hasCalorieData = calorieSeries.some(d => d.kcal > 0);

  /* ── Heatmap helpers ── */

  function dayCompletion(date: string): number | null {
    if (date > todayStr || !visibleCols.length) return null;
    const done = visibleCols.filter(i => data.habits.checks[date]?.[String(i)]).length;
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

  return (
    <div className="page">
      <h1 className="page-title">Progress</h1>
      <p className="page-subtitle">Your body, nutrition and consistency — all in one place.</p>

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
        </div>
        <div className="card">
          <div className="card-label"><Zap size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Avg Calories (7d)</div>
          <div className="card-value">{avgCal7 || '—'}</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-secondary)' }}>kcal / day logged</div>
        </div>
        <div className="card">
          <div className="card-label"><Dumbbell size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Workouts (7d)</div>
          <div className="card-value">{workouts7}</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-secondary)' }}>sessions this week</div>
        </div>
        <div className="card">
          <div className="card-label"><CalendarCheck size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Habit Consistency</div>
          <div className="card-value">{monthConsistency}%</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-secondary)' }}>{getMonthLabel(heatYear, heatMonth)}</div>
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
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weightSeries} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} minTickGap={28} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
              <Tooltip content={<ChartTooltip unit="kg" />} cursor={{ stroke: CHART.grid }} />
              <Line
                type="monotone"
                dataKey="kg"
                stroke={CHART.blue}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART.blue, stroke: CHART.surface, strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
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

      {/* ── Calories (last 30 days) ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="section-label">Calories — last 30 days</div>
        {hasCalorieData ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={calorieSeries} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} minTickGap={28} />
              <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
              <Tooltip content={<ChartTooltip unit="kcal" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="kcal" fill={CHART.green} radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><Zap size={22} /></div>
            No meals logged in the last 30 days. Scan a meal on the Calories page.
          </div>
        )}
      </div>

      {/* ── Habit heatmap ── */}
      <div className="card">
        <div className="row-between" style={{ marginBottom: '1rem' }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Habit Consistency</div>
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
            Add habit columns in Settings to see your consistency map.
          </div>
        )}
      </div>

      {showLogin && <LoginPromptModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
