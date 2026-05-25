import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('MapPage', () => {
  it('replaces the disabled placeholder with layered map composition', () => {
    const source = fs.readFileSync('src/app/routes/public/map/MapPage.tsx', 'utf-8');

    expect(source).toContain('MapBase3DView');
    expect(source).toContain('MapProjectionOverlay');
    expect(source).toContain('MediaClusterLayer');
    expect(source).toContain('MapRelationshipPanel');
    expect(source).not.toContain('地图功能已停用');
  });

  it('wires projection pipeline through useProjectedMapGraph', () => {
    const source = fs.readFileSync('src/app/routes/public/map/MapPage.tsx', 'utf-8');

    expect(source).toContain('useProjectedMapGraph');
  });

  it('passes onMapReady to MapBase3DView', () => {
    const source = fs.readFileSync('src/app/routes/public/map/MapPage.tsx', 'utf-8');

    expect(source).toContain('onMapReady');
  });

  it('renders MapProjectionOverlay for the projected overlay', () => {
    const source = fs.readFileSync('src/app/routes/public/map/MapPage.tsx', 'utf-8');

    expect(source).toContain('MapProjectionOverlay');
  });
});
