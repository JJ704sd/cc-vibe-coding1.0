import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/projects', label: '项目', icon: '📁' },
  { to: '/map', label: '地图', icon: '🗺️' },
  { to: '/admin', label: '后台', icon: '⚙️' }
];

export function SiteHeader() {
  return (
    <header style={{ padding: '20px 0', marginBottom: '8px' }}>
      <div className="page-shell">
        <div className="panel" style={{ padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem' }}>🧭</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>Trace Scope</span>
          </Link>
          <nav style={{ display: 'flex', gap: '4px' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                })}
                end={item.to === '/'}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
