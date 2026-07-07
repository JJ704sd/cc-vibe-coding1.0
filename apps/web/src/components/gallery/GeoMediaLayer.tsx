import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { AnchoredMediaPlacement, FallbackMediaPlacement } from '@/features/gallery/useCurvedMapProjection';
import type { CurvedMapSampler } from './CurvedMapSurface';
import type { MediaImage } from '@/types/domain';
import { disposeMaterialDeep } from '@/lib/utils/threeDispose';

const CARD_ASPECT_X = 4;
const CARD_ASPECT_Y = 3;
const CARD_HEIGHT = 200;
const CARD_WIDTH = (CARD_HEIGHT * CARD_ASPECT_X) / CARD_ASPECT_Y;
const LIFT_HEIGHT = 35;
const FALLBACK_X = -600;
const FALLBACK_SPACING = 250;

interface GeoMediaLayerProps {
  scene: THREE.Scene;
  anchored: AnchoredMediaPlacement[];
  fallback: FallbackMediaPlacement[];
  sampler: CurvedMapSampler;
  onImageSelect: (mediaImage: MediaImage) => void;
}

interface CardMeshData {
  group: THREE.Group;
  frontMesh: THREE.Mesh;
  imgMat: THREE.MeshStandardMaterial;
  backMat: THREE.MeshStandardMaterial;
}

export function GeoMediaLayer({
  scene,
  anchored,
  fallback,
  sampler,
  onImageSelect,
}: GeoMediaLayerProps) {
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  const sharedGeometry = useMemo(
    () => new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT),
    []
  );

  const darkMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.FrontSide,
      }),
    []
  );

  // C+ fix: anchored and fallback cards now live in separate refs so
  // their cleanup paths don't trample each other. The previous design
  // pushed both kinds into `cardsRef`, and the anchored effect's
  // cleanup wiped the entire array — deleting fallback cards whenever
  // the anchored prop changed, while the fallback effect had no
  // cleanup at all, so stale fallback cards accumulated when the
  // fallback prop changed.
  const anchoredCardsRef = useRef<CardMeshData[]>([]);
  const fallbackCardsRef = useRef<CardMeshData[]>([]);

  // Unmount cleanup: release the useMemo-shared GPU resources only.
// Per-card dispose is handled by the anchored/fallback effects'
// own cleanups (which run on unmount along with this one), so we
// don't double-dispose them here.
  useEffect(() => {
    return () => {
      // C+ fix: darkMaterial was a useMemo([]) shared across every
      // card; without explicit dispose the Three.js shader-program
      // cache keeps the compiled program alive after unmount.
      darkMaterial.dispose();
      // Same story for the shared PlaneGeometry — kept alive by the
      // useMemo([]) reference even after the last mesh referencing
      // it has been disposed.
      sharedGeometry.dispose();
    };
  }, [darkMaterial, sharedGeometry]);

  // Build anchored cards
  useEffect(() => {
    // Hold the cards we create this run in a local const so the
    // cleanup closure disposes exactly this batch — even if the next
    // effect run has already replaced anchoredCardsRef.current.
    const createdCards: CardMeshData[] = [];

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
      createdCards.push({ group, frontMesh, imgMat, backMat: darkMaterial });
    });

    anchoredCardsRef.current = createdCards;

    return () => {
      for (const card of createdCards) {
        disposeMaterialDeep(card.imgMat);
        card.group.removeFromParent();
      }
      // If we still own anchoredCardsRef.current (no later effect has
      // overwritten it), drop the reference so the GC can collect.
      if (anchoredCardsRef.current === createdCards) {
        anchoredCardsRef.current = [];
      }
    };
  }, [anchored, sampler, scene, textureLoader, sharedGeometry, darkMaterial]);

  // Build fallback cards (with cleanup — was missing before, caused
  // stale fallback cards to accumulate when the fallback prop changed,
  // AND the anchored effect's cleanup previously wiped both kinds).
  useEffect(() => {
    const createdCards: CardMeshData[] = [];

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
      createdCards.push({ group, frontMesh, imgMat, backMat: darkMaterial });
    });

    fallbackCardsRef.current = createdCards;

    return () => {
      for (const card of createdCards) {
        disposeMaterialDeep(card.imgMat);
        card.group.removeFromParent();
      }
      if (fallbackCardsRef.current === createdCards) {
        fallbackCardsRef.current = [];
      }
    };
  }, [fallback, scene, textureLoader, sharedGeometry, darkMaterial]);

  return null;
}
