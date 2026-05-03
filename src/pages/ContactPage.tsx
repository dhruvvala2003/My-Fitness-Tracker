import { Mail, Code2, Dumbbell, MapPin, Heart, Coffee, Trophy, Flame, ExternalLink } from 'lucide-react';

const SKILLS = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'HTML & CSS', 'Git & GitHub'];

const FUN_FACTS = [
  { icon: '☕', text: 'Codes better after coffee' },
  { icon: '🏋️', text: 'Gym is my second home' },
  { icon: '🎯', text: 'Always chasing the next goal' },
  { icon: '🚀', text: 'Built this entire app from scratch' },
];

const STATS = [
  { icon: Trophy, label: 'Projects Built', value: '5+', color: 'var(--accent-warn)' },
  { icon: Code2,  label: 'Days Coding',    value: '365+', color: 'var(--accent-primary)' },
  { icon: Flame,  label: 'Gym Streak',     value: '∞',   color: 'var(--accent-danger)' },
  { icon: Coffee, label: 'Coffees / Day',  value: '3',   color: '#a78bfa' },
];

export default function ContactPage() {
  return (
    <div className="page">

      {/* ── Header ── */}
      <h1 className="page-title">About Developer</h1>

      {/* ── Profile card ── */}
      <div className="card" style={{ marginBottom: '1.25rem', position: 'relative', overflow: 'visible' }}>
        {/* Glow ring behind photo */}
        <div style={{
          position: 'absolute', top: '-2px', left: '50%',
          transform: 'translateX(-50%)',
          width: 110, height: 110,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00ff9d, #7c3aed)',
          filter: 'blur(16px)',
          opacity: 0.45,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '0.5rem' }}>
          {/* Photo */}
          <div style={{
            width: 110, height: 110,
            borderRadius: '50%',
            border: '3px solid var(--accent-primary)',
            boxShadow: '0 0 24px rgba(0,255,157,0.4)',
            overflow: 'hidden',
            marginBottom: '1rem',
            flexShrink: 0,
          }}>
            <img
              src="/dhruv.jpg"
              alt="Vala Dhruv"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
            />
          </div>

          {/* Name & title */}
          <h2 style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '1.5rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #00ff9d, #00d4ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem',
          }}>
            Vala Dhruv
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            Coder in Progress &nbsp;·&nbsp; Fitness Enthusiast
          </p>

          {/* Location badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-tertiary)', borderRadius: '20px', padding: '0.3rem 0.875rem', marginBottom: '1.25rem' }}>
            <MapPin size={13} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>India 🇮🇳</span>
          </div>

          {/* Contact links */}
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href="mailto:dkvala2003@gmail.com"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.25)', borderRadius: '8px', padding: '0.45rem 0.875rem', color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, transition: 'all 160ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,157,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,255,157,0.08)')}
            >
              <Mail size={14} /> dkvala2003@gmail.com
            </a>
            <a
              href="https://github.com"
              target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.45rem 0.875rem', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, transition: 'all 160ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            >
              <ExternalLink size={14} /> GitHub
            </a>
            <a
              href="https://linkedin.com"
              target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,119,181,0.12)', border: '1px solid rgba(0,119,181,0.3)', borderRadius: '8px', padding: '0.45rem 0.875rem', color: '#60a5fa', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, transition: 'all 160ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,119,181,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,119,181,0.12)')}
            >
              <ExternalLink size={14} /> LinkedIn
            </a>
          </div>
        </div>
      </div>

      {/* ── Mini stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.625rem', marginBottom: '1.25rem' }}>
        {STATS.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '0.875rem 0.75rem' }}>
            <Icon size={18} color={color} style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── About / Bio ── */}
      <div className="card" style={{ marginBottom: '1.25rem', borderLeft: '3px solid var(--accent-primary)' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.75rem' }}>
          👋 About Developer
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.75, marginBottom: '0.75rem' }}>
          Hey! I'm <strong style={{ color: 'var(--accent-primary)' }}>Dhruv</strong> — a passionate coder-in-learning who believes every bug is just a puzzle waiting to be solved. I built this fitness tracker from scratch to combine two things I love: <strong>coding</strong> and <strong>staying fit</strong>.
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
          Currently leveling up my skills in web development, one project at a time. When I'm not behind a screen, you'll find me in the gym, lifting heavy things and putting them back down. 💪
        </p>
      </div>

      {/* ── Skills ── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <Code2 size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Tech Stack</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {SKILLS.map(skill => (
            <span key={skill} style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid rgba(0,255,157,0.15)',
              borderRadius: '20px',
              padding: '0.3rem 0.875rem',
              fontSize: '0.78rem',
              color: 'var(--accent-primary)',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 500,
            }}>
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* ── Fun facts ── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <Dumbbell size={16} color="var(--accent-warn)" />
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-warn)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Fun Facts</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {FUN_FACTS.map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── This app ── */}
      <div className="card" style={{ borderLeft: '3px solid var(--accent-secondary)' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.75rem' }}>
          🛠 About This App
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-primary)' }}>FitTrack</strong> is a personal fitness tracker built with{' '}
          <span style={{ color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace' }}>React + TypeScript</span>,{' '}
          <span style={{ color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace' }}>Tailwind CSS</span>, and{' '}
          <span style={{ color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace' }}>Claude AI</span>.
          All data stays on your device — no accounts, no servers, just pure local storage. Built with{' '}
          <Heart size={13} style={{ display: 'inline', verticalAlign: 'middle' }} color="var(--accent-danger)" />{' '}
          and too much coffee.
        </p>
      </div>

    </div>
  );
}
