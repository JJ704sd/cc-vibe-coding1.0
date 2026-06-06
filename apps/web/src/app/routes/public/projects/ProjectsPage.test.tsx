import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsPage } from './ProjectsPage';

const usePublicProjectsMock = vi.fn();

vi.mock('@/features/projects/api/usePublicProjects', () => ({
  usePublicProjects: () => usePublicProjectsMock(),
}));

describe('ProjectsPage', () => {
  it('renders published projects from the public API hook', () => {
    usePublicProjectsMock.mockReturnValue({
      projects: [
        { id: 'project-1', slug: 'trace-scope', title: 'Trace Scope', summary: 'A project about traces', coverImage: null, tags: ['china'], status: 'published' },
      ],
      loading: false,
      error: null,
    });
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByText('Trace Scope')).toBeTruthy();
  });

  it('shows project count', () => {
    usePublicProjectsMock.mockReturnValue({
      projects: [
        { id: 'project-1', slug: 'trace-scope', title: 'Trace Scope', summary: 'A project about traces', coverImage: null, tags: ['china'], status: 'published' },
      ],
      loading: false,
      error: null,
    });
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByText('1 projects')).toBeTruthy();
  });

  it('shows a loading hint while the public list is in flight', () => {
    usePublicProjectsMock.mockReturnValue({
      projects: [],
      loading: true,
      error: null,
    });
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByTestId('projects-loading')).toBeTruthy();
  });

  it('surfaces the error from the public API instead of an empty grid', () => {
    usePublicProjectsMock.mockReturnValue({
      projects: [],
      loading: false,
      error: new Error('Network down'),
    });
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    const errorBlock = screen.getByTestId('projects-error');
    expect(errorBlock.textContent).toContain('Network down');
  });

  it('shows an empty state when the API returns no published projects', () => {
    usePublicProjectsMock.mockReturnValue({
      projects: [],
      loading: false,
      error: null,
    });
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByTestId('projects-empty')).toBeTruthy();
  });
});
