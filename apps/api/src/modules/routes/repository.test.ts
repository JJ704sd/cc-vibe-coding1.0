import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetPool = vi.hoisted(() => vi.fn());

const mockConnection = vi.hoisted(() => ({
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, undefined]),
}));

const buildMockPool = () => {
  const pool = {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(undefined),
    getConnection: vi.fn().mockResolvedValue(mockConnection),
    persist: vi.fn().mockResolvedValue(undefined),
  };
  return pool;
};

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

describe('route repository - replaceRouteLocations', () => {
  beforeEach(() => {
    mockGetPool.mockReset();
    mockConnection.beginTransaction.mockClear().mockResolvedValue(undefined);
    mockConnection.commit.mockClear().mockResolvedValue(undefined);
    mockConnection.rollback.mockClear().mockResolvedValue(undefined);
    mockConnection.release.mockClear();
    mockConnection.execute.mockClear().mockResolvedValue([{ affectedRows: 1 }, undefined]);
  });

  it('wraps the delete-and-insert sequence in a transaction that commits on success', async () => {
    mockGetPool.mockReturnValue(buildMockPool());
    const repository = createRouteRepository();

    await repository.replaceRouteLocations('route-1', ['loc-a', 'loc-b']);

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).toHaveBeenCalledTimes(1);
    expect(mockConnection.rollback).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);

    const executedSql = mockConnection.execute.mock.calls.map(([sql]) => sql);
    expect(executedSql[0]).toBe('DELETE FROM route_location WHERE route_id = ?');
    expect(executedSql.filter((sql) => sql.startsWith('INSERT INTO route_location'))).toHaveLength(2);
  });

  it('rolls back the transaction when an INSERT fails and rethrows the error', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // DELETE
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // first INSERT
      .mockRejectedValueOnce(new Error('duplicate key')); // second INSERT fails
    mockGetPool.mockReturnValue(buildMockPool());
    const repository = createRouteRepository();

    await expect(
      repository.replaceRouteLocations('route-1', ['loc-a', 'loc-b', 'loc-c']),
    ).rejects.toThrow('duplicate key');

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back the transaction when the DELETE itself fails', async () => {
    mockConnection.execute.mockReset();
    mockConnection.execute.mockRejectedValue(new Error('connection lost'));
    mockGetPool.mockReturnValue(buildMockPool());
    const repository = createRouteRepository();

    await expect(
      repository.replaceRouteLocations('route-1', ['loc-a']),
    ).rejects.toThrow('connection lost');

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });
});

describe('route repository - createRouteWithLocations', () => {
  beforeEach(() => {
    mockGetPool.mockReset();
    mockConnection.beginTransaction.mockClear().mockResolvedValue(undefined);
    mockConnection.commit.mockClear().mockResolvedValue(undefined);
    mockConnection.rollback.mockClear().mockResolvedValue(undefined);
    mockConnection.release.mockClear();
    mockConnection.execute.mockClear().mockResolvedValue([{ affectedRows: 1 }, undefined]);
  });

  it('inserts the route and every route_location in a single transaction', async () => {
    const pool = buildMockPool();
    pool.queryOne
      .mockResolvedValueOnce({ id: 'route-1' } as any) // route read-back
      .mockResolvedValueOnce(null);
    pool.query.mockResolvedValueOnce([ // route_location read-back
      { route_id: 'route-1', location_id: 'loc-a', sort_order: 0 },
      { route_id: 'route-1', location_id: 'loc-b', sort_order: 1 },
    ] as any);
    mockGetPool.mockReturnValue(pool);
    const repository = createRouteRepository();

    const result = await repository.createRouteWithLocations({
      id: 'route-1',
      project_id: 'p-1',
      name: 'Loop',
      description: 'd',
      line_style: 'solid',
      color: '#000',
      is_featured: 0,
      created_at: '2026-01-01 00:00:00',
      updated_at: '2026-01-01 00:00:00',
      location_ids: ['loc-a', 'loc-b'],
    });

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).toHaveBeenCalledTimes(1);
    expect(mockConnection.rollback).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);

    const executedSql = mockConnection.execute.mock.calls.map(([sql]) => sql);
    expect(executedSql[0]).toMatch(/^INSERT INTO route /);
    expect(executedSql.filter((sql) => sql.startsWith('INSERT INTO route_location'))).toHaveLength(2);

    // The transaction must run on the dedicated connection, not the pool.
    expect(mockConnection.execute).toHaveBeenCalled();
    expect(pool.execute).not.toHaveBeenCalled();

    expect(result.id).toBe('route-1');
    expect(result.locations).toHaveLength(2);
  });

  it('rolls back when the route insert fails so no route_location row is left dangling', async () => {
    mockConnection.execute.mockReset();
    mockConnection.execute.mockRejectedValueOnce(new Error('constraint violated'));
    mockGetPool.mockReturnValue(buildMockPool());
    const repository = createRouteRepository();

    await expect(
      repository.createRouteWithLocations({
        id: 'route-1',
        project_id: 'p-1',
        name: 'Loop',
        description: 'd',
        line_style: 'solid',
        color: '#000',
        is_featured: 0,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-01 00:00:00',
        location_ids: ['loc-a', 'loc-b'],
      }),
    ).rejects.toThrow('constraint violated');

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });
});

describe('route repository - updateRouteWithLocations', () => {
  beforeEach(() => {
    mockGetPool.mockReset();
    mockConnection.beginTransaction.mockClear().mockResolvedValue(undefined);
    mockConnection.commit.mockClear().mockResolvedValue(undefined);
    mockConnection.rollback.mockClear().mockResolvedValue(undefined);
    mockConnection.release.mockClear();
    mockConnection.execute.mockClear().mockResolvedValue([{ affectedRows: 1 }, undefined]);
  });

  it('updates the route and atomically swaps its location links when location_ids is provided', async () => {
    const pool = buildMockPool();
    pool.queryOne.mockResolvedValueOnce({ id: 'route-1' } as any).mockResolvedValueOnce(null);
    pool.query.mockResolvedValueOnce([
      { route_id: 'route-1', location_id: 'loc-b', sort_order: 0 },
      { route_id: 'route-1', location_id: 'loc-c', sort_order: 1 },
    ] as any);
    mockGetPool.mockReturnValue(pool);
    const repository = createRouteRepository();

    const result = await repository.updateRouteWithLocations({
      id: 'route-1',
      name: 'Renamed',
      description: null,
      line_style: null,
      color: null,
      is_featured: null,
      updated_at: '2026-01-01 00:00:00',
      location_ids: ['loc-b', 'loc-c'],
    });

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).toHaveBeenCalledTimes(1);
    expect(mockConnection.rollback).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);

    const executedSql = mockConnection.execute.mock.calls.map(([sql]) => sql);
    expect(executedSql[0]).toMatch(/^UPDATE route SET/);
    expect(executedSql).toContain('DELETE FROM route_location WHERE route_id = ?');
    expect(executedSql.filter((sql) => sql.startsWith('INSERT INTO route_location'))).toHaveLength(2);

    expect(result.id).toBe('route-1');
    expect(result.locations).toHaveLength(2);
  });

  it('leaves the location link set untouched when location_ids is null', async () => {
    const pool = buildMockPool();
    pool.queryOne.mockResolvedValueOnce({ id: 'route-1' } as any).mockResolvedValueOnce(null);
    pool.query.mockResolvedValueOnce([] as any);
    mockGetPool.mockReturnValue(pool);
    const repository = createRouteRepository();

    await repository.updateRouteWithLocations({
      id: 'route-1',
      name: 'Renamed',
      description: null,
      line_style: null,
      color: null,
      is_featured: null,
      updated_at: '2026-01-01 00:00:00',
      location_ids: null,
    });

    const executedSql = mockConnection.execute.mock.calls.map(([sql]) => sql);
    expect(executedSql[0]).toMatch(/^UPDATE route SET/);
    // Critical: no DELETE or INSERT for route_location when caller passes null.
    expect(executedSql.some((sql) => sql.startsWith('DELETE FROM route_location'))).toBe(false);
    expect(executedSql.some((sql) => sql.startsWith('INSERT INTO route_location'))).toBe(false);
    expect(mockConnection.commit).toHaveBeenCalledTimes(1);
  });

  it('rolls back when the UPDATE fails so partial route + new links never commit', async () => {
    mockConnection.execute.mockReset();
    mockConnection.execute.mockRejectedValueOnce(new Error('connection reset'));
    mockGetPool.mockReturnValue(buildMockPool());
    const repository = createRouteRepository();

    await expect(
      repository.updateRouteWithLocations({
        id: 'route-1',
        name: 'Renamed',
        description: null,
        line_style: null,
        color: null,
        is_featured: null,
        updated_at: '2026-01-01 00:00:00',
        location_ids: ['loc-b'],
      }),
    ).rejects.toThrow('connection reset');

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });
});

describe('route repository - findLocationsByIdsAndProject', () => {
  beforeEach(() => {
    mockGetPool.mockReset();
  });

  it('issues a single SELECT with one placeholder per id plus the project id', async () => {
    const pool = buildMockPool();
    pool.query.mockResolvedValueOnce([{ id: 'loc-a' }, { id: 'loc-b' }] as any);
    mockGetPool.mockReturnValue(pool);
    const repository = createRouteRepository();

    const result = await repository.findLocationsByIdsAndProject(['loc-a', 'loc-b'], 'p-1');

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toBe('SELECT id FROM location WHERE id IN (?,?) AND project_id = ?');
    expect(params).toEqual(['loc-a', 'loc-b', 'p-1']);
    expect(result).toEqual([{ id: 'loc-a' }, { id: 'loc-b' }]);
  });

  it('short-circuits without hitting the pool when no ids are requested', async () => {
    const pool = buildMockPool();
    mockGetPool.mockReturnValue(pool);
    const repository = createRouteRepository();

    const result = await repository.findLocationsByIdsAndProject([], 'p-1');

    expect(result).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
