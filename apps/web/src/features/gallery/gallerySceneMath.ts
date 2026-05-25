import * as THREE from 'three';

export const LNG_MIN = 73;
export const LNG_MAX = 135;
export const LAT_MIN = 18;
export const LAT_MAX = 54;

export function clampToUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function lngLatToUv(longitude: number, latitude: number): { u: number; v: number } {
  const u = clampToUnit((longitude - LNG_MIN) / (LNG_MAX - LNG_MIN));
  const v = clampToUnit(1 - (latitude - LAT_MIN) / (LAT_MAX - LAT_MIN));
  return { u, v };
}

interface UvToCurvedWorldParams {
  u: number;
  v: number;
  radius: number;
  arcSpan: number;
  mapHeight: number;
}

export function uvToCurvedWorld(params: UvToCurvedWorldParams): THREE.Vector3 {
  const { u, v, radius, arcSpan, mapHeight } = params;
  // Flat map lying horizontally on XZ plane
  // x: left-right (longitude: 73 west to 135 east), y: 0 (flat on ground), z: front-back (latitude)
  const x = (u - 0.5) * radius * 2;
  const z = (v - 0.5) * mapHeight;
  const y = 0;
  return new THREE.Vector3(x, y, z);
}

export function estimateCurvedNormal(u: number, arcSpan: number): THREE.Vector3 {
  // Flat map, normal points up
  return new THREE.Vector3(0, 1, 0);
}
