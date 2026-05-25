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

export type RouteWithLocations = RouteRow & {
  locations: RouteLocationRow[];
};

export type CreateRouteInput = {
  project_id: string;
  name: string;
  description: string;
  line_style: string;
  color: string;
  is_featured?: boolean;
  location_ids?: string[];
};

export type UpdateRouteInput = {
  name?: string;
  description?: string;
  line_style?: string;
  color?: string;
  is_featured?: boolean;
  location_ids?: unknown;
};
