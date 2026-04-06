import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页', icon: '◈' },
  { to: '/projects', label: '项目', icon: '◇' },
  { to: '/map', label: '地图', icon: '◉' },
  { to: '/admin', label: '后台', icon: '◎' }
];

export function SiteHeader() {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '12px 0',
    }}>
      <div className="page-shell">
        <div className="glass" style={{
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '20px',
        }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '1.4rem', color: 'var(--accent)' }}>◈</span>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.15rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'var(--text-primary)',
            }}>
              Trace Scope
            </span>
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
                  padding: '9px 16px',
                  borderRadius: '14px',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(91, 141, 238, 0.15)' : 'transparent',
                  transition: 'all 0.25s ease',
                  textDecoration: 'none',
                  border: isActive ? '1px solid rgba(91, 141, 238, 0.3)' : '1px solid transparent',
                })}
                end={item.to === '/'}
              >
                <span style={{ fontSize: '0.8rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
