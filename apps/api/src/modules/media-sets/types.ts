export type MediaSetType = 'spin360' | 'gallery';

export type MediaSetRow = {
  id: string;
  project_id: string;
  location_id: string | null;
  type: string;
  title: string;
  description: string;
  cover_upload_file_id: string | null;
  is_featured: number;
  created_at: string;
  updated_at: string;
};

export type MediaSet = {
  id: string;
  projectId: string;
  locationId: string | null;
  type: MediaSetType;
  title: string;
  description: string;
  coverUploadFileId: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateMediaSetInput = {
  projectId: string;
  locationId?: string;
  type: MediaSetType;
  title: string;
  description: string;
  coverUploadFileId?: string;
  isFeatured?: boolean;
};

export type UpdateMediaSetInput = {
  locationId?: string;
  type?: MediaSetType;
  title?: string;
  description?: string;
  coverUploadFileId?: string;
  isFeatured?: boolean;
};
