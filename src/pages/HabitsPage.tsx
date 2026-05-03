import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import ProgressCard from '../components/ProgressCard';
import LoginPromptModal from '../components/LoginPromptModal';
import { today, getMonthDays, getMonthLabel, formatDisplayDate } from '../utils/dateHelpers';

export default function HabitsPage() {
  const { data, loading, toggleHabitCheck } = useAppData();
  const { user } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const { columns, checks } = data.habits;
  const hiddenColumns: number[] = data.habits.hiddenColumns ?? [];
  const visibleIndices = columns.map((_, i) => i).filter(i => !hiddenColumns.includes(i));
  const todayStr = today();

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const days = getMonthDays(viewYear, viewMonth);
  const elapsedDays = isCurrentMonth ? days.slice(0, now.getDate()) : days;

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

  function colProgress(colIdx: number) {
    const checked = elapsedDays.filter(d => checks[d]?.[colIdx]).length;
    const total = elapsedDays.length;
    return total === 0 ? 0 : (checked / total) * 100;
  }

  function overallProgress() {
    const total = elapsedDays.length * visibleIndices.length;
    if (total === 0) return 0;
    const checked = elapsedDays.reduce((acc, d) => {
      return acc + visibleIndices.reduce((s, i) => s + (checks[d]?.[i] ? 1 : 0), 0);
    }, 0);
    return (checked / total) * 100;
  }

  const monthLabel = getMonthLabel(viewYear, viewMonth);
  const progressDetail = isCurrentMonth
    ? `Day ${now.getDate()} of ${days.length}`
    : `${days.length} days`;

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      {showLoginPrompt && (
        <LoginPromptModal
          message="You need to be signed in to track your habits. Sign in to start checking off your daily goals!"
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      <h1 className="page-title">Habits</h1>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button className="btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={goPrev}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', minWidth: '130px', textAlign: 'center' }}>
          {monthLabel}
        </span>
        <button
          className="btn-secondary"
          style={{ padding: '0.3rem 0.5rem', opacity: canGoNext() ? 1 : 0.3, cursor: canGoNext() ? 'pointer' : 'default' }}
          onClick={goNext}
          disabled={!canGoNext()}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Progress cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <ProgressCard
          label="Overall"
          value={overallProgress()}
          detail={progressDetail}
        />
        {visibleIndices.map(i => (
          <ProgressCard key={i} label={columns[i]} value={colProgress(i)} />
        ))}
      </div>

      {/* Habit table */}
      <div className="habit-table-wrapper">
        <table className="habit-table">
          <thead>
            <tr>
              <th>Date</th>
              {visibleIndices.map(i => <th key={i}>{columns[i]}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map(dateStr => {
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const rowClass = isToday ? 'today' : isFuture ? 'future' : '';
              return (
                <tr key={dateStr} className={rowClass}>
                  <td>{formatDisplayDate(dateStr)}</td>
                  {visibleIndices.map(colIdx => {
                    const checked = !!checks[dateStr]?.[colIdx];
                    return (
                      <td key={colIdx}>
                        <button
                          className={`check-btn${checked ? ' checked' : ''}`}
                          onClick={() => {
                            if (!user) { setShowLoginPrompt(true); return; }
                            if (!isFuture) toggleHabitCheck(dateStr, colIdx);
                          }}
                          disabled={isFuture}
                          aria-label={checked ? 'Uncheck' : 'Check'}
                        >
                          {checked && <Check size={16} strokeWidth={3} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {columns.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
          {user
            ? 'No habit columns yet. Go to Settings to add some.'
            : 'Sign in to create and track your habits.'}
        </p>
      )}
      {columns.length > 0 && visibleIndices.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
          All columns are hidden. Toggle visibility in Settings.
        </p>
      )}
    </div>
  );
}
