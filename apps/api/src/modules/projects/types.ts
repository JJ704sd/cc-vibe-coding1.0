export type ProjectRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  cover_upload_file_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TagRow = {
  project_id: string;
  tag: string;
};

export type Project = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  coverUploadFileId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
};

export type CreateProjectInput = {
  title: string;
  slug?: string;
  summary: string;
  description: string;
  status: string;
  coverUploadFileId?: string;
  tags?: string[];
};

export type UpdateProjectInput = {
  title?: string;
  slug?: string;
  summary?: string;
  description?: string;
  status?: string;
  coverUploadFileId?: string;
  tags?: string[];
};

export type FindProjectsOptions = {
  projectId?: string;
  status?: 'draft' | 'published';
};
