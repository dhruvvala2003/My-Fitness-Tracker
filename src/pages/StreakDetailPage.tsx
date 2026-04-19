import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Flame } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { DEFAULT_DATA } from '../types';
import type { AppData, StreakData } from '../types';
import { today, daysDiff, formatFullDate, formatDisplayDate } from '../utils/dateHelpers';

function getCurrentStreak(streak: StreakData): number {
  const t = today();
  if (streak.breakDates.length === 0) return daysDiff(streak.startDate, t);
  const lastBreak = [...streak.breakDates].sort().slice(-1)[0];
  return daysDiff(lastBreak, t);
}

export default function StreakDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useLocalStorage<AppData>('fittrack_v2', DEFAULT_DATA);
  const [breakDate, setBreakDate] = useState(today());

  const streak = data.streaks.find(s => s.id === id);

  if (!streak) {
    return (
      <div className="page">
        <button className="btn-secondary" onClick={() => navigate('/streaks')}>
          <ArrowLeft size={16} /> Back
        </button>
        <p style={{ color: 'var(--text-secondary)', marginTop: '2rem' }}>Streak not found.</p>
      </div>
    );
  }

  const currentDays = getCurrentStreak(streak);
  const sortedBreaks = [...streak.breakDates].sort().reverse();

  function logBreak() {
    if (!breakDate) return;
    if (streak!.breakDates.includes(breakDate)) return;
    setData(prev => ({
      ...prev,
      streaks: prev.streaks.map(s =>
        s.id === id ? { ...s, breakDates: [...s.breakDates, breakDate] } : s
      ),
    }));
  }

  function removeBreak(date: string) {
    setData(prev => ({
      ...prev,
      streaks: prev.streaks.map(s =>
        s.id === id ? { ...s, breakDates: s.breakDates.filter(d => d !== date) } : s
      ),
    }));
  }

  return (
    <div className="page">
      <button className="btn-secondary" style={{ marginBottom: '1.5rem' }} onClick={() => navigate('/streaks')}>
        <ArrowLeft size={16} /> Back to Streaks
      </button>

      {/* Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Flame size={20} color="var(--accent-warn)" />
          <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>{streak.name}</span>
        </div>
        <div className="streak-count">{currentDays}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          days current streak
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Started: </span>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
            {formatFullDate(streak.startDate)}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          <span>Total breaks: </span>
          <span style={{ color: streak.breakDates.length > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
            {streak.breakDates.length}
          </span>
        </div>
      </div>

      {/* Log break date */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Log a Break Date</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Record a date when you broke this streak.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="date"
            className="input-date"
            value={breakDate}
            min={streak.startDate}
            max={today()}
            onChange={e => setBreakDate(e.target.value)}
          />
          <button className="btn-danger" onClick={logBreak}>
            <Plus size={16} /> Log Break
          </button>
        </div>
      </div>

      {/* Break dates list */}
      <div className="card">
        <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
          Break History ({sortedBreaks.length})
        </p>
        {sortedBreaks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No breaks logged — keep it up!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedBreaks.map(d => (
              <div
                key={d}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                }}
              >
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem', color: 'var(--accent-danger)' }}>
                  {formatDisplayDate(d)} &nbsp;
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({d})</span>
                </span>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: '0.25rem' }}
                  onClick={() => removeBreak(d)}
                  title="Remove this break"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
