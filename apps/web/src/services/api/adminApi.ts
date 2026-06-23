const BASE = '/api';

async function json<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCascadePreview {
  project: { id: string; title: string };
  willDelete: {
    locations: number;
    mediaSets: number;
    mediaImages: number;
    routes: number;
    routeLocations: number;
  };
}

export const projectsApi = {
  list: () => json<Project[]>('/projects'),
  get: (id: string) => json<Project>(`/projects/${id}`),
  create: (data: { title: string; summary: string; description: string; status: string; tags?: string[] }) =>
    json<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ title: string; summary: string; description: string; status: string; tags: string[] }>) =>
    json<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => json<void>(`/projects/${id}`, { method: 'DELETE' }),
  cascadePreview: (id: string) => json<ProjectCascadePreview>(`/projects/${id}/cascade-preview`),
};

export interface Location {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: string;
  latitude: number;
  longitude: number;
  address_text: string;
  visit_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocationCascadePreview {
  location: { id: string; name: string };
  willDelete: {
    mediaSets: number;
    mediaImages: number;
  };
}

export const locationsApi = {
  list: (projectId?: string) => json<Location[]>(`/locations${projectId ? `?project_id=${projectId}` : ''}`),
  get: (id: string) => json<Location>(`/locations/${id}`),
  create: (data: { project_id: string; name: string; description: string; latitude: number; longitude: number; address_text: string; visit_order?: number }) =>
    json<Location>('/locations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; description: string; latitude: number; longitude: number; address_text: string; visit_order: number | null }>) =>
    json<Location>(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => json<void>(`/locations/${id}`, { method: 'DELETE' }),
  cascadePreview: (id: string) => json<LocationCascadePreview>(`/locations/${id}/cascade-preview`),
};

export interface RouteLocationRow {
  route_id: string;
  location_id: string;
  sort_order: number;
}

export interface Route {
  id: string;
  project_id: string;
  name: string;
  description: string;
  line_style: string;
  color: string;
  is_featured: number;
  locations: RouteLocationRow[];
  created_at: string;
  updated_at: string;
}

export interface RouteCascadePreview {
  route: { id: string; name: string };
  willDelete: {
    routeLocations: number;
  };
}

export const routesApi = {
  list: (projectId?: string) => json<Route[]>(`/routes${projectId ? `?project_id=${projectId}` : ''}`),
  get: (id: string) => json<Route>(`/routes/${id}`),
  create: (data: { project_id: string; name: string; description: string; line_style: string; color: string; is_featured?: boolean; location_ids?: string[] }) =>
    json<Route>('/routes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; description: string; line_style: string; color: string; is_featured: boolean; location_ids: string[] }>) =>
    json<Route>(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => json<void>(`/routes/${id}`, { method: 'DELETE' }),
  cascadePreview: (id: string) => json<RouteCascadePreview>(`/routes/${id}/cascade-preview`),
};

export interface MediaSet {
  id: string;
  project_id: string;
  location_id: string | null;
  type: string;
  title: string;
  description: string;
  cover_upload_file_id: string | null;
  is_featured: number;
  created_at: string;
  updated_at: string;
}

export interface MediaSetCascadePreview {
  mediaSet: { id: string; title: string };
  willDelete: {
    mediaImages: number;
  };
}

export const mediaSetsApi = {
  list: (projectId?: string) => json<MediaSet[]>(`/media-sets${projectId ? `?project_id=${projectId}` : ''}`),
  get: (id: string) => json<MediaSet>(`/media-sets/${id}`),
  create: (data: { project_id: string; location_id?: string; type: string; title: string; description: string; is_featured?: boolean }) =>
    json<MediaSet>('/media-sets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ location_id: string; type: string; title: string; description: string; is_featured: boolean }>) =>
    json<MediaSet>(`/media-sets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => json<void>(`/media-sets/${id}`, { method: 'DELETE' }),
  cascadePreview: (id: string) => json<MediaSetCascadePreview>(`/media-sets/${id}/cascade-preview`),
  reorderImages: (mediaSetId: string, imageIds: string[]) =>
    json<{ images: MediaImage[] }>(`/media-sets/${mediaSetId}/images/order`, {
      method: 'PUT',
      body: JSON.stringify({ imageIds }),
    }),
};

export interface MediaImage {
  id: string;
  media_set_id: string;
  upload_file_id: string;
  alt_text: string;
  caption: string;
  sort_order: number;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  updated_at: string;
}

export const mediaImagesApi = {
  list: (mediaSetId?: string) => json<MediaImage[]>(`/media-images${mediaSetId ? `?media_set_id=${mediaSetId}` : ''}`),
  create: (data: { media_set_id: string; upload_file_id: string; alt_text: string; caption: string; sort_order: number; latitude?: number; longitude?: number }) =>
    json<MediaImage>('/media-images', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ alt_text: string; caption: string; sort_order: number; latitude: number; longitude: number }>) =>
    json<MediaImage>(`/media-images/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => json<void>(`/media-images/${id}`, { method: 'DELETE' }),
};
