import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GalleryViewPage } from './GalleryViewPage';

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
      type: 'gallery' as const,
      title: 'Test Gallery',
      description: 'A gallery of photos',
      coverImage: null,
      locationId: null,
      isFeatured: false,
      images: [
        { id: 'img-1', mediaSetId: 'ms-1', url: '/img/1.jpg', thumbnailUrl: '', altText: '', caption: 'Photo 1', sortOrder: 1, createdAt: '', updatedAt: '' },
      ],
    },
    loading: false,
    error: null,
  }),
}));

describe('GalleryViewPage', () => {
  it('renders gallery title and description', () => {
    render(<MemoryRouter><GalleryViewPage /></MemoryRouter>);
    expect(screen.getByText('Test Gallery')).toBeTruthy();
    expect(screen.getByText('A gallery of photos')).toBeTruthy();
  });
});
