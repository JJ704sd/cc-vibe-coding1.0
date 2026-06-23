import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminProjectsPage from './AdminProjectsPage';

vi.mock('@/services/api/adminApi', () => {
  return {
    projectsApi: {
      list: vi.fn(async () => [
        {
          id: 'p-tags',
          title: '带标签的项目',
          slug: 'tagged',
          summary: '摘要',
          description: '描述',
          status: 'published',
          tags: ['上海', '历史', '建筑'],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'p-empty',
          title: '无标签项目',
          slug: 'no-tags',
          summary: '摘要',
          description: '描述',
          status: 'draft',
          tags: [],
          createdAt: '',
          updatedAt: '',
        },
      ]),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      cascadePreview: vi.fn(async () => ({
        project: { id: 'p-tags', title: '带标签的项目' },
        willDelete: { locations: 0, mediaSets: 0, mediaImages: 0, routes: 0, routeLocations: 0 },
      })),
    },
    locationsApi: { list: vi.fn(async () => []), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), cascadePreview: vi.fn() },
    mediaSetsApi: { list: vi.fn(async () => []), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), cascadePreview: vi.fn(), reorderImages: vi.fn() },
    routesApi: { list: vi.fn(async () => []), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), cascadePreview: vi.fn() },
  };
});

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <AdminProjectsPage />
    </MemoryRouter>,
  );
}

describe('AdminProjectsPage', () => {
  it('shows tags on each project row', async () => {
    renderWithRouter();
    expect(await screen.findByText('带标签的项目')).toBeTruthy();
    const tagContainer = await screen.findByTestId('project-tags-p-tags');
    expect(tagContainer.textContent).toContain('#上海');
    expect(tagContainer.textContent).toContain('#历史');
    expect(tagContainer.textContent).toContain('#建筑');
  });

  it('omits the tag chip row when a project has no tags', async () => {
    renderWithRouter();
    expect(await screen.findByText('无标签项目')).toBeTruthy();
    expect(screen.queryByTestId('project-tags-p-empty')).toBeNull();
  });

  it('renders a tags input field for the project form', async () => {
    renderWithRouter();
    expect(await screen.findByTestId('project-tags-input')).toBeTruthy();
  });

  it('opens a cascade delete dialog when the delete button is clicked', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderWithRouter();
    const deleteBtn = await screen.findByTestId('project-delete-p-tags');
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getByTestId('cascade-delete-overlay')).toBeTruthy();
    });
  });
});