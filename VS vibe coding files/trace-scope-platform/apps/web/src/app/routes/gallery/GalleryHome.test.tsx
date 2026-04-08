import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('GalleryHome', () => {
  it('passes MediaImage[] to GalleryScene', () => {
    const source = fs.readFileSync('src/app/routes/gallery/GalleryHome.tsx', 'utf-8');
    expect(source).toMatch(/mediaImages=/);
  });

  it('reads all published media images', () => {
    const source = fs.readFileSync('src/app/routes/gallery/GalleryHome.tsx', 'utf-8');
    expect(source).toMatch(/getAllPublishedMediaImages|getPublishedMediaImages/);
  });
});
