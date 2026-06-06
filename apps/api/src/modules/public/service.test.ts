import { describe, expect, it, vi } from 'vitest';
import { PublicService, toCoverImageUrl } from './service.js';

const buildRepository = () => ({
  listProjectsForPublic: vi.fn(),
  findProjectDetailByIdOrSlug: vi.fn(),
  findTagsByProjectId: vi.fn(),
  findTagsByProjectIds: vi.fn(),
  findLocationsByProjectId: vi.fn(),
  findMediaSetsByProjectId: vi.fn(),
  findRoutesByProjectId: vi.fn(),
  findRouteLocationsByRouteIds: vi.fn(),
  findMediaSetById: vi.fn(),
  findMediaImagesByMediaSetId: vi.fn(),
  findUploadFilesByIds: vi.fn(),
  getMapRelationshipSource: vi.fn(),
  findPublishedProjectCover: vi.fn(),
  findPublishedMediaSetCover: vi.fn(),
  findPublishedMediaImage: vi.fn(),
  findUploadFileById: vi.fn(),
});

const buildStorage = () => ({
  saveBuffer: vi.fn(),
  getFile: vi.fn(),
  deleteFile: vi.fn(),
});

describe('toCoverImageUrl', () => {
  it('returns the public uploads URL for a file id', () => {
    expect(toCoverImageUrl('file-1')).toBe('/api/public/uploads/file-1');
  });

  it('returns null when no file id is set', () => {
    expect(toCoverImageUrl(null)).toBeNull();
    expect(toCoverImageUrl(undefined)).toBeNull();
    expect(toCoverImageUrl('')).toBeNull();
  });
});

describe('PublicService cover image URL semantics', () => {
  it('returns a renderable URL on listProjects instead of the raw file id', async () => {
    const repository = buildRepository();
    repository.listProjectsForPublic.mockResolvedValue([
      {
        id: 'p-1',
        slug: 'p-1',
        title: 'P1',
        summary: '',
        cover_upload_file_id: 'file-1',
      },
      {
        id: 'p-2',
        slug: 'p-2',
        title: 'P2',
        summary: '',
        cover_upload_file_id: null,
      },
    ]);
    repository.findTagsByProjectIds.mockResolvedValue([]);

    const service = new PublicService(repository, buildStorage());
    const result = await service.listProjects();

    expect(result.items[0]?.coverImage).toBe('/api/public/uploads/file-1');
    expect(result.items[1]?.coverImage).toBeNull();
  });

  it('returns renderable URLs for project and media set covers in project detail', async () => {
    const repository = buildRepository();
    repository.findProjectDetailByIdOrSlug.mockResolvedValue({
      id: 'p-1',
      slug: 'p-1',
      title: 'P1',
      summary: '',
      description: '',
      cover_upload_file_id: 'file-project',
    });
    repository.findTagsByProjectId.mockResolvedValue([]);
    repository.findLocationsByProjectId.mockResolvedValue([]);
    repository.findMediaSetsByProjectId.mockResolvedValue([
      {
        id: 'ms-1',
        type: 'gallery',
        title: 'G1',
        description: '',
        cover_upload_file_id: 'file-mediaset',
        location_id: null,
        is_featured: 0,
      },
    ]);
    repository.findRoutesByProjectId.mockResolvedValue([]);

    const service = new PublicService(repository, buildStorage());
    const result = await service.getProjectDetail('p-1');

    expect(result.project.coverImage).toBe('/api/public/uploads/file-project');
    expect(result.mediaSets[0]?.coverImage).toBe('/api/public/uploads/file-mediaset');
  });

  it('returns a renderable URL on getMediaSet cover', async () => {
    const repository = buildRepository();
    repository.findMediaSetById.mockResolvedValue({
      id: 'ms-1',
      type: 'gallery',
      title: 'G1',
      description: '',
      cover_upload_file_id: 'file-cover',
      location_id: null,
      is_featured: 0,
    });
    repository.findMediaImagesByMediaSetId.mockResolvedValue([]);

    const service = new PublicService(repository, buildStorage());
    const result = await service.getMediaSet('ms-1');

    expect(result.coverImage).toBe('/api/public/uploads/file-cover');
  });

  it('returns renderable URLs on map relationship projects and media sets', async () => {
    const repository = buildRepository();
    repository.getMapRelationshipSource.mockResolvedValue({
      projects: [
        {
          id: 'p-1',
          title: 'P1',
          slug: 'p-1',
          summary: '',
          description: '',
          cover_upload_file_id: 'file-proj',
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
        },
      ],
      tags: [],
      locations: [],
      mediaSets: [
        {
          id: 'ms-1',
          project_id: 'p-1',
          location_id: null,
          type: 'gallery',
          title: 'G1',
          description: '',
          cover_upload_file_id: 'file-ms',
          is_featured: 0,
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
        },
      ],
      routes: [],
      routeLocations: [],
      mediaImages: [],
    });

    const service = new PublicService(repository, buildStorage());
    const result = await service.getMapRelationship();

    expect(result.projects[0]?.coverImage).toBe('/api/public/uploads/file-proj');
    expect(result.mediaSets[0]?.coverImage).toBe('/api/public/uploads/file-ms');
  });
});
