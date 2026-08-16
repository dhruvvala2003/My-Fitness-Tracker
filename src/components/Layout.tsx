import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Calendar, Flame, Zap, TrendingUp, Settings, User, Lightbulb,
  Video, Dumbbell, LogIn, LogOut, Shield, MoreHorizontal, Activity,
} from 'lucide-react';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';

type NavEntry = { to: string; icon: typeof Home; label: string; end: boolean };

const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/',         icon: Home,       label: 'Home',     end: true },
      { to: '/progress', icon: TrendingUp, label: 'Progress', end: true },
    ],
  },
  {
    label: 'Track',
    items: [
      { to: '/habits',   icon: Calendar, label: 'Habits',   end: true },
      { to: '/streaks',  icon: Flame,    label: 'Streaks',  end: false },
      { to: '/calories', icon: Zap,      label: 'Calories', end: true },
      { to: '/workout',  icon: Dumbbell, label: 'Workout',  end: true },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/insights', icon: Lightbulb, label: 'Insights', end: true },
      { to: '/videos',   icon: Video,     label: 'Videos',   end: true },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings',        end: true },
      { to: '/contact',  icon: User,     label: 'About Developer', end: true },
    ],
  },
];

// Mobile: 4 core tabs + "More" sheet for the rest
const CORE_NAV: NavEntry[] = [
  { to: '/',         icon: Home,     label: 'Home',     end: true },
  { to: '/habits',   icon: Calendar, label: 'Habits',   end: true },
  { to: '/insights', icon: Lightbulb, label: 'Insights', end: true },
  { to: '/videos',   icon: Video,     label: 'Videos',   end: true },
];

const MORE_NAV: NavEntry[] = [
  { to: '/streaks',  icon: Flame,      label: 'Streaks',  end: false },
  { to: '/progress', icon: TrendingUp, label: 'Progress', end: true },
  { to: '/calories', icon: Zap,        label: 'Calories', end: true },
  { to: '/workout',  icon: Dumbbell,  label: 'Workout',  end: true },
  { to: '/settings', icon: Settings,   label: 'Settings', end: true },
  { to: '/contact',  icon: User,       label: 'About',    end: true },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const moreActive = MORE_NAV.some(n =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  );
  const displayName = user?.email ? user.email.split('@')[0] : 'Guest';

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-mark"><Activity size={17} strokeWidth={2.5} /></span>
          FitTrack
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ display: 'contents' }}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map(({ to, icon: Icon, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {isAdmin && (
            <NavLink to="/admin" end
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              style={{ color: 'var(--accent-warn)' }}>
              <Shield size={17} />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>

        {/* User chip at the bottom */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          {user ? (
            <div className="sidebar-user">
              <div className="avatar">{displayName.slice(0, 2)}</div>
              <div className="user-meta">
                <div className="user-name">{displayName}</div>
                <div className="user-sub">{user.email}</div>
              </div>
              <button className="icon-btn danger" onClick={signOut} title="Sign out">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <LogIn size={15} />
              Sign In
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {CORE_NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            onClick={() => setMoreOpen(false)}
            className={({ isActive }) => `bottom-nav-item${isActive && !moreOpen ? ' active' : ''}`}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          className={`bottom-nav-item${moreOpen || moreActive ? ' active' : ''}`}
          onClick={() => setMoreOpen(o => !o)}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="more-sheet">
            <div className="sheet-handle" />
            <div className="sheet-grid">
              {MORE_NAV.map(({ to, icon: Icon, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => `sheet-item${isActive ? ' active' : ''}`}>
                  <span className="sheet-icon"><Icon size={19} /></span>
                  {label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink to="/admin" end
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => `sheet-item${isActive ? ' active' : ''}`}>
                  <span className="sheet-icon"><Shield size={19} /></span>
                  Admin
                </NavLink>
              )}
              {user ? (
                <button className="sheet-item" onClick={() => { setMoreOpen(false); signOut(); }}>
                  <span className="sheet-icon"><LogOut size={19} /></span>
                  Sign Out
                </button>
              ) : (
                <button className="sheet-item" onClick={() => { setMoreOpen(false); navigate('/login'); }}>
                  <span className="sheet-icon"><LogIn size={19} /></span>
                  Sign In
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
