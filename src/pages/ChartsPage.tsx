import { useState, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import type { AppData } from '../types';
import {
  getPast30Days, getMonthDays, today,
  formatDisplayDate, getMonthLabel,
} from '../utils/dateHelpers';

function computeProgress(
  checks: AppData['habits']['checks'],
  visibleIndices: number[],
  dateStr: string
): number {
  if (visibleIndices.length === 0) return 0;
  const checked = visibleIndices.reduce(
    (s, i) => s + (checks[dateStr]?.[String(i)] ? 1 : 0),
    0
  );
  return Math.round((checked / visibleIndices.length) * 100);
}

function barColor(value: number): string {
  if (value === 0) return '#1a1a24';
  if (value < 50) return '#ffa502';
  if (value < 100) return '#00d4ff';
  return '#00ff9d';
}

function heatColor(value: number): string {
  if (value === 0) return 'rgba(255,255,255,0.05)';
  if (value < 34) return 'rgba(255,100,80,0.55)';
  if (value < 67) return 'rgba(255,165,0,0.65)';
  if (value < 100) return 'rgba(0,210,255,0.72)';
  return '#00ff9d';
}

function downloadChartAsPng(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
  const el = ref.current;
  if (!el) return;
  const svg = el.querySelector('svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const { width, height } = svg.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = width || 600;
  canvas.height = height || 300;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#111118';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = new Image();
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = url;
}

function HabitHeatmap({
  checks, visibleIndices, year, month,
}: {
  checks: AppData['habits']['checks'];
  visibleIndices: number[];
  year: number;
  month: number;
}) {
  const todayStr = today();
  const days = getMonthDays(year, month);
  const startDow = new Date(year, month, 1).getDay();

  const cells: (string | null)[] = [...Array(startDow).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
          {week.map((dateStr, di) => {
            if (!dateStr) return <div key={di} style={{ aspectRatio: '1' }} />;
            const isFuture = dateStr > todayStr;
            const progress = isFuture ? -1 : computeProgress(checks, visibleIndices, dateStr);
            const isToday = dateStr === todayStr;
            const dayNum = parseInt(dateStr.split('-')[2]);
            return (
              <div
                key={di}
                title={`${formatDisplayDate(dateStr)}: ${isFuture ? '—' : progress + '%'}`}
                style={{
                  aspectRatio: '1',
                  borderRadius: '5px',
                  background: isFuture ? 'rgba(255,255,255,0.02)' : heatColor(progress),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'JetBrains Mono, monospace',
                  border: isToday ? '1.5px solid rgba(0,255,157,0.7)' : '1px solid rgba(255,255,255,0.04)',
                  cursor: 'default',
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
        {([
          ['rgba(255,255,255,0.05)', '0%'],
          ['rgba(255,100,80,0.55)', '< 34%'],
          ['rgba(255,165,0,0.65)', '< 67%'],
          ['rgba(0,210,255,0.72)', '< 100%'],
          ['#00ff9d', '100%'],
        ] as [string, string][]).map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color, border: '1px solid rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: '#1a1a24',
  border: '1px solid rgba(0,255,157,0.18)',
  borderRadius: '8px',
  padding: '0.5rem 0.75rem',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '12px',
};

export default function ChartsPage() {
  const { data, loading } = useAppData();
  const { columns, checks, hiddenColumns } = data.habits;
  const visibleIndices = columns.map((_, i) => i).filter(i => !(hiddenColumns ?? []).includes(i));
  const todayStr = today();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const trendRef = useRef<HTMLDivElement>(null);
  const monthBarRef = useRef<HTMLDivElement>(null);
  const dowRef = useRef<HTMLDivElement>(null);

  function canGoNext() {
    if (viewYear < now.getFullYear()) return true;
    return viewYear === now.getFullYear() && viewMonth < now.getMonth();
  }
  function goPrev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function goNext() {
    if (!canGoNext()) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // 30-day trend
  const trendData = getPast30Days().map(d => ({
    label: formatDisplayDate(d),
    progress: computeProgress(checks, visibleIndices, d),
  }));
  const trendAvg = trendData.length
    ? Math.round(trendData.reduce((s, d) => s + d.progress, 0) / trendData.length)
    : 0;
  const trendStatus = trendAvg >= 70 ? 'On fire' : trendAvg >= 40 ? 'Building up' : 'Keep going';

  // Monthly bar chart (navigable)
  const monthDays = getMonthDays(viewYear, viewMonth);
  const monthlyData = monthDays
    .filter(d => d <= todayStr)
    .map(d => ({
      day: Number(d.split('-')[2]),
      label: formatDisplayDate(d),
      progress: computeProgress(checks, visibleIndices, d),
    }));
  const monthLabel = getMonthLabel(viewYear, viewMonth);

  // Day-of-week performance (last 90 days)
  const dowData = (() => {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets = Array(7).fill(null).map(() => ({ sum: 0, count: 0 }));
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dow = d.getDay();
      buckets[dow].sum += computeProgress(checks, visibleIndices, dateStr);
      buckets[dow].count += 1;
    }
    return labels.map((day, i) => ({
      day,
      avg: buckets[i].count > 0 ? Math.round(buckets[i].sum / buckets[i].count) : 0,
    }));
  })();
  const bestDay = dowData.reduce((best, cur) => cur.avg > best.avg ? cur : best, dowData[0]);

  // Per-habit breakdown for selected month
  const habitBreakdown = visibleIndices.map(i => {
    const eligible = monthDays.filter(d => d <= todayStr);
    const checked = eligible.filter(d => checks[d]?.[String(i)]).length;
    return {
      name: columns[i],
      pct: eligible.length > 0 ? Math.round((checked / eligible.length) * 100) : 0,
    };
  });

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Charts</h1>

      {/* Month navigation — applies to Monthly Bar + Heatmap + Per-Habit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={goPrev}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontFamily: 'JetBrains Mono, monospace', minWidth: '130px', textAlign: 'center' }}>
          {monthLabel}
        </span>
        <button
          className="btn-secondary"
          style={{ padding: '0.3rem 0.5rem', opacity: canGoNext() ? 1 : 0.35, cursor: canGoNext() ? 'pointer' : 'default' }}
          onClick={goNext}
          disabled={!canGoNext()}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* ── 1. Monthly Bar Chart ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>Monthly Progress</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace', opacity: 0.8 }}>
              {monthLabel}
            </p>
          </div>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem', flexShrink: 0 }}
            onClick={() => downloadChartAsPng(monthBarRef, `fittrack-monthly-${todayStr}.png`)} title="Download PNG">
            <Download size={15} />
          </button>
        </div>
        <div ref={monthBarRef}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { label: string; progress: number };
                return (
                  <div style={tooltipStyle}>
                    <div style={{ color: '#8888aa', marginBottom: '2px' }}>{d.label}</div>
                    <div style={{ color: barColor(d.progress), fontWeight: 600, fontSize: '14px' }}>{d.progress}%</div>
                  </div>
                );
              }} />
              <Bar dataKey="progress" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {monthlyData.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.progress)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {monthlyData.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.8rem', padding: '1rem 0' }}>
            No data for this month yet.
          </p>
        )}
      </div>

      {/* ── 2. Habit Heatmap ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>Habit Heatmap</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace', opacity: 0.8 }}>
            {monthLabel} · daily completion intensity
          </p>
        </div>
        <HabitHeatmap checks={checks} visibleIndices={visibleIndices} year={viewYear} month={viewMonth} />
      </div>

      {/* ── 3. 30-Day Trend ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>30-Day Trend</p>
            <p style={{ fontSize: '0.75rem', color: '#8888aa', fontFamily: 'JetBrains Mono, monospace' }}>
              avg {trendAvg}% &middot; {trendStatus}
            </p>
          </div>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem', flexShrink: 0 }}
            onClick={() => downloadChartAsPng(trendRef, `fittrack-trend-${todayStr}.png`)} title="Download PNG">
            <Download size={15} />
          </button>
        </div>
        <div ref={trendRef}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8888aa', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={6} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ ...tooltipStyle, border: '1px solid rgba(0,212,255,0.22)' }}>
                    <div style={{ color: '#8888aa', marginBottom: '2px' }}>{label}</div>
                    <div style={{ color: '#00d4ff', fontWeight: 600, fontSize: '14px' }}>{payload[0].value}%</div>
                  </div>
                );
              }} />
              <Area type="monotone" dataKey="progress" stroke="#00d4ff" strokeWidth={2} fill="url(#trendFill)" dot={false} activeDot={{ r: 4, fill: '#00d4ff', stroke: '#111118', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 4. Day-of-Week Performance ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>Day-of-Week Performance</p>
            <p style={{ fontSize: '0.75rem', color: '#8888aa', fontFamily: 'JetBrains Mono, monospace' }}>
              avg % per weekday &middot; last 90 days
              {bestDay && bestDay.avg > 0 && (
                <span style={{ color: '#00ff9d' }}> &middot; best: {bestDay.day}</span>
              )}
            </p>
          </div>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem', flexShrink: 0 }}
            onClick={() => downloadChartAsPng(dowRef, `fittrack-weekday-${todayStr}.png`)} title="Download PNG">
            <Download size={15} />
          </button>
        </div>
        <div ref={dowRef}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dowData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#8888aa', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = payload[0].value as number;
                return (
                  <div style={tooltipStyle}>
                    <div style={{ color: '#8888aa', marginBottom: '2px' }}>{label}</div>
                    <div style={{ color: barColor(val), fontWeight: 600, fontSize: '14px' }}>{val}%</div>
                  </div>
                );
              }} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {dowData.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 5. Per-Habit Breakdown ── */}
      {habitBreakdown.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>Per-Habit Breakdown</p>
          <p style={{ fontSize: '0.75rem', color: '#8888aa', fontFamily: 'JetBrains Mono, monospace', marginBottom: '1.25rem' }}>
            completion rate &middot; {monthLabel}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {habitBreakdown.map(({ name, pct }) => (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{name}</span>
                  <span style={{ fontSize: '0.82rem', color: barColor(pct), fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: barColor(pct),
                    borderRadius: '4px',
                    transition: 'width 0.6s ease',
                    boxShadow: pct === 100 ? '0 0 8px rgba(0,255,157,0.5)' : 'none',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {visibleIndices.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          Add habit columns in Settings to see chart data.
        </p>
      )}
    </div>
  );
}
