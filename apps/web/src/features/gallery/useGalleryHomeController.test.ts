import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGalleryHomeController } from './useGalleryHomeController';

// Map relationship data is fetched lazily by an upstream hook — feed it an
// empty payload so the controller starts in a deterministic state without
// touching the real /api/public/map-relationship endpoint.
vi.mock('@/features/map/api/fetchMapRelationshipData', () => ({
  fetchMapRelationshipData: vi.fn().mockResolvedValue({
    projects: [],
    locations: [],
    mediaSets: [],
    routes: [],
  }),
}));

describe('useGalleryHomeController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the documented state, derived, and actions surface', () => {
    const { result } = renderHook(() => useGalleryHomeController());

    expect(result.current.viewMode).toBe('gallery');
    expect(result.current.isMapMode).toBe(false);
    expect(result.current.activeLocationId).toBeNull();
    expect(result.current.selectedImage).toBeNull();
    expect(result.current.showGalleryPanel).toBe(false);
    expect(result.current.showLoadingScreen).toBe(true);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.showSearch).toBe(false);
    expect(result.current.mapInstance).toBeNull();
    expect(result.current.loadingImages).toBe(false);
    expect(result.current.bootstrappingGallery).toBe(false);
    expect(result.current.activeProjectId).toBeNull();
    expect(result.current.activeAnchor).toBeNull();
    expect(result.current.activeCluster).toBeNull();
    expect(result.current.activeProject).toBeNull();
    expect(result.current.activeNode).toBeNull();
    expect(result.current.currentImages).toEqual([]);
    expect(result.current.filteredRailImages).toEqual([]);
    expect(result.current.allCurrentImages).toEqual([]);
    expect(result.current.showMediaRail).toBe(false);

    expect(typeof result.current.handleImageSelect).toBe('function');
    expect(typeof result.current.handleMapLocationSelect).toBe('function');
    expect(typeof result.current.handleViewModeToggle).toBe('function');
    expect(typeof result.current.handleLoadingComplete).toBe('function');
    expect(typeof result.current.handleCloseGalleryPanel).toBe('function');
    expect(typeof result.current.handleCloseImageModal).toBe('function');
    expect(typeof result.current.toggleSearch).toBe('function');
    expect(typeof result.current.toggleNightMode).toBe('function');
    expect(typeof result.current.setSearchQuery).toBe('function');
    expect(typeof result.current.setMapInstance).toBe('function');
  });

  it('handleViewModeToggle flips between gallery and map', () => {
    const { result } = renderHook(() => useGalleryHomeController());

    expect(result.current.viewMode).toBe('gallery');
    expect(result.current.isMapMode).toBe(false);

    act(() => result.current.handleViewModeToggle());
    expect(result.current.viewMode).toBe('map');
    expect(result.current.isMapMode).toBe(true);

    // Toggling from map → gallery must also close the gallery panel.
    act(() => {
      result.current.handleMapLocationSelect('loc-1');
    });
    expect(result.current.showGalleryPanel).toBe(true);

    act(() => result.current.handleViewModeToggle());
    expect(result.current.viewMode).toBe('gallery');
    expect(result.current.showGalleryPanel).toBe(false);
  });

  it('handleLoadingComplete hides the loading screen', () => {
    const { result } = renderHook(() => useGalleryHomeController());
    expect(result.current.showLoadingScreen).toBe(true);

    act(() => result.current.handleLoadingComplete());
    expect(result.current.showLoadingScreen).toBe(false);
  });

  it('handleCloseImageModal and handleCloseGalleryPanel reset their state', () => {
    const { result } = renderHook(() => useGalleryHomeController());

    act(() => {
      result.current.handleMapLocationSelect('loc-1');
      result.current.handleImageSelect({
        id: 'img-1',
        mediaSetId: 'ms-1',
        url: 'https://example.test/img.jpg',
        thumbnailUrl: 'https://example.test/img.jpg',
        altText: 'alt',
        caption: 'caption',
        sortOrder: 0,
        latitude: undefined,
        longitude: undefined,
        createdAt: '',
      });
    });
    expect(result.current.selectedImage).not.toBeNull();
    expect(result.current.showGalleryPanel).toBe(true);

    act(() => result.current.handleCloseImageModal());
    expect(result.current.selectedImage).toBeNull();

    act(() => result.current.handleCloseGalleryPanel());
    expect(result.current.showGalleryPanel).toBe(false);
  });

  it('toggleSearch and toggleNightMode flip their respective flags', () => {
    const { result } = renderHook(() => useGalleryHomeController());

    expect(result.current.showSearch).toBe(false);
    act(() => result.current.toggleSearch());
    expect(result.current.showSearch).toBe(true);
    act(() => result.current.toggleSearch());
    expect(result.current.showSearch).toBe(false);

    const initialNightMode = result.current.nightMode;
    act(() => result.current.toggleNightMode());
    expect(result.current.nightMode).toBe(!initialNightMode);
  });

  it('setSearchQuery forwards the new query string', () => {
    const { result } = renderHook(() => useGalleryHomeController());

    act(() => result.current.setSearchQuery('hello'));
    expect(result.current.searchQuery).toBe('hello');

    act(() => result.current.setSearchQuery(''));
    expect(result.current.searchQuery).toBe('');
  });
});