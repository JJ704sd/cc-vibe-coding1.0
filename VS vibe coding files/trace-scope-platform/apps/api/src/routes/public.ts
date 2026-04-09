import type { FastifyInstance } from "fastify";
import { getPool, queryAll, queryOne } from "../infrastructure/db/helpers.js";
import { AppError } from "../app/errors.js";
import type { LocalFileStorage } from "../infrastructure/storage/localFileStorage.js";

type ProjectCardRow = {
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

type TagRow = {
  project_id: string;
  tag: string;
};

type LocationRow = {
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

type MediaSetRow = {
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

type MediaImageRow = {
  id: string;
  media_set_id: string;
  upload_file_id: string;
  caption: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type RouteRow = {
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

type RouteLocationRow = {
  route_id: string;
  location_id: string;
  sort_order: number;
};

type UploadFileRow = {
  id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  sha256_hash: string;
  created_at: string;
};

/**
 * Check if a file is reachable from any published content.
 * A file is considered public if it's referenced by:
 * - A published project's cover image
 * - A published project's media set's cover image
 * - A media image belonging to a published project's media set
 */
const isFileReachableFromPublishedContent = async (
  pool: Awaited<ReturnType<typeof getPool>>,
  fileId: string
): Promise<boolean> => {
  // Get all published project IDs
  const publishedProjects = await queryAll<{ id: string }>(
    pool,
    `SELECT id FROM project WHERE status = 'published'`,
    []
  );

  if (publishedProjects.length === 0) {
    return false;
  }

  const publishedIds = publishedProjects.map((p) => p.id);
  const placeholders = publishedIds.map(() => "?").join(",");

  // Check if file is a project cover
  const projectCover = await queryOne<{ id: string }>(
    pool,
    `SELECT id FROM project WHERE cover_upload_file_id = ? AND status = 'published'`,
    [fileId]
  );
  if (projectCover) return true;

  // Check if file is a media_set cover for a published project
  const mediaSetCover = await queryOne<{ id: string }>(
    pool,
    `SELECT ms.id FROM media_set ms
     JOIN project p ON ms.project_id = p.id
     WHERE ms.cover_upload_file_id = ? AND p.status = 'published'`,
    [fileId]
  );
  if (mediaSetCover) return true;

  // Check if file is a media_image in a published project's media set
  const mediaImage = await queryOne<{ id: string }>(
    pool,
    `SELECT mi.id FROM media_image mi
     JOIN media_set ms ON mi.media_set_id = ms.id
     JOIN project p ON ms.project_id = p.id
     WHERE mi.upload_file_id = ? AND p.status = 'published'`,
    [fileId]
  );
  if (mediaImage) return true;

  return false;
};

export const registerPublicRoutes = (server: FastifyInstance, storage: LocalFileStorage) => {
  // GET /api/public/projects - list all published projects
  server.get("/api/public/projects", async () => {
    const pool = getPool();

    const projects = await queryAll<ProjectCardRow>(
      pool,
      `SELECT * FROM project WHERE status = 'published' ORDER BY created_at DESC`,
      []
    );

    if (projects.length === 0) {
      return { items: [] };
    }

    const ids = projects.map((p) => p.id);
    const tagsPlaceholders = ids.map(() => "?").join(",");
    const tags = await queryAll<TagRow>(
      pool,
      `SELECT * FROM project_tag WHERE project_id IN (${tagsPlaceholders})`,
      ids
    );

    const tagsByProject: Record<string, string[]> = {};
    for (const tag of tags) {
      if (!tagsByProject[tag.project_id]) tagsByProject[tag.project_id] = [];
      tagsByProject[tag.project_id].push(tag.tag);
    }

    const items = projects.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      coverImage: p.cover_upload_file_id,
      tags: tagsByProject[p.id] ?? [],
      status: "published" as const,
    }));

    return { items };
  });

  // GET /api/public/projects/:projectIdOrSlug - get published project detail
  server.get<{ Params: { projectIdOrSlug: string } }>(
    "/api/public/projects/:projectIdOrSlug",
    async (request, reply) => {
      const pool = getPool();
      const { projectIdOrSlug } = request.params;

      // Try to find by ID first, then by slug
      let project = await queryOne<ProjectCardRow>(
        pool,
        `SELECT * FROM project WHERE id = ? AND status = 'published'`,
        [projectIdOrSlug]
      );

      if (!project) {
        project = await queryOne<ProjectCardRow>(
          pool,
          `SELECT * FROM project WHERE slug = ? AND status = 'published'`,
          [projectIdOrSlug]
        );
      }

      if (!project) {
        throw new AppError("Published project not found", 404);
      }

      // Fetch tags
      const tags = await queryAll<TagRow>(
        pool,
        `SELECT tag FROM project_tag WHERE project_id = ?`,
        [project.id]
      );

      // Fetch locations
      const locations = await queryAll<LocationRow>(
        pool,
        `SELECT * FROM location WHERE project_id = ? ORDER BY visit_order`,
        [project.id]
      );

      // Fetch media sets
      const mediaSets = await queryAll<MediaSetRow>(
        pool,
        `SELECT * FROM media_set WHERE project_id = ?`,
        [project.id]
      );

      // Fetch routes
      const routes = await queryAll<RouteRow>(
        pool,
        `SELECT * FROM route WHERE project_id = ?`,
        [project.id]
      );

      // Fetch route-location associations
      if (routes.length > 0) {
        const routeIds = routes.map((r) => r.id);
        const routePlaceholders = routeIds.map(() => "?").join(",");
        const routeLocations = await queryAll<RouteLocationRow>(
          pool,
          `SELECT * FROM route_location WHERE route_id IN (${routePlaceholders}) ORDER BY sort_order`,
          routeIds
        );

        const locationsByRoute: Record<string, string[]> = {};
        for (const rl of routeLocations) {
          if (!locationsByRoute[rl.route_id]) locationsByRoute[rl.route_id] = [];
          locationsByRoute[rl.route_id].push(rl.location_id);
        }

        for (const route of routes) {
          (route as unknown as Record<string, unknown>).locationIds = locationsByRoute[route.id] ?? [];
        }
      }

      return {
        project: {
          id: project.id,
          slug: project.slug,
          title: project.title,
          summary: project.summary,
          description: project.description,
          coverImage: project.cover_upload_file_id,
          tags: tags.map((t) => t.tag),
          status: "published",
        },
        locations: locations.map((l) => ({
          id: l.id,
          name: l.name,
          slug: l.slug,
          description: l.description,
          latitude: l.latitude,
          longitude: l.longitude,
          addressText: l.address_text,
          visitOrder: l.visit_order,
        })),
        mediaSets: mediaSets.map((ms) => ({
          id: ms.id,
          type: ms.type as "spin360" | "gallery",
          title: ms.title,
          description: ms.description,
          coverImage: ms.cover_upload_file_id,
          locationId: ms.location_id,
          isFeatured: Boolean(ms.is_featured),
        })),
        routes: routes.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          lineStyle: r.line_style as "solid" | "dashed",
          color: r.color,
          locationIds: ((r as unknown as Record<string, unknown>).locationIds as string[]) ?? [],
          isFeatured: Boolean(r.is_featured),
        })),
      };
    }
  );

  // GET /api/public/media-sets/:mediaSetId - get published media set with images
  server.get<{ Params: { mediaSetId: string } }>(
    "/api/public/media-sets/:mediaSetId",
    async (request, reply) => {
      const pool = getPool();
      const { mediaSetId } = request.params;

      // First verify the media set belongs to a published project
      const mediaSet = await queryOne<MediaSetRow>(
        pool,
        `SELECT ms.* FROM media_set ms
         JOIN project p ON ms.project_id = p.id
         WHERE ms.id = ? AND p.status = 'published'`,
        [mediaSetId]
      );

      if (!mediaSet) {
        throw new AppError("Published media set not found", 404);
      }

      // Fetch media images
      const images = await queryAll<MediaImageRow>(
        pool,
        `SELECT * FROM media_image WHERE media_set_id = ? ORDER BY sort_order`,
        [mediaSetId]
      );

      // Fetch upload file details for each image
      if (images.length > 0) {
        const fileIds = images.map((img) => img.upload_file_id);
        const filePlaceholders = fileIds.map(() => "?").join(",");
        const files = await queryAll<UploadFileRow>(
          pool,
          `SELECT * FROM upload_file WHERE id IN (${filePlaceholders})`,
          fileIds
        );
        const filesById: Record<string, UploadFileRow> = {};
        for (const file of files) {
          filesById[file.id] = file;
        }

        for (const image of images) {
          const file = filesById[image.upload_file_id];
          if (file) {
            (image as unknown as Record<string, unknown>).url = `/api/public/uploads/${file.id}`;
            (image as unknown as Record<string, unknown>).mimeType = file.mime_type;
          }
        }
      }

      return {
        id: mediaSet.id,
        type: mediaSet.type,
        title: mediaSet.title,
        description: mediaSet.description,
        coverImage: mediaSet.cover_upload_file_id,
        locationId: mediaSet.location_id,
        isFeatured: Boolean(mediaSet.is_featured),
        images: images.map((img) => ({
          id: img.id,
          caption: img.caption,
          sortOrder: img.sort_order,
          url: ((img as unknown as Record<string, unknown>).url as string) ?? null,
          mimeType: ((img as unknown as Record<string, unknown>).mimeType as string) ?? null,
        })),
      };
    }
  );

  // GET /api/public/uploads/:fileId - serve uploaded file if reachable from published content
  server.get<{ Params: { fileId: string } }>(
    "/api/public/uploads/:fileId",
    async (request, reply) => {
      const pool = getPool();
      const { fileId } = request.params;

      // Check if file exists
      const file = await queryOne<UploadFileRow>(
        pool,
        `SELECT * FROM upload_file WHERE id = ?`,
        [fileId]
      );

      if (!file) {
        throw new AppError("File not found", 404);
      }

      // Check if file is reachable from published content
      if (!await isFileReachableFromPublishedContent(pool, fileId)) {
        throw new AppError("File not found", 404);
      }

      // Get the file from storage
      const fileResult = await storage.getFile(file.storage_key);
      if (!fileResult) {
        throw new AppError("File not found", 404);
      }

      reply.header("Content-Type", fileResult.mimeType);
      reply.header("Cache-Control", "public, max-age=300");
      return reply.send(fileResult.stream);
    }
  );

  // GET /api/public/map-relationship - get source data for map visualization
  // Returns the raw source shape expected by buildMapRelationshipViewModel
  server.get("/api/public/map-relationship", async () => {
    const pool = getPool();

    // Get all published projects with tags
    const projects = await queryAll<ProjectCardRow>(
      pool,
      `SELECT * FROM project WHERE status = 'published'`,
      []
    );

    if (projects.length === 0) {
      return { projects: [], locations: [], mediaSets: [], routes: [] };
    }

    const projectIds = projects.map((p) => p.id);
    const projectPlaceholders = projectIds.map(() => "?").join(",");

    // Get tags for projects
    const tags = await queryAll<TagRow>(
      pool,
      `SELECT * FROM project_tag WHERE project_id IN (${projectPlaceholders})`,
      projectIds
    );
    const tagsByProject: Record<string, string[]> = {};
    for (const tag of tags) {
      if (!tagsByProject[tag.project_id]) tagsByProject[tag.project_id] = [];
      tagsByProject[tag.project_id].push(tag.tag);
    }

    // Get all locations for published projects
    const locations = await queryAll<LocationRow>(
      pool,
      `SELECT * FROM location WHERE project_id IN (${projectPlaceholders})`,
      projectIds
    );

    // Get all media sets for published projects
    const mediaSets = await queryAll<MediaSetRow>(
      pool,
      `SELECT * FROM media_set WHERE project_id IN (${projectPlaceholders})`,
      projectIds
    );

    // Get all routes for published projects
    const routes = await queryAll<RouteRow>(
      pool,
      `SELECT * FROM route WHERE project_id IN (${projectPlaceholders})`,
      projectIds
    );

    // Get route-location associations
    let routeLocations: RouteLocationRow[] = [];
    if (routes.length > 0) {
      const routeIds = routes.map((r) => r.id);
      const routePlaceholders = routeIds.map(() => "?").join(",");
      routeLocations = await queryAll<RouteLocationRow>(
        pool,
        `SELECT * FROM route_location WHERE route_id IN (${routePlaceholders})`,
        routeIds
      );
    }

    // Build locationIds array for each project from locations table
    const locationIdsByProject: Record<string, string[]> = {};
    for (const loc of locations) {
      if (!locationIdsByProject[loc.project_id]) {
        locationIdsByProject[loc.project_id] = [];
      }
      locationIdsByProject[loc.project_id].push(loc.id);
    }

    // Build mediaSetIds array for each location from media_sets table
    const mediaSetIdsByLocation: Record<string, string[]> = {};
    for (const ms of mediaSets) {
      if (ms.location_id) {
        if (!mediaSetIdsByLocation[ms.location_id]) {
          mediaSetIdsByLocation[ms.location_id] = [];
        }
        mediaSetIdsByLocation[ms.location_id].push(ms.id);
      }
    }

    // Build routeIds array for each project from routes table
    const routeIdsByProject: Record<string, string[]> = {};
    for (const route of routes) {
      if (!routeIdsByProject[route.project_id]) {
        routeIdsByProject[route.project_id] = [];
      }
      routeIdsByProject[route.project_id].push(route.id);
    }

    // Get media images for all published media sets
    const mediaSetIds = mediaSets.map((ms) => ms.id);
    let mediaImages: MediaImageRow[] = [];
    if (mediaSetIds.length > 0) {
      const mediaSetPlaceholders = mediaSetIds.map(() => "?").join(",");
      mediaImages = await queryAll<MediaImageRow>(
        pool,
        `SELECT * FROM media_image WHERE media_set_id IN (${mediaSetPlaceholders})`,
        mediaSetIds
      );
    }

    // Build imageIds array for each media set
    const imageIdsByMediaSet: Record<string, string[]> = {};
    for (const img of mediaImages) {
      if (!imageIdsByMediaSet[img.media_set_id]) {
        imageIdsByMediaSet[img.media_set_id] = [];
      }
      imageIdsByMediaSet[img.media_set_id].push(img.id);
    }

    // Return raw source data in the format expected by buildMapRelationshipViewModel
    return {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        description: p.description,
        coverImage: p.cover_upload_file_id,
        tags: tagsByProject[p.id] ?? [],
        status: 'published' as const,
        locationIds: locationIdsByProject[p.id] ?? [],
        mediaSetIds: [], // Media sets are associated through locations
        routeIds: routeIdsByProject[p.id] ?? [],
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      locations: locations.map((l) => ({
        id: l.id,
        projectId: l.project_id,
        name: l.name,
        slug: l.slug,
        description: l.description,
        latitude: l.latitude,
        longitude: l.longitude,
        addressText: l.address_text,
        mediaSetIds: mediaSetIdsByLocation[l.id] ?? [],
        visitOrder: l.visit_order,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      })),
      mediaSets: mediaSets.map((ms) => ({
        id: ms.id,
        projectId: ms.project_id,
        locationId: ms.location_id,
        type: ms.type as "spin360" | "gallery",
        title: ms.title,
        description: ms.description,
        coverImage: ms.cover_upload_file_id,
        imageIds: imageIdsByMediaSet[ms.id] ?? [],
        isFeatured: Boolean(ms.is_featured),
        createdAt: ms.created_at,
        updatedAt: ms.updated_at,
      })),
      routes: routes.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        name: r.name,
        description: r.description,
        locationIds: routeLocations
          .filter((rl) => rl.route_id === r.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((rl) => rl.location_id),
        lineStyle: r.line_style as "solid" | "dashed",
        color: r.color,
        isFeatured: Boolean(r.is_featured),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  });
};
