import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SpinViewPage } from './SpinViewPage';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ mediaSetId: 'ms-1' }),
  };
});

vi.mock('@/features/media/api/usePublicMediaSet', () => ({
  usePublicMediaSet: () => ({
    data: {
      id: 'ms-1',
      type: 'spin360' as const,
      title: '360 Spin Set',
      description: 'A 360 spin experience',
      coverImage: null,
      locationId: null,
      isFeatured: false,
      images: [
        { id: 'img-1', mediaSetId: 'ms-1', url: '/spin/1.jpg', thumbnailUrl: '', altText: '', caption: 'Frame 1', sortOrder: 1, createdAt: '', updatedAt: '' },
      ],
    },
    loading: false,
    error: null,
  }),
}));

describe('SpinViewPage', () => {
  it('renders spin360 title and description', () => {
    render(<MemoryRouter><SpinViewPage /></MemoryRouter>);
    expect(screen.getByText('360 Spin Set')).toBeTruthy();
    expect(screen.getByText('A 360 spin experience')).toBeTruthy();
  });
});
