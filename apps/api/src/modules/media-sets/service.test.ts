import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSetService } from './service.js';
import { AppError } from '../../app/errors.js';
import type { MediaImageRow } from '../media-images/types.js';
import type { MediaSetRow } from './types.js';

const baseMediaSet = (overrides: Partial<MediaSetRow> = {}): MediaSetRow => ({
  id: 'ms-1',
  project_id: 'p-1',
  location_id: null,
  type: 'gallery',
  title: 't',
  description: 'd',
  cover_upload_file_id: null,
  is_featured: 0,
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('MediaSetService - reorderImages', () => {
  const baseRow = (id: string, sortOrder = 0): MediaImageRow => ({
    id,
    media_set_id: 'ms-1',
    upload_file_id: `u-${id}`,
    alt_text: '',
    caption: '',
    sort_order: sortOrder,
    latitude: null,
    longitude: null,
    created_at: '',
    updated_at: '',
  });

  let repository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByProjectId: ReturnType<typeof vi.fn>;
    findByLocationId: ReturnType<typeof vi.fn>;
    upsertMediaSet: ReturnType<typeof vi.fn>;
    deleteMediaSet: ReturnType<typeof vi.fn>;
    findMediaImagesByMediaSetId: ReturnType<typeof vi.fn>;
    reorderMediaImages: ReturnType<typeof vi.fn>;
    countMediaImagesByMediaSetId: ReturnType<typeof vi.fn>;
    findProjectById: ReturnType<typeof vi.fn>;
    findLocationById: ReturnType<typeof vi.fn>;
    findUploadFileById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByProjectId: vi.fn(),
      findByLocationId: vi.fn(),
      upsertMediaSet: vi.fn(),
      deleteMediaSet: vi.fn(),
      findMediaImagesByMediaSetId: vi.fn(),
      reorderMediaImages: vi.fn(),
      countMediaImagesByMediaSetId: vi.fn(),
      findProjectById: vi.fn(),
      findLocationById: vi.fn(),
      findUploadFileById: vi.fn(),
    };
  });

  it('rejects an empty imageIds array', async () => {
    const service = new MediaSetService(repository);

    await expect(service.reorderImages('ms-1', [])).rejects.toBeInstanceOf(AppError);
  });

  it('throws 404 when the media set does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    const service = new MediaSetService(repository);

    await expect(service.reorderImages('ms-1', ['img-1'])).rejects.toMatchObject({
      statusCode: 404,
      message: 'Media set not found',
    });
    expect(repository.reorderMediaImages).not.toHaveBeenCalled();
  });

  it('rejects duplicate ids in the requested order', async () => {
    repository.findById.mockResolvedValue(baseMediaSet());
    repository.findMediaImagesByMediaSetId.mockResolvedValue([{ id: 'img-1' }, { id: 'img-2' }]);
    const service = new MediaSetService(repository);

    await expect(service.reorderImages('ms-1', ['img-1', 'img-1'])).rejects.toMatchObject({
      statusCode: 400,
      message: 'imageIds must not contain duplicates',
    });
    expect(repository.reorderMediaImages).not.toHaveBeenCalled();
  });

  it('rejects ids that do not belong to the media set', async () => {
    repository.findById.mockResolvedValue(baseMediaSet());
    repository.findMediaImagesByMediaSetId.mockResolvedValue([{ id: 'img-1' }, { id: 'img-2' }]);
    const service = new MediaSetService(repository);

    await expect(service.reorderImages('ms-1', ['img-1', 'img-other'])).rejects.toMatchObject({
      statusCode: 400,
      message: 'imageId img-other does not belong to this media set',
    });
    expect(repository.reorderMediaImages).not.toHaveBeenCalled();
  });

  it('rejects a partial list that omits some of the existing images', async () => {
    repository.findById.mockResolvedValue(baseMediaSet());
    repository.findMediaImagesByMediaSetId.mockResolvedValue([{ id: 'img-1' }, { id: 'img-2' }, { id: 'img-3' }]);
    const service = new MediaSetService(repository);

    await expect(service.reorderImages('ms-1', ['img-1', 'img-2'])).rejects.toMatchObject({
      statusCode: 400,
      message: 'imageIds must include every image of the media set exactly once',
    });
    expect(repository.reorderMediaImages).not.toHaveBeenCalled();
  });

  it('delegates to the repository when validation passes', async () => {
    repository.findById.mockResolvedValue(baseMediaSet());
    repository.findMediaImagesByMediaSetId.mockResolvedValue([{ id: 'img-1' }, { id: 'img-2' }, { id: 'img-3' }]);
    const reordered = [baseRow('img-3', 0), baseRow('img-1', 1), baseRow('img-2', 2)];
    repository.reorderMediaImages.mockResolvedValue(reordered);
    const service = new MediaSetService(repository);

    const result = await service.reorderImages('ms-1', ['img-3', 'img-1', 'img-2']);

    expect(repository.reorderMediaImages).toHaveBeenCalledWith({
      mediaSetId: 'ms-1',
      imageIds: ['img-3', 'img-1', 'img-2'],
    });
    expect(result).toEqual(reordered);
  });
});

describe('MediaSetService - cascadePreview', () => {
  let repository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByProjectId: ReturnType<typeof vi.fn>;
    findByLocationId: ReturnType<typeof vi.fn>;
    upsertMediaSet: ReturnType<typeof vi.fn>;
    deleteMediaSet: ReturnType<typeof vi.fn>;
    findMediaImagesByMediaSetId: ReturnType<typeof vi.fn>;
    reorderMediaImages: ReturnType<typeof vi.fn>;
    countMediaImagesByMediaSetId: ReturnType<typeof vi.fn>;
    findProjectById: ReturnType<typeof vi.fn>;
    findLocationById: ReturnType<typeof vi.fn>;
    findUploadFileById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByProjectId: vi.fn(),
      findByLocationId: vi.fn(),
      upsertMediaSet: vi.fn(),
      deleteMediaSet: vi.fn(),
      findMediaImagesByMediaSetId: vi.fn(),
      reorderMediaImages: vi.fn(),
      countMediaImagesByMediaSetId: vi.fn(),
      findProjectById: vi.fn(),
      findLocationById: vi.fn(),
      findUploadFileById: vi.fn(),
    };
  });

  it('returns null when the media set does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    const service = new MediaSetService(repository);

    const result = await service.cascadePreview('missing');

    expect(result).toBeNull();
  });

  it('counts media images under the media set', async () => {
    repository.findById.mockResolvedValue(baseMediaSet());
    repository.countMediaImagesByMediaSetId.mockResolvedValue(4);

    const service = new MediaSetService(repository);
    const result = await service.cascadePreview('ms-1');

    expect(result).toEqual({
      mediaSet: { id: 'ms-1', title: 't' },
      willDelete: { mediaImages: 4 },
    });
  });
});