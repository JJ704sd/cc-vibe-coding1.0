export type MediaImageRow = {
  id: string;
  media_set_id: string;
  upload_file_id: string;
  alt_text: string;
  caption: string;
  sort_order: number;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaImageInput = {
  media_set_id: string;
  upload_file_id: string;
  alt_text: string;
  caption: string;
  sort_order: number;
  latitude?: number;
  longitude?: number;
};

export type MediaImageUpdate = {
  alt_text?: string;
  caption?: string;
  sort_order?: number;
  latitude?: number;
  longitude?: number;
};
