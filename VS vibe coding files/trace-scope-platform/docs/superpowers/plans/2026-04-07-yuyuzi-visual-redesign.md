# yuyuzi Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all public-facing pages of Trace Scope Platform to match yuyuzi.art visual language: procedural day/night sky, multi-ring staggered 3D gallery, glassmorphism UI, elegant typography, and cinematic intro.

**Architecture:** Shared visual design system (CSS variables + fonts) applied consistently. Sky shader extracted into reusable `SkyBackground` component. GalleryScene uses custom ShaderMaterial sky dome with stars/clouds/sun. LoadingScreen uses CSS-only animation. All pages use glassmorphism via `backdrop-filter`.

**Tech Stack:** React 18, Vite, Three.js, React Router v6, inline styles + CSS variables (no Tailwind)

---

## Phase 1: Visual Design Foundation

### Task 1: Add Google Fonts to index.html

**Files:**
- Modify: `apps/web/index.html`

- [ ] **Step 1: Add Google Fonts link**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Noto+Sans+SC:wght@300;400&family=Parisienne&family=Work+Sans:wght@300;400&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Add global CSS variables and body styles**

In `apps/web/src/styles/global.css` (create if not exists):

```css
:root {
  --font-display: 'Cormorant Garamond', serif;
  --font-accent: 'Parisienne', cursive;
  --font-body: 'Work Sans', sans-serif;
  --font-zh: 'Noto Sans SC', sans-serif;

  /* Day colors */
  --sky-top: #87CEEB;
  --sky-horizon: #FFD9DA;
  --accent: #f85a4e;

  /* Night colors */
  --night-top: #0a0e1a;
  --night-mid: #101525;
  --night-bot: #1a1f35;
  --night-accent: #7BA7FF;

  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-blur: blur(18px) saturate(1.3) brightness(0.85);

  /* Text */
  --text-primary: rgba(230, 230, 240, 0.9);
  --text-secondary: rgba(200, 200, 220, 0.6);
}

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-body);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: Import global.css in main.tsx**

In `apps/web/src/main.tsx`, add:
```tsx
import './styles/global.css';
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/index.html apps/web/src/styles/global.css apps/web/src/main.tsx
git commit -m "feat: add Google Fonts and CSS variables for yuyuzi visual system"
```

---

### Task 2: Create SkyBackground component with full shader

**Files:**
- Create: `apps/web/src/components/site/SkyBackground.tsx`

- [ ] **Step 1: Write the complete SkyBackground component**

```tsx
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

interface SkyBackgroundProps {
  nightFactor: number; // 0 = day, 1 = night
  time?: number;
}

export function SkyBackground({ nightFactor, time = 0 }: SkyBackgroundProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const skyUniforms = useMemo(() => ({
    uSunElev: { value: 0.5 },
    uNightFactor: { value: nightFactor },
    uTime: { value: time },
    uSunDir: { value: new THREE.Vector3(0.3, 0.5, 0.5) },
    uMobile: { value: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 1.0 : 0.0 }
  }), []);

  const skyMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uSunElev;
      uniform float uNightFactor;
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform float uMobile;
      varying vec3 vWorldPosition;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float hash3(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        int iterations = (uMobile > 0.5) ? 2 : 5;
        for (int i = 0; i < 5; i++) {
          if (i >= iterations) break;
          v += a * noise(p);
          p = p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      float milkyWay(vec3 dir) {
        vec3 mwAxis = normalize(vec3(0.3, 0.85, 0.43));
        float distFromBand = abs(dot(dir, mwAxis));
        float core = exp(-distFromBand * distFromBand * 25.0) * 1.0;
        float diffuse = exp(-distFromBand * distFromBand * 6.0) * 0.35;
        vec2 mwUV = dir.xz / (0.3 + abs(dir.y) * 0.7);
        float mwNoise = fbm(mwUV * 4.0 + 17.0);
        float mwNoise2 = fbm(mwUV * 8.0 + 43.0);
        float mwDetail = mwNoise * 0.6 + mwNoise2 * 0.4;
        return (core + diffuse) * (0.5 + mwDetail * 0.8);
      }

      float stars(vec3 dir, out vec3 starCol) {
        float totalBrightness = 0.0;
        starCol = vec3(0.0);
        float mwDensity = milkyWay(dir);

        // Layer 1: Dense faint (skip on mobile)
        if (uMobile < 0.5) {
          float scale = 200.0;
          vec3 p = dir * scale;
          vec3 cell = floor(p);
          vec3 f = fract(p);
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 cellId = cell + neighbor;
                float h = hash3(cellId);
                float threshold = 0.88 - mwDensity * 0.3;
                if (h > threshold) {
                  vec3 starPos = neighbor + vec3(
                    hash3(cellId + 1.0), hash3(cellId + 2.0), hash3(cellId + 3.0)
                  );
                  float d = length(f - starPos);
                  float size = 0.015 + hash3(cellId + 4.0) * 0.025;
                  float glow = exp(-d * d / (size * size * 1.5));
                  float twinkle = 0.85 + 0.15 * sin(uTime * 0.3 + h * 200.0);
                  float b = glow * twinkle * (0.15 + hash3(cellId + 6.0) * 0.2);
                  totalBrightness += b;
                  starCol += b * vec3(0.75, 0.8, 1.0);
                }
              }
            }
          }
        }

        // Layer 2: Medium visible stars
        {
          float scale = 70.0;
          vec3 p = dir * scale;
          vec3 cell = floor(p);
          vec3 f = fract(p);
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 cellId = cell + neighbor;
                float h = hash3(cellId);
                float threshold = 0.85 - mwDensity * 0.15;
                if (h > threshold) {
                  vec3 starPos = neighbor + vec3(
                    hash3(cellId + 11.0), hash3(cellId + 12.0), hash3(cellId + 13.0)
                  );
                  float d = length(f - starPos);
                  float size = 0.025 + hash3(cellId + 14.0) * 0.045;
                  float glow = exp(-d * d / (size * size * 2.0));
                  float twinkle = 0.65 + 0.35 * sin(uTime * (0.4 + hash3(cellId + 15.0) * 1.5) + h * 80.0);
                  float b = glow * twinkle * (0.35 + hash3(cellId + 16.0) * 0.45);
                  totalBrightness += b;
                  float temp = hash3(cellId + 17.0);
                  vec3 col = temp < 0.3 ? vec3(0.7, 0.75, 1.0)
                           : temp < 0.7 ? vec3(1.0, 0.98, 0.95)
                           : vec3(1.0, 0.88, 0.7);
                  starCol += b * col;
                }
              }
            }
          }
        }

        // Layer 3: Bright prominent stars
        {
          float scale = 30.0;
          vec3 p = dir * scale;
          vec3 cell = floor(p);
          vec3 f = fract(p);
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 cellId = cell + neighbor;
                float h = hash3(cellId);
                if (h > 0.93) {
                  vec3 starPos = neighbor + vec3(
                    hash3(cellId + 21.0), hash3(cellId + 22.0), hash3(cellId + 23.0)
                  );
                  float d = length(f - starPos);
                  float mag = hash3(cellId + 27.0);
                  float baseBright = 0.5 + pow(mag, 3.0) * 2.0;
                  float size = 0.04 + hash3(cellId + 24.0) * 0.08;
                  float core = exp(-d * d / (size * size * 1.5));
                  float halo = exp(-d * d / (size * size * 8.0)) * 0.3;
                  float glow = core + halo;
                  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + hash3(cellId + 25.0) * 2.5) + h * 60.0);
                  float b = glow * twinkle * baseBright;
                  totalBrightness += b;
                  float temp = hash3(cellId + 26.0);
                  vec3 col = temp < 0.15 ? vec3(0.6, 0.7, 1.0)
                           : temp < 0.25 ? vec3(1.0, 0.65, 0.4)
                           : temp < 0.6  ? vec3(1.0, 1.0, 0.98)
                           : vec3(1.0, 0.92, 0.75);
                  starCol += b * col;
                }
              }
            }
          }
        }

        return min(totalBrightness, 2.5);
      }

      void main() {
        vec3 dir = normalize(vWorldPosition);
        float y = dir.y;

        vec3 dayZenith = vec3(0.22, 0.45, 0.85);
        vec3 dayHorizon = vec3(0.6, 0.75, 0.92);
        vec3 dayNadir = vec3(0.55, 0.7, 0.88);

        float sunsetFactor = smoothstep(0.0, 0.3, uSunElev) * (1.0 - smoothstep(0.3, 0.6, uSunElev));
        vec3 sunsetHorizon = vec3(0.95, 0.55, 0.3);
        vec3 sunsetZenith = vec3(0.45, 0.35, 0.65);

        vec3 dayColorUp = mix(dayHorizon, dayZenith, smoothstep(0.0, 0.6, y));
        vec3 dayColorDown = mix(dayHorizon, dayNadir, smoothstep(0.0, -0.5, y));
        vec3 daySky = y >= 0.0 ? dayColorUp : dayColorDown;
        daySky = mix(daySky, mix(sunsetHorizon, sunsetZenith, smoothstep(-0.1, 0.5, y)), sunsetFactor * 0.7);

        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        vec3 sunGlow = vec3(1.0, 0.9, 0.7) * pow(sunDot, 64.0) * 1.5 * (1.0 - uNightFactor);
        vec3 sunHalo = vec3(1.0, 0.8, 0.5) * pow(sunDot, 8.0) * 0.3 * (1.0 - uNightFactor);

        vec3 nightZenith = vec3(0.01, 0.01, 0.04);
        vec3 nightHorizon = vec3(0.03, 0.03, 0.08);
        vec3 nightSky = mix(nightHorizon, nightZenith, smoothstep(-0.1, 0.5, y));

        vec3 starColor;
        float starBrightness = stars(dir, starColor) * uNightFactor;
        nightSky += starColor * uNightFactor * 1.2;

        float mwGlow = milkyWay(dir) * uNightFactor;
        vec3 mwColor = mix(vec3(0.12, 0.1, 0.18), vec3(0.15, 0.13, 0.2), noise(dir.xz * 3.0));
        nightSky += mwColor * mwGlow * 0.4;

        vec3 sky = mix(daySky, nightSky, uNightFactor);
        sky += sunGlow + sunHalo;

        float cloudFactor = (1.0 - uNightFactor);
        if (cloudFactor > 0.01 && y > -0.15) {
          vec2 cloudUV = dir.xz / (0.4 + abs(y) * 0.6);
          cloudUV *= 1.8;
          cloudUV += uTime * vec2(0.008, 0.003);
          float cloudNoise = fbm(cloudUV);
          float cloudNoise2 = fbm(cloudUV * 1.5 + vec2(50.0, 30.0));
          float cloud = smoothstep(0.35, 0.65, cloudNoise);
          cloud *= smoothstep(0.3, 0.6, cloudNoise2);
          float horizonFade = smoothstep(-0.15, 0.1, y) * smoothstep(0.8, 0.3, abs(y));
          vec3 cloudColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.85, 0.7), sunsetFactor * 0.5);
          cloudColor *= 0.85 + 0.15 * cloudNoise2;
          float cloudAlpha = cloud * horizonFade * cloudFactor * 0.55;
          sky = mix(sky, cloudColor, cloudAlpha);
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  }), [skyUniforms]);

  return (
    <mesh ref={meshRef} material={skyMaterial} renderOrder={-2}>
      <sphereGeometry args={[8000, 32, 32]} />
    </mesh>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/site/SkyBackground.tsx
git commit -m "feat: add SkyBackground component with full starfield and cloud shader"
```

---

### Task 3: Create LoadingScreen component

**Files:**
- Create: `apps/web/src/components/gallery/LoadingScreen.tsx`

- [ ] **Step 1: Write LoadingScreen component**

```tsx
import { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flash = flashRef.current;
    if (!flash) return;

    // Phase 1: flash to white (0.4s)
    flash.style.transition = 'opacity 0.4s ease-in';
    flash.style.opacity = '1';

    const timer1 = setTimeout(() => {
      // Phase 2: hold white briefly, then fade out (0.6s)
      const parent = flash.parentElement;
      if (parent) {
        parent.style.transition = 'opacity 0.6s ease-out';
        parent.style.opacity = '0';
      }
      setTimeout(() => {
        onComplete();
      }, 600);
    }, 400);

    return () => clearTimeout(timer1);
  }, [onComplete]);

  // Compute time-of-day background color
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const isNight = h < 5.5 || h > 18.5;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: isNight
          ? 'linear-gradient(to bottom, #a3e3f9, #22295b)'
          : 'linear-gradient(to bottom, #ffd9da, #f85a4e)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Spinning dice */}
      <img
        src="/assets/shaizi.png"
        alt="loading"
        style={{
          width: '111px',
          height: '111px',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 18px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 40px rgba(255, 255, 255, 0.15))',
          animation: 'diceSpin 4s linear infinite',
        }}
      />
      <style>{`
        @keyframes diceSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Flash overlay */}
      <div
        ref={flashRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: isNight
            ? 'linear-gradient(to bottom, #a3e3f9, #22295b)'
            : 'linear-gradient(to bottom, #ffd9da, #f85a4e)',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/gallery/LoadingScreen.tsx
git commit -m "feat: add LoadingScreen with time-of-day gradient and flash transition"
```

---

## Phase 2: Gallery Home — Core Visual Overhaul

### Task 4: Rewrite GalleryScene with yuyuzi layout and sky shader

**Files:**
- Modify: `apps/web/src/components/gallery/GalleryScene.tsx`

- [ ] **Step 1: Write the new GalleryScene**

Replace the entire file content with this complete rewrite:

```tsx
import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Project, Location } from '@/types/domain';
import { SkyBackground } from '@/components/site/SkyBackground';

const CARD_SIZE = 280;
const MAX_ROWS = 4;
const VERTICAL_SPACING = 550;
const INNER_RADIUS = 1000;
const RING_SPACING = 800;
const CARDS_PER_RING = 4;

interface GallerySceneProps {
  projects: Project[];
  locations: Location[];
  nightMode: boolean;
  onProjectSelect: (project: Project) => void;
}

export function GalleryScene({
  projects,
  locations,
  nightMode,
  onProjectSelect,
}: GallerySceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const artworkPivotRef = useRef<THREE.Group | null>(null);
  const cardDataRef = useRef<Array<{
    group: THREE.Group;
    initialPos: THREE.Vector3;
    initialRot: THREE.Euler;
    phase: number;
    driftAmp: number;
  }>>([]);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(-9999, -9999), []);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);
  const sharedGeom = useMemo(() => new THREE.PlaneGeometry(CARD_SIZE, CARD_SIZE), []);
  const _worldPos = useMemo(() => new THREE.Vector3(), []);
  const _hitPoint = useMemo(() => new THREE.Vector3(), []);
  const _box3 = useMemo(() => new THREE.Box3(), []);

  const nightFactor = nightMode ? 1.0 : 0.0;

  // Compute card positions: rows × rings arrangement
  const cardPositions = useMemo(() => {
    const rows = Math.min(MAX_ROWS, projects.length);
    const positions: Array<{ x: number; y: number; z: number; angle: number }> = [];
    projects.forEach((_, index) => {
      const row = index % rows;
      const posInRow = Math.floor(index / rows);
      const ring = Math.floor(posInRow / CARDS_PER_RING);
      const posInRing = posInRow % CARDS_PER_RING;
      const r = INNER_RADIUS + ring * RING_SPACING + (Math.random() - 0.5) * 250;
      const angleStep = (Math.PI * 2) / CARDS_PER_RING;
      const ringOffset = ring * (angleStep * 0.4);
      const rowOffset = row * (angleStep * 0.22);
      const angle = posInRing * angleStep + ringOffset + rowOffset + (Math.random() - 0.5) * 0.45;
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);
      const totalHeight = (rows - 1) * VERTICAL_SPACING;
      const y = row * VERTICAL_SPACING - totalHeight / 2 + (Math.random() - 0.5) * 120;
      positions.push({ x, y, z, angle });
    });
    return positions;
  }, [projects]);

  // Create back-face canvas texture
  const createBackTexture = useCallback((title: string, year?: string, medium?: string, dimensions?: string, description?: string) => {
    const canvas = document.createElement('canvas');
    const res = 512;
    canvas.width = res; canvas.height = res;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, res, res);
    const cx = res / 2;
    const hasDesc = description && description.trim().length > 0;
    if (!hasDesc) {
      ctx.fillStyle = 'rgba(30,30,30,0.9)';
      ctx.font = 'italic 28px "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, cx, res / 2);
    } else {
      const pad = 48;
      let y = 100;
      ctx.fillStyle = 'rgba(30,30,30,0.9)';
      ctx.font = 'italic 28px "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, cx, y);
      y += 44;
      if (year || medium) {
        ctx.fillStyle = 'rgba(80,80,80,0.6)';
        ctx.font = '14px "Helvetica", sans-serif';
        ctx.fillText([year, medium].filter(Boolean).join('  ·  '), cx, y);
        y += 24;
      }
      if (dimensions) {
        ctx.fillText(dimensions, cx, y);
        y += 24;
      }
      y += 12;
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.moveTo(pad + 60, y);
      ctx.lineTo(res - pad - 60, y);
      ctx.stroke();
      y += 36;
      ctx.fillStyle = 'rgba(60,60,60,0.7)';
      ctx.font = '15px "Helvetica", sans-serif';
      ctx.textAlign = 'center';
      const maxWidth = res - pad * 2 - 20;
      const lineHeight = 24;
      const words = description!.split(' ');
      let line = '';
      for (let w = 0; w < words.length; w++) {
        const testLine = line + words[w] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && line !== '') {
          ctx.fillText(line.trim(), cx, y);
          line = words[w] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line.trim()) ctx.fillText(line.trim(), cx, y);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Ambient and directional lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xfff8ee, 0.5);
    dirLight.position.set(1, 1.5, 1).normalize();
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xd0e4ff, 0.25);
    fillLight.position.set(-1, -0.5, -1).normalize();
    scene.add(fillLight);

    const camera = new THREE.PerspectiveCamera(55, w / h, 1, 10000);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.minDistance = 500;
    controls.maxDistance = 5000;
    controls.maxPolarAngle = Math.PI * 0.75;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Artwork pivot group for global rotation
    const pivot = new THREE.Group();
    scene.add(pivot);
    artworkPivotRef.current = pivot;

    // Frustum
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();

    // Animation loop
    let raf: number;
    let clock = new THREE.Clock();
    let time = 0;
    let introActive = true;
    const INTRO_DURATION = 3.0;
    const introFrom = { theta: -2.0, phi: Math.PI / 2.15, zoom: 6500 };
    const introTo = { theta: 0.4, phi: Math.PI / 2, zoom: 1200 };
    const currentOrbit = { theta: introFrom.theta, phi: introFrom.phi };
    const zoomCurrent = introFrom.zoom;

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate() {
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      time += 0.005;

      // Intro cinematic
      if (introActive) {
        const t = Math.min(elapsed / INTRO_DURATION, 1.0);
        const e = easeInOutCubic(t);
        const spiralSweep = 5.5;
        const theta = introFrom.theta + (introTo.theta - introFrom.theta + spiralSweep) * e;
        const phi = introFrom.phi + (introTo.phi - introFrom.phi) * e;
        const zoom = introFrom.zoom + (introTo.zoom - introFrom.zoom) * e;
        camera.position.x = zoom * Math.sin(phi) * Math.cos(theta);
        camera.position.y = zoom * Math.cos(phi);
        camera.position.z = zoom * Math.sin(phi) * Math.sin(theta);
        camera.lookAt(0, 0, 0);
        if (t >= 1.0) introActive = false;
      } else {
        controls.update();
        // Slow global rotation of pivot
        pivot.rotation.y = elapsed * 0.03;

        // Animate cards + frustum culling + distance opacity
        camera.updateMatrixWorld();
        frustum.setFromProjectionMatrix(projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

        cardDataRef.current.forEach((data, idx) => {
          const pos = cardPositions[idx];
          if (!pos) return;
          // Drift animation
          data.group.position.y = pos.y + Math.sin(elapsed * 0.4 + data.phase) * data.driftAmp;
          data.group.rotation.x = data.initialRot.x + Math.sin(elapsed * 0.25 + data.phase) * 0.03;
          data.group.rotation.y = data.initialRot.y + Math.cos(elapsed * 0.3 + data.phase) * 0.03;

          // World position
          data.group.getWorldPosition(_worldPos);

          // Frustum culling
          const halfSize = CARD_SIZE / 2;
          _box3.setFromCenterAndSize(_worldPos, new THREE.Vector3(halfSize * 2.2, halfSize * 2.2, 40));
          const inFrustum = frustum.containsPoint(_worldPos);
          data.group.visible = inFrustum;

          // Distance-based opacity
          const dist = camera.position.distanceTo(_worldPos);
          const NEAR = 1200, FAR = 4000;
          const opacityT = Math.max(0, Math.min(1, (dist - NEAR) / (FAR - NEAR)));
          const cardOpacity = 0.90 - opacityT * 0.75;
          const frontMesh = data.group.children[0] as THREE.Mesh;
          const backMesh = data.group.children[1] as THREE.Mesh;
          if (frontMesh?.material) {
            (frontMesh.material as THREE.MeshStandardMaterial).opacity = cardOpacity;
          }
          if (backMesh?.material) {
            (backMesh.material as THREE.MeshStandardMaterial).opacity = cardOpacity;
          }
        });
      }

      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync night mode to lighting
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.children.forEach((child) => {
      if (child instanceof THREE.AmbientLight) {
        child.intensity = nightMode ? 0.3 : 0.65;
      }
      if (child instanceof THREE.DirectionalLight) {
        if (child.position.y > 0) {
          child.intensity = nightMode ? 0.12 : 0.5;
        } else {
          child.intensity = nightMode ? 0.15 : 0.25;
        }
      }
    });
  }, [nightMode]);

  // Create/update project cards
  useEffect(() => {
    const pivot = artworkPivotRef.current;
    if (!pivot) return;

    // Clear existing cards
    while (pivot.children.length > 0) {
      pivot.remove(pivot.children[0]);
    }
    cardDataRef.current = [];

    projects.forEach((project, idx) => {
      const pos = cardPositions[idx];
      if (!pos) return;

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);

      // Front face — image card
      let imgMat: THREE.Material;
      if (project.coverImage) {
        const tex = textureLoader.load(project.coverImage);
        tex.colorSpace = THREE.SRGBColorSpace;
        imgMat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.35,
          metalness: 0.03,
          side: THREE.FrontSide,
          emissive: 0xffffff,
          emissiveIntensity: 0.25,
          emissiveMap: tex,
          transparent: true,
          opacity: 0.72,
        });
      } else {
        imgMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#334466'),
          roughness: 0.35,
          metalness: 0.03,
          side: THREE.FrontSide,
          transparent: true,
          opacity: 0.72,
        });
      }
      const imgMesh = new THREE.Mesh(sharedGeom, imgMat);
      imgMesh.userData = { projectId: project.id };
      group.add(imgMesh);

      // Back face — info card
      const backTex = createBackTexture(project.title);
      const backMat = new THREE.MeshStandardMaterial({
        map: backTex,
        roughness: 0.5,
        metalness: 0.0,
        side: THREE.FrontSide,
      });
      const backMesh = new THREE.Mesh(sharedGeom, backMat);
      backMesh.rotation.y = Math.PI;
      backMesh.position.z = -1;
      group.add(backMesh);

      // Look at center
      group.lookAt(0, group.position.y, 0);
      group.rotateX((Math.random() - 0.5) * 0.06);
      group.rotateY((Math.random() - 0.5) * 0.06);
      group.rotateZ((Math.random() - 0.5) * 0.04);

      const initialPos = group.position.clone();
      const initialRot = group.rotation.clone();

      pivot.add(group);
      cardDataRef.current.push({
        group,
        initialPos,
        initialRot,
        phase: Math.random() * Math.PI * 2,
        driftAmp: 8 + Math.random() * 12,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, cardPositions, createBackTexture]);

  // Raycasting — pre-filter with bounding boxes
  const raycastFiltered = useCallback(() => {
    if (!cameraRef.current) return [];
    const meshes: THREE.Mesh[] = [];
    cardDataRef.current.forEach((data) => {
      const frontMesh = data.group.children[0] as THREE.Mesh;
      if (frontMesh?.userData?.projectId) meshes.push(frontMesh);
    });
    return raycaster.intersectObjects(meshes);
  }, [raycaster]);

  // Pointer events for click
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let touchStartPos = { x: 0, y: 0 };
    let touchPinchDist = 0;

    function onPointerDown(e: PointerEvent) {
      isDragging = false;
      prevMouse = { x: e.clientX, y: e.clientY };
      touchStartPos = { x: e.clientX, y: e.clientY };
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    function onPointerMove(e: PointerEvent) {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging = true;
    }

    function onPointerUp(e: PointerEvent) {
      if (isDragging) return;
      if (!cameraRef.current) return;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const hits = raycastFiltered();
      if (hits.length > 0) {
        const projectId = hits[0].object.userData.projectId;
        const project = projects.find((p) => p.id === projectId);
        if (project) onProjectSelect(project);
      }
    }

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
    };
  }, [projects, onProjectSelect, raycaster, mouse, raycastFiltered]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }}
    >
      {/* Sky dome */}
      <SkyBackground nightFactor={nightFactor} time={0} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/gallery/GalleryScene.tsx
git commit -m "feat: rewrite GalleryScene with yuyuzi multi-ring layout, flip cards, and intro cinematic"
```

---

### Task 5: Update GalleryHome UI chrome to match yuyuzi style

**Files:**
- Modify: `apps/web/src/app/routes/gallery/GalleryHome.tsx`

- [ ] **Step 1: Update GalleryHome**

Replace the entire file with this version:

```tsx
import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GalleryScene } from '@/components/gallery/GalleryScene';
import { GalleryModal } from '@/components/gallery/GalleryModal';
import { LoadingScreen } from '@/components/gallery/LoadingScreen';
import { usePublicData } from '@/services/storage/usePublicData';
import type { Project } from '@/types/domain';

export function GalleryHome() {
  const [showLoader, setShowLoader] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [nightMode, setNightMode] = useState(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 5.5 || h > 18.5;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const reader = usePublicData();
  const state = reader.getState();
  const publishedProjects = reader.getPublishedProjects();

  const filteredProjects = publishedProjects.filter((project) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.title.toLowerCase().includes(query) ||
      project.summary?.toLowerCase().includes(query) ||
      project.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Night mode auto-refresh every minute
  useEffect(() => {
    const iv = setInterval(() => {
      const h = new Date().getHours() + new Date().getMinutes() / 60;
      setNightMode(h < 5.5 || h > 18.5);
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: nightMode ? '#22295b' : '#87CEEB',
        transition: 'background 2s ease',
      }}
    >
      {showLoader && <LoadingScreen onComplete={() => setShowLoader(false)} />}

      {/* 3D Scene */}
      {!showLoader && (
        <GalleryScene
          projects={filteredProjects}
          locations={state.locations}
          nightMode={nightMode}
          onProjectSelect={handleProjectSelect}
        />
      )}

      {/* Floating UI Overlay */}
      {!showLoader && (
        <>
          {/* Top-left: Brand — Cormorant Garamond */}
          <div
            style={{
              position: 'fixed',
              top: '40px',
              left: '40px',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '22px',
                fontWeight: 400,
                color: nightMode ? 'rgba(200,200,220,0.6)' : 'rgba(60,60,80,0.6)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                transition: 'color 2s ease',
              }}
            >
              Trace Scope
            </div>
          </div>

          {/* Top-right: Parisienne site name */}
          <div
            style={{
              position: 'fixed',
              top: '24px',
              right: '40px',
              zIndex: 10,
              fontFamily: "'Parisienne', cursive",
              fontSize: '28px',
              fontWeight: 400,
              fontStyle: 'normal',
              letterSpacing: '0.05em',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.9) 20%, rgba(200,220,255,0.6) 40%, rgba(255,255,255,0.95) 55%, rgba(220,200,255,0.5) 70%, rgba(255,255,255,0.85) 100%)',
              backgroundSize: '300% 300%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'glassText 8s ease-in-out infinite',
            }}
          >
            <style>{`
              @keyframes glassText {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }
            `}</style>
            Trace Scope
          </div>

          {/* Top-right: Nav bar */}
          <div
            style={{
              position: 'fixed',
              top: '28px',
              right: '28px',
              zIndex: 50,
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {/* Search toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: showSearch ? 'rgba(91, 141, 238, 0.3)' : nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                border: `1px solid ${showSearch ? 'rgba(91, 141, 238, 0.5)' : nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
                color: nightMode ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.85)',
                fontSize: '1rem',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              ⌕
            </button>

            {/* Search input */}
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索项目..."
                autoFocus
                style={{
                  width: '180px',
                  padding: '8px 14px',
                  borderRadius: '14px',
                  background: nightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                  color: nightMode ? 'white' : 'black',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backdropFilter: 'blur(12px)',
                  fontFamily: "'Work Sans', sans-serif",
                }}
              />
            )}

            {/* Night mode toggle */}
            <button
              onClick={() => setNightMode((n) => !n)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
                color: nightMode ? '#7BA7FF' : '#FFEEDD',
                fontSize: '1.1rem',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              title={nightMode ? '切换日间模式' : '切换夜间模式'}
            >
              {nightMode ? '☀' : '☾'}
            </button>

            {/* Nav links */}
            {[
              { to: '/projects', label: '项目' },
              { to: '/admin', label: '后台' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  padding: '8px 18px',
                  borderRadius: '14px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  fontFamily: "'Work Sans', sans-serif",
                  backdropFilter: 'blur(12px)',
                  background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
                  color: 'rgba(255,255,255,0.85)',
                  textDecoration: 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Bottom-right: Project count */}
          <div
            style={{
              position: 'fixed',
              bottom: '16px',
              right: '20px',
              zIndex: 10,
              fontSize: '11px',
              color: nightMode ? 'rgba(200,200,220,0.25)' : 'rgba(60,60,80,0.35)',
              letterSpacing: '0.04em',
              fontFamily: "'Work Sans', sans-serif",
              transition: 'color 2s ease',
              pointerEvents: 'none',
            }}
          >
            {searchQuery ? `${filteredProjects.length} / ${publishedProjects.length}` : publishedProjects.length} projects · drag to explore
          </div>

          {/* Bottom-left: Hint */}
          <div
            style={{
              position: 'fixed',
              bottom: '16px',
              left: '40px',
              zIndex: 10,
              fontSize: '11px',
              color: nightMode ? 'rgba(200,200,220,0.35)' : 'rgba(60,60,80,0.4)',
              letterSpacing: '0.06em',
              fontFamily: "'Work Sans', sans-serif",
              transition: 'color 2s ease',
              pointerEvents: 'none',
            }}
          >
            scroll to zoom · drag to rotate · click to view
          </div>

          {/* Copyright */}
          <div
            style={{
              position: 'fixed',
              bottom: '16px',
              right: '120px',
              zIndex: 10,
              fontSize: '11px',
              color: nightMode ? 'rgba(200,200,220,0.25)' : 'rgba(60,60,80,0.3)',
              letterSpacing: '0.04em',
              fontFamily: "'Work Sans', sans-serif",
              transition: 'color 2s ease',
              pointerEvents: 'none',
            }}
          >
            © 2026 Trace Scope
          </div>
        </>
      )}

      {/* Project Modal */}
      {selectedProject && (
        <GalleryModal
          project={selectedProject}
          locations={state.locations}
          mediaSets={state.mediaSets}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/routes/gallery/GalleryHome.tsx
git commit -m "feat: update GalleryHome UI with yuyuzi typography (Cormorant Garamond, Parisienne, Work Sans)"
```

---

### Task 6: Rewrite GalleryModal with glassmorphism flowing light

**Files:**
- Modify: `apps/web/src/components/gallery/GalleryModal.tsx`

- [ ] **Step 1: Write new GalleryModal**

Replace the entire file with:

```tsx
import { useEffect, useRef } from 'react';
import type { Project, Location, MediaSet } from '@/types/domain';

interface GalleryModalProps {
  project: Project;
  locations: Location[];
  mediaSets: MediaSet[];
  onClose: () => void;
}

export function GalleryModal({ project, locations, mediaSets, onClose }: GalleryModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('modal-open');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const projectLocs = locations.filter((l) => l.projectId === project.id);
  const relatedMedia = mediaSets.filter((m) => m.projectId === project.id);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.22)',
        backdropFilter: 'blur(18px) saturate(1.3) brightness(0.85)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.3) brightness(0.85)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Flowing light animation */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(200,210,255,0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(255,240,245,0.08) 0%, transparent 40%)
          `,
          animation: 'glassFlow 12s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <style>{`
        @keyframes glassFlow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(3%, -2%) rotate(1deg); }
          66% { transform: translate(-2%, 3%) rotate(-1deg); }
        }
      `}</style>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '36px',
          right: '40px',
          fontSize: '36px',
          fontWeight: 300,
          color: 'rgba(200,200,220,0.7)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          width: '44px',
          height: '44px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'transform 0.3s ease',
          fontFamily: "'Work Sans', sans-serif",
          zIndex: 60,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1) rotate(0deg)')}
      >
        ×
      </button>

      {/* Image container */}
      <div
        style={{
          maxWidth: '88vw',
          maxHeight: '75vh',
          boxShadow: '0 16px 60px rgba(0,0,0,0.5)',
          opacity: 0,
          transform: 'translateY(24px) scale(0.97)',
          animation: 'modalImgIn 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <style>{`
          @keyframes modalImgIn {
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={project.title}
            style={{
              maxWidth: '100%',
              maxHeight: '75vh',
              objectFit: 'contain',
              display: 'block',
              borderRadius: '2px',
            }}
          />
        ) : (
          <div
            style={{
              width: '600px',
              height: '400px',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)',
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '14px',
            }}
          >
            No cover image
          </div>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          marginTop: '28px',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '26px',
          fontWeight: 400,
          fontStyle: 'italic',
          letterSpacing: '0.04em',
          color: 'rgba(230,230,240,0.9)',
          opacity: 0,
          transform: 'translateY(12px)',
          animation: 'modalFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards',
          textAlign: 'center',
          maxWidth: '80vw',
        }}
      >
        <style>{`@keyframes modalFadeIn { to { opacity: 1; transform: translateY(0); } }`}</style>
        {project.title}
      </div>

      {/* Meta */}
      {project.tags.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '13px',
            fontWeight: 300,
            letterSpacing: '0.04em',
            color: 'rgba(200,200,220,0.7)',
            opacity: 0,
            transform: 'translateY(10px)',
            animation: 'modalFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards',
          }}
        >
          {project.tags.join(' · ')}
        </div>
      )}

      {/* Description */}
      {project.summary && (
        <div
          style={{
            marginTop: '16px',
            maxWidth: '85vw',
            textAlign: 'center',
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '15px',
            fontWeight: 300,
            lineHeight: 1.7,
            letterSpacing: '0.02em',
            color: 'rgba(230,230,240,0.9)',
            opacity: 0,
            transform: 'translateY(10px)',
            animation: 'modalFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards',
          }}
        >
          {project.summary}
        </div>
      )}

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          /* Mobile styles handled by flex layout */
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/gallery/GalleryModal.tsx
git commit -m "feat: rewrite GalleryModal with glassmorphism flowing light animation"
```

---

## Phase 3: Remaining Public Pages

### Task 7: Update PublicLayout with glassmorphism header

**Files:**
- Modify: `apps/web/src/components/site/PublicLayout.tsx`

- [ ] **Step 1: Write updated PublicLayout**

```tsx
import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  const [nightMode] = useState(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 5.5 || h > 18.5;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: nightMode ? '#0f1629' : '#f5f5f5',
        transition: 'background 2s ease',
        fontFamily: "'Work Sans', sans-serif",
      }}
    >
      {/* Glassmorphism header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: nightMode
            ? 'rgba(15, 22, 41, 0.7)'
            : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          borderBottom: `1px solid ${nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          zIndex: 100,
          transition: 'background 2s ease',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '20px',
              fontWeight: 400,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: nightMode ? 'rgba(230,230,240,0.9)' : 'rgba(40,40,60,0.9)',
              transition: 'color 2s ease',
            }}
          >
            Trace Scope
          </span>
          <span
            style={{
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: nightMode ? 'rgba(200,200,220,0.5)' : 'rgba(80,80,100,0.5)',
              transition: 'color 2s ease',
            }}
          >
            双核心空间叙事平台
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[
            { to: '/gallery', label: '画廊' },
            { to: '/map', label: '地图' },
            { to: '/projects', label: '项目' },
            { to: '/admin', label: '后台' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                padding: '8px 18px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 500,
                fontFamily: "'Work Sans', sans-serif",
                backdropFilter: 'blur(12px)',
                background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                color: nightMode ? 'rgba(230,230,240,0.85)' : 'rgba(40,40,60,0.85)',
                textDecoration: 'none',
                transition: 'all 0.25s ease',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <main style={{ paddingTop: '64px' }}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/site/PublicLayout.tsx
git commit -m "feat: update PublicLayout with glassmorphism header and yuyuzi fonts"
```

---

### Task 8: Update ProjectsPage with glass card grid

**Files:**
- Modify: `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`

- [ ] **Step 1: Write updated ProjectsPage**

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublicData } from '@/services/storage/usePublicData';
import type { Project } from '@/types/domain';

export function ProjectsPage() {
  const reader = usePublicData();
  const projects = reader.getPublishedProjects();
  const [nightMode] = useState(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 5.5 || h > 18.5;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: nightMode ? '#0f1629' : '#f0f4f8',
        transition: 'background 2s ease',
        padding: '100px 40px 60px',
      }}
    >
      {/* Page header */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '48px',
            fontWeight: 300,
            fontStyle: 'italic',
            color: nightMode ? 'rgba(230,230,240,0.9)' : 'rgba(40,40,60,0.9)',
            letterSpacing: '0.04em',
            margin: 0,
            transition: 'color 2s ease',
          }}
        >
          Projects
        </h1>
        <p
          style={{
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '14px',
            color: nightMode ? 'rgba(200,200,220,0.5)' : 'rgba(80,80,100,0.5)',
            marginTop: '12px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transition: 'color 2s ease',
          }}
        >
          {projects.length} projects
        </p>
      </div>

      {/* Project grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '32px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} nightMode={nightMode} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, nightMode }: { project: Project; nightMode: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/projects/${project.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        textDecoration: 'none',
        borderRadius: '16px',
        overflow: 'hidden',
        background: nightMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: hovered
          ? (nightMode ? '0 20px 60px rgba(0,0,0,0.5)' : '0 16px 48px rgba(0,0,0,0.12)')
          : (nightMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.06)'),
        transform: hovered ? 'translateY(-4px) scale(1.01)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Cover image */}
      <div style={{ aspectRatio: '16/10', overflow: 'hidden', position: 'relative' }}>
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={project.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: hovered ? 1 : 0.85,
              transition: 'opacity 0.4s ease',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: nightMode ? '#1a2240' : '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: nightMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
              fontSize: '14px',
            }}
          >
            No image
          </div>
        )}
        {/* Accent line on hover */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: hovered
              ? (nightMode ? 'linear-gradient(90deg, #7BA7FF, #a78bfa)' : 'linear-gradient(90deg, #f85a4e, #ff7b54)')
              : 'transparent',
            transition: 'all 0.4s ease',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '24px',
            fontWeight: 400,
            fontStyle: 'italic',
            color: nightMode ? 'rgba(230,230,240,0.95)' : 'rgba(40,40,60,0.95)',
            margin: '0 0 8px',
            transition: 'color 0.3s ease',
          }}
        >
          {project.title}
        </h2>
        {project.summary && (
          <p
            style={{
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 300,
              lineHeight: 1.6,
              color: nightMode ? 'rgba(200,200,220,0.65)' : 'rgba(80,80,100,0.7)',
              margin: '0 0 16px',
              transition: 'color 0.3s ease',
              display: '-webkit-box',
              WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          >
            {project.summary}
          </p>
        )}
        {project.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontFamily: "'Work Sans', sans-serif",
                  fontWeight: 500,
                  background: nightMode ? 'rgba(123,167,255,0.15)' : 'rgba(248,90,78,0.1)',
                  color: nightMode ? '#7BA7FF' : '#f85a4e',
                  border: `1px solid ${nightMode ? 'rgba(123,167,255,0.25)' : 'rgba(248,90,78,0.2)'}`,
                  letterSpacing: '0.04em',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/routes/public/projects/ProjectsPage.tsx
git commit -m "feat: update ProjectsPage with glassmorphism card grid"
```

---

### Task 9: Update MapPage glass overlay panels

**Files:**
- Modify: `apps/web/src/app/routes/public/map/MapPage.tsx`

- [ ] **Step 1: Read current MapPage to understand its structure**

- [ ] **Step 2: Update MapPage to use glassmorphism overlay panels**

Apply glassmorphism styles to the map container and location detail panel, updating colors/fonts to match the yuyuzi system. Focus on:
- Replace any solid-color panels with glass style: `backdrop-filter: blur(20px)`, semi-transparent backgrounds
- Update font usage to `'Work Sans', sans-serif`
- Update accent colors to nightMode-aware values (`#7BA7FF` night / `#5B8DEE` day)
- Transition all color changes over 2s

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/routes/public/map/MapPage.tsx
git commit -m "feat: update MapPage with glassmorphism overlay panels"
```

---

### Task 10: Update ProjectDetailPage with glassmorphism

**Files:**
- Modify: `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`

- [ ] **Step 1: Read current ProjectDetailPage**

- [ ] **Step 2: Apply yuyuzi visual system**

Apply glassmorphism to metadata panels and location cards, update fonts to use `'Cormorant Garamond'` for titles and `'Work Sans'` for body. Use nightMode-aware colors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx
git commit -m "feat: update ProjectDetailPage with glassmorphism layout"
```

---

## Phase 4: Final Integration & Verification

### Task 11: Verify all pages render without errors

**Files:**
- Run: `npm run build` in `apps/web`

- [ ] **Step 1: Run production build**

```bash
cd apps/web && npm run build 2>&1
```

Expected: Clean build with no TypeScript errors, no missing assets.

- [ ] **Step 2: Run dev server and verify**

```bash
cd apps/web && npm run dev
```

Visit `http://localhost:5173/gallery` and verify:
1. Loading screen appears with spinning dice
2. 3D gallery scene loads with multi-ring layout
3. Night/day toggle works
4. Search works
5. Clicking a card opens the modal
6. Navigation to other pages works

- [ ] **Step 3: Verify other pages**

Navigate to `/projects`, `/map`, `/projects/:id` and verify glassmorphism styles and fonts render correctly.

- [ ] **Step 4: Commit final changes**

```bash
git add -A && git commit -m "feat: complete yuyuzi visual redesign across all public pages"
```

---

## Spec Coverage Check

- [ ] Gallery Home: loading screen ✓, multi-ring 3D scene ✓, intro cinematic ✓, sky shader ✓, glassmorphism UI ✓, yuyuzi fonts ✓, night mode ✓, search ✓
- [ ] Gallery Modal: glassmorphism + flowing light ✓, image + title + meta ✓
- [ ] Projects Page: glass card grid ✓
- [ ] Map Page: glass overlay panels ✓
- [ ] Project Detail: glassmorphism layout ✓
- [ ] PublicLayout: glassmorphism header ✓
- [ ] SkyBackground: full starfield + milky way + clouds ✓
- [ ] Visual Design System: CSS variables, Google Fonts ✓
