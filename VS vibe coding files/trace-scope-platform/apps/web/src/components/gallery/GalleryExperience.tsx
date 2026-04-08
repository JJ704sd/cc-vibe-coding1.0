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
const LIFT_HEIGHT = 35;
const FALLBACK_X = -600;
const FALLBACK_SPACING = 250;

function buildGeoMediaCards(params: {
  scene: THREE.Scene;
  sampler: CurvedMapSampler;
  anchored: ReturnType<typeof useCurvedMapProjection>['anchored'];
  fallback: ReturnType<typeof useCurvedMapProjection>['fallback'];
  onImageSelect: (mediaImage: MediaImage) => void;
}): () => void {
  const { scene, sampler, anchored, fallback, onImageSelect } = params;
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

    scene.add(group);
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

    scene.add(group);
    groups.push(group);
  });

  // Return cleanup function
  return () => {
    groups.forEach((group) => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });
      scene.remove(group);
    });
    sharedGeometry.dispose();
    darkMaterial.dispose();
  };
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
  const cardCleanupRef = useRef<(() => void) | null>(null);
  const samplerRef = useRef<CurvedMapSampler | null>(null);
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

    // Camera
    const camera = new THREE.PerspectiveCamera(55, w / h, 1, 10000);
    camera.position.set(0, 0, 800);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.enablePan = false;
    controls.minDistance = 400;
    controls.maxDistance = 2000;
    controls.maxPolarAngle = Math.PI * 0.75;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Sky dome
    const { mesh: skyMesh, uniforms: skyUniforms } = createSkyBackground();
    scene.add(skyMesh);
    skyUniformsRef.current = skyUniforms;

    // Curved map surface mesh
    const curvedGeo = buildCurvedMapGeometry();
    const curvedMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a5c,
      side: THREE.DoubleSide,
    });
    const curvedMesh = new THREE.Mesh(curvedGeo, curvedMat);
    scene.add(curvedMesh);

    // Sampler
    const sampler = buildCurvedMapSampler();
    samplerRef.current = sampler;
    setSamplerReady(true);

    // Animation loop
    let raf: number;
    let clock = new THREE.Clock();
    let time = 0;

    function animate() {
      raf = requestAnimationFrame(animate);
      time += 0.005;

      // Update sky uniforms
      if (skyUniformsRef.current) {
        skyUniformsRef.current.uTime.value = time;
        skyUniformsRef.current.uNightFactor.value = nightMode ? 1.0 : 0.0;
      }
      skyMesh.position.copy(camera.position);

      controls.update();

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
      curvedMat.dispose();
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
    if (cardCleanupRef.current) {
      cardCleanupRef.current();
      cardCleanupRef.current = null;
    }

    const cleanup = buildGeoMediaCards({
      scene: sceneRef.current,
      sampler: samplerRef.current,
      anchored,
      fallback,
      onImageSelect,
    });
    cardCleanupRef.current = cleanup;

    return () => {
      cleanup();
      cardCleanupRef.current = null;
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
