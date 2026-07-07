import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaPageController } from './useMediaPageController';

const stubToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  show: vi.fn(),
  dismiss: vi.fn(),
};

vi.mock('@/components/common/useToast', () => ({
  useToast: () => stubToast,
}));

vi.mock('@/services/api/adminApi', () => ({
  mediaSetsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    cascadePreview: vi.fn(),
    reorderImages: vi.fn().mockResolvedValue({ images: [] }),
  },
  mediaImagesApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  projectsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
  locationsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

import { mediaImagesApi } from '@/services/api/adminApi';

function makeFile(name = 'photo.jpg'): File {
  return new File(['fake-bytes'], name, { type: 'image/jpeg' });
}

describe('useMediaPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mediaImagesApi.create).mockResolvedValue({
      id: 'img-1',
      media_set_id: 'ms-1',
      upload_file_id: 'up-1',
      alt_text: '',
      caption: '',
      sort_order: 1,
      latitude: null,
      longitude: null,
      created_at: '',
      updated_at: '',
    });
    // jsdom does not implement FormData.get / fetch by default for the
    // multipart upload branch — keep it minimal by stubbing global fetch.
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'up-1' }), { status: 200 }),
    ) as unknown as typeof fetch;
  });

  it('exposes the documented state, derived, and actions surface', async () => {
    const { result } = renderHook(() => useMediaPageController());

    expect(result.current.mediaSets).toEqual([]);
    expect(result.current.mediaImages).toEqual([]);
    expect(result.current.projects).toEqual([]);
    expect(result.current.locations).toEqual([]);
    expect(result.current.loading).toBe(true);

    expect(result.current.editingId).toBeNull();
    expect(result.current.selectedMediaSetId).toBeNull();
    expect(result.current.projectId).toBe('');
    expect(result.current.locationId).toBe('');

    expect(result.current.dragImageId).toBeNull();
    expect(result.current.dragOverImageId).toBeNull();
    expect(result.current.reordering).toBe(false);

    expect(result.current.cascadeTarget).toBeNull();
    expect(result.current.imageDeleteTarget).toBeNull();

    expect(result.current.selectedMediaSet).toBeNull();
    expect(result.current.selectedImages).toEqual([]);
    expect(result.current.locationsForProject).toEqual([]);

    expect(typeof result.current.setProjectId).toBe('function');
    expect(typeof result.current.setLocationId).toBe('function');
    expect(typeof result.current.setTitle).toBe('function');
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.handleUploadImage).toBe('function');

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('setProjectId also clears locationId so a stale location does not leak across projects', () => {
    const { result } = renderHook(() => useMediaPageController());

    act(() => result.current.setLocationId('loc-1'));
    expect(result.current.locationId).toBe('loc-1');

    act(() => result.current.setProjectId('proj-1'));
    expect(result.current.projectId).toBe('proj-1');
    expect(result.current.locationId).toBe('');
  });

  it('handleUploadImage parses latitude and longitude to numbers', async () => {
    const { result } = renderHook(() => useMediaPageController());

    act(() => result.current.setSelectedMediaSetId('ms-1'));
    act(() => result.current.setImageLatitude('31.2304'));
    act(() => result.current.setImageLongitude('121.4737'));

    await act(async () => {
      await result.current.handleUploadImage(makeFile('shanghai.jpg'));
    });

    expect(mediaImagesApi.create).toHaveBeenCalledTimes(1);
    const createCall = vi.mocked(mediaImagesApi.create).mock.calls[0][0];
    expect(createCall.latitude).toBeCloseTo(31.2304);
    expect(createCall.longitude).toBeCloseTo(121.4737);
  });

  it('handleUploadImage omits latitude/longitude when the inputs are empty', async () => {
    const { result } = renderHook(() => useMediaPageController());

    act(() => result.current.setSelectedMediaSetId('ms-1'));

    await act(async () => {
      await result.current.handleUploadImage(makeFile());
    });

    const createCall = vi.mocked(mediaImagesApi.create).mock.calls[0][0];
    expect(createCall.latitude).toBeUndefined();
    expect(createCall.longitude).toBeUndefined();
  });

  it('handleUploadImage surfaces an error when no media set is selected', async () => {
    const { result } = renderHook(() => useMediaPageController());

    await act(async () => {
      await result.current.handleUploadImage(makeFile());
    });

    expect(stubToast.error).toHaveBeenCalledWith('请先选择一个媒体组');
    expect(mediaImagesApi.create).not.toHaveBeenCalled();
  });

  // BUG-037 regression: confirmImageDelete must early-return when no
  // target is selected, never dereferencing a non-null-asserted
  // imageDeleteTarget!.id that would throw after the dialog closes.
  it('confirmImageDelete is a no-op when no image delete target is set', async () => {
    const { result } = renderHook(() => useMediaPageController());

    await act(async () => {
      await result.current.confirmImageDelete();
    });

    expect(mediaImagesApi.delete).not.toHaveBeenCalled();
    expect(stubToast.error).not.toHaveBeenCalled();
    expect(stubToast.success).not.toHaveBeenCalled();
  });
});