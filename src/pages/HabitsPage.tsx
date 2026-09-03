import { useState, useEffect } from 'react';
import { Check, ChevronLeft, ChevronRight, Target, PartyPopper, AlertCircle, SlidersHorizontal, Plus } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import ProgressCard from '../components/ProgressCard';
import LoginPromptModal from '../components/LoginPromptModal';
import { today, getMonthDays, getMonthLabel, formatDisplayDate } from '../utils/dateHelpers';

type HabitsPageProps = { mode?: 'main' | 'core' };

export default function HabitsPage({ mode = 'main' }: HabitsPageProps) {
  const isCore = mode === 'core';
  const {
    data, loading,
    toggleHabitCheck, toggleOverallColumn,
    toggleCoreHabitCheck, addCoreHabitColumn, deleteCoreHabitColumn,
    renameCoreHabitColumn, toggleCoreColumnVisibility, toggleCoreOverallColumn,
  } = useAppData();
  const { user } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [newCoreHabit, setNewCoreHabit] = useState('');

  // Monthly target % — persisted so the forecast survives reloads
  const [targetPct, setTargetPct] = useState<number>(() => {
    const v = parseInt(localStorage.getItem('fittrack_habit_target') ?? '', 10);
    return v >= 1 && v <= 100 ? v : 70;
  });
  useEffect(() => {
    localStorage.setItem('fittrack_habit_target', String(targetPct));
  }, [targetPct]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const habits = isCore ? data.coreHabits : data.habits;
  const columns = habits.columns;
  const checks = habits.checks;
  const hiddenColumns: number[] = habits.hiddenColumns ?? [];
  const visibleIndices = columns.map((_, i) => i).filter(i => !hiddenColumns.includes(i));
  const overallIndices = visibleIndices.filter(i => (habits.overallColumns ?? visibleIndices).includes(i));
  const toggleCheck = isCore ? toggleCoreHabitCheck : toggleHabitCheck;
  const toggleOverall = isCore ? toggleCoreOverallColumn : toggleOverallColumn;
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
    const total = elapsedDays.length * overallIndices.length;
    if (total === 0) return 0;
    const checked = elapsedDays.reduce((acc, d) => {
      return acc + overallIndices.reduce((s, i) => s + (checks[d]?.[i] ? 1 : 0), 0);
    }, 0);
    return (checked / total) * 100;
  }

  async function handleAddCoreHabit() {
    const name = newCoreHabit.trim();
    if (!name || columns.length >= 4) return;
    if (!user) { setShowLoginPrompt(true); return; }
    await addCoreHabitColumn(name);
    setNewCoreHabit('');
  }

  /* ── Target forecast (current month only) ──
     For each habit: how many of the remaining days must be checked
     to finish the month at >= targetPct%. */
  function colForecast(colIdx: number) {
    const total = days.length;
    const done = elapsedDays.filter(d => checks[d]?.[colIdx]).length;
    const targetDays = Math.ceil((targetPct / 100) * total);
    const needed = Math.max(0, targetDays - done);
    // days still open for checking: today (if unchecked) + all future days
    const futureDays = total - now.getDate();
    const todayOpen = checks[todayStr]?.[colIdx] ? 0 : 1;
    const remaining = futureDays + todayOpen;
    const maxPct = Math.round(((done + remaining) / total) * 100);
    return { done, targetDays, needed, remaining, maxPct, total };
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
          message={`You need to be signed in to track your ${isCore ? 'core habits' : 'habits'}. Sign in to start checking off your daily goals!`}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      <h1 className="page-title">{isCore ? 'Core Habits' : 'Habits'}</h1>

      {isCore && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="row-between" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Add Core Habit</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Track the habits that support everything else.</p>
            </div>
            {columns.length < 4 && (
              <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 280px', maxWidth: 420 }}>
                <input
                  className="input"
                  placeholder='e.g. "Sleep 8 hours"'
                  value={newCoreHabit}
                  onChange={e => setNewCoreHabit(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCoreHabit()}
                  maxLength={30}
                />
                <button className="btn-primary" onClick={handleAddCoreHabit} style={{ flexShrink: 0 }}>
                  <Plus size={15} /> Add
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
        {visibleIndices.map((i, idx) => (
          <ProgressCard key={i} label={columns[i]} value={colProgress(i)} delay={(idx + 1) * 80} />
        ))}
      </div>

      {visibleIndices.length > 0 && (
        <div className="card stagger-in" style={{ marginBottom: '1.5rem', animationDelay: '80ms' }}>
          <div className="row" style={{ gap: '0.5rem', marginBottom: '0.35rem' }}>
            <SlidersHorizontal size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
              Overall calculation
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Choose which habits contribute to the Overall percentage.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {visibleIndices.map(i => (
              <label key={i} className="row" style={{ gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={overallIndices.includes(i)}
                  disabled={overallIndices.length === 1 && overallIndices.includes(i)}
                  onChange={() => {
                    if (!user) { setShowLoginPrompt(true); return; }
                    toggleOverall(i);
                  }}
                />
                {columns[i]}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Monthly target forecast ── */}
      {isCurrentMonth && visibleIndices.length > 0 && (
        <div className="card stagger-in" style={{ marginBottom: '1.5rem', animationDelay: '160ms' }}>
          <div className="row-between" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <div className="row" style={{ gap: '0.5rem' }}>
              <Target size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                Monthly Target
              </span>
            </div>
            <div className="row" style={{ gap: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Goal</span>
              <input
                className="input"
                type="number"
                min={1}
                max={100}
                value={targetPct}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (v >= 1 && v <= 100) setTargetPct(v);
                }}
                style={{ width: 68, textAlign: 'center', padding: '0.35rem 0.5rem' }}
              />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>%</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {visibleIndices.map(i => {
              const f = colForecast(i);
              const reached = f.needed === 0;
              const possible = f.needed <= f.remaining;
              return (
                <div key={i} className="row-between forecast-row"
                  style={{ flexWrap: 'wrap', gap: '0.5rem', padding: '0.55rem 0.7rem', borderRadius: 10, background: 'var(--bg-tertiary)' }}>
                  <span className="row" style={{ gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {columns[i]}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {f.done}/{f.targetDays} days
                    </span>
                  </span>

                  {reached ? (
                    <span className="row" style={{ gap: '0.35rem', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      <PartyPopper size={14} /> {targetPct}% target reached!
                    </span>
                  ) : possible ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Do it on <strong style={{ color: 'var(--accent-blue)' }}>{f.needed}</strong> of
                      the remaining <strong style={{ color: 'var(--text-primary)' }}>{f.remaining}</strong> day{f.remaining !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="row" style={{ gap: '0.35rem', fontSize: '0.78rem', color: 'var(--accent-warn)' }}>
                      <AlertCircle size={14} />
                      Out of reach — best possible now: {f.maxPct}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Habit table */}
      <div className="habit-table-wrapper stagger-in" style={{ animationDelay: '240ms' }}>
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
                            if (!isFuture) toggleCheck(dateStr, colIdx);
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

      {isCore && columns.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Manage Core Habits</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {columns.map((column, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input className="input" value={column} maxLength={30}
                  onChange={e => user && renameCoreHabitColumn(i, e.target.value)} />
                <button className="btn-secondary" onClick={() => user && toggleCoreColumnVisibility(i)}>
                  {hiddenColumns.includes(i) ? 'Show' : 'Hide'}
                </button>
                <button className="btn-danger" onClick={() => user && deleteCoreHabitColumn(i)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {columns.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
          {user
            ? `No ${isCore ? 'core ' : ''}habit columns yet. ${isCore ? 'Add one above.' : 'Go to Settings to add some.'}`
            : 'Sign in to create and track your habits.'}
        </p>
      )}
      {columns.length > 0 && visibleIndices.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
          All columns are hidden. Toggle visibility above.
        </p>
      )}
    </div>
  );
}
