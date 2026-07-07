import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProjectsPageController } from './useProjectsPageController';

// Replace useToast with a no-op stub so we don't drag ToastProvider (and its
// dismiss timers) into the hook's unit tests. The toast contract is verified
// at the page-level via AdminMediaPage.test.tsx. The mock returns a single
// stable reference every render so callbacks that depend on toast stay
// referentially stable — this mirrors the production toastRef pattern.
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
  projectsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    cascadePreview: vi.fn(),
  },
  locationsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
  mediaSetsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
  routesApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

import { projectsApi } from '@/services/api/adminApi';

describe('useProjectsPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsApi.list).mockResolvedValue([]);
    vi.mocked(projectsApi.delete).mockResolvedValue(undefined);
  });

  it('exposes the documented state, derived, and actions surface', async () => {
    const { result } = renderHook(() => useProjectsPageController());

    expect(result.current.projects).toEqual([]);
    expect(result.current.countsByProject).toEqual({});
    expect(result.current.loading).toBe(true);
    expect(result.current.editingId).toBeNull();
    expect(result.current.title).toBe('');
    expect(result.current.summary).toBe('');
    expect(result.current.description).toBe('');
    expect(result.current.tagsText).toBe('');
    expect(result.current.status).toBe('draft');
    expect(result.current.fieldError).toBe('');
    expect(result.current.cascadeTarget).toBeNull();
    expect(result.current.cascadeDeleting).toBe(false);
    expect(result.current.cascadeError).toBeNull();
    expect(result.current.readinessByProject).toEqual({});

    expect(typeof result.current.setTitle).toBe('function');
    expect(typeof result.current.setSummary).toBe('function');
    expect(typeof result.current.setDescription).toBe('function');
    expect(typeof result.current.setTagsText).toBe('function');
    expect(typeof result.current.setStatus).toBe('function');
    expect(typeof result.current.startEdit).toBe('function');
    expect(typeof result.current.startCreate).toBe('function');
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.requestDelete).toBe('function');
    expect(typeof result.current.cancelCascadeDelete).toBe('function');
    expect(typeof result.current.confirmCascadeDelete).toBe('function');
    expect(typeof result.current.loadPreview).toBe('function');

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('set* setters forward field updates', async () => {
    const { result } = renderHook(() => useProjectsPageController());

    act(() => result.current.setTitle('Hello'));
    act(() => result.current.setSummary('World'));
    act(() => result.current.setDescription('Details'));
    act(() => result.current.setTagsText('a, b, c'));
    act(() => result.current.setStatus('published'));

    expect(result.current.title).toBe('Hello');
    expect(result.current.summary).toBe('World');
    expect(result.current.description).toBe('Details');
    expect(result.current.tagsText).toBe('a, b, c');
    expect(result.current.status).toBe('published');
  });

  it('handleSave blocks when required fields are empty and surfaces fieldError', async () => {
    const { result } = renderHook(() => useProjectsPageController());

    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.fieldError).toBeTruthy();
    expect(projectsApi.create).not.toHaveBeenCalled();
    expect(projectsApi.update).not.toHaveBeenCalled();

    act(() => result.current.setTitle('T'));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(result.current.fieldError).toBeTruthy();
    expect(projectsApi.create).not.toHaveBeenCalled();
  });

  it('startEdit populates the form; startCreate resets it', () => {
    const { result } = renderHook(() => useProjectsPageController());

    act(() =>
      result.current.startEdit({
        id: 'p-1',
        slug: 'p-1',
        title: 'Existing',
        summary: 'Sum',
        description: 'Desc',
        tags: ['x', 'y'],
        status: 'published',
        createdAt: '',
        updatedAt: '',
      }),
    );
    expect(result.current.editingId).toBe('p-1');
    expect(result.current.title).toBe('Existing');
    expect(result.current.summary).toBe('Sum');
    expect(result.current.description).toBe('Desc');
    expect(result.current.tagsText).toBe('x, y');
    expect(result.current.status).toBe('published');

    act(() => result.current.startCreate());
    expect(result.current.editingId).toBeNull();
    expect(result.current.title).toBe('');
    expect(result.current.summary).toBe('');
    expect(result.current.description).toBe('');
    expect(result.current.tagsText).toBe('');
    expect(result.current.status).toBe('draft');
  });

  it('requestDelete sets cascade target; cancelCascadeDelete clears it', () => {
    const { result } = renderHook(() => useProjectsPageController());

    act(() =>
      result.current.requestDelete({
        id: 'p-2',
        slug: 'p-2',
        title: 'Doomed',
        summary: '',
        description: '',
        tags: [],
        status: 'draft',
        createdAt: '',
        updatedAt: '',
      }),
    );
    expect(result.current.cascadeTarget).toEqual({ id: 'p-2', name: 'Doomed' });

    act(() => result.current.cancelCascadeDelete());
    expect(result.current.cascadeTarget).toBeNull();
  });
});