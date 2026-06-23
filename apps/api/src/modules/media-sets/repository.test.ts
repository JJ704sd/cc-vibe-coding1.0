import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetPool = vi.hoisted(() => vi.fn());

const mockConnection = vi.hoisted(() => ({
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  release: vi.fn(),
  query: vi.fn(),
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

const { createMediaSetRepository } = await import('./repository.js');

describe('media-set repository - reorderMediaImages', () => {
  beforeEach(() => {
    mockGetPool.mockReset();
    mockConnection.beginTransaction.mockClear().mockResolvedValue(undefined);
    mockConnection.commit.mockClear().mockResolvedValue(undefined);
    mockConnection.rollback.mockClear().mockResolvedValue(undefined);
    mockConnection.release.mockClear();
    mockConnection.query.mockReset();
    mockConnection.execute.mockClear().mockResolvedValue([{ affectedRows: 1 }, undefined]);
  });

  it('rewrites sort_order inside a transaction using an offset-shift to avoid unique collisions', async () => {
    mockConnection.query
      .mockResolvedValueOnce([
        [
          { id: 'img-1', sort_order: 0 },
          { id: 'img-2', sort_order: 1 },
          { id: 'img-3', sort_order: 2 },
        ],
        [],
      ])
      .mockResolvedValueOnce([
        [
          { id: 'img-3', media_set_id: 'ms-1', upload_file_id: 'u-3', alt_text: '', caption: '', sort_order: 0, latitude: null, longitude: null, created_at: '', updated_at: '' },
          { id: 'img-1', media_set_id: 'ms-1', upload_file_id: 'u-1', alt_text: '', caption: '', sort_order: 1, latitude: null, longitude: null, created_at: '', updated_at: '' },
          { id: 'img-2', media_set_id: 'ms-1', upload_file_id: 'u-2', alt_text: '', caption: '', sort_order: 2, latitude: null, longitude: null, created_at: '', updated_at: '' },
        ],
        [],
      ]);
    mockGetPool.mockReturnValue(buildMockPool());

    const repository = createMediaSetRepository();
    const result = await repository.reorderMediaImages({
      mediaSetId: 'ms-1',
      imageIds: ['img-3', 'img-1', 'img-2'],
    });

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).toHaveBeenCalledTimes(1);
    expect(mockConnection.rollback).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);

    // Phase 1: shift by offset (3) — single UPDATE
    const executeCalls = mockConnection.execute.mock.calls.map(([sql, params]) => ({ sql, params }));
    const shift = executeCalls.find((c) => c.sql === 'UPDATE media_image SET sort_order = sort_order + ? WHERE media_set_id = ?');
    expect(shift).toBeDefined();
    expect(shift?.params).toEqual([3, 'ms-1']);

    // Phase 2: three per-image UPDATEs with new sort_order = index
    const rewriteCalls = executeCalls.filter((c) => c.sql === 'UPDATE media_image SET sort_order = ? WHERE id = ? AND media_set_id = ?');
    expect(rewriteCalls).toHaveLength(3);
    expect(rewriteCalls[0]?.params).toEqual([0, 'img-3', 'ms-1']);
    expect(rewriteCalls[1]?.params).toEqual([1, 'img-1', 'ms-1']);
    expect(rewriteCalls[2]?.params).toEqual([2, 'img-2', 'ms-1']);

    expect(result.map((r) => r.id)).toEqual(['img-3', 'img-1', 'img-2']);
  });

  it('rolls back when a per-image UPDATE fails and rethrows the error', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 'img-1', sort_order: 0 }], []])
      .mockResolvedValueOnce([[], []]);
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // shift
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // first rewrite
      .mockRejectedValueOnce(new Error('deadlock')); // second rewrite fails

    mockGetPool.mockReturnValue(buildMockPool());
    const repository = createMediaSetRepository();

    await expect(
      repository.reorderMediaImages({
        mediaSetId: 'ms-1',
        imageIds: ['img-2', 'img-1', 'img-3'],
      }),
    ).rejects.toThrow('deadlock');

    expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });

  it('does not run the shift UPDATE when the media set has no images', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []]);
    mockGetPool.mockReturnValue(buildMockPool());
    const repository = createMediaSetRepository();

    const result = await repository.reorderMediaImages({
      mediaSetId: 'ms-1',
      imageIds: [],
    });

    const shiftCall = mockConnection.execute.mock.calls.find(([sql]) => sql === 'UPDATE media_image SET sort_order = sort_order + ? WHERE media_set_id = ?');
    expect(shiftCall).toBeUndefined();
    expect(result).toEqual([]);
    expect(mockConnection.commit).toHaveBeenCalledTimes(1);
  });
});