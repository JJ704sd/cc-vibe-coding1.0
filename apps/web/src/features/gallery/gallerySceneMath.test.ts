import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  clampToUnit,
  estimateCurvedNormal,
  lngLatToUv,
  uvToCurvedWorld,
} from './gallerySceneMath';

describe('gallerySceneMath', () => {
  it('clamps values to the unit interval', () => {
    expect(clampToUnit(-0.25)).toBe(0);
    expect(clampToUnit(0.25)).toBe(0.25);
    expect(clampToUnit(1.75)).toBe(1);
  });

  it('converts longitude and latitude into clamped UV coordinates', () => {
    expect(lngLatToUv(73, 54)).toEqual({ u: 0, v: 0 });
    expect(lngLatToUv(104, 36)).toEqual({
      u: expect.closeTo(0.5, 5),
      v: expect.closeTo(0.5, 5),
    });
    expect(lngLatToUv(140, 10)).toEqual({ u: 1, v: 1 });
  });

  it('maps UVs onto the flat map plane around the origin', () => {
    const world = uvToCurvedWorld({
      u: 0.5,
      v: 0.5,
      radius: 100,
      arcSpan: Math.PI,
      mapHeight: 200,
    });

    expect(world).toBeInstanceOf(THREE.Vector3);
    expect(world.x).toBeCloseTo(0, 6);
    expect(world.y).toBeCloseTo(0, 6);
    expect(world.z).toBeCloseTo(0, 6);
  });

  it('returns an upward normal for the flat map plane', () => {
    const normal = estimateCurvedNormal(0.5, Math.PI);

    expect(normal).toBeInstanceOf(THREE.Vector3);
    expect(normal.length()).toBeCloseTo(1, 6);
    expect(normal.x).toBeCloseTo(0, 6);
    expect(normal.y).toBeCloseTo(1, 6);
    expect(normal.z).toBeCloseTo(0, 6);
  });
});
