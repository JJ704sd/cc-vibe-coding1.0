import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminMediaPage from './AdminMediaPage';

vi.mock('@/services/api/adminApi', () => ({
  mediaSetsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    cascadePreview: vi.fn(),
    reorderImages: vi.fn(),
  },
  mediaImagesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  projectsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    cascadePreview: vi.fn(),
  },
  locationsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    cascadePreview: vi.fn(),
  },
}));

import { mediaSetsApi, mediaImagesApi, projectsApi, locationsApi } from '@/services/api/adminApi';

function makeImage(id: string, sortOrder: number) {
  return {
    id,
    media_set_id: 'ms-1',
    upload_file_id: `upload-${id}`,
    alt_text: `alt-${id}`,
    caption: `caption-${id}`,
    sort_order: sortOrder,
    latitude: null,
    longitude: null,
    created_at: '',
    updated_at: '',
  };
}

function setupMockData() {
  vi.mocked(projectsApi.list).mockResolvedValue([
    { id: 'proj-a', title: '项目A', slug: 'a', summary: '', description: '', status: 'published', tags: [], createdAt: '', updatedAt: '' },
    { id: 'proj-b', title: '项目B', slug: 'b', summary: '', description: '', status: 'draft', tags: [], createdAt: '', updatedAt: '' },
  ]);
  vi.mocked(locationsApi.list).mockResolvedValue([
    { id: 'loc-a', project_id: 'proj-a', name: '地点A-1', slug: 'a1', description: '', latitude: 0, longitude: 0, address_text: '', visit_order: null, created_at: '', updated_at: '' },
    { id: 'loc-a2', project_id: 'proj-a', name: '地点A-2', slug: 'a2', description: '', latitude: 0, longitude: 0, address_text: '', visit_order: null, created_at: '', updated_at: '' },
    { id: 'loc-b', project_id: 'proj-b', name: '地点B-1', slug: 'b1', description: '', latitude: 0, longitude: 0, address_text: '', visit_order: null, created_at: '', updated_at: '' },
  ]);
  vi.mocked(mediaSetsApi.list).mockResolvedValue([
    { id: 'ms-1', project_id: 'proj-a', location_id: null, type: 'gallery', title: '媒体组1', description: '', cover_upload_file_id: null, is_featured: 0, created_at: '', updated_at: '' },
  ]);
  vi.mocked(mediaImagesApi.list).mockResolvedValue([
    makeImage('img-1', 1),
    makeImage('img-2', 2),
    makeImage('img-3', 3),
  ]);
  vi.mocked(mediaSetsApi.cascadePreview).mockResolvedValue({
    mediaSet: { id: 'ms-1', title: '媒体组1' },
    willDelete: { mediaImages: 3 },
  });
  vi.mocked(mediaSetsApi.delete).mockResolvedValue(undefined);
  vi.mocked(mediaImagesApi.delete).mockResolvedValue(undefined);
  vi.mocked(mediaSetsApi.reorderImages).mockImplementation(async (_id, imageIds) => ({
    images: imageIds.map((id: string, idx: number) => makeImage(id, idx + 1)),
  }));
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMediaPage />
    </MemoryRouter>,
  );
}

describe('AdminMediaPage', () => {
  it('filters the location dropdown by the chosen project', async () => {
    setupMockData();
    renderPage();
    await waitFor(() => expect(screen.getByText('媒体组1')).toBeTruthy());
    const projectSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    act(() => { fireEvent.change(projectSelect, { target: { value: 'proj-a' } }); });
    const locationSelect = screen.getByTestId('mediaset-location-select') as HTMLSelectElement;
    const optionTexts = Array.from(locationSelect.querySelectorAll('option')).map(o => o.textContent);
    expect(optionTexts).toEqual(expect.arrayContaining(['不绑定主地点', '地点A-1', '地点A-2']));
    expect(optionTexts).not.toContain('地点B-1');
  });

  it('calls reorderImages API with the new order when an image is moved down', async () => {
    setupMockData();
    renderPage();
    await waitFor(() => expect(screen.getByText('媒体组1')).toBeTruthy());
    const manageButtons = screen.getAllByRole('button', { name: '管理图片' });
    await act(async () => { fireEvent.click(manageButtons[0]); });
    const downButton = await screen.findByTestId('media-image-down-img-1');
    await act(async () => { fireEvent.click(downButton); });
    await waitFor(() => {
      expect(mediaSetsApi.reorderImages).toHaveBeenCalled();
    });
    const [calledMediaSetId, calledImageIds] = vi.mocked(mediaSetsApi.reorderImages).mock.calls[0];
    expect(calledMediaSetId).toBe('ms-1');
    expect(calledImageIds).toEqual(['img-2', 'img-1', 'img-3']);
  });

  it('opens cascade delete dialog and confirms via API when user confirms', async () => {
    setupMockData();
    renderPage();
    const deleteBtn = await screen.findByTestId('mediaset-delete-ms-1');
    await act(async () => { fireEvent.click(deleteBtn); });
    expect(await screen.findByTestId('cascade-delete-overlay')).toBeTruthy();
    expect(mediaSetsApi.cascadePreview).toHaveBeenCalledWith('ms-1');
    const confirmBtn = await screen.findByTestId('cascade-delete-confirm');
    await act(async () => { fireEvent.click(confirmBtn); });
    await waitFor(() => {
      expect(mediaSetsApi.delete).toHaveBeenCalledWith('ms-1');
    });
  });
});