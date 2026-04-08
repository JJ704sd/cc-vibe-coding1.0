import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('src/app/routes/gallery/GalleryHome.tsx', 'utf-8');

describe('GalleryHome', () => {
  it('contains GalleryExperience', () => {
    expect(source).toContain('GalleryExperience');
  });

  it('does not contain GalleryScene', () => {
    expect(source).not.toContain('GalleryScene');
  });

  it('does not contain GalleryMapBase', () => {
    expect(source).not.toContain('GalleryMapBase');
  });

  it('reads all published media images', () => {
    expect(source).toMatch(/getAllPublishedMediaImages|getPublishedMediaImages/);
  });
});
