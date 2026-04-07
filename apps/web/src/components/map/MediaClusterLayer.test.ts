import { describe, expect, it } from 'vitest';
import { MediaClusterLayer } from '@/components/map/MediaClusterLayer';
import { MapRelationshipPanel } from '@/components/map/MapRelationshipPanel';

describe('map media expansion shell', () => {
  it('exports media cluster and relationship panel components', () => {
    expect(MediaClusterLayer).toBeTypeOf('function');
    expect(MapRelationshipPanel).toBeTypeOf('function');
  });

  it('returns null when no media cluster is focused', () => {
    expect(MediaClusterLayer({ cluster: null })).toBeNull();
  });
});
