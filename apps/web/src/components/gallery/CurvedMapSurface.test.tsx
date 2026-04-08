import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CurvedMapSurface } from './CurvedMapSurface';
import * as THREE from 'three';

describe('CurvedMapSurface', () => {
  it('renders without crashing', () => {
    const onSamplerReady = vi.fn();
    render(<CurvedMapSurface onSamplerReady={onSamplerReady} />);
    expect(onSamplerReady).toHaveBeenCalled();
  });

  it('calls onSamplerReady with a valid sampler', () => {
    const onSamplerReady = vi.fn();
    render(<CurvedMapSurface onSamplerReady={onSamplerReady} />);

    expect(onSamplerReady).toHaveBeenCalledTimes(1);
    const sampler = onSamplerReady.mock.calls[0][0];

    expect(typeof sampler.getUvAt).toBe('function');
    expect(typeof sampler.getPointAt).toBe('function');
    expect(typeof sampler.getNormalAt).toBe('function');
  });

  it('getUvAt returns u and v coordinates', () => {
    const onSamplerReady = vi.fn();
    render(<CurvedMapSurface onSamplerReady={onSamplerReady} />);

    const sampler = onSamplerReady.mock.calls[0][0];
    const uv = sampler.getUvAt(104, 36);

    expect(uv).toHaveProperty('u');
    expect(uv).toHaveProperty('v');
    expect(uv.u).toBeGreaterThanOrEqual(0);
    expect(uv.u).toBeLessThanOrEqual(1);
    expect(uv.v).toBeGreaterThanOrEqual(0);
    expect(uv.v).toBeLessThanOrEqual(1);
  });

  it('getPointAt returns a THREE.Vector3', () => {
    const onSamplerReady = vi.fn();
    render(<CurvedMapSurface onSamplerReady={onSamplerReady} />);

    const sampler = onSamplerReady.mock.calls[0][0];
    const point = sampler.getPointAt(104, 36);

    expect(point).toBeInstanceOf(THREE.Vector3);
  });

  it('getNormalAt returns a THREE.Vector3 with unit length', () => {
    const onSamplerReady = vi.fn();
    render(<CurvedMapSurface onSamplerReady={onSamplerReady} />);

    const sampler = onSamplerReady.mock.calls[0][0];
    const normal = sampler.getNormalAt(104, 36);

    expect(normal).toBeInstanceOf(THREE.Vector3);
    expect(normal.length()).toBeCloseTo(1, 5);
  });

  it('accepts textureUrl prop without error (v1 ignores it)', () => {
    const onSamplerReady = vi.fn();
    render(
      <CurvedMapSurface
        onSamplerReady={onSamplerReady}
        textureUrl="https://example.com/texture.png"
      />
    );
    expect(onSamplerReady).toHaveBeenCalled();
  });
});
