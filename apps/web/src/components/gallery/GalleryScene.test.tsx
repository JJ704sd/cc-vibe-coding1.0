import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('GalleryScene', () => {
  it('accepts mediaImages prop instead of projects', () => {
    const source = fs.readFileSync('src/components/gallery/GalleryScene.tsx', 'utf-8');
    expect(source).toMatch(/mediaImages:\s*MediaImage\[\]/);
  });

  it('does not reference projects prop', () => {
    const source = fs.readFileSync('src/components/gallery/GalleryScene.tsx', 'utf-8');
    expect(source).not.toMatch(/projects:\s*Project\[\]/);
  });
});
