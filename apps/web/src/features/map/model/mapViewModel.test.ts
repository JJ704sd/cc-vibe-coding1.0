import { describe, expect, it } from 'vitest';
import { buildMapRelationshipViewModel } from '@/features/map/model/mapViewModel';

describe('buildMapRelationshipViewModel', () => {
  const seed = {
    projects: [
      {
        id: 'project-a',
        title: 'Project A',
        slug: 'project-a',
        summary: 'Project A summary',
        description: 'Project A description',
        coverImage: 'project-a.jpg',
        tags: [],
        status: 'published' as const,
        locationIds: ['location-a', 'location-b'],
        mediaSetIds: ['media-a-spin', 'media-a-gallery', 'media-b-gallery'],
        routeIds: ['route-a'],
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'project-b',
        title: 'Project B',
        slug: 'project-b',
        summary: 'Project B summary',
        description: 'Project B description',
        coverImage: 'project-b.jpg',
        tags: [],
        status: 'published' as const,
        locationIds: ['location-c'],
        mediaSetIds: ['media-c-gallery'],
        routeIds: ['route-b'],
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
    ],
    locations: [
      {
        id: 'location-a',
        projectId: 'project-a',
        name: 'Location A',
        slug: 'location-a',
        description: 'Location A description',
        latitude: 31.2,
        longitude: 121.4,
        addressText: 'Address A',
        mediaSetIds: ['media-a-spin', 'media-a-gallery'],
        visitOrder: 1,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'location-b',
        projectId: 'project-a',
        name: 'Location B',
        slug: 'location-b',
        description: 'Location B description',
        latitude: 31.21,
        longitude: 121.41,
        addressText: 'Address B',
        mediaSetIds: ['media-b-gallery'],
        visitOrder: 2,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'location-c',
        projectId: 'project-b',
        name: 'Location C',
        slug: 'location-c',
        description: 'Location C description',
        latitude: 31.22,
        longitude: 121.42,
        addressText: 'Address C',
        mediaSetIds: ['media-c-gallery'],
        visitOrder: 1,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
    ],
    mediaSets: [
      {
        id: 'media-a-spin',
        projectId: 'project-a',
        locationId: 'location-a',
        type: 'spin360' as const,
        title: 'Location A spin',
        description: 'spin cluster',
        coverImage: 'media-a-spin.jpg',
        imageIds: ['image-1'],
        isFeatured: true,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'media-a-gallery',
        projectId: 'project-a',
        locationId: 'location-a',
        type: 'gallery' as const,
        title: 'Location A gallery',
        description: 'gallery cluster',
        coverImage: 'media-a-gallery.jpg',
        imageIds: ['image-2'],
        isFeatured: false,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'media-b-gallery',
        projectId: 'project-a',
        locationId: 'location-b',
        type: 'gallery' as const,
        title: 'Location B gallery',
        description: 'gallery cluster',
        coverImage: 'media-b-gallery.jpg',
        imageIds: ['image-3'],
        isFeatured: false,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'media-a-project-gallery',
        projectId: 'project-a',
        locationId: null,
        type: 'gallery' as const,
        title: 'Project A gallery',
        description: 'project level gallery',
        coverImage: 'media-a-project-gallery.jpg',
        imageIds: ['image-5'],
        isFeatured: false,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'media-c-gallery',
        projectId: 'project-b',
        locationId: 'location-c',
        type: 'gallery' as const,
        title: 'Location C gallery',
        description: 'gallery cluster',
        coverImage: 'media-c-gallery.jpg',
        imageIds: ['image-4'],
        isFeatured: false,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'media-cross-project',
        projectId: 'project-b',
        locationId: 'location-a',
        type: 'gallery' as const,
        title: 'Invalid cross project gallery',
        description: 'should be ignored',
        coverImage: 'media-cross-project.jpg',
        imageIds: ['image-6'],
        isFeatured: false,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'media-dangling',
        projectId: 'project-b',
        locationId: 'location-missing',
        type: 'gallery' as const,
        title: 'Invalid dangling gallery',
        description: 'should be ignored',
        coverImage: 'media-dangling.jpg',
        imageIds: ['image-7'],
        isFeatured: false,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
    ],
    routes: [
      {
        id: 'route-a',
        projectId: 'project-a',
        name: 'Route A',
        description: 'Route A description',
        locationIds: ['location-a', 'location-b'],
        lineStyle: 'solid' as const,
        color: '#123456',
        isFeatured: true,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'route-cross-project',
        projectId: 'project-a',
        name: 'Cross Project Route',
        description: 'Cross project route description',
        locationIds: ['location-a', 'location-c'],
        lineStyle: 'solid' as const,
        color: '#abcdef',
        isFeatured: false,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
      {
        id: 'route-b',
        projectId: 'project-b',
        name: 'Route B',
        description: 'Route B description',
        locationIds: ['location-c'],
        lineStyle: 'dashed' as const,
        color: '#654321',
        isFeatured: false,
        createdAt: '2026-04-06T00:00:00.000Z',
        updatedAt: '2026-04-06T00:00:00.000Z',
      },
    ],
  };

  it('maps location entities to map star nodes', () => {
    const viewModel = buildMapRelationshipViewModel(seed);

    expect(viewModel.nodes).toHaveLength(3);
    expect(viewModel.nodes[0]).toEqual({
      id: 'location-a',
      projectId: 'project-a',
      locationId: 'location-a',
      title: 'Location A',
      description: 'Location A description',
      latitude: 31.2,
      longitude: 121.4,
      addressText: 'Address A',
      visitOrder: 1,
      mediaSetIds: ['media-a-spin', 'media-a-gallery'],
      routeIds: ['route-a', 'route-cross-project'],
    });
    expect(viewModel.nodes[1].routeIds).toEqual(['route-a']);
  });

  it('maps projects to project groups', () => {
    const viewModel = buildMapRelationshipViewModel(seed);

    expect(viewModel.projectGroups).toEqual([
      {
        id: 'project-a',
        projectId: 'project-a',
        title: 'Project A',
        summary: 'Project A summary',
        locationIds: ['location-a', 'location-b'],
        routeIds: ['route-a', 'route-cross-project'],
        edgeIds: ['route-a:location-a->location-b'],
        mediaClusterIds: [
          '{"projectId":"project-a","locationId":"location-a","type":"spin360"}',
          '{"projectId":"project-a","locationId":"location-a","type":"gallery"}',
          '{"projectId":"project-a","locationId":"location-b","type":"gallery"}',
          '{"projectId":"project-a","locationId":null,"type":"gallery"}',
        ],
      },
      {
        id: 'project-b',
        projectId: 'project-b',
        title: 'Project B',
        summary: 'Project B summary',
        locationIds: ['location-c'],
        routeIds: ['route-b'],
        edgeIds: [],
        mediaClusterIds: ['{"projectId":"project-b","locationId":"location-c","type":"gallery"}'],
      },
    ]);
  });

  it('groups media sets into map media clusters', () => {
    const viewModel = buildMapRelationshipViewModel(seed);

    expect(viewModel.mediaClusters).toEqual([
      {
        id: '{"projectId":"project-a","locationId":"location-a","type":"spin360"}',
        projectId: 'project-a',
        locationId: 'location-a',
        type: 'spin360',
        title: 'Location A · 360',
        mediaSetIds: ['media-a-spin'],
      },
      {
        id: '{"projectId":"project-a","locationId":"location-a","type":"gallery"}',
        projectId: 'project-a',
        locationId: 'location-a',
        type: 'gallery',
        title: 'Location A · gallery',
        mediaSetIds: ['media-a-gallery'],
      },
      {
        id: '{"projectId":"project-a","locationId":"location-b","type":"gallery"}',
        projectId: 'project-a',
        locationId: 'location-b',
        type: 'gallery',
        title: 'Location B · gallery',
        mediaSetIds: ['media-b-gallery'],
      },
      {
        id: '{"projectId":"project-a","locationId":null,"type":"gallery"}',
        projectId: 'project-a',
        locationId: null,
        type: 'gallery',
        title: 'Project A · gallery',
        mediaSetIds: ['media-a-project-gallery'],
      },
      {
        id: '{"projectId":"project-b","locationId":"location-c","type":"gallery"}',
        projectId: 'project-b',
        locationId: 'location-c',
        type: 'gallery',
        title: 'Location C · gallery',
        mediaSetIds: ['media-c-gallery'],
      },
    ]);
  });

  it('ignores media sets that do not belong to the location project or target a missing location', () => {
    const viewModel = buildMapRelationshipViewModel(seed);

    expect(viewModel.nodes[0].mediaSetIds).toEqual(['media-a-spin', 'media-a-gallery']);
    expect(viewModel.projectGroups[1].mediaClusterIds).toEqual([
      '{"projectId":"project-b","locationId":"location-c","type":"gallery"}',
    ]);
    expect(
      viewModel.mediaClusters.some((cluster) => cluster.projectId === 'project-b' && cluster.locationId === 'location-a'),
    ).toBe(false);
    expect(viewModel.mediaClusters.some((cluster) => cluster.locationId === 'location-missing')).toBe(false);
  });

  it('skips cross-project route edges while keeping same-project memberships', () => {
    const viewModel = buildMapRelationshipViewModel(seed);

    expect(viewModel.edges).toEqual([
      {
        id: 'route-a:location-a->location-b',
        projectId: 'project-a',
        routeId: 'route-a',
        sourceLocationId: 'location-a',
        targetLocationId: 'location-b',
        sourceNodeId: 'location-a',
        targetNodeId: 'location-b',
        lineStyle: 'solid',
        color: '#123456',
      },
    ]);
    expect(viewModel.projectGroups[0].edgeIds).toEqual(['route-a:location-a->location-b']);
  });
});
