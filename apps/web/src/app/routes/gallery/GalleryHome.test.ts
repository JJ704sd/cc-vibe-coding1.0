import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GalleryHome navigation', () => {
  it('includes a map entry in the floating home navigation', () => {
    // The navigation links moved into the extracted GalleryTopBar component.
    const topBarSource = fs.readFileSync('src/app/routes/gallery/GalleryTopBar.tsx', 'utf-8');

    expect(topBarSource).toContain("{ to: '/map'");
  });
});
