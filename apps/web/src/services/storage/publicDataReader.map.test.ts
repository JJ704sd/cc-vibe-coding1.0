import { describe, expect, it } from 'vitest';
import { createAdminDataStore, createMemoryStorageAdapter } from '@/services/storage/adminDataStore';
import { createPublicDataReader } from '@/services/storage/publicDataReader';

const seed = {
  projects: [
    {
      id: 'draft-project',
      title: '草稿项目',
      slug: 'draft-project',
      summary: '草稿摘要',
      description: '草稿描述',
      coverImage: 'draft.jpg',
      tags: [],
      status: 'draft' as const,
      locationIds: ['draft-location'],
      mediaSetIds: ['draft-set'],
      routeIds: [],
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    {
      id: 'published-project',
      title: '已发布项目',
      slug: 'published-project',
      summary: '已发布摘要',
      description: '已发布描述',
      coverImage: 'published.jpg',
      tags: [],
      status: 'published' as const,
      locationIds: ['location-1'],
      mediaSetIds: ['spin-set', 'gallery-set'],
      routeIds: ['route-1'],
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
  ],
  locations: [
    {
      id: 'draft-location',
      projectId: 'draft-project',
      name: '草稿地点',
      slug: 'draft-location',
      description: '草稿地点描述',
      latitude: 30.1,
      longitude: 120.1,
      addressText: '草稿地址',
      mediaSetIds: ['draft-set'],
      visitOrder: 1,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    {
      id: 'location-1',
      projectId: 'published-project',
      name: '地点一',
      slug: 'location-1',
      description: '地点描述',
      latitude: 31.2,
      longitude: 121.4,
      addressText: '测试地址',
      mediaSetIds: ['spin-set', 'gallery-set'],
      visitOrder: 1,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
  ],
  mediaSets: [
    {
      id: 'draft-set',
      projectId: 'draft-project',
      locationId: 'draft-location',
      type: 'gallery' as const,
      title: '草稿媒体组',
      description: '草稿媒体描述',
      coverImage: 'draft-cover.jpg',
      imageIds: ['draft-image-1'],
      isFeatured: false,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    {
      id: 'spin-set',
      projectId: 'published-project',
      locationId: 'location-1',
      type: 'spin360' as const,
      title: '旋转组',
      description: '旋转描述',
      coverImage: 'spin-cover.jpg',
      imageIds: ['spin-image-1'],
      isFeatured: true,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
    {
      id: 'gallery-set',
      projectId: 'published-project',
      locationId: 'location-1',
      type: 'gallery' as const,
      title: '图集组',
      description: '图集描述',
      coverImage: 'gallery-cover.jpg',
      imageIds: ['gallery-image-1'],
      isFeatured: false,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
  ],
  mediaImages: [
    {
      id: 'draft-image-1',
      mediaSetId: 'draft-set',
      url: 'draft-1.jpg',
      thumbnailUrl: 'draft-1-thumb.jpg',
      altText: '草稿图 1',
      caption: '草稿图',
      sortOrder: 1,
      createdAt: '2026-04-06T00:00:00.000Z',
    },
    {
      id: 'spin-image-1',
      mediaSetId: 'spin-set',
      url: 'spin-1.jpg',
      thumbnailUrl: 'spin-1-thumb.jpg',
      altText: '旋转图 1',
      caption: '第 1 帧',
      sortOrder: 1,
      createdAt: '2026-04-06T00:00:00.000Z',
    },
    {
      id: 'gallery-image-1',
      mediaSetId: 'gallery-set',
      url: 'gallery-1.jpg',
      thumbnailUrl: 'gallery-1-thumb.jpg',
      altText: '图集图 1',
      caption: '图集 1',
      sortOrder: 1,
      createdAt: '2026-04-06T00:00:00.000Z',
    },
  ],
  routes: [
    {
      id: 'route-1',
      projectId: 'published-project',
      name: '测试轨迹',
      description: '轨迹描述',
      locationIds: ['location-1'],
      lineStyle: 'solid' as const,
      color: '#ffffff',
      isFeatured: true,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
  ],
};

describe('createPublicDataReader map relationship source', () => {
  it('returns published map relationship source data in one call', () => {
    const store = createAdminDataStore({
      adapter: createMemoryStorageAdapter(),
      seed,
    });
    const reader = createPublicDataReader(store);

    const source = reader.getPublishedMapRelationshipSource();

    expect(source.projects).toHaveLength(1);
    expect(source.projects[0].id).toBe('published-project');
    expect(source.locations).toHaveLength(1);
    expect(source.mediaSets.map((mediaSet) => mediaSet.id)).toEqual(['spin-set', 'gallery-set']);
    expect(source.mediaImages.map((image) => image.id)).toEqual(['spin-image-1', 'gallery-image-1']);
    expect(source.routes).toHaveLength(1);
  });
});
