import { describe, expect, it, vi } from 'vitest';
import { createAdminDataStore, createMemoryStorageAdapter } from '@/services/storage/adminDataStore';

const seed = {
  projects: [
    {
      id: 'p-1',
      title: '初始项目',
      slug: 'initial-project',
      summary: '摘要',
      description: '描述',
      coverImage: 'cover.jpg',
      tags: [],
      status: 'draft' as const,
      locationIds: [],
      mediaSetIds: ['m-1'],
      routeIds: [],
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
  ],
  locations: [],
  mediaSets: [
    {
      id: 'm-1',
      projectId: 'p-1',
      locationId: null,
      type: 'gallery' as const,
      title: '初始媒体组',
      description: '媒体组描述',
      coverImage: 'media.jpg',
      imageIds: ['img-1'],
      isFeatured: false,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    },
  ],
  mediaImages: [
    {
      id: 'img-1',
      mediaSetId: 'm-1',
      url: 'image.jpg',
      thumbnailUrl: 'thumb.jpg',
      altText: '图片',
      caption: '第一张',
      sortOrder: 1,
      createdAt: '2026-04-06T00:00:00.000Z',
    },
  ],
  routes: [],
};

describe('createAdminDataStore', () => {
  it('reads seed data and supports create, update, and delete for projects', () => {
    const store = createAdminDataStore({
      adapter: createMemoryStorageAdapter(),
      seed,
    });

    expect(store.getState().projects).toHaveLength(1);

    store.saveProject({
      id: 'p-2',
      title: '新项目',
      slug: 'new-project',
      summary: '新摘要',
      description: '新描述',
      coverImage: 'new.jpg',
      tags: ['tag'],
      status: 'published',
      locationIds: [],
      mediaSetIds: [],
      routeIds: [],
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    });

    expect(store.getState().projects).toHaveLength(2);

    store.saveProject({
      ...store.getState().projects.find((project) => project.id === 'p-2')!,
      title: '新项目-已更新',
    });

    expect(store.getState().projects.find((project) => project.id === 'p-2')?.title).toBe('新项目-已更新');

    store.deleteProject('p-2');

    expect(store.getState().projects).toHaveLength(1);
  });

  it('supports media image create, delete, and reorder for a media set', () => {
    const store = createAdminDataStore({
      adapter: createMemoryStorageAdapter(),
      seed,
    });

    store.saveMediaImage({
      id: 'img-2',
      mediaSetId: 'm-1',
      url: 'image-2.jpg',
      thumbnailUrl: 'thumb-2.jpg',
      altText: '图片2',
      caption: '第二张',
      sortOrder: 2,
      createdAt: '2026-04-06T00:00:00.000Z',
    });

    expect(store.getState().mediaImages).toHaveLength(2);
    expect(store.getState().mediaSets.find((mediaSet) => mediaSet.id === 'm-1')?.imageIds).toEqual(['img-1', 'img-2']);

    store.reorderMediaImages('m-1', ['img-2', 'img-1']);

    expect(store.getState().mediaSets.find((mediaSet) => mediaSet.id === 'm-1')?.imageIds).toEqual(['img-2', 'img-1']);
    expect(store.getState().mediaImages.find((image) => image.id === 'img-2')?.sortOrder).toBe(1);
    expect(store.getState().mediaImages.find((image) => image.id === 'img-1')?.sortOrder).toBe(2);

    store.deleteMediaImage('img-2');

    expect(store.getState().mediaImages).toHaveLength(1);
    expect(store.getState().mediaSets.find((mediaSet) => mediaSet.id === 'm-1')?.imageIds).toEqual(['img-1']);
  });

  it('notifies subscribers when state changes', () => {
    const store = createAdminDataStore({
      adapter: createMemoryStorageAdapter(),
      seed,
    });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.saveProject({
      id: 'p-2',
      title: '可订阅项目',
      slug: 'subscribed-project',
      summary: '摘要',
      description: '描述',
      coverImage: 'cover.jpg',
      tags: [],
      status: 'draft',
      locationIds: [],
      mediaSetIds: [],
      routeIds: [],
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    });

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.deleteProject('p-2');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers when external storage changes', () => {
    const adapter = createMemoryStorageAdapter();
    const store = createAdminDataStore({
      adapter,
      seed,
    });
    const listener = vi.fn();
    store.subscribe(listener);

    adapter.setExternalItem(
      'trace-scope-admin-data',
      JSON.stringify({
        ...seed,
        projects: [
          ...seed.projects,
          {
            id: 'p-3',
            title: '外部项目',
            slug: 'external-project',
            summary: '外部摘要',
            description: '外部描述',
            coverImage: 'external.jpg',
            tags: [],
            status: 'published' as const,
            locationIds: [],
            mediaSetIds: [],
            routeIds: [],
            createdAt: '2026-04-06T00:00:00.000Z',
            updatedAt: '2026-04-06T00:00:00.000Z',
          },
        ],
      }),
    );

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().projects).toHaveLength(2);
  });
});
