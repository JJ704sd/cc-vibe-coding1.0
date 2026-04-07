import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GalleryHome navigation', () => {
  it('includes a map entry in the floating home navigation', () => {
    const source = fs.readFileSync('src/app/routes/gallery/GalleryHome.tsx', 'utf-8');

    expect(source).toContain("{ to: '/map'");
  });
});
