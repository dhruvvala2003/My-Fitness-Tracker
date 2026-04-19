import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '../hooks/useLocalStorage';
import { DEFAULT_DATA } from '../types';
import type { AppData, StreakData } from '../types';
import { today, daysDiff, formatFullDate } from '../utils/dateHelpers';

function getCurrentStreak(streak: StreakData): number {
  const t = today();
  if (streak.breakDates.length === 0) return daysDiff(streak.startDate, t);
  const lastBreak = [...streak.breakDates].sort().slice(-1)[0];
  return daysDiff(lastBreak, t);
}

function getSinceDate(streak: StreakData): string {
  if (streak.breakDates.length === 0) return streak.startDate;
  return [...streak.breakDates].sort().slice(-1)[0];
}

export default function StreaksPage() {
  const [data, setData] = useLocalStorage<AppData>('fittrack_v2', DEFAULT_DATA);
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today());

  function addStreak() {
    if (!name.trim()) return;
    const newStreak: StreakData = { id: uuidv4(), name: name.trim(), startDate, breakDates: [] };
    setData(prev => ({ ...prev, streaks: [...prev.streaks, newStreak] }));
    setName('');
    setStartDate(today());
    setShowForm(false);
  }

  function deleteStreak(id: string) {
    setData(prev => ({ ...prev, streaks: prev.streaks.filter(s => s.id !== id) }));
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Streaks</h1>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          <Plus size={16} /> New Streak
        </button>
      </div>

      {/* Add streak form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>New Streak Tracker</p>
          <input
            className="input"
            placeholder='e.g. "No Soft Drink"'
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStreak()}
          />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Started on</label>
            <input
              type="date"
              className="input-date"
              value={startDate}
              max={today()}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={addStreak}>Add</button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Streak list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.streaks.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
            No streaks yet. Add one to start tracking.
          </p>
        )}
        {data.streaks.map(streak => {
          const days = getCurrentStreak(streak);
          const since = getSinceDate(streak);
          return (
            <div key={streak.id} className="streak-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Flame size={16} color="var(--accent-warn)" />
                    <span style={{ fontWeight: 600 }}>{streak.name}</span>
                  </div>
                  <div className="streak-count">{days}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    days &nbsp;·&nbsp; since {formatFullDate(since)}
                  </div>
                  {streak.breakDates.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', marginTop: '0.25rem' }}>
                      {streak.breakDates.length} break{streak.breakDates.length > 1 ? 's' : ''} logged
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.6rem' }}
                    onClick={() => navigate(`/streaks/${streak.id}`)}
                    title="View details / log break"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    className="btn-danger"
                    style={{ padding: '0.4rem 0.6rem' }}
                    onClick={() => deleteStreak(streak.id)}
                    title="Delete streak"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
