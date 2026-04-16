import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createSkyBackground } from '@/components/site/SkyBackground';
import { buildTiandituRasterStyle, MAP_ENV_KEYS } from '@/lib/constants/map';
import type { MediaImage } from '@/types/domain';

interface GalleryExperienceProps {
  mediaImages: MediaImage[];
  nightMode: boolean;
  onImageSelect: (mediaImage: MediaImage) => void;
}

type MapInstance = import('maplibre-gl').Map;

const CENTER_LNG = 104.1954;
const CENTER_LAT = 35.8617;

const CARD_H = 200;
const CARD_W = (CARD_H * 4) / 3;
const CARD_LIFT = 80;
const FALLBACK_X = -650;
const FALLBACK_SPACING = 320;

function lngLatToUv(lng: number, lat: number) {
  return { u: (lng + 180) / 360, v: (lat + 90) / 180 };
}

function uvToCurved(u: number, v: number) {
  const radius = 1400;
  const arc = Math.PI * 0.88;
  const mapHeight = 2000;
  const x = (u - 0.5) * arc * radius;
  const angle = (v - 0.5) * Math.PI;
  const y = radius * Math.cos(angle) + mapHeight - radius;
  const z = radius * Math.sin(angle);
  return new THREE.Vector3(x, y, z);
}

function buildCurvedGeo(): THREE.PlaneGeometry {
  const segmentsX = 32;
  const segmentsY = 16;
  const radius = 1400;
  const arc = Math.PI * 0.88;
  const mapHeight = 2000;
  const geo = new THREE.PlaneGeometry(1, 1, segmentsX, segmentsY);
  const pos = geo.attributes.position;

  for (let iy = 0; iy <= segmentsY; iy += 1) {
    for (let ix = 0; ix <= segmentsX; ix += 1) {
      const u = ix / segmentsX;
      const v = iy / segmentsY;
      const x = (u - 0.5) * arc * radius;
      const angle = (v - 0.5) * Math.PI;
      const y = radius * Math.cos(angle) + mapHeight - radius;
      const z = radius * Math.sin(angle);
      pos.setXYZ(iy * (segmentsX + 1) + ix, x, y, z);
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

  function add(img: MediaImage, pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    let material: THREE.MeshStandardMaterial;
    if (img.url) {
      const texture = loader.load(img.url);
      texture.colorSpace = THREE.SRGBColorSpace;
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
        color: 0x666666,
        roughness: 0.5,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.2,
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
    parent.add(group);
    groups.push(group);
  }

  anchored.forEach(({ img, lng, lat }) => {
    const uv = lngLatToUv(lng, lat);
    const point = uvToCurved(uv.u, uv.v);
    const normal = new THREE.Vector3(
      -Math.cos((uv.u - 0.5) * Math.PI * 0.88),
      0,
      -Math.sin((uv.u - 0.5) * Math.PI * 0.88),
    ).normalize();
    add(img, point.clone().add(normal.multiplyScalar(CARD_LIFT)));
  });

  fallback.forEach(({ img, idx }) => {
    add(img, new THREE.Vector3(FALLBACK_X, (idx - fallback.length / 2) * FALLBACK_SPACING, 0));
  });

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
      parent.remove(group);
    });
    geo.dispose();
    darkMat.dispose();
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

function setMapInteractionEnabled(map: MapInstance, enabled: boolean) {
  const interactions = [
    map.scrollZoom,
    map.dragPan,
    map.doubleClickZoom,
    map.touchZoomRotate,
    map.boxZoom,
    map.keyboard,
  ];

  interactions.forEach((interaction) => {
    if (enabled) {
      interaction.enable();
    } else {
      interaction.disable();
    }
  });
}

export function GalleryExperience({
  mediaImages,
  nightMode,
  onImageSelect,
}: GalleryExperienceProps) {
  const [isMapFocused, setIsMapFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const mapFocusRef = useRef(false);
  const nightModeRef = useRef(nightMode);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const skyUniformsRef = useRef<ReturnType<typeof createSkyBackground>['uniforms'] | null>(null);
  const cardDataRef = useRef<{ cleanup: () => void; groups: THREE.Group[] } | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null);
  const mapErrorRef = useRef(false);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(-9999, -9999), []);
  const mouseDown = useMemo(() => ({ x: 0, y: 0 }), []);
  const dragging = useMemo(() => ({ value: false }), []);

  const { anchored, fallback } = useProjection(mediaImages);
  const mapToken = import.meta.env[MAP_ENV_KEYS.tiandituToken] as string | undefined;

  const enterMapFocus = useCallback(() => {
    setIsMapFocused(true);
  }, []);

  const exitMapFocus = useCallback(() => {
    setIsMapFocused(false);
  }, []);

  useEffect(() => {
    nightModeRef.current = nightMode;
  }, [nightMode]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapToken) {
      mapErrorRef.current = true;
      return;
    }

    let disposed = false;
    let map: MapInstance | null = null;

    void (async () => {
      const maplibre = await import('maplibre-gl');
      if (disposed || !mapContainerRef.current) return;

      map = new maplibre.Map({
        container: mapContainerRef.current,
        style: buildTiandituRasterStyle(mapToken),
        center: [CENTER_LNG, CENTER_LAT],
        zoom: 4,
        minZoom: 3,
        maxZoom: 10,
        pitch: 0,
        attributionControl: false,
      });
      mapRef.current = map;
      setMapInteractionEnabled(map, false);

      map.addControl(
        new maplibre.NavigationControl({ showCompass: true, visualizePitch: true }),
        'top-right',
      );
      map.addControl(
        new maplibre.ScaleControl({ maxWidth: 120, unit: 'metric' }),
        'bottom-left',
      );

      map.on('error', () => {
        if (!disposed) {
          mapErrorRef.current = true;
        }
      });
    })();

    return () => {
      disposed = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [mapToken]);

  useEffect(() => {
    mapFocusRef.current = isMapFocused;
    if (controlsRef.current) {
      controlsRef.current.enabled = !isMapFocused;
    }
    if (mapRef.current) {
      setMapInteractionEnabled(mapRef.current, isMapFocused);
    }
  }, [isMapFocused]);

  useEffect(() => {
    if (!isMapFocused) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        exitMapFocus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exitMapFocus, isMapFocused]);

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
    controls.enabled = !mapFocusRef.current;
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
    mapMesh.visible = false;
    scene.add(mapMesh);

    const errorTimer = window.setTimeout(() => {
      mapMesh.visible = mapErrorRef.current;
    }, 3000);

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

      const skyDrift = mapFocusRef.current ? 0.38 : 1;
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
        if (!mapFocusRef.current) {
          controls.update();
        }
        pivot.rotation.y = time * 0.025;
      }

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
        group.position.y = initialPos.y + Math.sin(time * 0.4 + phase) * driftAmp - yOffset;
        group.rotation.y = initialRot.y + rotAmount;
        group.rotation.x = initialRot.x + Math.sin(time * 0.25 + phase) * 0.03;

        const dist = camera.position.distanceTo(group.position);
        const fade = Math.max(0, Math.min(1, (dist - 1000) / 3000));
        const opacity = (0.92 - fade * 0.75) * entry;
        const front = group.children[0] as THREE.Mesh | undefined;
        const back = group.children[1] as THREE.Mesh | undefined;
        if (front?.material) {
          (front.material as THREE.MeshStandardMaterial).opacity = opacity;
        }
        if (back?.material) {
          (back.material as THREE.MeshStandardMaterial).opacity = opacity;
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
      window.clearTimeout(errorTimer);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      mapGeo.dispose();
      mapMat.dispose();
      mapTex.dispose();
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
      data-map-focus={isMapFocused ? 'focused' : 'idle'}
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
          pointerEvents: isMapFocused ? 'none' : 'auto',
        }}
      />

      {isMapFocused ? (
        <button
          type="button"
          aria-label="退出地图聚焦"
          onClick={exitMapFocus}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 18,
            border: 'none',
            background: nightMode ? 'rgba(5, 8, 18, 0.38)' : 'rgba(20, 24, 38, 0.16)',
            backdropFilter: 'blur(10px) saturate(0.92)',
            cursor: 'pointer',
          }}
        />
      ) : null}

      <div
        data-testid="gallery-map-stage"
        data-focus-state={isMapFocused ? 'focused' : 'idle'}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: isMapFocused ? 'center' : 'flex-end',
          justifyContent: 'center',
          padding: isMapFocused
            ? 'clamp(24px, 5vw, 52px)'
            : 'clamp(80px, 14vh, 144px) clamp(20px, 4vw, 40px) clamp(44px, 8vh, 90px)',
        }}
      >
        <div
          style={{
            position: 'relative',
            pointerEvents: 'auto',
            width: isMapFocused ? 'min(82vw, 1280px)' : 'min(68vw, 1040px)',
            maxWidth: 'calc(100vw - 40px)',
            height: isMapFocused ? 'min(72vh, 760px)' : 'clamp(280px, 33vw, 500px)',
            transform: isMapFocused
              ? 'translate3d(0, -1.8vh, 0) scale(1.015)'
              : 'translate3d(0, 0, 0) scale(1)',
            transition: 'width 480ms cubic-bezier(0.22, 1, 0.36, 1), height 480ms cubic-bezier(0.22, 1, 0.36, 1), transform 480ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: isMapFocused ? '-34px' : '-26px',
              transform: 'translateX(-50%)',
              padding: '8px 14px',
              borderRadius: '999px',
              border: `1px solid ${nightMode ? 'rgba(182, 204, 255, 0.16)' : 'rgba(255, 255, 255, 0.36)'}`,
              background: nightMode ? 'rgba(9, 14, 30, 0.54)' : 'rgba(255, 255, 255, 0.38)',
              backdropFilter: 'blur(16px)',
              color: nightMode ? 'rgba(220, 230, 255, 0.8)' : 'rgba(42, 50, 70, 0.76)',
              fontSize: '0.72rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              boxShadow: nightMode
                ? '0 16px 34px rgba(0, 0, 0, 0.24)'
                : '0 14px 24px rgba(84, 102, 138, 0.12)',
            }}
          >
            {isMapFocused ? 'Map Focus' : 'Grounded Atlas'}
          </div>

          <div
            onClick={!isMapFocused ? enterMapFocus : undefined}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              borderRadius: isMapFocused ? '32px' : '28px',
              transform: isMapFocused ? 'perspective(1600px) rotateX(0deg)' : 'perspective(1600px) rotateX(9deg)',
              transformOrigin: 'center 85%',
              transition: 'border-radius 480ms cubic-bezier(0.22, 1, 0.36, 1), transform 480ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 480ms cubic-bezier(0.22, 1, 0.36, 1)',
              border: `1px solid ${nightMode ? 'rgba(164, 188, 255, 0.14)' : 'rgba(255, 255, 255, 0.46)'}`,
              boxShadow: nightMode
                ? '0 40px 80px rgba(0, 0, 0, 0.4), 0 10px 32px rgba(39, 54, 96, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                : '0 34px 70px rgba(102, 114, 156, 0.2), 0 12px 26px rgba(120, 104, 92, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
              cursor: isMapFocused ? 'default' : 'zoom-in',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: nightMode
                  ? 'linear-gradient(180deg, rgba(14, 22, 44, 0.92) 0%, rgba(20, 30, 57, 0.82) 55%, rgba(8, 14, 28, 0.96) 100%)'
                  : 'linear-gradient(180deg, rgba(250, 251, 255, 0.96) 0%, rgba(223, 232, 244, 0.78) 52%, rgba(214, 196, 184, 0.92) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                  linear-gradient(${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(84,98,128,0.1)'} 1px, transparent 1px),
                  linear-gradient(90deg, ${nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(84,98,128,0.1)'} 1px, transparent 1px)
                `,
                backgroundSize: isMapFocused ? '56px 56px' : '44px 44px',
                opacity: isMapFocused ? 0.35 : 0.5,
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: '10px',
                borderRadius: isMapFocused ? '24px' : '20px',
                overflow: 'hidden',
                border: `1px solid ${nightMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.55)'}`,
                background: nightMode ? 'rgba(6, 10, 24, 0.38)' : 'rgba(255, 255, 255, 0.16)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: nightMode
                    ? 'radial-gradient(circle at 50% 0%, rgba(116, 150, 255, 0.16), transparent 42%), linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.18))'
                    : 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.46), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.1), rgba(90,70,54,0.08))',
                }}
              />
              <div
                ref={mapContainerRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: 18,
                  bottom: 18,
                  padding: '10px 12px',
                  maxWidth: isMapFocused ? 340 : 300,
                  borderRadius: '18px',
                  background: nightMode ? 'rgba(7, 10, 24, 0.58)' : 'rgba(255, 255, 255, 0.55)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'}`,
                  backdropFilter: 'blur(14px)',
                  color: nightMode ? 'rgba(224,230,244,0.82)' : 'rgba(48,54,70,0.78)',
                  boxShadow: nightMode
                    ? '0 18px 32px rgba(0,0,0,0.18)'
                    : '0 12px 24px rgba(112,116,132,0.12)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    opacity: 0.74,
                    marginBottom: 6,
                  }}
                >
                  {mapToken ? 'Map Module' : 'Map Placeholder'}
                </div>
                <div
                  style={{
                    fontSize: isMapFocused ? '0.95rem' : '0.88rem',
                    lineHeight: 1.4,
                  }}
                >
                  {isMapFocused
                    ? '滚轮或双指缩放，拖拽平移。按 Esc、点空白处，或点右上角收起地图。'
                    : '地图被压成地面模块铺在舞台上，点击后进入聚焦态。'}
                </div>
              </div>

              {!isMapFocused ? (
                <button
                  type="button"
                  aria-label="进入地图聚焦"
                  onClick={(event) => {
                    event.stopPropagation();
                    enterMapFocus();
                  }}
                  style={{
                    position: 'absolute',
                    right: 18,
                    top: 18,
                    padding: '12px 18px',
                    borderRadius: '999px',
                    border: 'none',
                    background: nightMode
                      ? 'linear-gradient(135deg, rgba(106, 138, 255, 0.84), rgba(63, 101, 214, 0.8))'
                      : 'linear-gradient(135deg, rgba(47, 79, 154, 0.9), rgba(69, 110, 194, 0.82))',
                    color: '#f7f9ff',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    boxShadow: '0 18px 32px rgba(26, 48, 110, 0.24)',
                  }}
                >
                  进入地图聚焦
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="收起地图"
                  onClick={(event) => {
                    event.stopPropagation();
                    exitMapFocus();
                  }}
                  style={{
                    position: 'absolute',
                    right: 18,
                    top: 18,
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)'}`,
                    background: nightMode ? 'rgba(8, 12, 28, 0.56)' : 'rgba(255, 255, 255, 0.56)',
                    color: nightMode ? 'rgba(234, 240, 255, 0.88)' : 'rgba(26, 34, 54, 0.88)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
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
