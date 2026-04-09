import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MediaImage } from '@/types/domain';
import { createSkyBackground } from '@/components/site/SkyBackground';
import {
  lngLatToUv,
  uvToCurvedWorld,
  estimateCurvedNormal,
} from '@/features/gallery/gallerySceneMath';
import { useCurvedMapProjection } from '@/features/gallery/useCurvedMapProjection';

interface GalleryExperienceProps {
  mediaImages: MediaImage[];
  nightMode: boolean;
  onImageSelect: (mediaImage: MediaImage) => void;
}

interface CurvedMapSampler {
  getUvAt(lng: number, lat: number): { u: number; v: number };
  getPointAt(lng: number, lat: number): THREE.Vector3;
  getNormalAt(lng: number, lat: number): THREE.Vector3;
}

// --- MapLibre + Tianditu map texture (uses MapLibre's internal tile fetching) ---
import {
  buildTiandituRasterStyle,
  MAP_CAMERA_DEFAULTS,
} from '@/lib/constants/map';

async function buildMapTextureFromMaplibre(): Promise<HTMLCanvasElement> {
  const maplibre = await import('maplibre-gl');
  const token = import.meta.env.VITE_TIANDITU_TOKEN || '3eca0d4062d71ed2ab6cfe692e0d2d40';

  // Canvas size: higher resolution + higher zoom = sharper tiles on the 3D surface
  const canvasWidth = 2048;
  const canvasHeight = 1024;
  const mapZoom = 7; // higher zoom = more detail per tile
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Draw ocean background
  ctx.fillStyle = '#1a3a5c';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  return new Promise<HTMLCanvasElement>((resolve) => {
    // Create an off-screen MapLibre map that renders tiles to our canvas
    // We use a "dummy" container since we don't need DOM rendering
    const container = document.createElement('div');
    container.style.cssText = `width:${canvasWidth}px;height:${canvasHeight}px;visibility:hidden;position:absolute;top:-9999px;left:-9999px;`;
    document.body.appendChild(container);

    const map = new maplibre.Map({
      container,
      style: buildTiandituRasterStyle(token),
      center: [...MAP_CAMERA_DEFAULTS.center],
      zoom: mapZoom,
      maxZoom: 10,
      attributionControl: false,
      interactive: false,
      fadeDuration: 0,
    });

    let resolved = false;
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;

    function resolveCanvas() {
      if (resolved) return;
      resolved = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      const mapCanvas = map.getCanvas();
      ctx.drawImage(mapCanvas, 0, 0, canvasWidth, canvasHeight);
      map.remove();
      document.body.removeChild(container);
      resolve(canvas);
    }

    map.on('load', () => {
      loadTimeout = setTimeout(resolveCanvas, 5000);
      function checkTiles() {
        if (resolved) return;
        if (map.areTilesLoaded()) {
          if (loadTimeout) clearTimeout(loadTimeout);
          resolveCanvas();
        } else {
          setTimeout(checkTiles, 200);
        }
      }
      setTimeout(checkTiles, 500);
    });

    map.on('error', () => {
      resolveCanvas();
    });
  });
}

// --- CurvedMapSurface logic (inline, plain Three.js) ---
const SEGMENTS_X = 32;
const SEGMENTS_Y = 16;
const CURVE_RADIUS = 1400;
const CURVE_ARC_SPAN = Math.PI * 0.9;
const CURVE_MAP_HEIGHT = 1800;

function buildCurvedMapGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(1, 1, SEGMENTS_X, SEGMENTS_Y);
  const positions = geo.attributes.position;
  const vector = new THREE.Vector3();

  for (let iy = 0; iy <= SEGMENTS_Y; iy++) {
    for (let ix = 0; ix <= SEGMENTS_X; ix++) {
      const u = ix / SEGMENTS_X;
      const v = iy / SEGMENTS_Y;
      const index = iy * (SEGMENTS_X + 1) + ix;
      const curved = uvToCurvedWorld({
        u,
        v,
        radius: CURVE_RADIUS,
        arcSpan: CURVE_ARC_SPAN,
        mapHeight: CURVE_MAP_HEIGHT,
      });
      positions.setXYZ(index, curved.x, curved.y, curved.z);
    }
  }

  positions.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function buildCurvedMapSampler(): CurvedMapSampler {
  return {
    getUvAt(lng: number, lat: number) {
      return lngLatToUv(lng, lat);
    },
    getPointAt(lng: number, lat: number) {
      const { u, v } = lngLatToUv(lng, lat);
      return uvToCurvedWorld({
        u,
        v,
        radius: CURVE_RADIUS,
        arcSpan: CURVE_ARC_SPAN,
        mapHeight: CURVE_MAP_HEIGHT,
      });
    },
    getNormalAt(lng: number, lat: number) {
      const { u } = lngLatToUv(lng, lat);
      return estimateCurvedNormal(u, CURVE_ARC_SPAN);
    },
  };
}

// --- GeoMediaLayer logic (inline, plain Three.js) ---
const CARD_ASPECT_X = 4;
const CARD_ASPECT_Y = 3;
const CARD_HEIGHT = 200;
const CARD_WIDTH = (CARD_HEIGHT * CARD_ASPECT_X) / CARD_ASPECT_Y;
const LIFT_HEIGHT = 80;
const FALLBACK_X = -600;
const FALLBACK_SPACING = 250;

function buildGeoMediaCards(params: {
  parentGroup: THREE.Group;
  sampler: CurvedMapSampler;
  anchored: ReturnType<typeof useCurvedMapProjection>['anchored'];
  fallback: ReturnType<typeof useCurvedMapProjection>['fallback'];
}): { cleanup: () => void; cardGroups: THREE.Group[] } {
  const { parentGroup, sampler, anchored, fallback } = params;
  const textureLoader = new THREE.TextureLoader();
  const sharedGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.7,
    metalness: 0.1,
    side: THREE.FrontSide,
  });

  const groups: THREE.Group[] = [];

  // Build anchored cards
  anchored.forEach((placement) => {
    const { mediaImage } = placement;

    const point = sampler.getPointAt(
      mediaImage.longitude!,
      mediaImage.latitude!
    );
    const normal = sampler.getNormalAt(
      mediaImage.longitude!,
      mediaImage.latitude!
    );
    const position = point.clone().add(
      normal.multiplyScalar(LIFT_HEIGHT)
    );

    const group = new THREE.Group();
    group.position.copy(position);

    // Front face — image texture
    let imgMat: THREE.MeshStandardMaterial;
    if (mediaImage.url) {
      const tex = textureLoader.load(mediaImage.url);
      tex.colorSpace = THREE.SRGBColorSpace;
      imgMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.4,
        metalness: 0.05,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.9,
      });
    } else {
      imgMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.5,
        metalness: 0.0,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.3,
      });
    }

    const frontMesh = new THREE.Mesh(sharedGeometry, imgMat);
    frontMesh.userData = { mediaImage };
    group.add(frontMesh);

    // Back face — dark material
    const backMesh = new THREE.Mesh(sharedGeometry, darkMaterial);
    backMesh.rotation.y = Math.PI;
    backMesh.position.z = -1;
    group.add(backMesh);

    // Orient card to face outward from curved surface
    group.lookAt(0, group.position.y, 0);

    // Add subtle random tilt (like old scene)
    group.rotateX((Math.random() - 0.5) * 0.06);
    group.rotateY((Math.random() - 0.5) * 0.06);
    group.rotateZ((Math.random() - 0.5) * 0.04);

    // Store animation data on group userData
    group.userData.initialPos = group.position.clone();
    group.userData.initialRot = group.rotation.clone();
    group.userData.phase = Math.random() * Math.PI * 2;
    group.userData.driftAmp = 8 + Math.random() * 12;
    group.userData.entryPhase = (anchored.indexOf(placement)) * 0.1; // staggered entry delay
    group.userData.entryTime = -1; // will be set when intro starts

    parentGroup.add(group);
    groups.push(group);
  });

  // Build fallback cards
  fallback.forEach((placement, index) => {
    const { mediaImage } = placement;

    const y = (index - fallback.length / 2) * FALLBACK_SPACING;
    const position = new THREE.Vector3(FALLBACK_X, y, 0);

    const group = new THREE.Group();
    group.position.copy(position);

    // Front face — image texture
    let imgMat: THREE.MeshStandardMaterial;
    if (mediaImage.url) {
      const tex = textureLoader.load(mediaImage.url);
      tex.colorSpace = THREE.SRGBColorSpace;
      imgMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.4,
        metalness: 0.05,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.9,
      });
    } else {
      imgMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.5,
        metalness: 0.0,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.3,
      });
    }

    const frontMesh = new THREE.Mesh(sharedGeometry, imgMat);
    frontMesh.userData = { mediaImage };
    group.add(frontMesh);

    // Back face — dark material
    const backMesh = new THREE.Mesh(sharedGeometry, darkMaterial);
    backMesh.rotation.y = Math.PI;
    backMesh.position.z = -1;
    group.add(backMesh);

    // Face toward the center (toward +x direction)
    group.lookAt(0, group.position.y, 0);

    // Add subtle random tilt
    group.rotateX((Math.random() - 0.5) * 0.06);
    group.rotateY((Math.random() - 0.5) * 0.06);
    group.rotateZ((Math.random() - 0.5) * 0.04);

    // Store animation data
    group.userData.initialPos = group.position.clone();
    group.userData.initialRot = group.rotation.clone();
    group.userData.phase = Math.random() * Math.PI * 2;
    group.userData.driftAmp = 8 + Math.random() * 12;
    group.userData.entryPhase = (index) * 0.1; // staggered entry delay
    group.userData.entryTime = -1;

    parentGroup.add(group);
    groups.push(group);
  });

  // Return cleanup + card groups
  const cleanup = () => {
    groups.forEach((group) => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });
      parentGroup.remove(group);
    });
    sharedGeometry.dispose();
    darkMaterial.dispose();
  };

  return { cleanup, cardGroups: groups };
}

// --- Main Component ---
export function GalleryExperience({
  mediaImages,
  nightMode,
  onImageSelect,
}: GalleryExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const skyUniformsRef = useRef<ReturnType<typeof createSkyBackground>['uniforms'] | null>(null);
  const cardDataRef = useRef<{ cleanup: () => void; cardGroups: THREE.Group[] } | null>(null);
  const samplerRef = useRef<CurvedMapSampler | null>(null);
  const artworkPivotRef = useRef<THREE.Group | null>(null);
  const curvedMatRef = useRef<THREE.Material | null>(null);
  const [samplerReady, setSamplerReady] = useState(false);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(-9999, -9999), []);
  const mouseDownPos = useMemo(() => ({ x: 0, y: 0 }), []);
  const isDragging = useMemo(() => ({ value: false }), []);

  const { anchored, fallback } = useCurvedMapProjection({ mediaImages });

  // Three.js initialization
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    let disposed = false;
    let mounted = true;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xfff8ee, 0.5);
    dirLight.position.set(1, 1.5, 1).normalize();
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xd0e4ff, 0.25);
    fillLight.position.set(-1, -0.5, -1).normalize();
    scene.add(fillLight);

    // Camera — starts far for intro
    const camera = new THREE.PerspectiveCamera(55, w / h, 1, 10000);
    cameraRef.current = camera;

    // Artwork pivot group (rotates during intro)
    const artworkPivot = new THREE.Group();
    scene.add(artworkPivot);
    artworkPivotRef.current = artworkPivot;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.enablePan = false;
    controls.minDistance = 400;
    controls.maxDistance = 2000;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Sky dome
    const { mesh: skyMesh, uniforms: skyUniforms } = createSkyBackground();
    scene.add(skyMesh);
    skyUniformsRef.current = skyUniforms;

    // Curved map surface mesh
    const curvedGeo = buildCurvedMapGeometry();

    // Sampler (同步创建，相机入场动画不依赖瓦片加载)
    const sampler = buildCurvedMapSampler();
    samplerRef.current = sampler;

    // Build Tianditu map texture asynchronously (真实瓦片纹理 via MapLibre)
    buildMapTextureFromMaplibre().then((mapCanvas) => {
      if (!mounted || disposed) return;
      const mapTexture = new THREE.CanvasTexture(mapCanvas);
      mapTexture.colorSpace = THREE.SRGBColorSpace;
      mapTexture.magFilter = THREE.LinearFilter;
      mapTexture.minFilter = THREE.LinearMipmapLinearFilter;
      mapTexture.needsUpdate = true;

      const curvedMat = new THREE.MeshStandardMaterial({
        map: mapTexture,
        side: THREE.FrontSide,
        transparent: true,
        roughness: 0.8,
        metalness: 0.0,
      });
      curvedMatRef.current = curvedMat;
      const curvedMesh = new THREE.Mesh(curvedGeo, curvedMat);
      scene.add(curvedMesh);
      setSamplerReady(true);
    }).catch(() => {
      if (disposed) return;
      // 瓦片加载失败时用占位深海色
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 4;
      fallbackCanvas.height = 4;
      const fc = fallbackCanvas.getContext('2d')!;
      fc.fillStyle = '#0a1e35';
      fc.fillRect(0, 0, 4, 4);
      const mapTexture = new THREE.CanvasTexture(fallbackCanvas);
      const curvedMat = new THREE.MeshStandardMaterial({
        map: mapTexture,
        side: THREE.FrontSide,
        transparent: true,
        roughness: 0.8,
        metalness: 0.0,
      });
      curvedMatRef.current = curvedMat;
      const curvedMesh = new THREE.Mesh(curvedGeo, curvedMat);
      scene.add(curvedMesh);
      setSamplerReady(true);
    });

    // Animation loop
    let raf: number;
    let clock = new THREE.Clock();
    let time = 0;

    // Intro cinematic state (like yuyuzi gallery)
    let introActive = true;
    let introStartTime = clock.getElapsedTime();
    const INTRO_DURATION = 1.5; // seconds
    const introFrom = { theta: 2.0, phi: Math.PI / 2.15, zoom: 5000 };
    // Natural overhead viewing angle
    const introTo = { theta: Math.PI / 2, phi: Math.PI / 3, zoom: 1400 };
    const currentOrbit = { theta: introFrom.theta, phi: introFrom.phi, zoom: introFrom.zoom };
    // Map center is at (x=0, z=0) after flat change
    const MAP_CENTER_X = 0;
    const MAP_CENTER_Z = 0;

    // Artwork pivot rotation (like yuyuzi artworkPivot) — already created in setup

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate() {
      raf = requestAnimationFrame(animate);
      time += 0.005;

      // Update sky uniforms
      if (skyUniformsRef.current) {
        skyUniformsRef.current.uTime.value = time;
        skyUniformsRef.current.uNightFactor.value = nightMode ? 1.0 : 0.0;
      }
      skyMesh.position.copy(camera.position);

      // Intro cinematic: camera spiral inward
      if (introActive) {
        const elapsed = clock.getElapsedTime() - introStartTime;
        const t = Math.min(elapsed / INTRO_DURATION, 1.0);
        const e = easeInOutCubic(t);

        // Camera spiral: horizontal sweep + zoom in
        const spiralSweep = 5.5;
        currentOrbit.theta = introFrom.theta + (introTo.theta - introFrom.theta + spiralSweep) * e;
        currentOrbit.phi = introFrom.phi + (introTo.phi - introFrom.phi) * e;
        currentOrbit.zoom = introFrom.zoom + (introTo.zoom - introFrom.zoom) * e;

        camera.position.x = currentOrbit.zoom * Math.sin(currentOrbit.phi) * Math.cos(currentOrbit.theta);
        camera.position.y = currentOrbit.zoom * Math.cos(currentOrbit.phi);
        camera.position.z = currentOrbit.zoom * Math.sin(currentOrbit.phi) * Math.sin(currentOrbit.theta);
        camera.lookAt(MAP_CENTER_X, 0, MAP_CENTER_Z);

        // Rotate artwork pivot (like yuyuzi artworkPivot.rotation.y = time * 0.03)
        artworkPivot.rotation.y = time * 0.03;

        if (t >= 1.0) {
          introActive = false;
          controls.target.set(MAP_CENTER_X, 0, MAP_CENTER_Z);
        }
      } else {
        controls.update();
      }

      // Card entry + drift animation (like yuyuzi per-card animation)
      if (cardDataRef.current) {
        cardDataRef.current.cardGroups.forEach((group) => {
          const { initialPos, initialRot, phase, driftAmp, entryPhase } = group.userData;
          if (!initialPos || !initialRot) return;

          // Initialize entry time when intro starts
          if (group.userData.entryTime < 0) {
            group.userData.entryTime = clock.getElapsedTime();
          }

          const entryElapsed = clock.getElapsedTime() - group.userData.entryTime;
          const entryT = Math.max(0, Math.min(1, entryElapsed / (INTRO_DURATION * 2)));
          const entryEase = entryT < 0.5 ? 2 * entryT * entryT : 1 - Math.pow(-2 * entryT + 2, 2) / 2;

          // Entry: rotate 360° + float up from below
          const rotationAmount = (1 - entryEase) * Math.PI * 2;
          const entryYOffset = Math.max(0, (1 - entryEase) * 100);

          // Base drift
          const driftY = initialPos.y + Math.sin(time * 0.4 + phase) * driftAmp;

          group.position.y = driftY - entryYOffset;
          group.rotation.y = initialRot.y + rotationAmount;
          group.rotation.x = initialRot.x + Math.sin(time * 0.25 + phase) * 0.03;

          // Distance-based opacity
          const dist = camera.position.distanceTo(group.position);
          const NEAR = 1200, FAR = 4000;
          const opacityT = Math.max(0, Math.min(1, (dist - NEAR) / (FAR - NEAR)));
          const cardOpacity = 0.90 - opacityT * 0.75;
          const finalOpacity = cardOpacity * entryEase;

          const frontMesh = group.children[0] as THREE.Mesh;
          const backMesh = group.children[1] as THREE.Mesh;
          if (frontMesh?.material) {
            (frontMesh.material as THREE.MeshStandardMaterial).opacity = finalOpacity;
          }
          if (backMesh?.material) {
            (backMesh.material as THREE.MeshStandardMaterial).opacity = finalOpacity;
          }
        });
      }

      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function onResize() {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const rw = containerRef.current.clientWidth;
      const rh = containerRef.current.clientHeight;
      cameraRef.current.aspect = rw / rh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(rw, rh);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      curvedGeo.dispose();
      curvedMatRef.current?.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
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

  // Build geo media cards when sampler is ready and placements change
  useEffect(() => {
    if (!samplerReady || !sceneRef.current || !samplerRef.current) return;

    // Clean up previous cards
    if (cardDataRef.current) {
      cardDataRef.current.cleanup();
      cardDataRef.current = null;
    }

    const result = buildGeoMediaCards({
      parentGroup: artworkPivotRef.current!,
      sampler: samplerRef.current!,
      anchored,
      fallback,
    });
    cardDataRef.current = result;

    return () => {
      result.cleanup();
      cardDataRef.current = null;
    };
  }, [samplerReady, anchored, fallback, onImageSelect]);

  // Raycasting — pointer events for click on cards
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.value = false;
    mouseDownPos.x = e.clientX;
    mouseDownPos.y = e.clientY;
    if (!cameraRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }, [mouse, mouseDownPos, isDragging]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDragging.value = true;
    }
    if (!cameraRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }, [mouse, mouseDownPos, isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.value) return;
    if (!cameraRef.current || !sceneRef.current) return;

    raycaster.setFromCamera(mouse, cameraRef.current);

    // Collect card meshes
    const cardMeshes: THREE.Mesh[] = [];
    sceneRef.current.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.mediaImage) {
        cardMeshes.push(obj);
      }
    });

    const hits = raycaster.intersectObjects(cardMeshes, false);
    if (hits.length > 0) {
      const mediaImage = hits[0].object.userData.mediaImage as MediaImage;
      if (mediaImage) {
        onImageSelect(mediaImage);
      }
    }
  }, [raycaster, mouse, onImageSelect]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none', position: 'relative' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
