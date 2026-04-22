import { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import { Download } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import type { AppData } from '../types';
import {
  getPast7Days, getCurrentMonthDays, today,
  formatDayLabel, formatDisplayDate,
  getWeekRangeLabel, getCurrentMonthLabel
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


export default function ChartsPage() {
  const { data, loading } = useAppData();
  const { columns, checks, hiddenColumns } = data.habits;
  const visibleIndices = columns.map((_, i) => i).filter(i => !(hiddenColumns ?? []).includes(i));
  const todayStr = today();

  const weekRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);

  const weeklyData = getPast7Days().map(d => ({
    day: formatDayLabel(d),
    date: d,
    progress: computeProgress(checks, visibleIndices, d),
  }));

  const monthlyData = getCurrentMonthDays()
    .filter(d => d <= todayStr)
    .map(d => ({
      day: Number(d.split('-')[2]),
      date: d,
      label: formatDisplayDate(d),
      progress: computeProgress(checks, visibleIndices, d),
    }));

  const weekRange = getWeekRangeLabel();
  const monthLabel = getCurrentMonthLabel();

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  const CustomTooltipWeek = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#1a1a24', border: '1px solid rgba(0,255,157,0.2)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
        <div style={{ color: '#8888aa', marginBottom: '2px' }}>{label}</div>
        <div style={{ color: barColor(payload[0].value), fontWeight: 600, fontSize: '14px' }}>{payload[0].value}%</div>
      </div>
    );
  };

  return (
    <div className="page">
      <h1 className="page-title">Charts</h1>

      {/* Weekly chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>Weekly Progress</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace', opacity: 0.8 }}>
              {weekRange}
            </p>
          </div>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem', flexShrink: 0 }}
            onClick={() => downloadChartAsPng(weekRef, `fittrack-weekly-${todayStr}.png`)} title="Download PNG">
            <Download size={15} />
          </button>
        </div>
        <div ref={weekRef}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#8888aa', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipWeek />} />
              <Bar dataKey="progress" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {weeklyData.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.progress)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {[['#1a1a24','0%'], ['#ffa502','< 50%'], ['#00d4ff','< 100%'], ['#00ff9d','100%']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, border: '1px solid rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly chart */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>Monthly Progress</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace', opacity: 0.8 }}>
              {monthLabel}
            </p>
          </div>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem', flexShrink: 0 }}
            onClick={() => downloadChartAsPng(monthRef, `fittrack-monthly-${todayStr}.png`)} title="Download PNG">
            <Download size={15} />
          </button>
        </div>
        <div ref={monthRef}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { label: string; progress: number };
                  return (
                    <div style={{ background: '#1a1a24', border: '1px solid rgba(0,255,157,0.2)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                      <div style={{ color: '#8888aa', marginBottom: '2px' }}>{d.label}</div>
                      <div style={{ color: barColor(d.progress), fontWeight: 600, fontSize: '14px' }}>{d.progress}%</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="progress" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {monthlyData.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.progress)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {visibleIndices.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          Add habit columns in Settings to see chart data.
        </p>
      )}
    </div>
  );
}
