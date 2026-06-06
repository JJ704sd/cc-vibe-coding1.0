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

/**
 * Build a small canvas-painted texture used as a fallback when the real
 * image URL fails to load. The placeholder reads as a quiet dark square
 * with a single diagonal hairline so cards never disappear into a
 * transparent black hole on broken uploads.
 */
export function createPlaceholderTexture(
  width = 64,
  height = 64,
  fill = 'rgba(40, 46, 60, 0.85)',
  stroke = 'rgba(150, 165, 200, 0.4)',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (context) {
    context.fillStyle = fill;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(width, height);
    context.moveTo(width, 0);
    context.lineTo(0, height);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

interface CardOpacityParams {
  /** Distance between the card and the camera, in world units. */
  distance: number;
  /** World distance at which the card is fully visible. */
  fadeStart?: number;
  /** World distance past which the card fades to nothing. */
  fadeEnd?: number;
  /** 0..1 progress of the entry animation; 0 = not yet entered, 1 = settled. */
  entry: number;
  /** Whether the card is currently hovered by the pointer. */
  isHovered?: boolean;
  /** Opacity used for a fully visible, settled, non-hovered card. */
  baseOpacity?: number;
}

const DEFAULT_FADE_START = 1000;
const DEFAULT_FADE_END = 4000;
const HOVER_BOOST = 0.18;
const MAX_OPACITY = 1;

/**
 * Compute the alpha a card material should use for the current frame.
 * The result composes four signals so the curve stays continuous: a base
 * brightness, a hover boost, a distance falloff, and an entry fade.
 */
export function computeCardOpacity({
  distance,
  fadeStart = DEFAULT_FADE_START,
  fadeEnd = DEFAULT_FADE_END,
  entry,
  isHovered = false,
  baseOpacity = 0.92,
}: CardOpacityParams): number {
  if (entry <= 0) return 0;

  const span = Math.max(1, fadeEnd - fadeStart);
  const fade = clampToUnit((distance - fadeStart) / span);
  const distanceAlpha = 1 - fade * 0.75;
  const hoverAlpha = isHovered ? 1 + HOVER_BOOST : 1;
  const opacity = baseOpacity * distanceAlpha * entry * hoverAlpha;

  return clampToUnit(opacity / MAX_OPACITY) * MAX_OPACITY;
}
