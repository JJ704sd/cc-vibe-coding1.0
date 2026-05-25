import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { AnchoredMediaPlacement, FallbackMediaPlacement } from '@/features/gallery/useCurvedMapProjection';
import type { CurvedMapSampler } from './CurvedMapSurface';
import type { MediaImage } from '@/types/domain';

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

  const cardsRef = useRef<CardMeshData[]>([]);

  // Clean up cards on unmount or when placements change
  useEffect(() => {
    return () => {
      cardsRef.current.forEach((card) => {
        card.imgMat.dispose();
        card.backMat.dispose();
        card.group.removeFromParent();
      });
      cardsRef.current = [];
    };
  }, []);

  // Build anchored cards
  useEffect(() => {
    // Remove old anchored cards
    cardsRef.current.forEach((card) => {
      card.imgMat.dispose();
      card.backMat.dispose();
      card.group.removeFromParent();
    });
    cardsRef.current = [];

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
      cardsRef.current.push({ group, frontMesh, imgMat, backMat: darkMaterial });
    });
  }, [anchored, sampler, scene, textureLoader, sharedGeometry, darkMaterial]);

  // Build fallback cards
  useEffect(() => {
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
      cardsRef.current.push({ group, frontMesh, imgMat, backMat: darkMaterial });
    });
  }, [fallback, scene, textureLoader, sharedGeometry, darkMaterial]);

  return null;
}
