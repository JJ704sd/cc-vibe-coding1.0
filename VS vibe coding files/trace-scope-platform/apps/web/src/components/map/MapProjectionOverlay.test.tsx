import { describe, expect, it } from 'vitest';
import { MapProjectionOverlay } from '@/components/map/MapProjectionOverlay';
import { render } from '@testing-library/react';

describe('MapProjectionOverlay', () => {
  it('exports a projection overlay component', () => {
    expect(MapProjectionOverlay).toBeTypeOf('function');
  });

  it('renders without crashing', () => {
    const { container } = render(
      <MapProjectionOverlay
        width={800}
        height={600}
        nodes={[]}
        edges={[]}
        onLocationSelect={() => {}}
        activeLocationId={null}
        activeProjectId={null}
      />,
    );
    expect(container).toBeTruthy();
  });

  it('contains an SVG layer for edges', () => {
    const { container } = render(
      <MapProjectionOverlay
        width={800}
        height={600}
        nodes={[]}
        edges={[]}
        onLocationSelect={() => {}}
        activeLocationId={null}
        activeProjectId={null}
      />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
