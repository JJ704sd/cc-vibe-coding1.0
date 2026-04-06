import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Project, Location, MediaSet } from '@/types/domain';

const CARD_WIDTH = 200;
const CARD_HEIGHT = 133;
const INNER_RADIUS = 1000;
const RING_SPACING = 800;
const CARDS_PER_RING = 4;
const ROWS = 4;
const VERTICAL_SPACING = 380;

interface GallerySceneProps {
  projects: Project[];
  locations: Location[];
  mediaSets: MediaSet[];
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
  const skyDomeRef = useRef<THREE.Mesh | null>(null);
  const cardRefs = useRef<Map<string, THREE.Group>>(new Map());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  // Sky shader uniforms
  const skyUniforms = useMemo(() => ({
    uTopColor: { value: new THREE.Color('#87CEEB') },
    uMidColor: { value: new THREE.Color('#B0D4E8') },
    uBotColor: { value: new THREE.Color('#F5E6D3') },
    uNightTop: { value: new THREE.Color('#0a0e1a') },
    uNightMid: { value: new THREE.Color('#101525') },
    uNightBot: { value: new THREE.Color('#1a1f35') },
    uNightFactor: { value: 0.0 },
    uTime: { value: 0.0 },
    uStarOpacity: { value: 0.0 },
  }), []);

  // Compute card positions
  const cardPositions = useMemo(() => {
    return projects.map((_, index) => {
      const row = index % ROWS;
      const posInRow = Math.floor(index / ROWS);
      const ring = Math.floor(posInRow / CARDS_PER_RING);
      const posInRing = posInRow % CARDS_PER_RING;
      const ringRadius = INNER_RADIUS + ring * RING_SPACING;
      const angleOffset = (ring % 2 === 0 ? 0 : Math.PI / CARDS_PER_RING);
      const angle = (posInRing / CARDS_PER_RING) * Math.PI * 2 + angleOffset + ring * 0.3;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;
      const y = row * VERTICAL_SPACING - ((ROWS - 1) * VERTICAL_SPACING) / 2;
      return { x, y, z, angle };
    });
  }, [projects]);

  // Create sky dome shader material
  const skyMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uBotColor;
        uniform vec3 uNightTop;
        uniform vec3 uNightMid;
        uniform vec3 uNightBot;
        uniform float uNightFactor;
        uniform float uTime;
        uniform float uStarOpacity;
        varying vec3 vWorldPosition;

        float hash(float n) {
          return fract(sin(n) * 43758.5453123);
        }
        float hash2(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // Soft glow star with halo
        float starGlow(vec2 uv, vec2 center, float size) {
          float d = length(uv - center);
          float core = smoothstep(size, 0.0, d);
          float halo = smoothstep(size * 4.0, size, d) * 0.4;
          return core + halo;
        }

        // Large bright stars with color tint
        float brightStar(vec2 uv, float seed, float size) {
          vec2 grid = floor(uv * 40.0);
          float h = hash2(grid + seed * 100.0);
          if (h < 0.92) return 0.0;
          vec2 f = fract(uv * 40.0) - 0.5;
          float d = length(f);
          float brightness = hash2(grid * 1.7 + seed);
          vec2 offset = vec2(hash(grid.x) - 0.5, hash(grid.y) - 0.5) * 0.3;
          float star = starGlow(f, offset, size * brightness);
          return star * brightness;
        }

        // Medium stars
        float medStar(vec2 uv, float seed) {
          vec2 grid = floor(uv * 100.0);
          float h = hash2(grid + seed * 50.0);
          if (h < 0.85) return 0.0;
          vec2 f = fract(uv * 100.0) - 0.5;
          float d = length(f);
          float brightness = hash2(grid * 2.3 + seed);
          return starGlow(f, vec2(0.0), 0.02 * brightness) * brightness;
        }

        // Tiny dense stars
        float tinyStar(vec2 uv, float seed) {
          vec2 grid = floor(uv * 250.0);
          float h = hash2(grid + seed * 25.0);
          if (h < 0.7) return 0.0;
          vec2 f = fract(uv * 250.0) - 0.5;
          float d = length(f);
          return smoothstep(0.03, 0.0, d) * hash2(grid * 3.7 + seed);
        }

        // Milky way band
        float milkyWay(vec2 uv, float time) {
          float band = sin(uv.x * 3.14159 * 2.0 + 0.5) * 0.5 + 0.5;
          band = pow(band, 3.0);
          float noise = 0.0;
          noise += hash2(floor(uv * 80.0)) * 0.5;
          noise += hash2(floor(uv * 160.0)) * 0.25;
          noise += hash2(floor(uv * 320.0)) * 0.125;
          return band * noise * 0.15;
        }

        // Shooting star
        float shootingStar(vec2 uv, float time) {
          float t = mod(time * 0.3, 6.0);
          float startX = fract(t * 0.17 + 0.1);
          float startY = fract(t * 0.11 + 0.3);
          vec2 start = vec2(startX, startY);
          vec2 dir = normalize(vec2(0.4, -0.6));
          float dist = length(uv - start - dir * t * 0.1);
          if (dist < 0.01 && t > 0.5 && t < 2.5) {
            float trail = smoothstep(0.01, 0.0, dist);
            float fade = (t - 0.5) * (2.5 - t) / 2.0;
            return trail * fade * 2.0;
          }
          return 0.0;
        }

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float y = dir.y * 0.5 + 0.5;
          float elevation = asin(dir.y) / 3.14159 + 0.5;

          // Day sky
          vec3 daySky = mix(uBotColor, uMidColor, smoothstep(0.0, 0.4, y));
          daySky = mix(daySky, uTopColor, smoothstep(0.4, 1.0, y));

          // Rich night sky with subtle purple/blue gradient
          vec3 nightSky = mix(uNightBot, uNightMid, smoothstep(0.0, 0.6, y));
          nightSky = mix(nightSky, uNightTop, smoothstep(0.6, 1.0, y));

          // Add subtle purple tint to horizon
          float purpleTint = smoothstep(0.0, 0.3, y) * smoothstep(0.5, 0.2, y);
          nightSky += vec3(0.02, 0.01, 0.04) * purpleTint;

          vec3 sky = mix(daySky, nightSky, uNightFactor);

          // Stars only when looking up and night mode
          if (dir.y > 0.05 && uStarOpacity > 0.0) {
            vec2 starUV = vec2(atan(dir.z, dir.x) / 6.283 + 0.5, elevation);

            // Twinkle phase for each star
            float twinklePhase = sin(uTime * 1.5 + starUV.x * 30.0 + starUV.y * 20.0) * 0.3 + 0.7;

            // Multi-layer stars with color variation
            float bs = brightStar(starUV, 1.0, 0.015) * twinklePhase;
            float ms = medStar(starUV, 2.0) * twinklePhase;
            float ts = tinyStar(starUV, 3.0);

            // Color tints for stars (warm white, cool white, blue)
            vec3 warmWhite = vec3(1.0, 0.95, 0.85);
            vec3 coolWhite = vec3(0.85, 0.9, 1.0);
            vec3 blueStar = vec3(0.7, 0.8, 1.0);

            float colorSeed = hash2(floor(starUV * 40.0));
            vec3 starColor = mix(warmWhite, coolWhite, colorSeed);
            starColor = mix(starColor, blueStar, hash2(floor(starUV * 40.0) + 7.0) * 0.3);

            sky += starColor * (bs * 2.5 + ms * 1.5 + ts * 0.8) * uStarOpacity;

            // Milky way
            float mw = milkyWay(starUV, uTime);
            sky += vec3(0.6, 0.65, 0.85) * mw * uStarOpacity * 0.8;

            // Shooting stars
            float ss = shootingStar(starUV, uTime);
            sky += vec3(1.0, 0.98, 0.9) * ss * uStarOpacity;
          }

          // Daytime clouds
          if (uNightFactor < 0.5) {
            float cn = sin(dir.x * 3.0 + uTime * 0.1) * cos(dir.z * 2.5 + uTime * 0.08) * 0.5 + 0.5;
            cn *= smoothstep(0.0, 0.3, y) * smoothstep(0.7, 0.3, y);
            sky = mix(sky, mix(sky, vec3(1.0), 0.08), cn * (1.0 - uNightFactor));
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      uniforms: skyUniforms,
      side: THREE.BackSide,
    });
  }, [skyUniforms]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(55, w / h, 1, 10000);
    camera.position.set(0, 200, 2200);
    cameraRef.current = camera;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.minDistance = 500;
    controls.maxDistance = 5000;
    controls.maxPolarAngle = Math.PI * 0.75;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    // Sun
    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(500, 1000, 500);
    scene.add(sun);

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(5000, 32, 32);
    const skyMesh = new THREE.Mesh(skyGeo, skyMaterial);
    scene.add(skyMesh);
    skyDomeRef.current = skyMesh;

    // Animation loop
    let raf: number;
    let time = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      time += 0.005;
      skyUniforms.uTime.value = time;

      // Animate cards
      cardRefs.current.forEach((group, id) => {
        const idx = projects.findIndex((p) => p.id === id);
        if (idx === -1) return;
        const pos = cardPositions[idx];
        if (!pos) return;
        group.position.y = pos.y + Math.sin(time * 0.8 + idx * 0.7) * 12;
      });

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
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

  // Sync night mode to sky
  useEffect(() => {
    skyUniforms.uNightFactor.value = nightMode ? 1.0 : 0.0;
    skyUniforms.uStarOpacity.value = nightMode ? 1.0 : 0.0;
    if (sceneRef.current) {
      sceneRef.current.children.forEach((child) => {
        if (child instanceof THREE.AmbientLight) {
          child.intensity = nightMode ? 0.3 : 0.6;
        }
        if (child instanceof THREE.DirectionalLight) {
          child.intensity = nightMode ? 0.2 : 1.0;
        }
      });
    }
  }, [nightMode, skyUniforms]);

  // Create/update project cards in scene
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old cards
    cardRefs.current.forEach((group) => scene.remove(group));
    cardRefs.current.clear();

    // Add new cards
    projects.forEach((project, i) => {
      const pos = cardPositions[i];
      if (!pos) return;

      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);

      // Card plane with texture
      const geo = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
      let mat: THREE.MeshBasicMaterial;

      if (project.coverImage) {
        const tex = textureLoader.load(project.coverImage);
        tex.colorSpace = THREE.SRGBColorSpace;
        mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide });
      } else {
        mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color('#334466'),
          side: THREE.FrontSide,
        });
      }

      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      // Glow border — 4 thin edge planes
      const borderColor = nightMode ? '#7BA7FF' : '#5B8DEE';
      const edges = [
        { pos: [0, CARD_HEIGHT / 2 + 3, 1], w: CARD_WIDTH + 6, h: 6 },
        { pos: [0, -CARD_HEIGHT / 2 - 3, 1], w: CARD_WIDTH + 6, h: 6 },
        { pos: [CARD_WIDTH / 2 + 3, 0, 1], w: 6, h: CARD_HEIGHT + 6 },
        { pos: [-CARD_WIDTH / 2 - 3, 0, 1], w: 6, h: CARD_HEIGHT + 6 },
      ];
      edges.forEach((e) => {
        const eg = new THREE.PlaneGeometry(e.w, e.h);
        const em = new THREE.MeshBasicMaterial({
          color: borderColor,
          transparent: true,
          opacity: 0.5,
          side: THREE.FrontSide,
        });
        const edgeMesh = new THREE.Mesh(eg, em);
        edgeMesh.position.set(e.pos[0], e.pos[1], e.pos[2]);
        group.add(edgeMesh);
      });

      // Title sprite
      const titleSprite = makeTextSprite(project.title, {
        fontSize: 18,
        color: '#ffffff',
        width: 400,
        height: 80,
      });
      titleSprite.position.set(0, -CARD_HEIGHT / 2 - 55, 1);
      titleSprite.scale.set(200, 50, 1);
      group.add(titleSprite);

      // Tag sprite
      if (project.tags[0]) {
        const tagSprite = makeTextSprite(project.tags[0], {
          fontSize: 14,
          color: nightMode ? '#7BA7FF' : '#5B8DEE',
          width: 200,
          height: 50,
        });
        tagSprite.position.set(CARD_WIDTH / 2 + 40, CARD_HEIGHT / 2 + 40, 1);
        tagSprite.scale.set(80, 30, 1);
        group.add(tagSprite);
      }

      // Trajectory /时空轨迹 visualization
      const TRAJ_W = 300, TRAJ_H = 110;
      const projectLocs = locations.filter((l) => l.projectId === project.id);
      const trajTex = createTrajectoryTexture(projectLocs, nightMode);
      const trajGeo = new THREE.PlaneGeometry(TRAJ_W, TRAJ_H);
      const trajMat = new THREE.MeshBasicMaterial({
        map: trajTex,
        transparent: true,
        side: THREE.FrontSide,
      });
      const trajMesh = new THREE.Mesh(trajGeo, trajMat);
      trajMesh.position.set(0, -CARD_HEIGHT / 2 - 55 - TRAJ_H / 2 - 8, 1);
      group.add(trajMesh);

      // Store ref for animation
      cardRefs.current.set(project.id, group);
      scene.add(group);

      // Click handler via raycasting data
      mesh.userData = { projectId: project.id };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, locations, cardPositions, nightMode]);

  // Click detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onClick(e: MouseEvent) {
      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) return;
      const c = containerRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const meshes: THREE.Mesh[] = [];
      cardRefs.current.forEach((group) => {
        group.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.userData.projectId) {
            meshes.push(child);
          }
        });
      });
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const hit = hits[0];
        const mesh = hit.object as THREE.Mesh;
        const projectId = mesh.userData.projectId as string;
        const project = projects.find((p) => p.id === projectId);
        if (project) onProjectSelect(project);
      }
    }

    container.addEventListener('click', onClick);
    return () => container.removeEventListener('click', onClick);
  }, [projects, onProjectSelect, raycaster, mouse]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
      onPointerDown={(e) => {
        if (e.button === 0) e.currentTarget.style.cursor = 'grabbing';
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.cursor = 'grab';
      }}
    />
  );
}

function makeTextSprite(
  text: string,
  opts: { fontSize?: number; color?: string; width?: number; height?: number }
): THREE.Sprite {
  const { fontSize = 18, color = '#ffffff', width = 400, height = 80 } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);
  ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  return sprite;
}

function createTrajectoryTexture(
  projectLocations: Location[],
  nightMode: boolean
): THREE.CanvasTexture {
  const W = 300, H = 120;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background — semi-transparent dark
  ctx.clearRect(0, 0, W, H);

  if (projectLocations.length === 0) {
    // No locations — show placeholder
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂无地点轨迹', W / 2, H / 2);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  const lats = projectLocations.map((l) => l.latitude);
  const lngs = projectLocations.map((l) => l.longitude);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);
  const pad = 18;
  const latRange = latMax - latMin || 0.001;
  const lngRange = lngMax - lngMin || 0.001;

  function toXY(lat: number, lng: number): [number, number] {
    const x = pad + ((lng - lngMin) / lngRange) * (W - pad * 2);
    const y = H - pad - ((lat - latMin) / latRange) * (H - pad * 2);
    return [x, y];
  }

  const accentColor = nightMode ? '#7BA7FF' : '#5B8DEE';
  const lineColor = nightMode ? 'rgba(123,167,255,0.7)' : 'rgba(91,141,238,0.7)';
  const bgColor = nightMode ? 'rgba(15,22,41,0.6)' : 'rgba(255,255,255,0.08)';

  // Draw connecting lines first
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  for (let i = 0; i < projectLocations.length; i++) {
    const [x, y] = toXY(projectLocations[i].latitude, projectLocations[i].longitude);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw location dots and labels
  projectLocations.forEach((loc, i) => {
    const [x, y] = toXY(loc.latitude, loc.longitude);

    // Outer glow ring
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 10);
    grad.addColorStop(0, accentColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Inner dot
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Step number
    ctx.fillStyle = nightMode ? '#0f1629' : '#ffffff';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x, y);

    // Location name label
    const labelX = x + 8;
    const labelY = y - 10;
    ctx.fillStyle = nightMode ? 'rgba(200,220,255,0.75)' : 'rgba(80,100,180,0.8)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(loc.name, labelX, labelY);

    // Coord
    ctx.fillStyle = nightMode ? 'rgba(200,220,255,0.45)' : 'rgba(80,100,180,0.55)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°`, labelX, labelY + 12);
  });

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
