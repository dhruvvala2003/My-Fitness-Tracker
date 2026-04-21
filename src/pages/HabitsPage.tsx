import { Check } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import ProgressCard from '../components/ProgressCard';
import { today, getCurrentMonthDays, formatDisplayDate } from '../utils/dateHelpers';

export default function HabitsPage() {
  const { data, loading, toggleHabitCheck } = useAppData();
  const { columns, checks } = data.habits;
  const hiddenColumns: number[] = data.habits.hiddenColumns ?? [];
  const visibleIndices = columns.map((_, i) => i).filter(i => !hiddenColumns.includes(i));
  const todayStr = today();
  const days = getCurrentMonthDays();

  const now = new Date();
  const currentDay = now.getDate();
  const elapsedDays = days.slice(0, currentDay);

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

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Habits</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        {monthLabel}
      </p>

      {/* Progress cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <ProgressCard
          label="Overall"
          value={overallProgress()}
          detail={`Day ${currentDay} of ${days.length}`}
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
                          onClick={() => !isFuture && toggleHabitCheck(dateStr, colIdx)}
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
          No habit columns yet. Go to Settings to add some.
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
