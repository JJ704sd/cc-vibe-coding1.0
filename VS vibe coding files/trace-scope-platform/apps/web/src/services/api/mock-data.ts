import type { Location, MediaImage, MediaSet, Project, RouteEntity } from '@/types/domain';

export const projects: Project[] = [
  {
    id: 'project-shanghai-trace',
    title: '上海轨迹样本项目',
    slug: 'shanghai-trace-session',
    summary: '一个把城市地点、轨迹顺序和人物旋转序列结合起来的空间叙事样本项目。',
    description: '该样本项目用于定义平台第一阶段的实现边界，重点验证项目、地点、媒体组和轨迹之间的关系。',
    coverImage: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    tags: ['urban', 'portrait', 'route'],
    status: 'published',
    locationIds: ['location-bund', 'location-xintiandi'],
    mediaSetIds: ['media-portrait-spin', 'media-xintiandi-gallery'],
    routeIds: ['route-central-loop'],
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-05T08:00:00.000Z'
  }
];

export const locations: Location[] = [
  {
    id: 'location-bund', projectId: 'project-shanghai-trace', name: '外滩', slug: 'the-bund',
    description: '作为轨迹起点的江边地点，用于承载一组人物旋转序列。', latitude: 31.2401, longitude: 121.4903,
    addressText: '上海外滩', mediaSetIds: ['media-portrait-spin'], visitOrder: 1,
    createdAt: '2026-04-01T08:00:00.000Z', updatedAt: '2026-04-05T08:00:00.000Z'
  },
  {
    id: 'location-xintiandi', projectId: 'project-shanghai-trace', name: '新天地', slug: 'xintiandi',
    description: '作为轨迹第二站的地点，用于承载环境图集内容。', latitude: 31.2206, longitude: 121.4751,
    addressText: '上海新天地', mediaSetIds: ['media-xintiandi-gallery'], visitOrder: 2,
    createdAt: '2026-04-01T09:00:00.000Z', updatedAt: '2026-04-05T08:00:00.000Z'
  }
];

export const mediaSets: MediaSet[] = [
  {
    id: 'media-portrait-spin', projectId: 'project-shanghai-trace', locationId: 'location-bund', type: 'spin360',
    title: '外滩人物旋转组', description: '一组按顺序排列的人物多角度图片，用于后续拖拽切帧与自动播放实现。',
    coverImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    imageIds: ['spin-01', 'spin-02', 'spin-03', 'spin-04', 'spin-05', 'spin-06', 'spin-07', 'spin-08'],
    isFeatured: true, createdAt: '2026-04-01T08:30:00.000Z', updatedAt: '2026-04-05T08:00:00.000Z'
  },
  {
    id: 'media-xintiandi-gallery', projectId: 'project-shanghai-trace', locationId: 'location-xintiandi', type: 'gallery',
    title: '新天地现场图集', description: '一组以地点氛围为核心的图集内容，不要求构成完整旋转闭环。',
    coverImage: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80',
    imageIds: ['gallery-01', 'gallery-02', 'gallery-03'],
    isFeatured: false, createdAt: '2026-04-01T09:30:00.000Z', updatedAt: '2026-04-05T08:00:00.000Z'
  }
];

export const mediaImages: MediaImage[] = [
  { id: 'spin-01', mediaSetId: 'media-portrait-spin', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80', altText: '旋转帧 1', caption: '第 1 帧', sortOrder: 1, latitude: 31.2401, longitude: 121.4903, createdAt: '2026-04-01T08:31:00.000Z' },
  { id: 'spin-02', mediaSetId: 'media-portrait-spin', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80', altText: '旋转帧 2', caption: '第 2 帧', sortOrder: 2, latitude: 31.2405, longitude: 121.4900, createdAt: '2026-04-01T08:32:00.000Z' },
  { id: 'spin-03', mediaSetId: 'media-portrait-spin', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80', altText: '旋转帧 3', caption: '第 3 帧', sortOrder: 3, latitude: 31.2398, longitude: 121.4906, createdAt: '2026-04-01T08:33:00.000Z' },
  { id: 'spin-04', mediaSetId: 'media-portrait-spin', url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=300&q=80', altText: '旋转帧 4', caption: '第 4 帧', sortOrder: 4, latitude: 31.2410, longitude: 121.4898, createdAt: '2026-04-01T08:34:00.000Z' },
  { id: 'spin-05', mediaSetId: 'media-portrait-spin', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', altText: '旋转帧 5', caption: '第 5 帧', sortOrder: 5, latitude: 31.2395, longitude: 121.4909, createdAt: '2026-04-01T08:35:00.000Z' },
  { id: 'spin-06', mediaSetId: 'media-portrait-spin', url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=300&q=80', altText: '旋转帧 6', caption: '第 6 帧', sortOrder: 6, latitude: 31.2206, longitude: 121.4751, createdAt: '2026-04-01T08:36:00.000Z' },
  { id: 'spin-07', mediaSetId: 'media-portrait-spin', url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80', altText: '旋转帧 7', caption: '第 7 帧', sortOrder: 7, latitude: 31.2210, longitude: 121.4755, createdAt: '2026-04-01T08:37:00.000Z' },
  { id: 'spin-08', mediaSetId: 'media-portrait-spin', url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=300&q=80', altText: '旋转帧 8', caption: '第 8 帧', sortOrder: 8, createdAt: '2026-04-01T08:38:00.000Z' },
  { id: 'gallery-01', mediaSetId: 'media-xintiandi-gallery', url: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=300&q=80', altText: '图集图片 1', caption: '街道氛围', sortOrder: 1, createdAt: '2026-04-01T09:31:00.000Z' },
  { id: 'gallery-02', mediaSetId: 'media-xintiandi-gallery', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=300&q=80', altText: '图集图片 2', caption: '路径细节', sortOrder: 2, createdAt: '2026-04-01T09:32:00.000Z' },
  { id: 'gallery-03', mediaSetId: 'media-xintiandi-gallery', url: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80', thumbnailUrl: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=300&q=80', altText: '图集图片 3', caption: '夜景氛围', sortOrder: 3, createdAt: '2026-04-01T09:33:00.000Z' }
];

export const routes: RouteEntity[] = [
  {
    id: 'route-central-loop', projectId: 'project-shanghai-trace', name: '中心轨迹样本', description: '一条从外滩到新天地的有序轨迹，用于验证地点顺序与轨迹连线关系。',
    locationIds: ['location-bund', 'location-xintiandi'], lineStyle: 'solid', color: '#72e3d2', isFeatured: true,
    createdAt: '2026-04-01T10:00:00.000Z', updatedAt: '2026-04-05T08:00:00.000Z'
  }
];
