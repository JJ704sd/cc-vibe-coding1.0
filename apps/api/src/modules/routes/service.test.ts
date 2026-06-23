import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteService } from './service.js';

const mockGetPool = vi.hoisted(() => vi.fn());
const mockQueryOne = vi.hoisted(() => vi.fn());

const buildMockPool = () => ({
  query: vi.fn(),
  queryOne: mockQueryOne,
  execute: vi.fn(),
  getConnection: vi.fn(),
  persist: vi.fn().mockResolvedValue(undefined),
});

vi.mock('../../infrastructure/db/db.js', () => ({
  getPool: mockGetPool,
  initDb: vi.fn(),
}));

vi.mock('../../infrastructure/db/helpers.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../infrastructure/db/helpers.js')>();
  return {
    ...actual,
    getPool: mockGetPool,
  };
});

const { createRouteRepository } = await import('./repository.js');

describe('RouteService - cascadePreview', () => {
  beforeEach(() => {
    mockGetPool.mockReset();
    mockQueryOne.mockReset();
    mockGetPool.mockReturnValue(buildMockPool());
  });

  it('returns null when the route does not exist', async () => {
    const repository = createRouteRepository();
    repository.findById = vi.fn().mockResolvedValue(null);

    const service = new RouteService(repository);
    const result = await service.cascadePreview('missing');

    expect(result).toBeNull();
  });

  it('counts route_location rows for the route', async () => {
    const repository = createRouteRepository();
    repository.findById = vi.fn().mockResolvedValue({
      id: 'route-1',
      project_id: 'p-1',
      name: 'Loop',
      description: '',
      line_style: 'solid',
      color: '#000',
      is_featured: 0,
      created_at: '',
      updated_at: '',
    });
    repository.countRouteLocationsByRouteId = vi.fn().mockResolvedValue(3);

    const service = new RouteService(repository);
    const result = await service.cascadePreview('route-1');

    expect(repository.countRouteLocationsByRouteId).toHaveBeenCalledWith('route-1');
    expect(result).toEqual({
      route: { id: 'route-1', name: 'Loop' },
      willDelete: { routeLocations: 3 },
    });
  });
});