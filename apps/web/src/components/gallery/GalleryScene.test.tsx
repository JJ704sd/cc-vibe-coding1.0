import { describe, expect, it } from 'vitest';
import fs from 'fs';

describe('GalleryScene', () => {
  it('accepts mediaImages prop instead of projects', async () => {
    const source = await import('./GalleryScene.tsx?raw');
    expect(source.default).toMatch(/mediaImages:\s*MediaImage\[\]/);
  });

  it('does not reference projects prop', async () => {
    const source = await import('./GalleryScene.tsx?raw');
    expect(source.default).not.toMatch(/projects:\s*Project\[\]/);
  });

  it('uses projected positions for images with coordinates', () => {
    const source = fs.readFileSync('src/components/gallery/GalleryScene.tsx', 'utf-8');
    expect(source).toMatch(/useGalleryProjection/);
  });
});
