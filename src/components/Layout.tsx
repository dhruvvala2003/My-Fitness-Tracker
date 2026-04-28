import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, Flame, Zap, BarChart2, Settings, User, Lightbulb, Video, LogIn, LogOut, Shield } from 'lucide-react';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';

const NAV = [
  { to: '/',         icon: Home,      label: 'Home',     end: true  },
  { to: '/habits',   icon: Calendar,  label: 'Habits',   end: true  },
  { to: '/streaks',  icon: Flame,     label: 'Streaks',  end: false },
  { to: '/calories', icon: Zap,       label: 'Calories', end: true  },
  { to: '/insights', icon: Lightbulb, label: 'Insights', end: true  },
  { to: '/videos',   icon: Video,     label: 'Videos',   end: true  },
  { to: '/charts',   icon: BarChart2, label: 'Charts',   end: true  },
  { to: '/settings', icon: Settings,  label: 'Settings', end: true  },
  { to: '/contact',  icon: User,      label: 'About Me', end: true  },
];

// Bottom nav excludes Charts + About Me (sidebar-only on desktop); Videos stays in for workout access
const BOTTOM_NAV = NAV.filter(n => n.to !== '/charts' && n.to !== '/contact');

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">FITTRACK</div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Admin link — only visible to the admin account */}
        {user?.email === ADMIN_EMAIL && (
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            style={{ marginTop: '0.5rem', color: '#ffa502' }}
          >
            <Shield size={18} />
            <span>Admin</span>
          </NavLink>
        )}

        {/* Auth action at the bottom of the sidebar */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {user ? (
            <button
              onClick={signOut}
              className="nav-item"
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="nav-item"
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)' }}
            >
              <LogIn size={18} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
