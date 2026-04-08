import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  lngLatToUv,
  uvToCurvedWorld,
  estimateCurvedNormal,
} from '@/features/gallery/gallerySceneMath';

export interface CurvedMapSampler {
  getUvAt(lng: number, lat: number): { u: number; v: number };
  getPointAt(lng: number, lat: number): THREE.Vector3;
  getNormalAt(lng: number, lat: number): THREE.Vector3;
}

interface CurvedMapSurfaceProps {
  onSamplerReady: (sampler: CurvedMapSampler) => void;
  textureUrl?: string;
}

const SEGMENTS_X = 32;
const SEGMENTS_Y = 16;
const CURVE_RADIUS = 1400;
const CURVE_ARC_SPAN = Math.PI * 0.9;
const CURVE_MAP_HEIGHT = 1800;

export function CurvedMapSurface({ onSamplerReady }: CurvedMapSurfaceProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1, SEGMENTS_X, SEGMENTS_Y);
    const positions = geo.attributes.position;
    const vector = new THREE.Vector3();

    for (let iy = 0; iy <= SEGMENTS_Y; iy++) {
      for (let ix = 0; ix <= SEGMENTS_X; ix++) {
        const u = ix / SEGMENTS_X;
        const v = iy / SEGMENTS_Y;
        const index = iy * (SEGMENTS_X + 1) + ix;
        const curved = uvToCurvedWorld({ u, v, radius: CURVE_RADIUS, arcSpan: CURVE_ARC_SPAN, mapHeight: CURVE_MAP_HEIGHT });
        positions.setXYZ(index, curved.x, curved.y, curved.z);
      }
    }

    positions.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  const sampler: CurvedMapSampler = useMemo(() => ({
    getUvAt(lng: number, lat: number) {
      return lngLatToUv(lng, lat);
    },
    getPointAt(lng: number, lat: number) {
      const { u, v } = lngLatToUv(lng, lat);
      return uvToCurvedWorld({ u, v, radius: CURVE_RADIUS, arcSpan: CURVE_ARC_SPAN, mapHeight: CURVE_MAP_HEIGHT });
    },
    getNormalAt(lng: number, lat: number) {
      const { u } = lngLatToUv(lng, lat);
      return estimateCurvedNormal(u, CURVE_ARC_SPAN);
    },
  }), []);

  useEffect(() => {
    onSamplerReady(sampler);
  }, [onSamplerReady, sampler]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={0x1a3a5c} side={THREE.DoubleSide} />
    </mesh>
  );
}
