import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Zap, Plus, Trash2, RefreshCw, Search, PencilLine, Camera,
  ChevronLeft, ChevronRight, Flame, Target, Settings as SettingsIcon, X,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import type { CalorieEntry } from '../types';
import { today, formatFullDate, formatDayLabel, getPast7Days } from '../utils/dateHelpers';
import { analyzeFood, prepareImage } from '../utils/aiCalories';
import { calcCalorieTarget } from '../utils/calories';
import { searchFoods, kcalFor } from '../data/foods';
import type { FoodItem } from '../data/foods';

type Mode = 'search' | 'manual' | 'photo';

interface Pending {
  name: string;
  grams: string;
  kcal: string;
  food?: FoodItem;      // set when picked from the database (keeps kcal in sync with grams)
  source: Mode;
}

function shiftDate(d: string, days: number): string {
  const [y, m, dd] = d.split('-').map(Number);
  const dt = new Date(y, m - 1, dd + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export default function CaloriesPage() {
  const { data, logMeal, deleteMeal } = useAppData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const todayStr = today();
  const [date, setDate] = useState(todayStr);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);

  // photo flow
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Day numbers ── */
  const log: CalorieEntry[] = data.calorieLog[date] ?? [];
  const eaten = log.reduce((s, e) => s + e.calories, 0);
  const burned = Math.round(data.workouts.filter(w => w.date === date).reduce((s, w) => s + w.totalCalories, 0));
  const latestWeight = data.weights[data.weights.length - 1]?.weightKg;
  const target = calcCalorieTarget(data.settings, latestWeight);
  const hasTarget = target.target > 0;
  const remaining = hasTarget ? target.target - eaten : null;
  const pct = hasTarget ? Math.min(100, Math.round((eaten / target.target) * 100)) : 0;
  const over = hasTarget && eaten > target.target;

  const results = useMemo(() => searchFoods(query), [query]);

  const week = useMemo(() => getPast7Days().map(d => ({
    date: d,
    kcal: (data.calorieLog[d] ?? []).reduce((s, e) => s + e.calories, 0),
  })), [data.calorieLog]);
  const weekMax = Math.max(1, ...week.map(w => w.kcal), hasTarget ? target.target : 0);

  /* ── Pending entry helpers ── */
  function pickFood(f: FoodItem) {
    setPending({
      name: f.name,
      grams: String(f.serving.grams),
      kcal: String(kcalFor(f, f.serving.grams)),
      food: f,
      source: 'search',
    });
    setQuery('');
    setError(null);
  }

  function updateGrams(g: string) {
    setPending(p => {
      if (!p) return p;
      const grams = parseFloat(g);
      const kcal = p.food && grams > 0 ? String(kcalFor(p.food, grams)) : p.kcal;
      return { ...p, grams: g, kcal };
    });
  }

  function startManual() {
    setMode('manual');
    setPending({ name: '', grams: '', kcal: '', source: 'manual' });
    setError(null);
  }

  async function addPending() {
    if (!user) { setShowLoginPrompt(true); return; }
    if (!pending) return;
    const kcal = Math.round(parseFloat(pending.kcal));
    const grams = Math.round(parseFloat(pending.grams)) || 0;
    if (!pending.name.trim() || !(kcal >= 0)) { setError('Enter a name and calories.'); return; }
    const entry: CalorieEntry = {
      id: uuidv4(),
      name: pending.name.trim(),
      amount: grams,
      calories: kcal,
      time: date === todayStr ? new Date().toTimeString().slice(0, 5) : '12:00',
    };
    await logMeal(entry, date);
    setPending(null);
    setError(null);
    clearPhoto();
  }

  /* ── Photo flow ── */
  function handlePhotoClick() {
    if (!user) { setShowLoginPrompt(true); return; }
    fileRef.current?.click();
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    setError(null);
    setAiNote(null);
    setImagePreview(URL.createObjectURL(file));
    try {
      const { base64, mimeType } = await prepareImage(file);
      setImageBase64(base64);
      setImageMime(mimeType);
      setPending({ name: '', grams: '150', kcal: '', source: 'photo' });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runAnalysis() {
    if (!imageBase64 || !pending) return;
    const grams = Math.max(1, parseFloat(pending.grams) || 150);
    setAnalyzing(true);
    setError(null);
    try {
      const r = await analyzeFood(imageBase64, imageMime, grams);
      setPending(p => p ? { ...p, name: p.name || r.name, kcal: String(r.calories), grams: String(grams) } : p);
      setAiNote(`${r.confidence} confidence${r.note ? ` · ${r.note}` : ''}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  function clearPhoto() {
    setImagePreview(null);
    setImageBase64('');
    setAiNote(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleDeleteMeal(id: string) {
    if (!user) { setShowLoginPrompt(true); return; }
    deleteMeal(id);
  }

  const ringColor = over ? 'var(--accent-danger)' : pct >= 85 ? 'var(--accent-warn)' : 'var(--accent-primary)';

  return (
    <div className="page">
      {showLoginPrompt && (
        <LoginPromptModal
          message="You need to be signed in to log your calories. Sign in to start tracking your nutrition!"
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      {/* Header + date nav */}
      <div className="row-between" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Calories</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {date === todayStr ? 'Today' : formatFullDate(date)}
          </p>
        </div>
        <div className="row" style={{ gap: '0.35rem' }}>
          <button className="icon-btn" onClick={() => setDate(shiftDate(date, -1))} title="Previous day"><ChevronLeft size={16} /></button>
          <input type="date" className="input-date" value={date} max={todayStr} onChange={e => e.target.value && setDate(e.target.value)} />
          <button className="icon-btn" onClick={() => setDate(shiftDate(date, 1))} disabled={date >= todayStr} style={{ opacity: date >= todayStr ? 0.3 : 1 }} title="Next day"><ChevronRight size={16} /></button>
          {date !== todayStr && <button className="chip" onClick={() => setDate(todayStr)}>Today</button>}
        </div>
      </div>

      {/* Summary */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="cal-summary">
          <div className="cal-ring" style={{ '--pct': `${pct}%`, '--ring': ringColor } as React.CSSProperties}>
            <div className="cal-ring-inner">
              <div className="cal-ring-value">{eaten}</div>
              <div className="cal-ring-label">{hasTarget ? `of ${target.target}` : 'kcal eaten'}</div>
            </div>
          </div>

          <div className="cal-stats">
            <div>
              <div className="card-label"><Target size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Target</div>
              <div className="cal-stat-value">{hasTarget ? target.target : '—'}</div>
            </div>
            <div>
              <div className="card-label"><Zap size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Eaten</div>
              <div className="cal-stat-value" style={{ color: 'var(--accent-primary)' }}>{eaten}</div>
            </div>
            <div>
              <div className="card-label"><Flame size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Burned</div>
              <div className="cal-stat-value" style={{ color: 'var(--accent-warn)' }}>{burned}</div>
            </div>
            <div>
              <div className="card-label">{over ? 'Over by' : 'Remaining'}</div>
              <div className="cal-stat-value" style={{ color: over ? 'var(--accent-danger)' : 'var(--accent-blue)' }}>
                {remaining === null ? '—' : Math.abs(remaining)}
              </div>
            </div>
          </div>
        </div>

        {!hasTarget && (
          <div className="cal-hint">
            <span>
              Set your height, age and goal to get a personal daily calorie target
              {target.missing.length > 0 && <> (missing: {target.missing.join(', ')})</>}.
            </span>
            <button className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }} onClick={() => navigate('/settings')}>
              <SettingsIcon size={13} /> Profile
            </button>
          </div>
        )}
        {hasTarget && target.source === 'profile' && target.tdee && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '0.75rem' }}>
            Target = maintenance {target.tdee} kcal adjusted for your goal · burned workout calories are shown separately, not added back.
          </p>
        )}
      </div>

      {/* Add food */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="row-between" style={{ marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontWeight: 600 }}>Add food</p>
          <div className="row" style={{ gap: '0.35rem' }}>
            <button className={`chip${mode === 'search' ? ' active' : ''}`} onClick={() => { setMode('search'); setError(null); }}>
              <Search size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Search
            </button>
            <button className={`chip${mode === 'manual' ? ' active' : ''}`} onClick={startManual}>
              <PencilLine size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Manual
            </button>
            <button className={`chip${mode === 'photo' ? ' active' : ''}`} onClick={() => { setMode('photo'); setError(null); }}>
              <Camera size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Photo (AI)
            </button>
          </div>
        </div>

        {/* Search mode */}
        {mode === 'search' && (
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '1.05rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <input
              className="input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search e.g. roti, dal, chicken, banana…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => { if (!user) setShowLoginPrompt(true); }}
            />
            {results.length > 0 && (
              <div className="food-results">
                {results.map(f => (
                  <button key={f.name} className="food-result" onClick={() => pickFood(f)}>
                    <span>{f.name}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {kcalFor(f, f.serving.grams)} kcal · {f.serving.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {query && results.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Not in the quick list — <button className="link-btn" onClick={() => { startManual(); setPending({ name: query, grams: '', kcal: '', source: 'manual' }); }}>add it manually</button>.
              </p>
            )}
          </div>
        )}

        {/* Photo mode */}
        {mode === 'photo' && (
          <>
            <div
              className="dropzone"
              style={{ marginBottom: 0, padding: imagePreview ? '0.75rem' : '2rem' }}
              onClick={handlePhotoClick}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (!user) { setShowLoginPrompt(true); return; }
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Food" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
              ) : (
                <>
                  <Upload size={32} color="var(--accent-primary)" style={{ margin: '0 auto 0.6rem', opacity: 0.6 }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Click or drop a food photo</p>
                  <p style={{ color: 'var(--text-faint)', fontSize: '0.72rem', marginTop: '0.25rem' }}>Analysed securely on the server · JPG, PNG, WEBP</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {imagePreview && (
              <div className="row" style={{ gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={runAnalysis} disabled={analyzing}>
                  {analyzing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={15} />}
                  {analyzing ? 'Analyzing…' : pending?.kcal ? 'Re-analyze' : 'Analyze'}
                </button>
                <button className="btn-secondary" onClick={() => { clearPhoto(); setPending(null); }}>
                  <X size={14} /> Clear
                </button>
                {aiNote && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{aiNote}</span>}
              </div>
            )}
          </>
        )}

        {/* Pending entry editor — shared by all three modes */}
        {pending && (mode !== 'photo' || imagePreview) && (
          <div className="pending-entry">
            <div className="pending-grid">
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="field-label">Food</p>
                <input className="input" placeholder="e.g. 2 rotis with dal" value={pending.name}
                  onChange={e => setPending(p => p ? { ...p, name: e.target.value } : p)} autoFocus={mode === 'manual'} />
              </div>
              <div>
                <p className="field-label">Amount (g)</p>
                <input className="input" type="number" min="0" placeholder="optional" value={pending.grams}
                  onChange={e => updateGrams(e.target.value)} />
              </div>
              <div>
                <p className="field-label">Calories (kcal)</p>
                <input className="input" type="number" min="0" placeholder="0" value={pending.kcal}
                  onChange={e => setPending(p => p ? { ...p, kcal: e.target.value, food: undefined } : p)} />
              </div>
            </div>
            {pending.food && (
              <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.4rem' }}>
                {pending.food.kcalPer100} kcal / 100 g · change the amount and the calories update automatically
              </p>
            )}
            {error && <p className="form-error">{error}</p>}
            <div className="row" style={{ gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn-primary" onClick={addPending} disabled={!pending.name.trim() || pending.kcal === ''}>
                <Plus size={15} /> Add to {date === todayStr ? 'today' : formatFullDate(date)}
              </button>
              <button className="btn-secondary" onClick={() => { setPending(null); setError(null); clearPhoto(); }}>Cancel</button>
            </div>
          </div>
        )}
        {error && !pending && <p className="form-error">{error}</p>}
      </div>

      {/* Day log */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{date === todayStr ? "Today's log" : `Log · ${formatFullDate(date)}`}</p>
        {log.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {user ? 'Nothing logged yet. Search a food above or snap a photo.' : 'Sign in to log and track your meals.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {log.map(entry => (
              <div key={entry.id} className="log-row">
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 500 }}>{entry.name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                    {entry.amount > 0 ? `${entry.amount} g · ` : ''}{entry.time}
                  </span>
                </div>
                <div className="row" style={{ gap: '0.5rem', flexShrink: 0 }}>
                  <span className="mono-num" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{entry.calories} kcal</span>
                  <button className="icon-btn danger" onClick={() => handleDeleteMeal(entry.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div className="row-between" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.625rem', marginTop: '0.25rem', fontWeight: 600 }}>
              <span>Total</span>
              <span className="mono-num" style={{ color: 'var(--accent-primary)' }}>{eaten} kcal</span>
            </div>
          </div>
        )}
      </div>

      {/* 7-day strip */}
      <div className="card">
        <div className="row-between" style={{ marginBottom: '0.75rem' }}>
          <p style={{ fontWeight: 600 }}>Last 7 days</p>
          {hasTarget && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>line = {target.target} kcal target</span>}
        </div>
        <div className="week-bars">
          {week.map(w => {
            const h = (w.kcal / weekMax) * 100;
            const isSel = w.date === date;
            const overT = hasTarget && w.kcal > target.target;
            return (
              <button key={w.date} className={`week-bar${isSel ? ' selected' : ''}`} onClick={() => setDate(w.date)} title={`${formatFullDate(w.date)} — ${w.kcal} kcal`}>
                <div className="week-bar-track">
                  <div className="week-bar-fill" style={{ height: `${h}%`, background: overT ? 'var(--accent-danger)' : 'var(--accent-primary)' }} />
                  {hasTarget && <div className="week-target" style={{ bottom: `${(target.target / weekMax) * 100}%` }} />}
                </div>
                <span className="week-bar-label">{formatDayLabel(w.date)}</span>
                <span className="week-bar-val">{w.kcal || ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
