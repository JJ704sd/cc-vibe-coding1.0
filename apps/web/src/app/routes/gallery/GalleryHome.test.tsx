import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('src/app/routes/gallery/GalleryHome.tsx', 'utf-8');
const railSource = fs.readFileSync('src/app/routes/gallery/GalleryMediaRail.tsx', 'utf-8');
const topBarSource = fs.readFileSync('src/app/routes/gallery/GalleryTopBar.tsx', 'utf-8');
const panelSource = fs.readFileSync('src/app/routes/gallery/GalleryRelationshipPanel.tsx', 'utf-8');

describe('GalleryHome', () => {
  it('contains GalleryExperience', () => {
    expect(source).toContain('GalleryExperience');
  });

  it('mounts the opening loading screen on first entry', () => {
    expect(source).toContain('LoadingScreen');
    expect(source).toContain('showLoadingScreen');
    expect(source).toContain('onComplete={handleLoadingComplete}');
  });

  it('does not contain GalleryScene', () => {
    expect(source).not.toContain('GalleryScene');
  });

  it('does not contain GalleryMapBase', () => {
    expect(source).not.toContain('GalleryMapBase');
  });

  it('uses API to fetch published media images', () => {
    expect(source).toMatch(/httpJson.*public\/media-sets/);
  });

  it('renders selected media inside a dedicated map rail instead of floating cards', () => {
    // GalleryHome now delegates the rail body to GalleryMediaRail; the testid
    // contract lives in that extracted component file.
    expect(railSource).toContain('data-testid="gallery-media-rail"');
    expect(source).not.toContain('data-testid="map-floating-card"');
    expect(source).not.toContain('floatingCards');
  });

  it('adds an explicit shell for the relationship panel overlay', () => {
    // The shell lives in the extracted GalleryRelationshipPanel component.
    expect(panelSource).toContain('data-testid="gallery-relationship-shell"');
  });

  it('adds aria labels to the primary map controls', () => {
    // The controls are now in the extracted GalleryTopBar component.
    expect(topBarSource).toContain('aria-label={showSearch ? \'Hide map search\' : \'Show map search\'}');
    expect(topBarSource).toContain('aria-label={isMapMode ? \'Switch to gallery view\' : \'Switch to map view\'}');
    expect(topBarSource).toContain('aria-label={nightMode ? \'Switch to day mode\' : \'Switch to night mode\'}');
  });

  it('preloads gallery media in parallel so the gallery view is not empty on first load', () => {
    expect(source).toContain('Promise.all(');
    expect(source).toContain("viewMode === 'gallery'");
  });

  it('wraps the top controls to preserve click targets on narrower viewports', () => {
    expect(source).toContain("flexWrap: 'wrap'");
  });

  it('keeps the relationship panel focused on context when the media rail is visible', () => {
    expect(source).toContain('images={showMediaRail ? undefined : currentImages}');
  });
});
