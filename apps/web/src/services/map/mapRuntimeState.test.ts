import { describe, expect, it } from 'vitest';
import { shouldInitializeInteractiveMap } from '@/services/map/mapRuntimeState';

describe('shouldInitializeInteractiveMap', () => {
  it('returns true only when container exists, token is ready, and no map instance exists', () => {
    expect(
      shouldInitializeInteractiveMap({
        hasContainer: true,
        tokenReady: true,
        hasMapInstance: false,
      }),
    ).toBe(true);
  });

  it('returns false when token is missing', () => {
    expect(
      shouldInitializeInteractiveMap({
        hasContainer: true,
        tokenReady: false,
        hasMapInstance: false,
      }),
    ).toBe(false);
  });

  it('returns false when map is already initialized', () => {
    expect(
      shouldInitializeInteractiveMap({
        hasContainer: true,
        tokenReady: true,
        hasMapInstance: true,
      }),
    ).toBe(false);
  });

  it('returns false when container is missing', () => {
    expect(
      shouldInitializeInteractiveMap({
        hasContainer: false,
        tokenReady: true,
        hasMapInstance: false,
      }),
    ).toBe(false);
  });
});
