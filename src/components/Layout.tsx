import { NavLink } from 'react-router-dom';
import { Home, Calendar, Flame, Zap, BarChart2, Settings } from 'lucide-react';

const NAV = [
  { to: '/',         icon: Home,      label: 'Home',     end: true  },
  { to: '/habits',   icon: Calendar,  label: 'Habits',   end: true  },
  { to: '/streaks',  icon: Flame,     label: 'Streaks',  end: false },
  { to: '/calories', icon: Zap,       label: 'Calories', end: true  },
  { to: '/charts',   icon: BarChart2, label: 'Charts',   end: true  },
  { to: '/settings', icon: Settings,  label: 'Settings', end: true  },
];

// Bottom nav shows 5 items (Charts accessible from Home quick-nav on mobile)
const BOTTOM_NAV = NAV.filter(n => n.to !== '/charts');

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
