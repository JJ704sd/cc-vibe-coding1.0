import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/auth/authContext';

export function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setError('');
    const success = await login(username, password);
    if (success) {
      navigate('/admin');
    } else {
      setError('用户名或密码错误');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#0f0f1a' }}>
      <div className="panel" style={{ padding: '40px', maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
          <h1 className="section-title">管理员登录</h1>
          <p className="muted mt-2">请输入管理员凭证以访问后台管理。</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(220,220,240,0.9)', padding: '10px 14px', width: '100%', fontSize: '0.9rem' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(220,220,240,0.9)', padding: '10px 14px', width: '100%', fontSize: '0.9rem' }}
            />
          </div>

          {error && (
            <div className="badge badge-warm" style={{ padding: '12px 16px', justifyContent: 'center' }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" style={{ width: '100%', marginTop: '8px', padding: '14px' }}>
            登录后台管理
          </button>
        </form>

        <div className="divider" />

        <div style={{ textAlign: 'center' }}>
          <p className="muted" style={{ fontSize: '0.8rem' }}>默认凭证</p>
          <p className="muted" style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>admin / change-me-now</p>
        </div>
      </div>
    </div>
  );
}
