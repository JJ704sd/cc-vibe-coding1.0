import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('map layered styles', () => {
  it('defines layered map shell and star relationship classes', () => {
    const css = fs.readFileSync('src/styles/index.css', 'utf-8');

    expect(css).toContain('.map-page-stage');
    expect(css).toContain('.map-page-base');
    expect(css).toContain('.map-star-layer');
    expect(css).toContain('.map-relationship-panel');
  });

  it('defines projected overlay classes', () => {
    const css = fs.readFileSync('src/styles/index.css', 'utf-8');

    expect(css).toContain('.map-projection-overlay');
    expect(css).toContain('.map-projection-overlay__svg');
    expect(css).toContain('.map-star-layer__nodes');
  });
});
