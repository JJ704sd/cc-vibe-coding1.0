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

  // C+ regression: the unmount cleanup must release every card group
  // it created (both anchored and fallback) so the scene is empty
  // after the component unmounts. Previously, the unmount cleanup
  // only existed for anchored cards AND it wiped the shared cardsRef,
  // which left fallback cards orphaned in the scene.
  it('clears every card from the scene on unmount', () => {
    const scene = new THREE.Scene();
    const sampler = createMockSampler();
    const anchored = createMockAnchored();
    const fallback = createMockFallback();
    const onImageSelect = vi.fn();

    const { unmount } = render(
      <GeoMediaLayer
        scene={scene}
        anchored={anchored}
        fallback={fallback}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />,
    );

    const groupsWhileMounted = scene.children.filter(
      (child) => child instanceof THREE.Group,
    ).length;
    expect(groupsWhileMounted).toBeGreaterThan(0);

    unmount();

    // After unmount every card group must have called removeFromParent
    // so the scene holds no stale groups. disposeMaterialDeep also
    // ran on each card's imgMat (its .map Texture) and the unmount
    // effect additionally disposed darkMaterial + sharedGeometry.
    const groupsAfter = scene.children.filter(
      (child) => child instanceof THREE.Group,
    );
    expect(groupsAfter).toEqual([]);
  });

  // C+ regression: changing the fallback prop must dispose old fallback
  // cards rather than letting them accumulate in the scene. Pre-fix,
  // the fallback useEffect had no cleanup return, so each new fallback
  // array added cards on top of the previous run's cards.
  it('does not accumulate stale fallback cards when fallback prop changes', () => {
    const scene = new THREE.Scene();
    const sampler = createMockSampler();
    const onImageSelect = vi.fn();

    const fallbackA = createMockFallback();
    const fallbackB: FallbackMediaPlacement[] = [
      fallbackA[0],
      {
        mediaImage: { ...fallbackA[0].mediaImage, id: 'img-extra' },
        fallbackIndex: 1,
      },
    ];

    const { rerender } = render(
      <GeoMediaLayer
        scene={scene}
        anchored={[]}
        fallback={fallbackA}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />,
    );
    const initialGroupCount = scene.children.filter(
      (child) => child instanceof THREE.Group,
    ).length;
    expect(initialGroupCount).toBe(1);

    rerender(
      <GeoMediaLayer
        scene={scene}
        anchored={[]}
        fallback={fallbackB}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />,
    );

    // 2 fallback cards now: cleanup of fallbackA's batch should have
    // removed the old single group, leaving exactly 2 new groups (one
    // per fallbackB entry). Without cleanup we'd see 1 + 2 = 3.
    const finalGroupCount = scene.children.filter(
      (child) => child instanceof THREE.Group,
    ).length;
    expect(finalGroupCount).toBe(2);
  });

  // C+ regression: changing the anchored prop must NOT delete fallback
  // cards. Pre-fix, both kinds shared a single cardsRef and the
  // anchored effect's cleanup wiped the entire array — falling back
  // into the scene whenever anchored changed.
  it('keeps fallback cards intact when anchored prop changes', () => {
    const scene = new THREE.Scene();
    const sampler = createMockSampler();
    const onImageSelect = vi.fn();

    const anchoredA = createMockAnchored();
    const anchoredB: AnchoredMediaPlacement[] = [
      anchoredA[0],
      {
        ...anchoredA[0],
        mediaImage: { ...anchoredA[0].mediaImage, id: 'img-second' },
      },
    ];
    const fallback = createMockFallback();

    const { rerender } = render(
      <GeoMediaLayer
        scene={scene}
        anchored={anchoredA}
        fallback={fallback}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />,
    );
    // 1 anchored group + 1 fallback group = 2 groups.
    expect(
      scene.children.filter((child) => child instanceof THREE.Group).length,
    ).toBe(2);

    rerender(
      <GeoMediaLayer
        scene={scene}
        anchored={anchoredB}
        fallback={fallback}
        sampler={sampler}
        onImageSelect={onImageSelect}
      />,
    );

    // 2 anchored + 1 fallback = 3 groups. Without the C+ fix the
    // anchored effect's cleanup would wipe both, leaving only the
    // newly-built 2 anchored groups (fallback card gone).
    expect(
      scene.children.filter((child) => child instanceof THREE.Group).length,
    ).toBe(3);
  });
});
