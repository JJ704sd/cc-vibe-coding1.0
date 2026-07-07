import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createSkyBackground } from '@/components/site/SkyBackground';
import { computeCardOpacity, createPlaceholderTexture } from '@/features/gallery/gallerySceneMath';
import { disposeMaterialDeep, disposeSkyDome } from '@/lib/utils/threeDispose';
import type { MediaImage } from '@/types/domain';

interface GalleryExperienceProps {
  mediaImages: MediaImage[];
  nightMode: boolean;
  onImageSelect: (mediaImage: MediaImage) => void;
}

const CARD_H = 200;
const CARD_W = (CARD_H * 4) / 3;
const CARD_LIFT = 80;
const FALLBACK_X = -650;
const FALLBACK_SPACING = 320;
const CHINA_LNG_MIN = 73;
const CHINA_LNG_MAX = 135;
const CHINA_LAT_MIN = 18;
const CHINA_LAT_MAX = 54;
const CURVE_RADIUS = 1400;
const CURVE_ARC = Math.PI * 0.9;
const CURVE_HEIGHT = 1800;

function clampToUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lngLatToUv(longitude: number, latitude: number) {
  return {
    u: clampToUnit((longitude - CHINA_LNG_MIN) / (CHINA_LNG_MAX - CHINA_LNG_MIN)),
    v: clampToUnit(1 - (latitude - CHINA_LAT_MIN) / (CHINA_LAT_MAX - CHINA_LAT_MIN)),
  };
}

function uvToCurved(u: number, v: number) {
  const angle = -CURVE_ARC / 2 + CURVE_ARC * clampToUnit(u);
  return new THREE.Vector3(
    Math.sin(angle) * CURVE_RADIUS,
    (0.5 - clampToUnit(v)) * CURVE_HEIGHT,
    Math.cos(angle) * CURVE_RADIUS - CURVE_RADIUS,
  );
}

function buildCurvedGeo(): THREE.PlaneGeometry {
  const segmentsX = 32;
  const segmentsY = 16;
  const geo = new THREE.PlaneGeometry(1, 1, segmentsX, segmentsY);
  const pos = geo.attributes.position;

  for (let iy = 0; iy <= segmentsY; iy += 1) {
    for (let ix = 0; ix <= segmentsX; ix += 1) {
      const u = ix / segmentsX;
      const v = iy / segmentsY;
      const point = uvToCurved(u, v);
      pos.setXYZ(iy * (segmentsX + 1) + ix, point.x, point.y, point.z);
    }
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function buildCards(params: {
  parent: THREE.Group;
  anchored: Array<{ img: MediaImage; lng: number; lat: number }>;
  fallback: Array<{ img: MediaImage; idx: number }>;
}): { cleanup: () => void; groups: THREE.Group[] } {
  const { parent, anchored, fallback } = params;
  const loader = new THREE.TextureLoader();
  const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.7,
    metalness: 0.1,
    side: THREE.FrontSide,
  });
  const groups: THREE.Group[] = [];
  // BUG-012: track every TextureLoader instance so cleanup can release them
  // even if the onLoad callback later swapped material.map to a different
  // texture instance (the original `texture` reference would otherwise leak).
  const texturesToDispose: THREE.Texture[] = [];
  // Guard against the async onLoad callback firing AFTER cleanup has disposed
  // the texture — otherwise we'd attach a disposed texture to material.map and
  // trigger WebGL errors the next frame.
  let disposed = false;

  function add(img: MediaImage, pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    let material: THREE.MeshStandardMaterial;
    if (img.url) {
      const placeholder = createPlaceholderTexture();
      const texture = loader.load(
        img.url,
        (loaded) => {
          // Replace the placeholder with the real texture once the network
          // load resolves. Failed loads keep the placeholder so the card
          // never collapses to an empty white square.
          if (disposed) return;
          loaded.colorSpace = THREE.SRGBColorSpace;
          material.map = loaded;
          material.needsUpdate = true;
        },
        undefined,
        () => {
          // Texture loader already falls back to the placeholder map; no
          // extra work needed but we keep the callback so a future
          // observer hook has a single seam to attach to.
        },
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      texturesToDispose.push(texture);
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.4,
        metalness: 0.05,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.88,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        map: createPlaceholderTexture(),
        roughness: 0.5,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.6,
      });
    }

    const front = new THREE.Mesh(geo, material);
    front.userData = { mediaImage: img };
    group.add(front);

    const back = new THREE.Mesh(geo, darkMat.clone());
    back.rotation.y = Math.PI;
    back.position.z = -1;
    group.add(back);

    group.lookAt(0, group.position.y, 0);
    group.rotateX((Math.random() - 0.5) * 0.07);
    group.rotateY((Math.random() - 0.5) * 0.07);
    group.rotateZ((Math.random() - 0.5) * 0.05);
    group.userData.initialPos = group.position.clone();
    group.userData.initialRot = group.rotation.clone();
    group.userData.phase = Math.random() * Math.PI * 2;
    group.userData.driftAmp = 3 + Math.random() * 5;
    group.userData.entryTime = -1;
    group.userData.baseScale = 1;
    parent.add(group);
    groups.push(group);
  }

  anchored.forEach(({ img, lng, lat }) => {
    const uv = lngLatToUv(lng, lat);
    const point = uvToCurved(uv.u, uv.v);
    const angle = -CURVE_ARC / 2 + CURVE_ARC * uv.u;
    const normal = new THREE.Vector3(
      Math.sin(angle),
      0,
      Math.cos(angle),
    ).normalize();
    add(img, point.clone().add(normal.multiplyScalar(CARD_LIFT)));
  });

  fallback.forEach(({ img, idx }) => {
    add(img, new THREE.Vector3(FALLBACK_X, (idx - fallback.length / 2) * FALLBACK_SPACING, 0));
  });

  const cleanup = () => {
    disposed = true;
    groups.forEach((group) => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (obj.material instanceof THREE.Material) {
            // BUG-012: deep dispose so .map (TextureLoader image + placeholder
            // CanvasTexture) and any other map slots are released too.
            disposeMaterialDeep(obj.material);
          }
        }
      });
      parent.remove(group);
    });
    geo.dispose();
    darkMat.dispose();
    // Dispose the initial TextureLoader instance(s). Even if onLoad swapped
    // material.map, the original `texture` we created still owns a GPU
    // resource until we release it explicitly here.
    texturesToDispose.forEach((t) => t.dispose());
  };

  return { cleanup, groups };
}

function useProjection(images: MediaImage[]) {
  return useMemo(() => {
    const anchored: Array<{ img: MediaImage; lng: number; lat: number }> = [];
    const fallback: Array<{ img: MediaImage; idx: number }> = [];

    images.forEach((img, index) => {
      if (img.longitude !== undefined && img.latitude !== undefined) {
        anchored.push({ img, lng: img.longitude, lat: img.latitude });
      } else {
        fallback.push({ img, idx: index });
      }
    });

    return { anchored, fallback };
  }, [images]);
}

export function GalleryExperience({
  mediaImages,
  nightMode,
  onImageSelect,
}: GalleryExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const nightModeRef = useRef(nightMode);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const skyUniformsRef = useRef<ReturnType<typeof createSkyBackground>['uniforms'] | null>(null);
  const cardDataRef = useRef<{ cleanup: () => void; groups: THREE.Group[] } | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(-9999, -9999), []);
  const mouseDown = useMemo(() => ({ x: 0, y: 0 }), []);
  const dragging = useMemo(() => ({ value: false }), []);

  const { anchored, fallback } = useProjection(mediaImages);

  useEffect(() => {
    nightModeRef.current = nightMode;
  }, [nightMode]);

  useEffect(() => {
    if (!threeContainerRef.current) return;

    const container = threeContainerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.pointerEvents = 'auto';
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xfff8ee, 0.5);
    sun.position.set(1, 1.5, 1).normalize();
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd0e4ff, 0.25);
    fill.position.set(-1, -0.5, -1).normalize();
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(55, width / height, 1, 10000);
    cameraRef.current = camera;

    const pivot = new THREE.Group();
    scene.add(pivot);
    pivotRef.current = pivot;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.enablePan = false;
    controls.minDistance = 300;
    controls.maxDistance = 2500;
    controls.maxPolarAngle = Math.PI;
    controls.minPolarAngle = 0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const { mesh: skyMesh, uniforms: skyUniforms } = createSkyBackground();
    scene.add(skyMesh);
    skyUniformsRef.current = skyUniforms;

    const mapGeo = buildCurvedGeo();
    const mapTex = buildMapCanvasTexture();
    const mapMat = new THREE.MeshStandardMaterial({
      map: mapTex,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.FrontSide,
      transparent: true,
      opacity: 0.88,
    });
    const mapMesh = new THREE.Mesh(mapGeo, mapMat);
    mapMesh.visible = true;
    pivot.add(mapMesh);

    let raf = 0;
    let time = 0;
    let introActive = true;
    const startedAt = performance.now() / 1000;
    const introDuration = 2.0;
    const from = { theta: 2.2, phi: Math.PI / 2.15, zoom: 5200 };
    const to = { theta: Math.PI / 2, phi: Math.PI / 3.2, zoom: 1500 };
    const current = { ...from };

    function ease(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate() {
      raf = requestAnimationFrame(animate);
      if (disposed) return;
      time += 0.005;

      if (skyUniformsRef.current) {
        skyUniformsRef.current.uTime.value = time;
        skyUniformsRef.current.uNightFactor.value = nightModeRef.current ? 1.0 : 0.0;
      }

      const skyDrift = 1;
      skyMesh.position.set(
        camera.position.x + Math.sin(time * 0.12) * 42 * skyDrift,
        camera.position.y + Math.cos(time * 0.09) * 28 * skyDrift,
        camera.position.z + Math.sin(time * 0.08 + 0.8) * 22 * skyDrift,
      );
      skyMesh.rotation.y = Math.sin(time * 0.03) * 0.08 * skyDrift;
      skyMesh.rotation.z = Math.cos(time * 0.025) * 0.03 * skyDrift;

      if (introActive) {
        const elapsed = performance.now() / 1000 - startedAt;
        const e = ease(Math.min(elapsed / introDuration, 1));
        const sweep = 5.5;
        current.theta = from.theta + (to.theta - from.theta + sweep) * e;
        current.phi = from.phi + (to.phi - from.phi) * e;
        current.zoom = from.zoom + (to.zoom - from.zoom) * e;
        camera.position.set(
          current.zoom * Math.sin(current.phi) * Math.cos(current.theta),
          current.zoom * Math.cos(current.phi),
          current.zoom * Math.sin(current.phi) * Math.sin(current.theta),
        );
        camera.lookAt(0, 0, 0);
        pivot.rotation.y = time * 0.03;
        if (elapsed >= introDuration) {
          introActive = false;
          controls.target.set(0, 0, 0);
        }
      } else {
        controls.update();
        pivot.rotation.y = time * 0.025;
      }

      // Pick the card currently under the pointer so we can give it a
      // stronger lift and a higher opacity. This reuses the raycaster
      // created above instead of allocating a new one every frame.
      raycaster.setFromCamera(mouse, camera);
      const pickables: THREE.Mesh[] = [];
      cardDataRef.current?.groups.forEach((group) => {
        const front = group.children[0] as THREE.Mesh | undefined;
        if (front) pickables.push(front);
      });
      const hoverHits = pickables.length > 0 ? raycaster.intersectObjects(pickables, false) : [];
      const hoveredGroup = hoverHits[0]?.object.parent ?? null;

      cardDataRef.current?.groups.forEach((group) => {
        const { initialPos, initialRot, phase, driftAmp } = group.userData;
        if (!initialPos || !initialRot) return;

        if (group.userData.entryTime < 0) {
          group.userData.entryTime = performance.now() / 1000;
        }

        const elapsed = performance.now() / 1000 - group.userData.entryTime;
        const entryTime = Math.max(0, Math.min(1, elapsed / (introDuration * 1.5)));
        const entry = entryTime < 0.5
          ? 2 * entryTime * entryTime
          : 1 - Math.pow(-2 * entryTime + 2, 2) / 2;
        const rotAmount = (1 - entry) * Math.PI * 2;
        const yOffset = Math.max(0, (1 - entry) * 100);
        const isHovered = group === hoveredGroup;
        const hoverLift = isHovered ? 18 : 0;
        const hoverScale = isHovered ? 1.08 : 1;
        group.position.y = initialPos.y + Math.sin(time * 0.4 + phase) * driftAmp - yOffset + hoverLift;
        group.rotation.y = initialRot.y + rotAmount;
        group.rotation.x = initialRot.x + Math.sin(time * 0.25 + phase) * 0.03;
        group.scale.setScalar(hoverScale);

        const dist = camera.position.distanceTo(group.position);
        const opacity = computeCardOpacity({ distance: dist, entry, isHovered });
        const front = group.children[0] as THREE.Mesh | undefined;
        const back = group.children[1] as THREE.Mesh | undefined;
        if (front?.material) {
          (front.material as THREE.MeshStandardMaterial).opacity = opacity;
        }
        if (back?.material) {
          (back.material as THREE.MeshStandardMaterial).opacity = opacity * 0.5;
        }
      });

      renderer.render(scene, camera);
    }

    animate();

    function onResize() {
      if (!threeContainerRef.current || !rendererRef.current || !cameraRef.current) return;
      const nextWidth = threeContainerRef.current.clientWidth || window.innerWidth;
      const nextHeight = threeContainerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = nextWidth / nextHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nextWidth, nextHeight);
    }

    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      mapGeo.dispose();
      mapMat.dispose();
      mapTex.dispose();
      // BUG-011: dispose the sky dome. The ShaderMaterial compiles a heavy
      // program (29-260 lines of fragment shader) that lives in WebGL's
      // program cache keyed by material UUID — it only goes away on
      // material.dispose(). Leaving it leaks both GPU memory and the
      // shader program itself across mount/unmount cycles.
      disposeSkyDome(skyMesh, scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    sceneRef.current.children.forEach((child) => {
      if (child instanceof THREE.AmbientLight) {
        child.intensity = nightMode ? 0.3 : 0.65;
      }
      if (child instanceof THREE.DirectionalLight) {
        child.intensity = child.position.y > 0
          ? (nightMode ? 0.12 : 0.5)
          : (nightMode ? 0.15 : 0.25);
      }
    });
  }, [nightMode]);

  useEffect(() => {
    if (!sceneRef.current || !pivotRef.current) return;

    if (cardDataRef.current) {
      cardDataRef.current.cleanup();
      cardDataRef.current = null;
    }

    const result = buildCards({ parent: pivotRef.current, anchored, fallback });
    cardDataRef.current = result;

    return () => {
      result.cleanup();
      cardDataRef.current = null;
    };
  }, [anchored, fallback]);

  const onPtrDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.value = false;
    mouseDown.x = event.clientX;
    mouseDown.y = event.clientY;
    const rect = threeContainerRef.current?.getBoundingClientRect();
    if (!rect || !cameraRef.current) return;
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }, [dragging, mouse, mouseDown]);

  const onPtrMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (Math.abs(event.clientX - mouseDown.x) > 5 || Math.abs(event.clientY - mouseDown.y) > 5) {
      dragging.value = true;
    }
    const rect = threeContainerRef.current?.getBoundingClientRect();
    if (!rect || !cameraRef.current) return;
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }, [dragging, mouse, mouseDown]);

  const onPtrUp = useCallback(() => {
    if (dragging.value || !cameraRef.current || !sceneRef.current) return;

    raycaster.setFromCamera(mouse, cameraRef.current);
    const meshes: THREE.Mesh[] = [];
    sceneRef.current.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.mediaImage) {
        meshes.push(obj);
      }
    });

    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const img = hits[0].object.userData.mediaImage as MediaImage;
      if (img) onImageSelect(img);
    }
  }, [dragging, mouse, onImageSelect, raycaster]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        ref={threeContainerRef}
        onPointerDown={onPtrDown}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'auto',
        }}
      />
    </div>
  );
}

function buildMapCanvasTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a4a7a');
  gradient.addColorStop(0.5, '#2a6a9a');
  gradient.addColorStop(1, '#1a3a5a');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const china = [
    [0.72, 0.16], [0.78, 0.20], [0.82, 0.27], [0.85, 0.35], [0.83, 0.44],
    [0.86, 0.50], [0.82, 0.54], [0.76, 0.58], [0.70, 0.60], [0.65, 0.57],
    [0.60, 0.53], [0.55, 0.46], [0.52, 0.38], [0.50, 0.28], [0.48, 0.20],
    [0.52, 0.14], [0.58, 0.12], [0.65, 0.13], [0.72, 0.16],
  ];
  context.beginPath();
  china.forEach(([px, py], index) => {
    if (index === 0) {
      context.moveTo(px * width, py * height);
    } else {
      context.lineTo(px * width, py * height);
    }
  });
  context.closePath();
  context.fillStyle = 'rgba(55,85,55,0.8)';
  context.fill();
  context.strokeStyle = 'rgba(80,120,80,0.6)';
  context.lineWidth = 2;
  context.stroke();

  [
    [0.22, 0.22, 0.09, 0.05],
    [0.30, 0.14, 0.07, 0.04],
    [0.42, 0.18, 0.08, 0.04],
    [0.28, 0.38, 0.10, 0.06],
    [0.18, 0.32, 0.08, 0.05],
  ].forEach(([px, py, rx, ry]) => {
    const grd = context.createRadialGradient(
      (px + rx / 2) * width,
      (py + ry / 2) * height,
      0,
      (px + rx / 2) * width,
      (py + ry / 2) * height,
      (rx * width) / 2,
    );
    grd.addColorStop(0, 'rgba(50,80,50,0.7)');
    grd.addColorStop(1, 'rgba(50,80,50,0)');
    context.beginPath();
    context.ellipse(
      (px + rx / 2) * width,
      (py + ry / 2) * height,
      (rx * width) / 2,
      (ry * height) / 2,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = grd;
    context.fill();
  });

  context.strokeStyle = 'rgba(255,255,255,0.04)';
  context.lineWidth = 1;
  for (let index = 1; index < 8; index += 1) {
    context.beginPath();
    context.moveTo((index * width) / 8, 0);
    context.lineTo((index * width) / 8, height);
    context.stroke();
  }
  for (let index = 1; index < 5; index += 1) {
    context.beginPath();
    context.moveTo(0, (index * height) / 5);
    context.lineTo(width, (index * height) / 5);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
