export type PublishStatus = 'draft' | 'published';
export type MediaSetType = 'spin360' | 'gallery';
export type RouteLineStyle = 'solid' | 'dashed';

export interface Project { id: string; title: string; slug: string; summary: string; description: string; coverImage: string; tags: string[]; status: PublishStatus; locationIds: string[]; mediaSetIds: string[]; routeIds: string[]; createdAt: string; updatedAt: string; }
export interface Location { id: string; projectId: string; name: string; slug: string; description: string; latitude: number; longitude: number; addressText: string; mediaSetIds: string[]; visitOrder: number | null; createdAt: string; updatedAt: string; }
export interface MediaSet { id: string; projectId: string; locationId: string | null; type: MediaSetType; title: string; description: string; coverImage: string; imageIds: string[]; isFeatured: boolean; createdAt: string; updatedAt: string; }
export interface MediaImage { id: string; mediaSetId: string; url: string; thumbnailUrl: string; altText: string; caption: string; sortOrder: number; latitude?: number; longitude?: number; createdAt: string; }
export interface RouteEntity { id: string; projectId: string; name: string; description: string; locationIds: string[]; lineStyle: RouteLineStyle; color: string; isFeatured: boolean; createdAt: string; updatedAt: string; }
export interface AdminUser { id: string; username: string; passwordHash: string; role: 'admin'; }
