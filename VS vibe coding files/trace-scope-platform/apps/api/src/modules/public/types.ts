export type ProjectCardRow = {
  id: string;
  slug: string;
  title: string;
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

export type LocationRow = {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: string;
  latitude: number;
  longitude: number;
  address_text: string;
  visit_order: number | null;
  created_at: string;
  updated_at: string;
};

export type MediaSetRow = {
  id: string;
  project_id: string;
  type: string;
  title: string;
  description: string;
  cover_upload_file_id: string | null;
  location_id: string | null;
  is_featured: number;
  created_at: string;
  updated_at: string;
};

export type MediaImageRow = {
  id: string;
  media_set_id: string;
  upload_file_id: string;
  caption: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type RouteRow = {
  id: string;
  project_id: string;
  name: string;
  description: string;
  line_style: string;
  color: string;
  is_featured: number;
  created_at: string;
  updated_at: string;
};

export type RouteLocationRow = {
  route_id: string;
  location_id: string;
  sort_order: number;
};

export type UploadFileRow = {
  id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  sha256_hash: string;
  created_at: string;
};
