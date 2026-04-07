# yuyuzi Visual Redesign — Design Spec

## 1. Overview

Redesign all public-facing pages of the Trace Scope Platform to match the yuyuzi.art visual language. The goal is a cohesive, high-end gallery aesthetic: immersive 3D scene, procedural day/night sky with stars and milky way, glassmorphism UI, elegant typography, and cinematic intro animation.

## 2. Visual Design System

### Fonts
- **Display/Brand**: `Cormorant Garamond` (serif, elegant) — site title, modal titles
- **Accent/Site Name**: `Parisienne` (cursive) — decorative brand element
- **Body/UI**: `Work Sans` (clean, geometric) — nav, labels, metadata
- **Chinese fallback**: `Noto Sans SC`
- Import via Google Fonts in `index.html`

### Color Palette
```
Day sky top:      #87CEEB  → night: #0a0e1a
Day sky horizon:  #FFD9DA  → night: #1a1f35
Day accent:       #f85a4e
Night accent:     #7BA7FF
Glass bg:         rgba(255,255,255,0.03)
Glass border:     rgba(255,255,255,0.12)
Text primary:     rgba(230,230,240,0.9)
Text secondary:   rgba(200,200,220,0.6)
```

### Day/Night Cycle
- Driven by local real-time hour (sunrise ~6, sunset ~18.5)
- Smooth `uNightFactor` 0→1 transition (shader + lighting)
- CSS background transitions `2s ease`
- Sky: procedural gradient, sun glow, daytime clouds, sunset warm tones
- Night: multi-layer starfield (bright/medium/dense), milky way band, shooting stars
- Fog color and ambient/directional light intensity all animate with night factor

## 3. Page-by-Page Specification

### 3.1 Gallery Home (`/gallery`)

**Layout:**
- Full-screen Three.js canvas (z-index 1)
- Floating UI overlay (z-index 10+): top-left brand, top-right search + night toggle + nav links
- Bottom hints: project count + controls
- Loading screen on initial load

**Loading Screen:**
- Gradient background matching time of day
- Spinning dice icon (CSS animation, 4s linear infinite)
- Flash-white transition on complete (0.4s white flash → 0.6s fade out)

**3D Scene — GalleryScene:**
- Multi-ring staggered arrangement: 4 rows × N rings
- Ring spacing: 800px, inner radius: 1000px, cards per ring: 4
- Each ring offset by `ring * 0.3` radians + random jitter for organic feel
- Slow global rotation of artwork pivot: `0.03 rad/s` (~3.5 min per revolution)
- Card drift animation: `sin/cos` vertical oscillation per card
- Frustum culling — only render visible cards
- Cards: frosted glass front face (image, emissive glow, `opacity: 0.72`), white info backface
- Dynamic opacity based on camera distance (0.90 near → 0.15 far)

**Intro Cinematic:**
- Duration: 3s, ease-in-out cubic
- Camera starts at `(theta: -2.0, phi: PI/2.15, zoom: 6500)` — far global view
- Sweeps `5.5 rad` (~315°) horizontal + zooms to inner ring (`zoom: 1200`)
- Loading screen fades out during intro

**Sky Dome Shader:**
- Large inverted sphere (radius 8000)
- Day gradient: zenith `#87CEEB` → horizon → nadir
- Sunset warm colors at horizon (when sun elevation 0→0.3)
- Night gradient: deep blue-black zenith → purple-tinted horizon
- Stars: 3 layers (bright color-tinted, medium, dense faint), all twinkle
- Milky way band with noise texture
- Shooting stars (random intervals)
- Procedural clouds (day only, fade at night)
- Sun glow + halo when sun is visible

**UI Chrome:**
- Brand top-left: `Cormorant Garamond` 22px, uppercase, letter-spacing 0.15em
- Site name top-right: `Parisienne` cursive with animated gradient text
- Search toggle + inline search input (glass style, `backdrop-filter: blur(12px)`)
- Night mode toggle button (sun/moon icon)
- Nav links: `Work Sans` 0.8rem, glass pill style
- Bottom-right: project count + "drag to explore"
- Bottom-left: "scroll to zoom · drag to rotate · click to view"
- Copyright bottom-right corner: `Work Sans` 11px

### 3.2 Gallery Modal (`GalleryModal`)

**Style:** Apple-style frosted glass
- `backdrop-filter: blur(18px) saturate(1.3) brightness(0.85)`
- Flowing light animation: radial gradients animating `translate` + `rotate`
- Open: scale `0.97→1.0` + `translateY 24→0px`, `0.65s cubic-bezier(0.16,1,0.3,1)`, 0.1s delay
- Title/meta/desc stagger in: 0.25s/0.3s/0.35s delays
- Close: × button top-right, click outside, Escape key
- Full-res image loads progressively (show container after load)
- Mobile: scrollable vertical layout, fixed close button

### 3.3 Projects Page (`/projects`)

**Style:** Grid or list of project cards
- Consistent glassmorphism card style
- Each card shows cover image, title, summary, tags
- Hover: subtle scale/glow effect
- Night/day consistent with global theme

### 3.4 Map Page (`/map`)

**Style:** Full-screen map with glass overlay panels
- Mapbox GL JS base
- Glassmorphism location detail panel (frosted glass, blur)
- Floating search/filter bar (glass style)
- Night mode tint on map or consistent dark UI panels

### 3.5 Project Detail (`/projects/:id`)

**Style:** Immersive detail view
- Hero section with large cover image
- Glassmorphism metadata panel
- Location list with mini trajectory preview
- Media sets grid with glass card style
- Related projects section

### 3.6 Shared Components

**SiteHeader / PublicLayout:**
- Glassmorphism header bar with blur
- Brand + nav links matching GalleryHome style
- Night mode toggle
- Responsive: hamburger on mobile

**SkyBackground:**
- Reusable sky dome component (can be used on any page)
- Shares the full shader from GalleryScene
- Night factor driven by global state or local computation

## 4. Mock Data Compatibility

All changes must work with existing `mock-data.ts` schema:
- `Project`: id, title, summary, coverImage, tags, published
- `Location`: id, projectId, name, latitude, longitude
- `MediaSet`: id, projectId, name, type, images

## 5. Technical Approach

- **Framework**: React 18 + Vite
- **3D**: Three.js with custom ShaderMaterial for sky
- **Styling**: Inline styles + CSS variables (no Tailwind), glassmorphism via `backdrop-filter`
- **State**: Local React state for night mode (no global state needed for public pages)
- **Routing**: React Router v6
- **Fonts**: Google Fonts loaded in `index.html`
- **Performance**:
  - Shared geometries for cards (single `PlaneGeometry` reused)
  - Frustum culling for gallery cards
  - Mobile: reduced star layers, simpler fog
  - Texture downscaling on mobile

## 6. Files to Modify

| File | Change |
|------|--------|
| `index.html` | Add Google Fonts (Cormorant Garamond, Parisienne, Work Sans, Noto Sans SC) |
| `styles/` | Add CSS variables for color system, global body styles |
| `components/gallery/GalleryScene.tsx` | Complete rewrite with yuyuzi layout + sky shader |
| `components/gallery/GalleryModal.tsx` | Glassmorphism flowing light style |
| `components/gallery/LoadingScreen.tsx` | Gradient + spinning icon + flash transition |
| `components/site/SkyBackground.tsx` | Upgrade shader with full starfield + clouds |
| `components/site/PublicLayout.tsx` | Glassmorphism header with yuyuzi fonts |
| `app/routes/gallery/GalleryHome.tsx` | Update UI chrome to match yuyuzi style |
| `app/routes/public/projects/ProjectsPage.tsx` | Glass card grid |
| `app/routes/public/map/MapPage.tsx` | Glass overlay panels |
| `app/routes/public/project-detail/ProjectDetailPage.tsx` | Glassmorphism detail layout |
