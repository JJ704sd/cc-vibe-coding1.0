import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { GalleryMapBase } from '@/components/gallery/GalleryMapBase';

describe('GalleryMapBase', () => {
  it('renders a map container div', () => {
    const { container } = render(<GalleryMapBase />);
    expect(container.querySelector('.gallery-map-base')).toBeTruthy();
  });
});
