import { describe, expect, it, vi } from 'vitest';
import { runInTransaction } from './runInTransaction';

describe('runInTransaction', () => {
  it('commits successful work', async () => {
    const calls: string[] = [];
    const connection = {
      beginTransaction: vi.fn(async () => calls.push('begin')),
      commit: vi.fn(async () => calls.push('commit')),
      rollback: vi.fn(async () => calls.push('rollback')),
      release: vi.fn(() => calls.push('release')),
    };

    const pool = {
      getConnection: vi.fn(async () => connection),
    };

    const result = await runInTransaction(pool as never, async () => 'done');

    expect(result).toBe('done');
    expect(calls).toEqual(['begin', 'commit', 'release']);
  });
});
