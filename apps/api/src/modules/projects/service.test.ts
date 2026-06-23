import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectService } from './service.js';

describe('ProjectService - cascadePreview', () => {
  let repository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findBySlug: ReturnType<typeof vi.fn>;
    upsertProject: ReturnType<typeof vi.fn>;
    updateProject: ReturnType<typeof vi.fn>;
    deleteProject: ReturnType<typeof vi.fn>;
    findCoverFile: ReturnType<typeof vi.fn>;
    countLocationsByProjectId: ReturnType<typeof vi.fn>;
    countMediaSetsByProjectId: ReturnType<typeof vi.fn>;
    countMediaImagesByProjectId: ReturnType<typeof vi.fn>;
    countRoutesByProjectId: ReturnType<typeof vi.fn>;
    countRouteLocationsByProjectId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      upsertProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      findCoverFile: vi.fn(),
      countLocationsByProjectId: vi.fn(),
      countMediaSetsByProjectId: vi.fn(),
      countMediaImagesByProjectId: vi.fn(),
      countRoutesByProjectId: vi.fn(),
      countRouteLocationsByProjectId: vi.fn(),
    };
  });

  it('returns null when the project does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    const service = new ProjectService(repository);

    const result = await service.cascadePreview('missing');

    expect(result).toBeNull();
  });

  it('aggregates counts from all related entities', async () => {
    repository.findById.mockResolvedValue({
      id: 'p-1',
      title: 'My Project',
      slug: 'my-project',
      summary: '',
      description: '',
      coverUploadFileId: null,
      status: 'draft',
      createdAt: '',
      updatedAt: '',
      tags: [],
    });
    repository.countLocationsByProjectId.mockResolvedValue(2);
    repository.countMediaSetsByProjectId.mockResolvedValue(3);
    repository.countMediaImagesByProjectId.mockResolvedValue(7);
    repository.countRoutesByProjectId.mockResolvedValue(1);
    repository.countRouteLocationsByProjectId.mockResolvedValue(4);

    const service = new ProjectService(repository);
    const result = await service.cascadePreview('p-1');

    expect(result).toEqual({
      project: { id: 'p-1', title: 'My Project' },
      willDelete: { locations: 2, mediaSets: 3, mediaImages: 7, routes: 1, routeLocations: 4 },
    });
  });
});