import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { GeoMediaLayer } from './GeoMediaLayer';
import * as THREE from 'three';
import type { CurvedMapSampler } from './CurvedMapSurface';
import type { AnchoredMediaPlacement, FallbackMediaPlacement } from '@/features/gallery/useCurvedMapProjection';

describe('GeoMediaLayer', () => {
  const createMockSampler = (): CurvedMapSampler => ({
    getUvAt: vi.fn(() => ({ u: 0.5, v: 0.5 })),
    getPointAt: vi.fn(() => new THREE.Vector3(100, 200, 50)),
    getNormalAt: vi.fn(() => new THREE.Vector3(0, 0, 1).normalize()),
  });

  const createMockAnchored = (): AnchoredMediaPlacement[] => [
    {
      mediaImage: {
        id: 'img-1',
        mediaSetId: 'ms-1',
        url: 'https://example.com/image1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        altText: 'Test Image 1',
        caption: 'Test caption 1',
        sortOrder: 0,
        latitude: 36.0,
        longitude: 104.0,
        createdAt: '2024-01-01T00:00:00Z',
      },
      u: 0.5,
      v: 0.5,
    },
  ];

  const createMockFallback = (): FallbackMediaPlacement[] => [
    {
      mediaImage: {
        id: 'img-2',
        mediaSetId: 'ms-1',
        url: 'https://example.com/image2.jpg',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        altText: 'Test Image 2',
        caption: 'Test caption 2',
        sortOrder: 1,
        createdAt: '2024-01-01T00:00:00Z',
      },
      fallbackIndex: 0,
    },
  ];

  it('renders without crashing with valid inputs', () => {
    const scene = new THREE.Scene();
    const sampler = createMockSampler();
    const anchored = createMockAnchored();
    const fallback = createMockFallback();
    const onImageSelect = vi.fn();

    render(
      <GeoMediaLayer
        scene={scene}
        anchored={anchored}
        fallback={fallback}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />
    );

    // Verify scene has children (the card groups were added)
    expect(scene.children.length).toBeGreaterThan(0);
  });

  it('adds anchored cards to scene', () => {
    const scene = new THREE.Scene();
    const sampler = createMockSampler();
    const anchored = createMockAnchored();
    const onImageSelect = vi.fn();

    render(
      <GeoMediaLayer
        scene={scene}
        anchored={anchored}
        fallback={[]}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />
    );

    // Should have at least one group added to scene
    const groups = scene.children.filter(
      (child) => child instanceof THREE.Group
    );
    expect(groups.length).toBe(1);
  });

  it('adds fallback cards to scene', () => {
    const scene = new THREE.Scene();
    const sampler = createMockSampler();
    const fallback = createMockFallback();
    const onImageSelect = vi.fn();

    render(
      <GeoMediaLayer
        scene={scene}
        anchored={[]}
        fallback={fallback}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />
    );

    // Should have at least one group added to scene
    const groups = scene.children.filter(
      (child) => child instanceof THREE.Group
    );
    expect(groups.length).toBe(1);
  });

  it('calls sampler methods for anchored placements', () => {
    const scene = new THREE.Scene();
    const sampler = createMockSampler();
    const anchored = createMockAnchored();
    const onImageSelect = vi.fn();

    render(
      <GeoMediaLayer
        scene={scene}
        anchored={anchored}
        fallback={[]}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />
    );

    expect(sampler.getPointAt).toHaveBeenCalledWith(104.0, 36.0);
    expect(sampler.getNormalAt).toHaveBeenCalledWith(104.0, 36.0);
  });

  it('handles empty anchored and fallback arrays', () => {
    const scene = new THREE.Scene();
    const sampler = createMockSampler();
    const onImageSelect = vi.fn();

    render(
      <GeoMediaLayer
        scene={scene}
        anchored={[]}
        fallback={[]}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />
    );

    // Scene should still be valid
    expect(scene).toBeDefined();
  });

  it('stores mediaImage on mesh userData for raycasting', () => {
    const scene = new THREE.Scene();
    const sampler = createMockSampler();
    const anchored = createMockAnchored();
    const onImageSelect = vi.fn();

    render(
      <GeoMediaLayer
        scene={scene}
        anchored={anchored}
        fallback={[]}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />
    );

    // Find the front mesh and check userData
    const group = scene.children.find(
      (child) => child instanceof THREE.Group
    ) as THREE.Group | undefined;

    expect(group).toBeDefined();
    const frontMesh = group!.children.find(
      (child) => child instanceof THREE.Mesh
    ) as THREE.Mesh | undefined;
    expect(frontMesh).toBeDefined();
    expect(frontMesh!.userData.mediaImage).toBeDefined();
    expect(frontMesh!.userData.mediaImage.id).toBe('img-1');
  });
});
