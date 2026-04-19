import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { DEFAULT_DATA } from '../types';
import type { AppData, StreakData } from '../types';
import { today, daysDiff } from '../utils/dateHelpers';

/* ─── Slide data ───────────────────────────────────────────────────── */
const SLIDES = [
  {
    // Glamorous female athlete — studio, dramatic lighting
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=90',
    line1: 'BUILD YOUR',
    line2: 'STRONGEST SELF',
    sub: 'Every habit counts. Every day matters.',
    pos: 'center 20%',
  },
  {
    // Male bodybuilder — gym, heavy iron
    url: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?auto=format&fit=crop&w=1600&q=90',
    line1: 'PUSH YOUR',
    line2: 'LIMITS.',
    sub: 'Iron sharpens iron. So does one rep more.',
    pos: 'center 30%',
  },
  {
    // Female CrossFit / functional fitness athlete
    url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1600&q=90',
    line1: 'SHE IS',
    line2: 'UNSTOPPABLE.',
    sub: 'Strength has no gender. Only dedication.',
    pos: 'center 25%',
  },
  {
    // Outdoor running — golden hour, road
    url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1600&q=90',
    line1: 'EVERY MILE',
    line2: 'MATTERS.',
    sub: 'Start slow. Finish strong. Never stop.',
    pos: 'center 45%',
  },
  {
    // Male gym — barbell squat / heavy lift
    url: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1600&q=90',
    line1: 'LIFT HEAVY.',
    line2: 'RISE HIGHER.',
    sub: 'Discipline is choosing between what you want now and what you want most.',
    pos: 'center 30%',
  },
  {
    // Female yoga / flexibility — serene
    url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1600&q=90',
    line1: 'REST IS',
    line2: 'PROGRESS TOO.',
    sub: 'Recovery is where the real gains happen.',
    pos: 'center 35%',
  },
  {
    // Gym weights / equipment — moody dark
    url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1600&q=90',
    line1: 'NO EXCUSES.',
    line2: 'ONLY RESULTS.',
    sub: 'Small steps every day. Big change every year.',
    pos: 'center 40%',
  },
  {
    // Female sprinting / track athlete
    url: 'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?auto=format&fit=crop&w=1600&q=90',
    line1: 'FASTER.',
    line2: 'STRONGER. TODAY.',
    sub: 'You are always one workout away from a good mood.',
    pos: 'center 35%',
  },
];

/* ─── Content data ─────────────────────────────────────────────────── */
const QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { text: "What seems impossible today will one day become your warm-up.", author: "Unknown" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Sweat is fat crying.", author: "Unknown" },
  { text: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never came from comfort zones.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Unknown" },
];

const CHALLENGES = [
  { emoji: '💪', text: 'Do 10 push-ups RIGHT NOW!', tag: '~45 sec' },
  { emoji: '🧘', text: 'Take 5 slow, deep breaths', tag: '~1 min' },
  { emoji: '🚰', text: 'Drink a full glass of water', tag: 'Now' },
  { emoji: '🦵', text: '20 bodyweight squats — go!', tag: '~2 min' },
  { emoji: '🏃', text: 'Walk in place for 60 seconds', tag: '~1 min' },
  { emoji: '🤸', text: 'Touch your toes 10 times', tag: '~30 sec' },
  { emoji: '👊', text: "15 jumping jacks — let's go!", tag: '~1 min' },
];

const FACTS = [
  "Your heart beats ~100,000 times per day. Regular exercise keeps it strong for decades.",
  "Muscle burns 3× more calories than fat — even while you sleep!",
  "Just 30 min of walking per day cuts heart disease risk by up to 40%.",
  "Sleep is when muscles actually grow. Rest days are part of the training plan.",
  "Drinking water before meals can boost your metabolism by up to 30%.",
  "It only takes 21 days to build a new habit — you're already on your way.",
  "The fittest people treat workouts like brushing teeth — non-negotiable, every day.",
];

/* ─── Helpers ──────────────────────────────────────────────────────── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Still up? 🌙";
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  if (h < 21) return "Good Evening";
  return "Night Owl Mode 🦉";
}

function currentStreakDays(s: StreakData): number {
  const t = today();
  if (!s.breakDates.length) return daysDiff(s.startDate, t);
  return daysDiff([...s.breakDates].sort().slice(-1)[0], t);
}

/* ─── Component ────────────────────────────────────────────────────── */
export default function HomePage() {
  const [data] = useLocalStorage<AppData>('fittrack_v2', DEFAULT_DATA);
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  const [slide, setSlide]           = useState(0);
  const [challengeDone, setChallengeDone] = useState(false);
  const [imgLoaded, setImgLoaded] = useState<boolean[]>(() => SLIDES.map(() => false));

  /* Auto-advance every 3 s */
  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  /* Preload images */
  useEffect(() => {
    SLIDES.forEach((sl, i) => {
      const img = new Image();
      img.src = sl.url;
      img.onload = () => setImgLoaded(prev => { const n = [...prev]; n[i] = true; return n; });
    });
  }, []);

  /* Pick daily content by date */
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote     = QUOTES[dayOfYear % QUOTES.length];
  const challenge = CHALLENGES[new Date().getDay()];
  const fact      = FACTS[dayOfYear % FACTS.length];

  /* Stats */
  const todayStr  = today();
  const { columns, checks } = data.habits;
  const todayChecked  = columns.reduce((s, _, i) => s + (checks[todayStr]?.[String(i)] ? 1 : 0), 0);
  const habitPct      = columns.length ? Math.round((todayChecked / columns.length) * 100) : 0;
  const bestStreak    = data.streaks.length ? Math.max(...data.streaks.map(currentStreakDays)) : 0;
  const todayCal      = (data.calorieLog[todayStr] ?? []).reduce((s, e) => s + e.calories, 0);

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  /* Quick nav items */
  const QUICK = [
    { to: '/habits',   emoji: '📅', label: 'Habits',   sub: 'Daily check-ins',    color: '#00ff9d' },
    { to: '/streaks',  emoji: '🔥', label: 'Streaks',  sub: 'Maintain your wins', color: '#ffa502' },
    { to: '/calories', emoji: '⚡', label: 'Calories', sub: 'AI food scanner',    color: '#00d4ff' },
    { to: '/charts',   emoji: '📊', label: 'Charts',   sub: 'See your progress',  color: '#7c3aed' },
  ];

  return (
    <div className="home-page">

      {/* ═══ HERO SLIDER ═══ */}
      <section className="hero-section">
        {SLIDES.map((sl, i) => (
          <div
            key={i}
            className={`hero-slide${i === slide ? ' active' : ''}`}
            style={{
              backgroundImage: imgLoaded[i] ? `url(${sl.url})` : undefined,
              backgroundColor: '#111118',
              backgroundPosition: sl.pos,
            }}
          />
        ))}
        <div className="hero-overlay" />

        <div className="hero-content">
          <p className="hero-line1">{SLIDES[slide].line1}</p>
          <p className="hero-line2">{SLIDES[slide].line2}</p>
          <p className="hero-sub">{SLIDES[slide].sub}</p>

          <div className="hero-cta-row">
            <button className="btn-primary" style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem', letterSpacing: '0.05em' }}
              onClick={() => navigate('/habits')}>
              Start Tracking →
            </button>
            <button className="btn-secondary" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}
              onClick={() => contentRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Explore
            </button>
          </div>

          {/* Slide indicators */}
          <div className="hero-dots">
            {SLIDES.map((_, i) => (
              <button key={i} className={`hero-dot${i === slide ? ' active' : ''}`} onClick={() => setSlide(i)} />
            ))}
          </div>
        </div>

        {/* Scroll arrow */}
        <button className="scroll-arrow" onClick={() => contentRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          <ChevronDown size={26} />
        </button>
      </section>

      {/* ═══ CONTENT ═══ */}
      <div ref={contentRef} className="home-content">

        {/* Greeting */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 className="home-greeting">
            {getGreeting()},{' '}
            <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 24px rgba(0,255,157,0.45)' }}>
              Champ! 💥
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.3rem' }}>
            {dateLabel}
          </p>
        </div>

        {/* Today's stats */}
        <div className="home-stats">
          {[
            { label: "Today's Habits", value: `${habitPct}%`,   sub: `${todayChecked}/${columns.length} done`,  color: 'var(--accent-primary)',   route: '/habits',   pct: habitPct },
            { label: 'Best Streak',    value: `${bestStreak}d`,  sub: 'days running',                            color: 'var(--accent-warn)',      route: '/streaks',  pct: null    },
            { label: 'Calories Today', value: `${todayCal}`,     sub: 'kcal logged',                             color: 'var(--accent-blue)',      route: '/calories', pct: null    },
          ].map(item => (
            <div key={item.label} className="card stat-card" onClick={() => navigate(item.route)} style={{ cursor: 'pointer' }}>
              <div className="card-label">{item.label}</div>
              <div className="card-value" style={{ color: item.color, textShadow: `0 0 20px ${item.color}66` }}>{item.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{item.sub}</div>
              {item.pct !== null && (
                <div className="progress-bar" style={{ marginTop: '0.625rem' }}>
                  <div className="progress-fill" style={{ width: `${item.pct}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Daily quote */}
        <div className="card quote-card" style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.6rem' }}>
            💬 Daily Motivation
          </div>
          <blockquote style={{ fontSize: '1rem', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
            "{quote.text}"
          </blockquote>
          <cite style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>— {quote.author}</cite>
        </div>

        {/* Challenge + Fact */}
        <div className="challenge-fact-grid" style={{ marginBottom: '1.5rem' }}>
          {/* Daily challenge */}
          <div className={`card challenge-card${challengeDone ? ' done' : ''}`}>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-warn)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '0.5rem' }}>
              ⚡ Today's Challenge
            </div>
            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{challenge.emoji}</div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.35, marginBottom: '0.25rem' }}>{challenge.text}</p>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '0.875rem' }}>Est. {challenge.tag}</p>
            <button
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', padding: '0.4rem 0.75rem', transition: 'all 200ms' }}
              className={challengeDone ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setChallengeDone(d => !d)}
            >
              {challengeDone ? <><Check size={13} /> Crushed it!</> : 'Mark as done'}
            </button>
          </div>

          {/* Fitness fact */}
          <div className="card fact-card">
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '0.5rem' }}>
              🧠 Did You Know?
            </div>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>💡</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{fact}</p>
          </div>
        </div>

        {/* Quick navigate */}
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.875rem' }}>
            Quick Navigate
          </p>
          <div className="quick-nav-grid">
            {QUICK.map(item => (
              <div key={item.to} className="quick-nav-card" onClick={() => navigate(item.to)}
                style={{ '--card-color': item.color } as React.CSSProperties}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{item.emoji}</div>
                <div style={{ fontWeight: 700, color: item.color, marginBottom: '0.2rem', fontSize: '0.9rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
