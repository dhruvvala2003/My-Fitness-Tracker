import { NavLink } from 'react-router-dom';
import { Home, Calendar, Flame, Zap, BarChart2, Settings, User, Lightbulb, Video } from 'lucide-react';

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
