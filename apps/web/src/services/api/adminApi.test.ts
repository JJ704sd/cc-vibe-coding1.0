import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mediaSetsApi,
  projectsApi,
  locationsApi,
  routesApi,
} from './adminApi';

describe('adminApi cascade preview endpoints', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function jsonResponse(body: unknown, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
      json: async () => body,
    } as Response;
  }

  it('projectsApi.cascadePreview hits the right URL with credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      project: { id: 'p1', title: 'P1' },
      willDelete: { locations: 1, mediaSets: 2, mediaImages: 3, routes: 0, routeLocations: 4 },
    }));
    const result = await projectsApi.cascadePreview('p1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/projects/p1/cascade-preview');
    expect(init).toMatchObject({ credentials: 'include' });
    expect(result.willDelete.mediaImages).toBe(3);
  });

  it('locationsApi.cascadePreview hits the right URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      location: { id: 'l1', name: 'L1' },
      willDelete: { mediaSets: 2, mediaImages: 7 },
    }));
    const result = await locationsApi.cascadePreview('l1');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/locations/l1/cascade-preview');
    expect(result.willDelete.mediaImages).toBe(7);
  });

  it('routesApi.cascadePreview hits the right URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      route: { id: 'r1', name: 'R1' },
      willDelete: { routeLocations: 5 },
    }));
    const result = await routesApi.cascadePreview('r1');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/routes/r1/cascade-preview');
    expect(result.willDelete.routeLocations).toBe(5);
  });

  it('mediaSetsApi.cascadePreview hits the right URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      mediaSet: { id: 'm1', title: 'M1' },
      willDelete: { mediaImages: 4 },
    }));
    const result = await mediaSetsApi.cascadePreview('m1');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/media-sets/m1/cascade-preview');
    expect(result.willDelete.mediaImages).toBe(4);
  });

  it('mediaSetsApi.reorderImages sends PUT with imageIds payload and returns updated images', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      images: [
        { id: 'img-2', media_set_id: 'ms', sort_order: 1 },
        { id: 'img-1', media_set_id: 'ms', sort_order: 2 },
      ],
    }));
    const result = await mediaSetsApi.reorderImages('ms', ['img-2', 'img-1']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/media-sets/ms/images/order');
    expect(init).toMatchObject({
      method: 'PUT',
      credentials: 'include',
    });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ imageIds: ['img-2', 'img-1'] });
    expect(result.images).toHaveLength(2);
    expect(result.images[0].id).toBe('img-2');
  });

  it('throws an error with the HTTP status when the response is not ok', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Too many login attempts',
      json: async () => ({}),
    });
    await expect(projectsApi.cascadePreview('p1')).rejects.toThrow(/429/);
  });
});