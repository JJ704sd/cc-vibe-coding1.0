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
  const angle = -arcSpan / 2 + arcSpan * clampToUnit(u);
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const y = (0.5 - clampToUnit(v)) * mapHeight;
  return new THREE.Vector3(x, y, z);
}

export function estimateCurvedNormal(u: number, arcSpan: number): THREE.Vector3 {
  const angle = -arcSpan / 2 + arcSpan * clampToUnit(u);
  const normal = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
  return normal.normalize();
}
