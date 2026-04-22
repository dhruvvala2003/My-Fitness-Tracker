import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Search, X, Star, BookOpen, AlertTriangle, ThumbsUp, ThumbsDown, Trash2, SlidersHorizontal } from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { today } from '../utils/dateHelpers';
import type { InsightEntry } from '../types';

type InsightType = 'learning' | 'mistake' | 'good' | 'bad';
type Tab = 'all' | InsightType;

const TYPE_META: Record<InsightType, { label: string; placeholder: string; icon: React.ReactNode; colorClass: string }> = {
  learning: {
    label: 'Learning',
    placeholder: 'What did you learn today?',
    icon: <BookOpen size={14} />,
    colorClass: 'learning',
  },
  mistake: {
    label: 'Mistake',
    placeholder: 'What mistake did you make?',
    icon: <AlertTriangle size={14} />,
    colorClass: 'mistake',
  },
  good: {
    label: 'Good Thing',
    placeholder: 'What good thing happened today?',
    icon: <ThumbsUp size={14} />,
    colorClass: 'good',
  },
  bad: {
    label: 'Bad Thing',
    placeholder: 'What bad thing happened today?',
    icon: <ThumbsDown size={14} />,
    colorClass: 'bad',
  },
};

const TABS: { val: Tab; label: string }[] = [
  { val: 'all',      label: 'All' },
  { val: 'learning', label: 'Learnings' },
  { val: 'mistake',  label: 'Mistakes' },
  { val: 'good',     label: 'Good Things' },
  { val: 'bad',      label: 'Bad Things' },
];

function StarRating({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const readonly = !onChange;
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          fill={(hovered || value) >= n ? 'var(--accent-warn)' : 'none'}
          color={(hovered || value) >= n ? 'var(--accent-warn)' : 'var(--text-secondary)'}
          style={{ cursor: readonly ? 'default' : 'pointer', transition: 'color 120ms, fill 120ms' }}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange?.(n)}
        />
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const { data, loading, addInsight, deleteInsight, updateInsightRating } = useAppData();
  const insights = data.insights ?? [];

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<InsightType>('learning');
  const [formText, setFormText] = useState('');
  const [formRating, setFormRating] = useState(3);
  const [formDate, setFormDate] = useState(today());

  const filtered = useMemo(() => {
    return insights.filter(e => {
      if (tab !== 'all' && e.type !== tab) return false;
      if (filterRating > 0 && e.rating !== filterRating) return false;
      if (filterDate && e.date !== filterDate) return false;
      if (search.trim() && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [insights, tab, filterRating, filterDate, search]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formText.trim()) return;
    addInsight({
      id: uuidv4(),
      type: formType,
      text: formText.trim(),
      rating: formRating,
      date: formDate,
      createdAt: new Date().toISOString(),
    });
    setFormText('');
    setFormRating(3);
    setFormDate(today());
    setShowForm(false);
  }

  function resetFilters() {
    setSearch('');
    setFilterRating(0);
    setFilterDate('');
    setTab('all');
  }

  const hasActiveFilters = tab !== 'all' || filterRating > 0 || !!filterDate || !!search.trim();

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Daily Insights</h1>
        <button className="insights-add-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={18} /> : <Plus size={18} />}
          <span>{showForm ? 'Cancel' : 'Add'}</span>
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form className="insights-form" onSubmit={handleSubmit}>
          <div className="insights-type-grid">
            {(Object.keys(TYPE_META) as InsightType[]).map(t => (
              <button
                key={t}
                type="button"
                className={`insights-type-btn${formType === t ? ' active' : ''}`}
                data-type={t}
                onClick={() => setFormType(t)}
              >
                {TYPE_META[t].icon}
                {TYPE_META[t].label}
              </button>
            ))}
          </div>

          <textarea
            className="insights-textarea"
            placeholder={TYPE_META[formType].placeholder}
            value={formText}
            onChange={e => setFormText(e.target.value)}
            rows={3}
            autoFocus
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                Rating
              </p>
              <StarRating value={formRating} onChange={setFormRating} />
            </div>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                Date
              </p>
              <input
                type="date"
                className="insights-date-input"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
              />
            </div>
            <button type="submit" className="insights-submit-btn" style={{ marginLeft: 'auto' }}>
              Save
            </button>
          </div>
        </form>
      )}

      {/* Search + filter toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
        <div className="insights-search-wrap">
          <Search size={15} color="var(--text-secondary)" />
          <input
            className="insights-search"
            placeholder="Search insights…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} onClick={() => setSearch('')}>
              <X size={14} color="var(--text-secondary)" />
            </button>
          )}
        </div>
        <button
          className={`insights-filter-toggle${showFilters ? ' active' : ''}`}
          onClick={() => setShowFilters(v => !v)}
          title="Filters"
        >
          <SlidersHorizontal size={16} />
          {hasActiveFilters && <span className="insights-filter-dot" />}
        </button>
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="insights-filters">
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {TABS.map(({ val, label }) => (
              <button key={val} className={`insights-chip${tab === val ? ' active' : ''}`} onClick={() => setTab(val)}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.625rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rating</span>
            <button className={`insights-chip${filterRating === 0 ? ' active' : ''}`} onClick={() => setFilterRating(0)}>All</button>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} className={`insights-chip${filterRating === n ? ' active' : ''}`} onClick={() => setFilterRating(n)}>
                {'★'.repeat(n)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.625rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</span>
            <input
              type="date"
              className="insights-date-input"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }} onClick={() => setFilterDate('')}>
                <X size={14} color="var(--text-secondary)" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button className="insights-clear-btn" onClick={resetFilters}>Clear all filters</button>
          )}
        </div>
      )}

      {/* Quick tabs (shown when filter panel is closed) */}
      {!showFilters && (
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {TABS.map(({ val, label }) => (
            <button key={val} className={`insights-chip${tab === val ? ' active' : ''}`} onClick={() => setTab(val)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Result count */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>
        {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}{hasActiveFilters && ' (filtered)'}
      </p>

      {/* Entry list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            {insights.length === 0
              ? 'No insights yet. Hit Add to log your first entry.'
              : 'No entries match your filters.'}
          </div>
        ) : (
          filtered.map(entry => (
            <InsightCard
              key={entry.id}
              entry={entry}
              onDelete={() => deleteInsight(entry.id)}
              onRatingChange={r => updateInsightRating(entry.id, r)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function InsightCard({
  entry,
  onDelete,
  onRatingChange,
}: {
  entry: InsightEntry;
  onDelete: () => void;
  onRatingChange: (r: number) => void;
}) {
  const meta = TYPE_META[entry.type as InsightType] ?? TYPE_META.learning;
  const dateLabel = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className={`insight-card ${meta.colorClass}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div className={`insight-type-icon ${meta.colorClass}`}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
            <span className={`insight-badge ${meta.colorClass}`}>{meta.label}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{dateLabel}</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.55, margin: 0, wordBreak: 'break-word' }}>
            {entry.text}
          </p>
          <div style={{ marginTop: '0.625rem' }}>
            <StarRating value={entry.rating} onChange={onRatingChange} size={16} />
          </div>
        </div>
        <button className="insight-delete-btn" onClick={onDelete} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
