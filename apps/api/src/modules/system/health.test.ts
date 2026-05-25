import { describe, expect, it, vi } from 'vitest';
import { createSystemHealthService } from './health.js';

describe('createSystemHealthService', () => {
  it('returns ready when database and upload storage are both available', async () => {
    const service = createSystemHealthService({
      pingDatabase: vi.fn().mockResolvedValue(undefined),
      checkUploadRoot: vi.fn().mockResolvedValue(undefined),
      getUptimeSeconds: () => 42,
      now: () => '2026-04-09T12:00:00.000Z',
    });

    expect(service.live()).toEqual({
      status: 'ok',
      checkedAt: '2026-04-09T12:00:00.000Z',
      uptimeSeconds: 42,
    });

    await expect(service.ready()).resolves.toEqual({
      status: 'ok',
      checkedAt: '2026-04-09T12:00:00.000Z',
      checks: {
        database: 'ok',
        storage: 'ok',
      },
    });
  });
});
