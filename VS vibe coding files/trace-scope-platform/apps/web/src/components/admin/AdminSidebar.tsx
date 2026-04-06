import { NavLink } from 'react-router-dom';

const links = [
  { href: '/admin', label: '仪表盘', icon: '📊' },
  { href: '/admin/projects', label: '项目管理', icon: '📁' },
  { href: '/admin/locations', label: '地点管理', icon: '📍' },
  { href: '/admin/media', label: '媒体管理', icon: '🖼' },
  { href: '/admin/routes', label: '轨迹管理', icon: '🛤' }
];

export function AdminSidebar() {
  return (
    <aside className="panel" style={{ padding: '24px', height: 'fit-content', position: 'sticky', top: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⚙️</div>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>后台管理</h2>
        <p className="muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Trace Scope Platform</p>
      </div>
      <nav style={{ display: 'grid', gap: '4px' }}>
        {links.map((link) => (
          <NavLink
            key={link.href}
            to={link.href}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '12px',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
            })}
            end={link.href === '/admin'}
          >
            <span style={{ fontSize: '1.1rem' }}>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="divider" />
      <div style={{ padding: '0 4px' }}>
        <a href="/" className="muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← 返回前台
        </a>
      </div>
    </aside>
  );
}
