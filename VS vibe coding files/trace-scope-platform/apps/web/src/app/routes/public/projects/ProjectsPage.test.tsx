import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsPage } from './ProjectsPage';

vi.mock('@/features/projects/api/usePublicProjects', () => ({
  usePublicProjects: () => ({
    projects: [
      { id: 'project-1', slug: 'trace-scope', title: 'Trace Scope', summary: 'A project about traces', coverImage: null, tags: ['china'], status: 'published' },
    ],
    loading: false,
    error: null,
  }),
}));

describe('ProjectsPage', () => {
  it('renders published projects from the public API hook', () => {
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByText('Trace Scope')).toBeTruthy();
  });

  it('shows project count', () => {
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByText('1 projects')).toBeTruthy();
  });
});
