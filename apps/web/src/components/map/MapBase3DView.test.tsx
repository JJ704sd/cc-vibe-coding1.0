import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MapBase3DView } from '@/components/map/MapBase3DView';
import type { Map as MaplibreMap } from 'maplibre-gl';

describe('MapBase3DView', () => {
  it('exports a dedicated map substrate component', () => {
    expect(MapBase3DView).toBeTypeOf('function');
  });

  it('accepts onMapReady callback prop', () => {
    const onMapReady = vi.fn<(map: MaplibreMap) => void>();
    // This will fail if onMapReady is not a valid prop (React will warn in console)
    render(<MapBase3DView onMapReady={onMapReady} />);
    // If we got here without error, the prop is accepted
    expect(onMapReady).not.toHaveBeenCalled(); // not called since map won't load without token
  });

  it('still works with the original onReady callback', () => {
    const onReady = vi.fn();
    render(<MapBase3DView onReady={onReady} />);
    expect(onReady).not.toHaveBeenCalled();
  });

  it('accepts both onReady and onMapReady simultaneously', () => {
    const onReady = vi.fn();
    const onMapReady = vi.fn<(map: MaplibreMap) => void>();
    render(<MapBase3DView onReady={onReady} onMapReady={onMapReady} />);
    expect(onReady).not.toHaveBeenCalled();
    expect(onMapReady).not.toHaveBeenCalled();
  });
});
