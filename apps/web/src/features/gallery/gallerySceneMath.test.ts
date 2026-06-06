import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  clampToUnit,
  computeCardOpacity,
  createPlaceholderTexture,
  estimateCurvedNormal,
  lngLatToUv,
  uvToCurvedWorld,
} from './gallerySceneMath.js';

describe('clampToUnit', () => {
  it('clamps values to the [0, 1] interval', () => {
    expect(clampToUnit(0.5)).toBe(0.5);
    expect(clampToUnit(-0.3)).toBe(0);
    expect(clampToUnit(1.7)).toBe(1);
  });
});

describe('lngLatToUv', () => {
  it('returns the south-west corner for the minimum longitude and latitude', () => {
    const uv = lngLatToUv(73, 18);
    expect(uv.u).toBe(0);
    expect(uv.v).toBeCloseTo(1, 6);
  });

  it('returns the north-east corner for the maximum longitude and latitude', () => {
    const uv = lngLatToUv(135, 54);
    expect(uv.u).toBe(1);
    expect(uv.v).toBeCloseTo(0, 6);
  });

  it('clamps out-of-range coordinates to the boundary', () => {
    const uv = lngLatToUv(0, 80);
    expect(uv.u).toBe(0);
    expect(uv.v).toBe(0);
  });
});

describe('uvToCurvedWorld', () => {
  it('returns a flat map lying on the XZ plane (y = 0)', () => {
    const point = uvToCurvedWorld({ u: 0.5, v: 0.5, radius: 1000, arcSpan: Math.PI, mapHeight: 800 });
    expect(point.y).toBe(0);
  });
});

describe('estimateCurvedNormal', () => {
  it('returns an upward normal for the flat map', () => {
    const normal = estimateCurvedNormal(0.3, Math.PI);
    expect(normal.y).toBe(1);
  });
});

describe('createPlaceholderTexture', () => {
  it('returns a CanvasTexture backed by a painted canvas', () => {
    const texture = createPlaceholderTexture();
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    expect(texture.image).toBeInstanceOf(HTMLCanvasElement);
  });

  it('respects the requested size', () => {
    const texture = createPlaceholderTexture(32, 48);
    const canvas = texture.image as HTMLCanvasElement;
    expect(canvas.width).toBe(32);
    expect(canvas.height).toBe(48);
  });
});

describe('computeCardOpacity', () => {
  it('is zero before the entry animation starts', () => {
    expect(computeCardOpacity({ distance: 1500, entry: 0 })).toBe(0);
  });

  it('is at the base opacity when the card is fully entered at the fade boundary', () => {
    const opacity = computeCardOpacity({ distance: 1000, entry: 1 });
    expect(opacity).toBeCloseTo(0.92, 5);
  });

  it('boosts the opacity when the card is hovered', () => {
    const resting = computeCardOpacity({ distance: 1500, entry: 1, isHovered: false });
    const hovered = computeCardOpacity({ distance: 1500, entry: 1, isHovered: true });
    expect(hovered).toBeGreaterThan(resting);
  });

  it('falls off with distance and never goes above the boost ceiling', () => {
    const close = computeCardOpacity({ distance: 1000, entry: 1, isHovered: true });
    const far = computeCardOpacity({ distance: 4000, entry: 1, isHovered: true });
    expect(far).toBeLessThan(close);
    expect(close).toBeLessThanOrEqual(1);
  });

  it('returns 0 when the entry has not started even if the card is hovered', () => {
    expect(computeCardOpacity({ distance: 1500, entry: 0, isHovered: true })).toBe(0);
  });
});
