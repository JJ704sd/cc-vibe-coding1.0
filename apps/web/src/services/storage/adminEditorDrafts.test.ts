import { describe, expect, it } from 'vitest';
import { createProjectDraft, createLocationDraft, createMediaSetDraft, createRouteDraft } from '@/services/storage/adminEditorDrafts';

describe('adminEditorDrafts', () => {
  it('creates editable drafts from existing entities', () => {
    const projectDraft = createProjectDraft({
      id: 'project-1',
      title: '项目一',
      slug: 'project-1',
      summary: '摘要',
      description: '描述',
      coverImage: 'cover.jpg',
      tags: ['a', 'b'],
      status: 'published',
      locationIds: [],
      mediaSetIds: [],
      routeIds: [],
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    });
    const locationDraft = createLocationDraft({
      id: 'location-1',
      projectId: 'project-1',
      name: '地点一',
      slug: 'location-1',
      description: '地点描述',
      latitude: 31.2,
      longitude: 121.4,
      addressText: '测试地址',
      mediaSetIds: [],
      visitOrder: 2,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    });
    const mediaDraft = createMediaSetDraft({
      id: 'media-1',
      projectId: 'project-1',
      locationId: 'location-1',
      type: 'gallery',
      title: '图集',
      description: '图集描述',
      coverImage: 'cover.jpg',
      imageIds: [],
      isFeatured: true,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    });
    const routeDraft = createRouteDraft({
      id: 'route-1',
      projectId: 'project-1',
      name: '轨迹一',
      description: '轨迹描述',
      locationIds: ['location-1'],
      lineStyle: 'dashed',
      color: '#ffffff',
      isFeatured: true,
      createdAt: '2026-04-06T00:00:00.000Z',
      updatedAt: '2026-04-06T00:00:00.000Z',
    });

    expect(projectDraft.title).toBe('项目一');
    expect(projectDraft.tagsText).toBe('a, b');
    expect(locationDraft.latitudeText).toBe('31.2');
    expect(locationDraft.visitOrderText).toBe('2');
    expect(mediaDraft.locationId).toBe('location-1');
    expect(routeDraft.locationIdsText).toBe('location-1');
    expect(routeDraft.lineStyle).toBe('dashed');
  });

  it('creates empty drafts for new entities', () => {
    expect(createProjectDraft().status).toBe('draft');
    expect(createLocationDraft().latitudeText).toBe('31.23');
    expect(createMediaSetDraft().type).toBe('gallery');
    expect(createRouteDraft().color).toBe('#72e3d2');
  });
});
