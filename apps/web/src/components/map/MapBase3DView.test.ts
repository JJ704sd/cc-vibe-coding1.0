import { describe, expect, it } from 'vitest';
import { MapBase3DView } from '@/components/map/MapBase3DView';

describe('MapBase3DView', () => {
  it('exports a dedicated map substrate component', () => {
    expect(MapBase3DView).toBeTypeOf('function');
  });
});
