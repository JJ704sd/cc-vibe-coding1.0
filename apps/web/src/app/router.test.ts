import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('src/app/router.tsx', 'utf-8');

describe('public router layout', () => {
  it('renders the gallery homepage without the public layout chrome', () => {
    expect(source).toContain("{ path: '/', element: withSuspense(<HomePage />) }");
    expect(source).not.toContain('{ index: true, element: withSuspense(<HomePage />) }');
  });

  it('keeps the non-gallery public pages inside PublicLayout', () => {
    expect(source).toContain('element: <PublicLayout />');
    expect(source).toContain("{ path: 'projects', element: withSuspense(<ProjectsPage />) }");
    expect(source).toContain("{ path: 'map', element: withSuspense(<MapPage />) }");
  });
});
