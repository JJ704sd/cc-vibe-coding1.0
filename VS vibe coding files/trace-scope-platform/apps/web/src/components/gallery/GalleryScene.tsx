import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Project, Location } from '@/types/domain';
import { createSkyBackground } from '@/components/site/SkyBackground';

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
  const skyUniformsRef = useRef<ReturnType<typeof createSkyBackground>['uniforms'] | null>(null);
  const cardDataRef = useRef<Array<{
    group: THREE.Group;
    initialPos: THREE.Vector3;
    initialRot: THREE.Euler;
    phase: number;
    driftAmp: number;
    imgMat: THREE.MeshStandardMaterial;
    backMat: THREE.MeshStandardMaterial;
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x385EC7, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Draw real-time clock on canvas overlay until 3D scene renders ──
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

    // Sky dome
    const { mesh: skyMesh, uniforms: skyUniforms } = createSkyBackground();
    scene.add(skyMesh);
    skyUniformsRef.current = skyUniforms;

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

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate() {
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      time += 0.005;

      // Update sky uniforms every frame
      if (skyUniformsRef.current) {
        skyUniformsRef.current.uTime.value = time;
        skyUniformsRef.current.uNightFactor.value = nightMode ? 1.0 : 0.0;
      }
      skyMesh.position.copy(camera.position);

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
        if (t >= 1.0) {
          introActive = false;
        }
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

  // Sync night mode to lighting + renderer clear color
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

    // Clear existing cards and dispose textures/materials
    cardDataRef.current.forEach((data) => {
      data.imgMat.dispose();
      data.backMat.dispose();
    });
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
      let imgMat: THREE.MeshStandardMaterial;
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
          color: new THREE.Color('#ffffff'),
          roughness: 0.35,
          metalness: 0.03,
          side: THREE.FrontSide,
          transparent: true,
          opacity: 0.15,
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
        imgMat,
        backMat,
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
      style={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none', position: 'relative' }}
    />
  );
}
