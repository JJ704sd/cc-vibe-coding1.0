import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('MapPage', () => {
  it('replaces the disabled placeholder with layered map composition', () => {
    const source = fs.readFileSync('src/app/routes/public/map/MapPage.tsx', 'utf-8');

    expect(source).toContain('MapBase3DView');
    expect(source).toContain('StarRelationshipLayer');
    expect(source).toContain('MediaClusterLayer');
    expect(source).toContain('MapRelationshipPanel');
    expect(source).not.toContain('地图功能已停用');
  });
});
