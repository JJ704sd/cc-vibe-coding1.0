# Trace Scope — yuyuzi.art Style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform all public-facing pages of Trace Scope Platform to yuyuzi.art's immersive glassmorphism aesthetic — frosted glass cards floating over a dynamic sky background, elegant typography, and slow breathing animations.

**Architecture:** A staged, non-breaking rewrite of the visual layer. First the design system (CSS tokens + glass atoms), then the layout shell, then each page. Zero changes to routing, business logic, or data models. Background is pure CSS — no Three.js or WebGL.

**Tech Stack:** Vanilla CSS (CSS custom properties, @keyframes, backdrop-filter), Google Fonts (Playfair Display, Inter, Noto Sans SC), React components only touched for style class changes.

---

## File Map

| File | Responsibility |
|------|----------------|
| `apps/web/src/styles/index.css` | Design tokens, typography, global resets, utility classes |
| `apps/web/src/components/site/SkyBackground.tsx` | Fixed full-viewport sky gradient + stars layer |
| `apps/web/src/components/site/PublicLayout.tsx` | Layout wrapper — adds SkyBackground + transparent main |
| `apps/web/src/components/site/SiteHeader.tsx` | Glass navbar with Playfair Display brand |
| `apps/web/src/components/project/HeroEntryPanel.tsx` | Glass hero card with gradient accents |
| `apps/web/src/components/project/ProjectCard.tsx` | Glass interactive card with image header |
| `apps/web/src/components/project/MediaSetCard.tsx` | Glass media type card |
| `apps/web/src/components/project/LocationDetailPanel.tsx` | Glass sidebar panel |
| `apps/web/src/components/media/SpinViewer.tsx` | Glass 360° viewer |
| `apps/web/src/components/media/GalleryViewer.tsx` | Glass gallery viewer |
| `apps/web/src/components/map/MapView.tsx` | Glass-framed map container |

Pages (`apps/web/src/app/routes/public/`) — only className/style changes, no logic touched.

---

## Task 1: Design System Core — CSS Variables + Typography + Glass Atoms

**Files:**
- Modify: `apps/web/src/styles/index.css`

- [ ] **Step 1: Replace all CSS variables**

Replace the entire `:root` block in `index.css` with the new yuyuzi-style design tokens.

Current content of `index.css` lines 1-25:
```css
:root {
  color-scheme: dark;
  --page-bg: #07111a;
  --panel-bg: rgba(10, 24, 36, 0.82);
  ...
}
```

Replace with:
```css
/* === Google Fonts === */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');

/* === Design Tokens === */
:root {
  color-scheme: light;
  --sky-gradient: linear-gradient(180deg, #87CEEB 0%, #B0D4E8 40%, #F5E6D3 100%);

  --glass-bg: rgba(255, 255, 255, 0.12);
  --glass-bg-hover: rgba(255, 255, 255, 0.18);
  --glass-border: rgba(255, 255, 255, 0.25);
  --glass-border-hover: rgba(255, 255, 255, 0.45);
  --glass-shadow: rgba(0, 0, 0, 0.08);
  --glass-shadow-lg: rgba(0, 0, 0, 0.14);

  --text-primary: #1a1a2e;
  --text-secondary: #4a4a6a;
  --text-muted: #8888aa;

  --accent: #5B8DEE;
  --accent-dim: rgba(91, 141, 238, 0.15);
  --accent-warm: #E8A87C;
  --accent-warm-dim: rgba(232, 168, 124, 0.15);
  --danger: #ff6b6b;

  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;

  font-family: 'Inter', 'Noto Sans SC', sans-serif;
  background: transparent;
}

.night-mode {
  --sky-gradient: linear-gradient(180deg, #0f1629 0%, #1a2245 50%, #22295b 100%);
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-bg-hover: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-border-hover: rgba(200, 220, 255, 0.35);
  --glass-shadow: rgba(0, 0, 0, 0.2);
  --glass-shadow-lg: rgba(0, 0, 0, 0.3);
  --text-primary: #e8e8f0;
  --text-secondary: #a0a0c0;
  --text-muted: #6868a0;
  --accent: #7BA7FF;
  --accent-warm: #FF9B6A;
}
```

- [ ] **Step 2: Add body/global styles after :root**

After the `:root` block, replace the existing `*`, `body`, `a`, etc. rules with:
```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-width: 320px;
  min-height: 100vh;
  color: var(--text-primary);
  background: var(--sky-gradient);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  transition: background 1s ease, color 0.5s ease;
}

a {
  color: var(--accent);
  text-decoration: none;
  transition: opacity 0.2s ease;
}
a:hover { opacity: 0.8; }

button, input, textarea, select {
  font: inherit;
  color: inherit;
}
```

- [ ] **Step 3: Replace .page-shell class**

Find and replace the `.page-shell` rule:
```css
.page-shell {
  width: min(1200px, calc(100vw - 32px));
  margin: 0 auto;
  /* No background, no panel — pure width constraint */
}
```

- [ ] **Step 4: Add glass atom classes after .page-shell**

```css
/* === Glass Card Base === */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: 0 8px 32px var(--glass-shadow);
  position: relative;
  overflow: hidden;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
}

/* Animated border shine */
.glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    transparent 0%,
    var(--glass-border-hover) 40%,
    transparent 60%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  animation: borderShine 6s ease-in-out infinite;
}

@keyframes borderShine {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.9; }
}

.glass-interactive {
  cursor: pointer;
}

.glass-interactive:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  transform: translateY(-4px);
  box-shadow: 0 16px 48px var(--glass-shadow-lg);
}
```

- [ ] **Step 5: Add button styles**

Replace existing `button` block (around line 114) with:
```css
/* === Glass Buttons === */
button {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: 10px 20px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
}

button:hover:not(:disabled) {
  background: var(--glass-bg-hover);
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(91, 141, 238, 0.2);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-accent {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.btn-accent:hover:not(:disabled) {
  background: #7BA3F5;
  border-color: #7BA3F5;
}

.btn-ghost {
  background: transparent;
  border-color: var(--glass-border);
  color: var(--text-secondary);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--glass-bg);
  border-color: var(--glass-border-hover);
  color: var(--text-primary);
  transform: none;
  box-shadow: none;
}
```

- [ ] **Step 6: Add typography + badge + form + utility classes**

Append these to the end of `index.css`:
```css
/* === Typography === */
.section-title {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--text-primary);
}

.section-title-sm {
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
  font-weight: 600;
}

.muted { color: var(--text-secondary); }
.muted-sm { font-size: 0.875rem; color: var(--text-secondary); }

/* === Badges === */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  backdrop-filter: blur(8px);
}

.badge-accent {
  background: rgba(91, 141, 238, 0.2);
  color: var(--accent);
  border: 1px solid rgba(91, 141, 238, 0.3);
}

.badge-warm {
  background: rgba(232, 168, 124, 0.2);
  color: var(--accent-warm);
  border: 1px solid rgba(232, 168, 124, 0.3);
}

.badge-draft {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

/* === Form Elements === */
input, textarea, select {
  width: 100%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  color: var(--text-primary);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  outline: none;
  backdrop-filter: blur(12px);
}

input::placeholder, textarea::placeholder { color: var(--text-muted); }
input:focus, textarea:focus, select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

/* === Utility === */
.text-accent { color: var(--accent); }
.text-warm { color: var(--accent-warm); }
.text-danger { color: var(--danger); }
.text-center { text-align: center; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }
.w-full { width: 100%; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* === Cards === */
.card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: all 0.3s ease;
}

/* === Empty State === */
.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: var(--text-secondary);
}

.empty-state-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* === Skeleton === */
.skeleton {
  background: linear-gradient(90deg, var(--glass-bg) 25%, var(--glass-bg-hover) 50%, var(--glass-bg) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* === Scrollbar === */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }

/* === Page Animations === */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeInUp 0.5s ease forwards;
}

/* === List Item === */
.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  gap: 16px;
  transition: all 0.3s ease;
}

.list-item:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
}

/* === Stat Card === */
.stat-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  text-align: center;
  backdrop-filter: blur(16px);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 4px;
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/styles/index.css
git commit -m "feat(style): new yuyuzi-style design system — glass atoms, CSS variables, typography"
```

---

## Task 2: Sky Background + PublicLayout + Auto Night Mode

**Files:**
- Create: `apps/web/src/components/site/SkyBackground.tsx`
- Modify: `apps/web/src/components/site/PublicLayout.tsx`

- [ ] **Step 1: Create SkyBackground component**

Create `apps/web/src/components/site/SkyBackground.tsx`:
```tsx
import { useEffect, useState } from 'react';

function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 19; // Night: 7pm–6am
}

export function SkyBackground() {
  const [nightMode, setNightMode] = useState(isNightTime);

  useEffect(() => {
    // Re-evaluate every minute in case user keeps page open
    const interval = setInterval(() => {
      setNightMode(isNightTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`sky-bg ${nightMode ? 'night-mode' : 'day-mode'}`}
      aria-hidden="true"
    >
      {nightMode && <StarsLayer />}
    </div>
  );
}

function StarsLayer() {
  // Generate deterministic star positions based on index
  const stars = Array.from({ length: 60 }, (_, i) => {
    const x = ((i * 137.508) % 100); // golden ratio spread
    const y = ((i * 73.254) % 100);
    const size = (i % 3) === 0 ? 2 : 1;
    const opacity = 0.4 + (i % 5) * 0.1;
    return { x, y, size, opacity };
  });

  return (
    <div className="stars-layer" aria-hidden="true">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 0%, rgba(40, 50, 100, 0.4) 0%, transparent 60%)`,
        }}
      />
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            background: 'white',
            opacity: star.opacity,
            animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.3) % 3}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: inherit; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Create SkyBackground CSS**

Add to `index.css`:
```css
/* === Sky Background Layer === */
.sky-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--sky-gradient);
  transition: background 1.5s ease;
}

.day-mode {
  background: linear-gradient(180deg, #87CEEB 0%, #B0D4E8 40%, #F5E6D3 100%);
}

.night-mode {
  background: linear-gradient(180deg, #0f1629 0%, #1a2245 50%, #22295b 100%);
}

.stars-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
```

- [ ] **Step 3: Update PublicLayout**

Replace `apps/web/src/components/site/PublicLayout.tsx` entirely:
```tsx
import { Outlet } from 'react-router-dom';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SkyBackground } from '@/components/site/SkyBackground';

export function PublicLayout() {
  return (
    <>
      <SkyBackground />
      <SiteHeader />
      <main style={{ min-height: 'calc(100vh - 80px)', paddingTop: '8px' }}>
        <Outlet />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/site/SkyBackground.tsx apps/web/src/components/site/PublicLayout.tsx apps/web/src/styles/index.css
git commit -m "feat(layout): add SkyBackground with auto night mode + transparent PublicLayout"
```

---

## Task 3: SiteHeader Glass化

**Files:**
- Modify: `apps/web/src/components/site/SiteHeader.tsx`

- [ ] **Step 1: Replace SiteHeader**

Replace the entire content of `SiteHeader.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/site/SiteHeader.tsx
git commit -m "feat(header): glass navbar with Playfair Display brand"
```

---

## Task 4: HomePage + HeroEntryPanel

**Files:**
- Modify: `apps/web/src/app/routes/public/home/HomePage.tsx`
- Modify: `apps/web/src/components/project/HeroEntryPanel.tsx`

- [ ] **Step 1: Update HeroEntryPanel**

Replace the entire `HeroEntryPanel.tsx`:
```tsx
import { Link } from 'react-router-dom';
import type { Project } from '@/types/domain';

export function HeroEntryPanel({ project }: { project: Project }) {
  return (
    <section className="glass animate-in" style={{ padding: '40px', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
          <div>
            <p className="muted" style={{
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--accent)',
            }}>
              双核心空间叙事平台
            </p>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              margin: '10px 0 0',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              color: 'var(--text-primary)',
            }}>
              {project.title}
            </h1>
            <p className="muted" style={{ marginTop: '14px', lineHeight: 1.7, maxWidth: '52ch' }}>
              {project.summary}
            </p>
          </div>
          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <Link
              to={`/projects/${project.id}`}
              className="btn-accent"
              style={{ padding: '12px 28px', fontSize: '0.9rem', borderRadius: '16px', textDecoration: 'none' }}
            >
              查看详情
            </Link>
            <Link
              to="/map"
              style={{
                padding: '12px 28px',
                fontSize: '0.9rem',
                borderRadius: '16px',
                textDecoration: 'none',
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--glass-bg-hover)';
                e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              探索地图
            </Link>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '16px', minHeight: '280px' }}>
          <div className="glass" style={{
            flex: 1,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            background: 'linear-gradient(135deg, rgba(91, 141, 238, 0.2), rgba(255, 255, 255, 0.05))',
            borderColor: 'rgba(91, 141, 238, 0.25)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--accent)' }}>◉</div>
            <h3 className="section-title-sm" style={{ margin: 0, fontSize: '1.1rem' }}>轨迹层</h3>
            <p className="muted mt-2" style={{ fontSize: '0.85rem', margin: 0 }}>
              地点点位与有序轨迹连线，后续接入真实地图后自动渲染。
            </p>
          </div>
          <div className="glass" style={{
            flex: 1,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            background: `linear-gradient(135deg, rgba(232, 168, 124, 0.2), rgba(255, 255, 255, 0.05))`,
            borderColor: 'rgba(232, 168, 124, 0.25)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--accent-warm)' }}>◇</div>
            <h3 className="section-title-sm" style={{ margin: 0, fontSize: '1.1rem' }}>媒体层</h3>
            <p className="muted mt-2" style={{ fontSize: '0.85rem', margin: 0 }}>
              360° 旋转序列与图集浏览，后续接入真实图片后自动切换。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update HomePage**

Replace the `return` block in `HomePage.tsx` (keep imports):
```tsx
  return (
    <div className="page-shell" style={{ display: 'grid', gap: '32px', paddingBottom: '64px' }}>
      <HeroEntryPanel project={featuredProject} />
      <section>
        <div className="glass" style={{ padding: '24px 28px', marginBottom: '20px' }}>
          <div className="flex justify-between items-center">
            <h2 className="section-title" style={{ fontSize: '1.5rem' }}>已发布项目</h2>
            <span className="badge badge-accent">{publishedProjects.length} 个项目</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {publishedProjects.map((project) => (<ProjectCard key={project.id} project={project} />))}
        </div>
      </section>
    </div>
  );
```

Also update the empty state in HomePage:
```tsx
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◈</div>
        <h2 className="section-title mt-4">暂无已发布项目</h2>
        <p className="muted mt-2">请先在后台创建项目并将状态设置为「已发布」</p>
        <a href="/admin" className="btn-accent mt-4" style={{ display: 'inline-flex', padding: '12px 24px', textDecoration: 'none', borderRadius: '16px' }}>
          前往后台
        </a>
      </div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/project/HeroEntryPanel.tsx apps/web/src/app/routes/public/home/HomePage.tsx
git commit -m "feat(home): glass hero + home page redesign"
```

---

## Task 5: ProjectCard

**Files:**
- Modify: `apps/web/src/components/project/ProjectCard.tsx`

- [ ] **Step 1: Replace ProjectCard**

```tsx
import { Link } from 'react-router-dom';
import type { Project } from '@/types/domain';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="glass glass-interactive"
      style={{ display: 'block', overflow: 'hidden', padding: 0, textDecoration: 'none' }}
    >
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: '24px 24px 0 0' }}>
        <img
          src={project.coverImage}
          alt={project.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.4s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />
      </div>
      <div style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge badge-draft" style={{ fontSize: '0.7rem' }}>
              {tag}
            </span>
          ))}
        </div>
        <h3 style={{
          margin: '0 0 10px',
          fontSize: '1.15rem',
          fontWeight: 600,
          fontFamily: "'Playfair Display', serif",
          color: 'var(--text-primary)',
        }}>
          {project.title}
        </h3>
        <p className="muted" style={{
          fontSize: '0.875rem',
          lineHeight: 1.6,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {project.summary}
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/project/ProjectCard.tsx
git commit -m "feat(card): glass ProjectCard with image hover zoom"
```

---

## Task 6: ProjectsPage

**Files:**
- Modify: `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`

- [ ] **Step 1: Update ProjectsPage**

Replace the `return` block (keep imports):
```tsx
  return (
    <div className="page-shell" style={{ paddingBottom: '64px' }}>
      <div className="glass animate-in" style={{ padding: '32px', marginBottom: '24px' }}>
        <h1 className="section-title">项目列表</h1>
        <p className="muted mt-2">共 {projects.length} 个已发布项目</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {projects.map((project) => (<ProjectCard key={project.id} project={project} />))}
      </div>
      {projects.length === 0 && (
        <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
          <div className="empty-state-icon">◇</div>
          <p className="muted mt-4">暂无已发布项目</p>
          <p className="muted" style={{ fontSize: '0.875rem' }}>请在后台创建项目并设置为「已发布」</p>
        </div>
      )}
    </div>
  );
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/routes/public/projects/ProjectsPage.tsx
git commit -m "feat(projects): glass list page"
```

---

## Task 7: ProjectDetailPage + LocationDetailPanel + MediaSetCard

**Files:**
- Modify: `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
- Modify: `apps/web/src/components/project/LocationDetailPanel.tsx`
- Modify: `apps/web/src/components/project/MediaSetCard.tsx`

- [ ] **Step 1: Update LocationDetailPanel**

```tsx
import type { Location } from '@/types/domain';

export function LocationDetailPanel({ location }: { location: Location | null }) {
  if (!location) {
    return (
      <aside className="glass" style={{ padding: '24px' }}>
        <p className="muted" style={{ textAlign: 'center' }}>
          请先选择一个地点。后续接入地图交互后，地图点位点击也必须驱动这里的内容更新。
        </p>
      </aside>
    );
  }

  return (
    <aside className="glass animate-in" style={{ padding: '24px' }}>
      <p className="muted" style={{
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        fontSize: '0.7rem',
        marginBottom: '8px',
      }}>
        当前选中地点
      </p>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '1.3rem',
        marginBottom: '8px',
      }}>
        {location.name}
      </h3>
      <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
        {location.addressText}
      </p>
      <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{location.description}</p>
    </aside>
  );
}
```

- [ ] **Step 2: Update MediaSetCard**

```tsx
import { Link } from 'react-router-dom';
import type { MediaSet } from '@/types/domain';

export function MediaSetCard({ mediaSet }: { mediaSet: MediaSet }) {
  const href = mediaSet.type === 'spin360' ? `/spin/${mediaSet.id}` : `/gallery/${mediaSet.id}`;
  return (
    <Link
      to={href}
      className="glass glass-interactive"
      style={{ display: 'block', padding: '20px', textDecoration: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span className={mediaSet.type === 'spin360' ? 'badge badge-warm' : 'badge badge-accent'}>
          {mediaSet.type}
        </span>
      </div>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '1.05rem',
        fontWeight: 600,
        marginBottom: '8px',
        color: 'var(--text-primary)',
      }}>
        {mediaSet.title}
      </h3>
      <p className="muted" style={{ fontSize: '0.875rem' }}>{mediaSet.description}</p>
    </Link>
  );
}
```

- [ ] **Step 3: Update ProjectDetailPage**

Replace the return block (keep imports and variable declarations):
```tsx
  return (
    <div className="page-shell" style={{ display: 'grid', gap: '24px', paddingBottom: '64px' }}>
      <section className="glass animate-in" style={{ padding: '32px' }}>
        <p className="muted" style={{
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          fontSize: '0.7rem',
        }}>
          项目详情
        </p>
        <h1 className="section-title" style={{ marginTop: '8px' }}>{project.title}</h1>
        <p className="muted mt-4" style={{ lineHeight: 1.7 }}>{project.description}</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass" style={{ padding: '20px' }}>
          <MapView
            locations={projectLocations}
            routes={projectRoutes}
            selectedLocationId={selectedLocationId}
            selectedRouteId={null}
            onLocationSelect={setSelectedLocationId}
          />
        </div>
        <LocationDetailPanel location={selectedLocation} />
      </div>

      <section>
        <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>地点列表</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {projectLocations.map((location) => (
            <button
              key={location.id}
              className="glass"
              onClick={() => setSelectedLocationId(location.id)}
              style={{
                padding: '10px 18px',
                borderRadius: '16px',
                border: location.id === selectedLocationId
                  ? '1px solid var(--accent)'
                  : '1px solid var(--glass-border)',
                background: location.id === selectedLocationId
                  ? 'rgba(91, 141, 238, 0.15)'
                  : 'var(--glass-bg)',
                color: location.id === selectedLocationId
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            >
              {location.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>媒体组列表</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {projectMediaSets.map((mediaSet) => (
            <MediaSetCard key={mediaSet.id} mediaSet={mediaSet} />
          ))}
        </div>
      </section>
    </div>
  );
```

Also update the "not found" empty state:
```tsx
      <div className="glass" style={{ padding: '48px', textAlign: 'center' }}>
        <div className="empty-state-icon">◈</div>
        <h2 className="section-title mt-4">未找到可展示项目</h2>
        <p className="muted mt-2">当前没有已发布项目可供前台展示。</p>
      </div>
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/project/LocationDetailPanel.tsx apps/web/src/components/project/MediaSetCard.tsx apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx
git commit -m "feat(detail): glass detail page with interactive location pills"
```

---

## Task 8: MapPage

**Files:**
- Modify: `apps/web/src/app/routes/public/map/MapPage.tsx`

- [ ] **Step 1: Update MapPage**

Replace the return block (keep imports and variable declarations):
```tsx
  return (
    <div className="page-shell" style={{ display: 'grid', gap: '24px', paddingBottom: '64px' }}>
      <div className="glass animate-in" style={{ padding: '28px' }}>
        <h1 className="section-title">地图探索</h1>
        <p className="muted mt-2">
          共 {locations.length} 个地点，{routes.length} 条轨迹
          {selectedLocation && ` · 当前选中: ${selectedLocation.name}`}
        </p>
      </div>

      <div className="glass" style={{ padding: '16px', borderRadius: '28px' }}>
        <MapView
          locations={locations}
          routes={routes}
          selectedLocationId={selectedLocationId}
          selectedRouteId={selectedRouteId}
          onLocationSelect={setSelectedLocationId}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="glass" style={{ padding: '20px' }}>
          <LocationMarkerLayer
            locations={locations}
            selectedLocationName={selectedLocation?.name ?? null}
          />
        </div>
        <div className="glass" style={{ padding: '20px' }}>
          <RoutePolylineLayer
            routes={routes}
            selectedRouteName={selectedRoute?.name ?? null}
          />
        </div>
      </div>
    </div>
  );
```

Also update the empty state in MapPage:
```tsx
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◉</div>
        <h2 className="section-title mt-4">暂无可展示地图数据</h2>
        <p className="muted mt-2">请先在后台创建并发布项目，再为项目补充地点和轨迹。</p>
        <a href="/admin" className="btn-accent mt-4" style={{
          display: 'inline-flex',
          padding: '12px 24px',
          textDecoration: 'none',
          borderRadius: '16px',
        }}>
          前往后台
        </a>
      </div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/routes/public/map/MapPage.tsx
git commit -m "feat(map): glass map page with info panels"
```

---

## Task 9: SpinViewer + GalleryViewer + Media Pages

**Files:**
- Modify: `apps/web/src/components/media/SpinViewer.tsx`
- Modify: `apps/web/src/components/media/GalleryViewer.tsx`
- Modify: `apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx`
- Modify: `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx`

- [ ] **Step 1: Update SpinViewer**

Replace the entire `SpinViewer.tsx`:
```tsx
import { useMemo, useState } from 'react';
import type { MediaImage } from '@/types/domain';

export function SpinViewer({ images }: { images: MediaImage[] }) {
  const orderedImages = useMemo(() => [...images].sort((a, b) => a.sortOrder - b.sortOrder), [images]);
  const [frameIndex, setFrameIndex] = useState(0);
  const currentImage = orderedImages[frameIndex] ?? orderedImages[0];
  const totalFrames = orderedImages.length;

  function move(delta: number) {
    if (totalFrames === 0) return;
    setFrameIndex((current) => (current + delta + totalFrames) % totalFrames);
  }

  if (totalFrames === 0) {
    return (
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◈</div>
        <p className="muted mt-4">当前媒体组没有可用图片</p>
      </div>
    );
  }

  return (
    <div className="glass animate-in" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="section-title-sm" style={{ margin: 0 }}>360° 序列查看器</h2>
          {totalFrames < 8 && (
            <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--accent-warm)' }}>
              当前图片数量 {totalFrames} 张，建议至少 8 张以获得流畅的旋转体验
            </p>
          )}
        </div>
        <div className="badge badge-accent" style={{ fontSize: '1rem', padding: '8px 16px' }}>
          {String(frameIndex + 1).padStart(2, '0')} / {String(totalFrames).padStart(2, '0')}
        </div>
      </div>

      <div style={{
        borderRadius: '24px',
        overflow: 'hidden',
        aspectRatio: '4/3',
        background: 'rgba(0,0,0,0.08)',
        marginBottom: '20px',
      }}>
        <img
          src={currentImage?.url}
          alt={currentImage?.altText ?? '旋转帧'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <button
          onClick={() => move(-1)}
          style={{ padding: '12px 32px', fontSize: '0.95rem', borderRadius: '16px' }}
        >
          ◀ 上一帧
        </button>
        <button
          onClick={() => move(1)}
          className="btn-accent"
          style={{ padding: '12px 32px', fontSize: '0.95rem', borderRadius: '16px' }}
        >
          下一帧 ▶
        </button>
      </div>

      {totalFrames > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
          {orderedImages.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setFrameIndex(idx)}
              style={{
                width: '52px',
                height: '38px',
                padding: 0,
                borderRadius: '10px',
                overflow: 'hidden',
                border: idx === frameIndex
                  ? '2px solid var(--accent)'
                  : '2px solid var(--glass-border)',
                opacity: idx === frameIndex ? 1 : 0.5,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
            >
              <img
                src={img.thumbnailUrl}
                alt={img.altText}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update GalleryViewer**

Replace the entire `GalleryViewer.tsx`:
```tsx
import { useMemo, useState } from 'react';
import type { MediaImage } from '@/types/domain';

export function GalleryViewer({ images }: { images: MediaImage[] }) {
  const orderedImages = useMemo(() => [...images].sort((a, b) => a.sortOrder - b.sortOrder), [images]);
  const [activeId, setActiveId] = useState(orderedImages[0]?.id ?? '');
  const activeImage = orderedImages.find((image) => image.id === activeId) ?? orderedImages[0];

  if (orderedImages.length === 0) {
    return (
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◇</div>
        <p className="muted mt-4">当前媒体组没有可用图片</p>
      </div>
    );
  }

  return (
    <div className="glass animate-in" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 className="section-title-sm" style={{ margin: 0 }}>图集查看器</h2>
        <p className="muted mt-2" style={{ margin: 0 }}>共 {orderedImages.length} 张图片</p>
      </div>

      <div style={{
        borderRadius: '24px',
        overflow: 'hidden',
        aspectRatio: '4/3',
        background: 'rgba(0,0,0,0.06)',
        marginBottom: '16px',
      }}>
        <img
          src={activeImage?.url}
          alt={activeImage?.altText ?? '图集图片'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {activeImage?.caption && (
        <p className="muted" style={{ textAlign: 'center', marginBottom: '16px', fontStyle: 'italic' }}>
          {activeImage.caption}
        </p>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {orderedImages.map((image) => (
          <button
            key={image.id}
            onClick={() => setActiveId(image.id)}
            style={{
              width: '64px',
              height: '48px',
              padding: 0,
              borderRadius: '12px',
              overflow: 'hidden',
              border: image.id === activeId
                ? '2px solid var(--accent)'
                : '2px solid var(--glass-border)',
              opacity: image.id === activeId ? 1 : 0.5,
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
          >
            <img
              src={image.thumbnailUrl}
              alt={image.altText}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update SpinViewPage and GalleryViewPage**

Both pages only need their empty states updated. Replace the empty state `return` block in each:

**SpinViewPage** empty state:
```tsx
        <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
          <div className="empty-state-icon">◈</div>
          <h2 className="section-title mt-4">暂无可展示的 360 媒体组</h2>
          <p className="muted mt-2">请先在后台为已发布项目创建 spin360 类型媒体组，并补充图片帧。</p>
          <a href="/admin" className="btn-accent mt-4" style={{
            display: 'inline-flex', padding: '12px 24px', textDecoration: 'none', borderRadius: '16px',
          }}>
            前往后台
          </a>
        </div>
```

**SpinViewPage** normal state — update the wrapper div:
```tsx
      <div className="glass animate-in" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span className="badge badge-warm">spin360</span>
          <h1 className="section-title" style={{ margin: 0 }}>{mediaSet.title}</h1>
        </div>
        <p className="muted">{mediaSet.description}</p>
      </div>
```

**GalleryViewPage** — same pattern, just empty state + wrapper glass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/media/SpinViewer.tsx apps/web/src/components/media/GalleryViewer.tsx apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx
git commit -m "feat(media): glass SpinViewer and GalleryViewer with accent selection"
```

---

## Task 10: MapView Glass Border + Animations Pass

**Files:**
- Modify: `apps/web/src/components/map/MapView.tsx`

- [ ] **Step 1: Check current MapView implementation**

Read the file and ensure the map container itself doesn't conflict with glass styles. The MapView likely has its own internal styles. Apply a glass wrapper class if it doesn't already have one, and ensure the container is transparent.

```tsx
// The goal is: <div className="glass" style={{ ... }}> wrapping the map
// The map itself (mapbox/placeholder) should show through the transparent areas
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/map/MapView.tsx
git commit -m "feat(map): glass framing on map container"
```

---

## Verification

After all tasks, verify the site renders correctly by:

1. Running `npm run dev` in `apps/web/`
2. Checking:
   - Sky gradient background visible behind all content
   - Cards have frosted glass effect with visible blur
   - Page loads without JS errors
   - Night mode activates after 7pm (or toggle manually by adding `night-mode` class to body)
   - All navigation links work

---

## Spec Coverage Checklist

| Spec Section | Tasks |
|-------------|-------|
| Design tokens + CSS variables | Task 1 |
| Glass atom classes | Task 1 |
| SkyBackground + night mode | Task 2 |
| PublicLayout transparent | Task 2 |
| SiteHeader glass | Task 3 |
| HomePage + HeroEntryPanel | Task 4 |
| ProjectCard | Task 5 |
| ProjectsPage | Task 6 |
| ProjectDetailPage | Task 7 |
| LocationDetailPanel | Task 7 |
| MediaSetCard | Task 7 |
| MapPage | Task 8 |
| SpinViewer + SpinViewPage | Task 9 |
| GalleryViewer + GalleryViewPage | Task 9 |
| MapView glass | Task 10 |
