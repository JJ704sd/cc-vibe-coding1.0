import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectDetailPage } from './ProjectDetailPage';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ projectId: 'proj-1' }),
  };
});

vi.mock('@/features/projects/api/usePublicProjectDetail', () => ({
  usePublicProjectDetail: () => ({
    data: {
      project: { id: 'proj-1', slug: 'proj', title: 'My Project', summary: 'summary', description: 'A detailed description', coverImage: null, tags: ['china'], status: 'published' as const },
      locations: [
        { id: 'loc-1', name: 'Shanghai', slug: 'shanghai', description: 'desc', latitude: 31.24, longitude: 121.49, addressText: 'Shanghai, China', visitOrder: 1, projectId: 'proj-1', createdAt: '', updatedAt: '' },
      ],
      mediaSets: [],
      routes: [],
    },
    loading: false,
    error: null,
  }),
}));

describe('ProjectDetailPage', () => {
  it('renders project title and description', () => {
    render(<MemoryRouter><ProjectDetailPage /></MemoryRouter>);
    expect(screen.getByText('My Project')).toBeTruthy();
    expect(screen.getByText('A detailed description')).toBeTruthy();
  });

  it('renders locations', () => {
    render(<MemoryRouter><ProjectDetailPage /></MemoryRouter>);
    expect(screen.getAllByText('Shanghai').length).toBeGreaterThan(0);
  });
});
