import { describe, expect, it } from 'vitest';
import type { MediaImage } from '@/types/domain';

describe('MediaImage type', () => {
  it('has latitude and longitude fields', () => {
    const image: MediaImage = {
      id: 'test',
      mediaSetId: 'test',
      url: 'https://example.com/img.jpg',
      thumbnailUrl: '',
      altText: '',
      caption: '',
      sortOrder: 1,
      latitude: 31.2401,
      longitude: 121.4903,
      createdAt: new Date().toISOString(),
    };
    expect(image.latitude).toBe(31.2401);
    expect(image.longitude).toBe(121.4903);
  });

  it('latitude and longitude are optional', () => {
    const image: MediaImage = {
      id: 'test',
      mediaSetId: 'test',
      url: 'https://example.com/img.jpg',
      thumbnailUrl: '',
      altText: '',
      caption: '',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
    };
    expect(image.latitude).toBeUndefined();
    expect(image.longitude).toBeUndefined();
  });
});
