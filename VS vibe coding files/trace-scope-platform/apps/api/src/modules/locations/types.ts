export type LocationRow = {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: string;
  latitude: string;
  longitude: string;
  address_text: string;
  visit_order: number | null;
  created_at: string;
  updated_at: string;
};

export type CreateLocationInput = {
  project_id: string;
  name: string;
  slug?: string;
  description: string;
  latitude: number;
  longitude: number;
  address_text: string;
  visit_order?: number;
};

export type UpdateLocationInput = {
  name?: string;
  slug?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address_text?: string;
  visit_order?: number;
};
