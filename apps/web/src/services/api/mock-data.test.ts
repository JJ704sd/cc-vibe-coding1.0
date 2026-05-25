import { describe, expect, it } from 'vitest';
import { mediaImages } from './mock-data';

describe('mock mediaImages', () => {
  it('some images have latitude and longitude', () => {
    const withCoords = mediaImages.filter(
      (img) => img.latitude !== undefined && img.longitude !== undefined,
    );
    expect(withCoords.length).toBeGreaterThan(0);
  });

  it('images without coordinates are also valid', () => {
    const withoutCoords = mediaImages.filter(
      (img) => img.latitude === undefined || img.longitude === undefined,
    );
    expect(withoutCoords.length).toBeGreaterThan(0);
  });
});
