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

const baseRouteRow = {
  id: 'route-1',
  project_id: 'p-1',
  name: 'Loop',
  description: '',
  line_style: 'solid',
  color: '#000',
  is_featured: 0,
  created_at: '',
  updated_at: '',
};

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
    repository.findById = vi.fn().mockResolvedValue(baseRouteRow);
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

describe('RouteService - create', () => {
  beforeEach(() => {
    mockGetPool.mockReset();
    mockQueryOne.mockReset();
    mockGetPool.mockReturnValue(buildMockPool());
  });

  it('rejects when required fields are missing', async () => {
    const service = new RouteService(createRouteRepository());

    await expect(
      service.create({ project_id: '', name: 'n', description: 'd', line_style: 'solid', color: '#000' }),
    ).rejects.toMatchObject({ message: expect.stringContaining('required'), statusCode: 400 });
  });

  it('rejects invalid line_style', async () => {
    const service = new RouteService(createRouteRepository());

    await expect(
      service.create({ project_id: 'p-1', name: 'n', description: 'd', line_style: 'wavy', color: '#000' }),
    ).rejects.toMatchObject({ message: expect.stringContaining("'solid' or 'dashed'"), statusCode: 400 });
  });

  it('rejects when the project does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null); // project lookup
    const service = new RouteService(createRouteRepository());

    await expect(
      service.create({ project_id: 'missing', name: 'n', description: 'd', line_style: 'solid', color: '#000' }),
    ).rejects.toMatchObject({ message: expect.stringContaining('project_id not found'), statusCode: 400 });
  });

  it('rejects when any location_id does not belong to the project (single batched lookup)', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 'p-1' }); // project exists
    const repository = createRouteRepository();
    // Batch returns only 1 of the 2 ids → mismatch → reject.
    repository.findLocationsByIdsAndProject = vi.fn().mockResolvedValue([{ id: 'loc-a' }]);
    const service = new RouteService(repository);

    await expect(
      service.create({
        project_id: 'p-1',
        name: 'n',
        description: 'd',
        line_style: 'solid',
        color: '#000',
        location_ids: ['loc-a', 'loc-b'],
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining('location_ids'), statusCode: 400 });

    expect(repository.findLocationsByIdsAndProject).toHaveBeenCalledWith(['loc-a', 'loc-b'], 'p-1');
  });

  it('delegates to the transactional repository method on success and does not touch the pool directly', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 'p-1' });
    const repository = createRouteRepository();
    repository.findLocationsByIdsAndProject = vi.fn().mockResolvedValue([{ id: 'loc-a' }, { id: 'loc-b' }]);
    repository.createRouteWithLocations = vi.fn().mockResolvedValue({
      ...baseRouteRow,
      locations: [
        { route_id: 'route-1', location_id: 'loc-a', sort_order: 0 },
        { route_id: 'route-1', location_id: 'loc-b', sort_order: 1 },
      ],
    });
    const service = new RouteService(repository);

    const result = await service.create({
      project_id: 'p-1',
      name: 'Loop',
      description: 'desc',
      line_style: 'solid',
      color: '#000',
      is_featured: true,
      location_ids: ['loc-a', 'loc-b'],
    });

    expect(repository.createRouteWithLocations).toHaveBeenCalledTimes(1);
    const call = repository.createRouteWithLocations.mock.calls[0][0];
    expect(call.location_ids).toEqual(['loc-a', 'loc-b']);
    expect(call.is_featured).toBe(1);
    expect(call.id).toMatch(/[0-9a-f-]{36}/);
    expect(result.id).toBe('route-1');
    expect(result.locations).toHaveLength(2);
  });
});

describe('RouteService - update', () => {
  beforeEach(() => {
    mockGetPool.mockReset();
    mockQueryOne.mockReset();
    mockGetPool.mockReturnValue(buildMockPool());
  });

  it('returns null when the route does not exist', async () => {
    const repository = createRouteRepository();
    repository.findById = vi.fn().mockResolvedValue(null);
    const service = new RouteService(repository);

    const result = await service.update('missing', { name: 'x' });
    expect(result).toBeNull();
  });

  it('rejects invalid line_style before touching the repository', async () => {
    const repository = createRouteRepository();
    repository.findById = vi.fn().mockResolvedValue(baseRouteRow);
    const service = new RouteService(repository);

    await expect(
      service.update('route-1', { line_style: 'dotted' }),
    ).rejects.toMatchObject({ message: expect.stringContaining("'solid' or 'dashed'"), statusCode: 400 });
  });

  it('passes null for location_ids when caller omits it, leaving the link set untouched', async () => {
    const repository = createRouteRepository();
    repository.findById = vi.fn().mockResolvedValue(baseRouteRow);
    repository.updateRouteWithLocations = vi.fn().mockResolvedValue({
      ...baseRouteRow,
      name: 'Renamed',
      locations: [],
    });
    const service = new RouteService(repository);

    await service.update('route-1', { name: 'Renamed' });

    const call = repository.updateRouteWithLocations.mock.calls[0][0];
    expect(call.name).toBe('Renamed');
    expect(call.location_ids).toBeNull();
  });

  it('forwards the new location_ids array so the repository swaps links atomically', async () => {
    const repository = createRouteRepository();
    repository.findById = vi.fn().mockResolvedValue(baseRouteRow);
    repository.updateRouteWithLocations = vi.fn().mockResolvedValue({
      ...baseRouteRow,
      locations: [
        { route_id: 'route-1', location_id: 'loc-x', sort_order: 0 },
        { route_id: 'route-1', location_id: 'loc-y', sort_order: 1 },
      ],
    });
    const service = new RouteService(repository);

    const result = await service.update('route-1', { location_ids: ['loc-x', 'loc-y'] });

    const call = repository.updateRouteWithLocations.mock.calls[0][0];
    expect(call.location_ids).toEqual(['loc-x', 'loc-y']);
    expect(call.name).toBeNull();
    expect(result.locations.map((l) => l.location_id)).toEqual(['loc-x', 'loc-y']);
  });
});