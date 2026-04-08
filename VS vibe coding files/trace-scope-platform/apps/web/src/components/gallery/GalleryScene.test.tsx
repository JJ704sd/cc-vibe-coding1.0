import { describe, expect, it } from 'vitest';

describe('GalleryScene', () => {
  it('accepts mediaImages prop instead of projects', async () => {
    const source = await import('./GalleryScene.tsx?raw');
    expect(source.default).toMatch(/mediaImages:\s*MediaImage\[\]/);
  });

  it('does not reference projects prop', async () => {
    const source = await import('./GalleryScene.tsx?raw');
    expect(source.default).not.toMatch(/projects:\s*Project\[\]/);
  });
});
