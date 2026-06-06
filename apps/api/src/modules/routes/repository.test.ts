import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetPool = vi.hoisted(() => vi.fn());

const mockConnection = vi.hoisted(() => ({
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, undefined]),
}));

const buildMockPool = () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  getConnection: vi.fn().mockResolvedValue(mockConnection),
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
