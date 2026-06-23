import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationService } from './service.js';
import type { LocationRow } from './types.js';

const baseLocation = (id: string, name: string): LocationRow => ({
  id,
  project_id: 'p-1',
  name,
  slug: name.toLowerCase(),
  description: '',
  latitude: '0',
  longitude: '0',
  address_text: '',
  visit_order: null,
  created_at: '',
  updated_at: '',
});

describe('LocationService - cascadePreview', () => {
  let repository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByProjectId: ReturnType<typeof vi.fn>;
    insertLocation: ReturnType<typeof vi.fn>;
    updateLocation: ReturnType<typeof vi.fn>;
    deleteLocation: ReturnType<typeof vi.fn>;
    findProjectById: ReturnType<typeof vi.fn>;
    findBySlugInProject: ReturnType<typeof vi.fn>;
    countMediaSetsByLocationId: ReturnType<typeof vi.fn>;
    countMediaImagesByLocationId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByProjectId: vi.fn(),
      insertLocation: vi.fn(),
      updateLocation: vi.fn(),
      deleteLocation: vi.fn(),
      findProjectById: vi.fn(),
      findBySlugInProject: vi.fn(),
      countMediaSetsByLocationId: vi.fn(),
      countMediaImagesByLocationId: vi.fn(),
    };
  });

  it('returns null when the location does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    const service = new LocationService(repository);

    const result = await service.cascadePreview('missing');

    expect(result).toBeNull();
  });

  it('counts media sets and media images linked to this location', async () => {
    repository.findById.mockResolvedValue(baseLocation('loc-1', 'Park'));
    repository.countMediaSetsByLocationId.mockResolvedValue(2);
    repository.countMediaImagesByLocationId.mockResolvedValue(5);

    const service = new LocationService(repository);
    const result = await service.cascadePreview('loc-1');

    expect(result).toEqual({
      location: { id: 'loc-1', name: 'Park' },
      willDelete: { mediaSets: 2, mediaImages: 5 },
    });
  });
});