import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, Flame, Droplets, Zap, Dumbbell, Scale, CalendarCheck,
  ChevronRight, Plus, Minus, ArrowUpRight, ArrowDownRight, Lightbulb,
} from 'lucide-react';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { TiltCard } from '../components/effects';
import type { HabitsData, StreakData } from '../types';
import { today, daysDiff, getPast7Days, formatDayLabel } from '../utils/dateHelpers';
import { calcCalorieTarget } from '../utils/calories';

/* ─── Banner slides (rotating background) ─────────────────────────── */
const SLIDES = [
  { url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80', pos: 'center 20%' },
  { url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?auto=format&fit=crop&w=1400&q=80', pos: 'center 30%' },
  { url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=80', pos: 'center 45%' },
  { url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1400&q=80', pos: 'center 40%' },
];

const QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: 'Unknown' },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: 'Unknown' },
  { text: "Take care of your body. It's the only place you have to live.", author: 'Jim Rohn' },
  { text: 'The pain you feel today will be the strength you feel tomorrow.', author: 'Unknown' },
  { text: 'What seems impossible today will one day become your warm-up.', author: 'Unknown' },
  { text: "You don't have to be great to start, but you have to start to be great.", author: 'Zig Ziglar' },
  { text: 'Push yourself because no one else is going to do it for you.', author: 'Unknown' },
  { text: 'Great things never came from comfort zones.', author: 'Unknown' },
  { text: 'Do something today that your future self will thank you for.', author: 'Unknown' },
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
];

const CHALLENGES = [
  { emoji: '💪', text: 'Do 10 push-ups right now', tag: '~45 sec' },
  { emoji: '🧘', text: 'Take 5 slow, deep breaths', tag: '~1 min' },
  { emoji: '🚰', text: 'Drink a full glass of water', tag: 'Now' },
  { emoji: '🦵', text: '20 bodyweight squats — go!', tag: '~2 min' },
  { emoji: '🏃', text: 'Walk in place for 60 seconds', tag: '~1 min' },
  { emoji: '🤸', text: 'Touch your toes 10 times', tag: '~30 sec' },
  { emoji: '👊', text: "15 jumping jacks — let's go!", tag: '~1 min' },
];

/* ─── Helpers ──────────────────────────────────────────────────────── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Night owl mode';
}

function currentStreakDays(s: StreakData): number {
  const t = today();
  if (!s.breakDates.length) return daysDiff(s.startDate, t);
  return daysDiff([...s.breakDates].sort().slice(-1)[0], t);
}

function pastDays(n: number, endOffset = 0): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i) - endOffset);
    const pad = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}

const DAY_OF_YEAR = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
const QUOTE     = QUOTES[DAY_OF_YEAR % QUOTES.length];
const CHALLENGE = CHALLENGES[new Date().getDay()];

interface ChecklistItem {
  key: string;
  kind: 'main' | 'core';
  idx: number;
  label: string;
  done: boolean;
  wantsNote: boolean;
}

/* ─── Component ────────────────────────────────────────────────────── */
export default function HomePage() {
  const { data, toggleHabitCheck, toggleCoreHabitCheck, setWater } = useAppData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [slide, setSlide] = useState(0);
  const [challengeDone, setChallengeDone] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [notePrompt, setNotePrompt] = useState<ChecklistItem & { text: string } | null>(null);

  const todayStr = today();
  const popupMessage = data.settings.popupMessage;

  /* Popup message (once per session per message) */
  useEffect(() => {
    if (popupMessage && popupMessage.trim()) {
      const key = 'popup_seen_' + btoa(unescape(encodeURIComponent(popupMessage.slice(0, 50))));
      if (!sessionStorage.getItem(key)) {
        const timer = setTimeout(() => setShowPopup(true), 100);
        return () => clearTimeout(timer);
      }
    }
  }, [popupMessage]);

  function dismissPopup() {
    setShowPopup(false);
    if (popupMessage) {
      const key = 'popup_seen_' + btoa(unescape(encodeURIComponent(popupMessage.slice(0, 50))));
      sessionStorage.setItem(key, '1');
    }
  }

  /* Banner rotation + preload */
  useEffect(() => {
    SLIDES.forEach(s => { const img = new Image(); img.src = s.url; });
    const id = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 7000);
    return () => clearInterval(id);
  }, []);

  /* Scroll reveal */
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('revealed'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── Today's numbers ── */
  const checklist: ChecklistItem[] = useMemo(() => {
    const items: ChecklistItem[] = [];
    const mk = (kind: 'main' | 'core', h: HabitsData) => {
      h.columns.forEach((label, idx) => {
        if ((h.hiddenColumns ?? []).includes(idx)) return;
        items.push({
          key: `${kind}-${idx}`, kind, idx, label,
          done: !!h.checks[todayStr]?.[String(idx)],
          wantsNote: (h.noteColumns ?? []).includes(idx),
        });
      });
    };
    mk('main', data.habits);
    mk('core', data.coreHabits);
    return items;
  }, [data.habits, data.coreHabits, todayStr]);

  const doneCount  = checklist.filter(i => i.done).length;
  const habitPct   = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;

  const bestStreak = data.streaks.length ? Math.max(...data.streaks.map(currentStreakDays)) : 0;
  const todayCal   = (data.calorieLog[todayStr] ?? []).reduce((s, e) => s + e.calories, 0);
  const todayBurn  = Math.round(data.workouts.filter(w => w.date === todayStr).reduce((s, w) => s + w.totalCalories, 0));
  const latestWeight = data.weights[data.weights.length - 1];
  const prevWeight   = data.weights[data.weights.length - 2];
  const weightDelta  = latestWeight && prevWeight ? latestWeight.weightKg - prevWeight.weightKg : null;
  const target  = calcCalorieTarget(data.settings, latestWeight?.weightKg);
  const water   = data.water[todayStr] ?? 0;
  const waterGoal = data.settings.waterGoal || 8;

  /* ── Week view: habit completion % per day, this week vs last ── */
  const mainVisible = data.habits.columns.map((_, i) => i).filter(i => !(data.habits.hiddenColumns ?? []).includes(i));
  const coreVisible = data.coreHabits.columns.map((_, i) => i).filter(i => !(data.coreHabits.hiddenColumns ?? []).includes(i));
  const totalCols = mainVisible.length + coreVisible.length;

  function dayPct(d: string): number {
    if (!totalCols) return 0;
    const done = mainVisible.filter(i => data.habits.checks[d]?.[String(i)]).length
               + coreVisible.filter(i => data.coreHabits.checks[d]?.[String(i)]).length;
    return Math.round((done / totalCols) * 100);
  }
  const week = getPast7Days().map(d => ({ date: d, pct: dayPct(d) }));
  const weekAvg = Math.round(week.reduce((s, w) => s + w.pct, 0) / 7);
  const lastWeek = pastDays(7, 7).map(dayPct);
  const lastWeekAvg = Math.round(lastWeek.reduce((s, p) => s + p, 0) / 7);
  const weekTrend = weekAvg - lastWeekAvg;
  const weekWorkouts = data.workouts.filter(w => getPast7Days().includes(w.date)).length;

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const rawName = user?.email?.split('@')[0] ?? '';
  const displayName = rawName
    ? rawName.charAt(0).toUpperCase() + rawName.slice(1).replace(/[._-]+/g, ' ')
    : 'Champ';

  /* ── Actions ── */
  function handleToggle(item: ChecklistItem) {
    if (!user) { navigate('/login'); return; }
    if (!item.done && item.wantsNote) { setNotePrompt({ ...item, text: '' }); return; }
    if (item.kind === 'main') toggleHabitCheck(todayStr, item.idx);
    else toggleCoreHabitCheck(todayStr, item.idx);
  }

  function commitNote(withNote: boolean) {
    if (!notePrompt) return;
    const note = withNote ? notePrompt.text.trim() : undefined;
    if (notePrompt.kind === 'main') toggleHabitCheck(todayStr, notePrompt.idx, note);
    else toggleCoreHabitCheck(todayStr, notePrompt.idx, note);
    setNotePrompt(null);
  }

  function changeWater(delta: number) {
    if (!user) { navigate('/login'); return; }
    setWater(todayStr, water + delta);
  }

  const topStreaks = [...data.streaks].sort((a, b) => currentStreakDays(b) - currentStreakDays(a)).slice(0, 3);

  const QUICK = [
    { to: '/habits',   emoji: '📅', label: 'Habits',   sub: 'Monthly table',      color: '#34d399' },
    { to: '/workout',  emoji: '🏋️', label: 'Workout',  sub: 'Log a session',      color: '#38bdf8' },
    { to: '/calories', emoji: '🍽️', label: 'Calories', sub: 'Food & target',      color: '#fbbf24' },
    { to: '/progress', emoji: '📈', label: 'Progress', sub: 'Weight & trends',    color: '#a78bfa' },
    { to: '/streaks',  emoji: '🔥', label: 'Streaks',  sub: 'Keep the chain',     color: '#f87171' },
    { to: '/insights', emoji: '💡', label: 'Insights', sub: 'Daily reflections',  color: '#f472b6' },
    { to: '/videos',   emoji: '🎬', label: 'Videos',   sub: 'Exercise library',   color: '#a3e635' },
    { to: '/settings', emoji: '⚙️', label: 'Settings', sub: 'Profile & goals',    color: '#8b93a7' },
  ];

  return (
    <div className="home-page">

      {/* ═══ POPUP MESSAGE ═══ */}
      {showPopup && popupMessage && (
        <div className="popup-overlay" onClick={dismissPopup}>
          <div className="popup-container" onClick={e => e.stopPropagation()}>
            <div className="popup-orb popup-orb-1" />
            <div className="popup-orb popup-orb-2" />
            <div className="popup-orb popup-orb-3" />
            <button className="popup-close" onClick={dismissPopup}><X size={20} /></button>
            <div className="popup-icon-row">
              <div className="popup-icon-glow"><span style={{ fontSize: '2rem' }}>💬</span></div>
            </div>
            <div className="popup-body"><p className="popup-text">{popupMessage}</p></div>
            <button className="popup-dismiss-btn" onClick={dismissPopup}>Got it ✨</button>
          </div>
        </div>
      )}

      {/* ═══ NOTE PROMPT (habit with notes enabled) ═══ */}
      {notePrompt && (
        <div className="note-prompt-overlay" onClick={() => setNotePrompt(null)}>
          <div className="note-prompt-card" onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{notePrompt.label}</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Add a note (optional)</p>
            <input
              autoFocus
              className="input"
              value={notePrompt.text}
              onChange={e => setNotePrompt({ ...notePrompt, text: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') commitNote(true); if (e.key === 'Escape') setNotePrompt(null); }}
              placeholder="E.g., Morning jog, 30 mins"
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={() => commitNote(false)}>Skip</button>
              <button className="btn-primary" onClick={() => commitNote(true)}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BANNER ═══ */}
      <section className="home-banner">
        {SLIDES.map((s, i) => (
          <div key={i} className={`home-banner-bg${i === slide ? ' active' : ''}`}
            style={{ backgroundImage: `url(${s.url})`, backgroundPosition: s.pos }} />
        ))}
        <div className="home-banner-overlay" />
        <div className="home-banner-content">
          <p className="home-banner-date">{dateLabel}</p>
          <h1 className="home-banner-greeting">
            {getGreeting()}, <span>{displayName}</span>
          </h1>
          <p className="home-banner-quote">“{QUOTE.text}” <span>— {QUOTE.author}</span></p>
          <div className="home-banner-cta">
            <button className="btn-primary" onClick={() => navigate('/workout')}>
              <Dumbbell size={15} /> Start workout
            </button>
            <button className="btn-secondary" onClick={() => navigate('/calories')}>
              <Zap size={15} /> Log food
            </button>
          </div>
        </div>
        <div className="home-banner-dots">
          {SLIDES.map((_, i) => (
            <button key={i} className={`hero-dot${i === slide ? ' active' : ''}`} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      </section>

      <div className="home-content">

        {/* ═══ TODAY AT A GLANCE ═══ */}
        <p className="section-label reveal">Today at a glance</p>
        <div className="home-stats reveal" style={{ marginBottom: '1.25rem' }}>
          <TiltCard className="card stat-card" onClick={() => navigate('/habits')}>
            <div className="card-label"><CalendarCheck size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Habits</div>
            <div className="card-value" style={{ color: 'var(--accent-primary)' }}>{habitPct}%</div>
            <div className="stat-sub">{doneCount}/{checklist.length} done</div>
            <div className="progress-bar" style={{ marginTop: '0.5rem' }}><div className="progress-fill" style={{ width: `${habitPct}%` }} /></div>
          </TiltCard>

          <TiltCard className="card stat-card" onClick={() => navigate('/calories')}>
            <div className="card-label"><Zap size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Calories</div>
            <div className="card-value" style={{ color: target.target && todayCal > target.target ? 'var(--accent-danger)' : 'var(--accent-blue)' }}>{todayCal}</div>
            <div className="stat-sub">{target.target ? `of ${target.target} kcal` : 'kcal eaten · set a target'}</div>
            {target.target > 0 && (
              <div className="progress-bar" style={{ marginTop: '0.5rem' }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, (todayCal / target.target) * 100)}%`, background: todayCal > target.target ? 'var(--accent-danger)' : 'var(--accent-blue)' }} />
              </div>
            )}
          </TiltCard>

          <TiltCard className="card stat-card" onClick={() => navigate('/workout')}>
            <div className="card-label"><Flame size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Burned</div>
            <div className="card-value" style={{ color: 'var(--accent-warn)' }}>{todayBurn}</div>
            <div className="stat-sub">{weekWorkouts} workout{weekWorkouts !== 1 ? 's' : ''} this week</div>
          </TiltCard>

          <TiltCard className="card stat-card" onClick={() => navigate('/progress')}>
            <div className="card-label"><Scale size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Weight</div>
            <div className="card-value">{latestWeight ? latestWeight.weightKg : '—'}<span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{latestWeight ? ' kg' : ''}</span></div>
            <div className="stat-sub" style={{ color: weightDelta === null ? undefined : weightDelta <= 0 ? 'var(--accent-primary)' : 'var(--accent-warn)' }}>
              {weightDelta === null ? (latestWeight ? 'latest entry' : 'log on Progress') : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg since last`}
            </div>
          </TiltCard>

          <TiltCard className="card stat-card" onClick={() => navigate('/streaks')}>
            <div className="card-label"><Flame size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />Best streak</div>
            <div className="card-value" style={{ color: 'var(--accent-danger)' }}>{bestStreak}<span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}> d</span></div>
            <div className="stat-sub">{data.streaks.length} streak{data.streaks.length !== 1 ? 's' : ''} tracked</div>
          </TiltCard>
        </div>

        {/* ═══ CHECKLIST + WATER ═══ */}
        <div className="home-grid-2 reveal" style={{ marginBottom: '1.25rem' }}>
          <div className="card">
            <div className="row-between" style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: 600 }}>Today's habits</p>
              <button className="link-btn" onClick={() => navigate('/habits')}>Full table <ChevronRight size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /></button>
            </div>
            {checklist.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {user ? 'No habits yet — add columns in Settings or Core Habits.' : 'Sign in to track your daily habits.'}
              </p>
            ) : (
              <div className="checklist">
                {checklist.map(item => (
                  <button key={item.key} className={`checklist-item${item.done ? ' done' : ''}`} onClick={() => handleToggle(item)}>
                    <span className={`check-btn${item.done ? ' checked' : ''}`} aria-hidden>
                      {item.done && <Check size={15} strokeWidth={3} />}
                    </span>
                    <span className="checklist-label">{item.label}</span>
                    {item.kind === 'core' && <span className="checklist-tag">core</span>}
                  </button>
                ))}
              </div>
            )}
            {checklist.length > 0 && doneCount === checklist.length && (
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '0.75rem', fontWeight: 600 }}>All done for today 🎉</p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Water */}
            <div className="card">
              <div className="row-between" style={{ marginBottom: '0.6rem' }}>
                <p style={{ fontWeight: 600 }}><Droplets size={15} color="var(--accent-blue)" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />Water</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{water} / {waterGoal} glasses</span>
              </div>
              <div className="water-row">
                {Array.from({ length: waterGoal }).map((_, i) => (
                  <button key={i} className={`water-glass${i < water ? ' full' : ''}`} onClick={() => changeWater(i < water ? -(water - i) : (i + 1 - water))} title={`${i + 1} glass${i ? 'es' : ''}`} />
                ))}
              </div>
              <div className="row" style={{ gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn-secondary" style={{ padding: '0.35rem 0.6rem' }} onClick={() => changeWater(-1)} disabled={water <= 0}><Minus size={14} /></button>
                <button className="btn-primary" style={{ padding: '0.35rem 0.75rem' }} onClick={() => changeWater(1)}><Plus size={14} /> Glass</button>
                {water >= waterGoal && <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Goal reached 💧</span>}
              </div>
            </div>

            {/* Challenge */}
            <div className={`card challenge-card${challengeDone ? ' done' : ''}`}>
              <div className="row-between">
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--accent-warn)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '0.35rem' }}>⚡ Mini challenge</div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{CHALLENGE.emoji} {CHALLENGE.text}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 2 }}>Est. {CHALLENGE.tag}</p>
                </div>
                <button className={challengeDone ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', flexShrink: 0 }} onClick={() => setChallengeDone(d => !d)}>
                  {challengeDone ? <><Check size={13} /> Done</> : 'Done?'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ THIS WEEK + STREAKS ═══ */}
        <div className="home-grid-2 reveal" style={{ marginBottom: '1.25rem' }}>
          <div className="card">
            <div className="row-between" style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: 600 }}>This week</p>
              <span className="row" style={{ gap: '0.3rem', fontSize: '0.78rem', color: weekTrend >= 0 ? 'var(--accent-primary)' : 'var(--accent-warn)', fontWeight: 600 }}>
                {weekTrend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {weekAvg}% avg · {weekTrend >= 0 ? '+' : ''}{weekTrend}% vs last week
              </span>
            </div>
            <div className="week-mini">
              {week.map(w => (
                <div key={w.date} className={`week-mini-col${w.date === todayStr ? ' today' : ''}`} title={`${w.date}: ${w.pct}%`}>
                  <div className="week-mini-track"><div className="week-mini-fill" style={{ height: `${w.pct}%` }} /></div>
                  <span>{formatDayLabel(w.date)}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '0.5rem' }}>Habit completion per day (main + core)</p>
          </div>

          <div className="card">
            <div className="row-between" style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: 600 }}>Streaks</p>
              <button className="link-btn" onClick={() => navigate('/streaks')}>All <ChevronRight size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /></button>
            </div>
            {topStreaks.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No streaks yet. Start one — e.g. “No sugar”.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {topStreaks.map(s => {
                  const d = currentStreakDays(s);
                  return (
                    <button key={s.id} className="streak-mini" onClick={() => navigate(`/streaks/${s.id}`)}>
                      <Flame size={15} color="var(--accent-warn)" />
                      <span style={{ flex: 1, textAlign: 'left', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                      <span className="mono-num" style={{ fontWeight: 700, color: 'var(--accent-warn)' }}>{d}<span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}> d</span></span>
                    </button>
                  );
                })}
              </div>
            )}
            {data.insights.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.875rem', borderTop: '1px solid var(--border)', paddingTop: '0.625rem' }}>
                <Lightbulb size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                Latest insight: <em>“{data.insights[0].text.slice(0, 80)}{data.insights[0].text.length > 80 ? '…' : ''}”</em>
              </p>
            )}
          </div>
        </div>

        {/* ═══ QUICK NAVIGATE ═══ */}
        <div className="reveal">
          <p className="section-label">Quick navigate</p>
          <div className="quick-nav-grid">
            {QUICK.map(item => (
              <TiltCard key={item.to} className="quick-nav-card" onClick={() => navigate(item.to)}
                style={{ '--card-color': item.color } as React.CSSProperties}>
                <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{item.emoji}</div>
                <div style={{ fontWeight: 700, color: item.color, marginBottom: '0.15rem', fontSize: '0.875rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{item.sub}</div>
              </TiltCard>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
