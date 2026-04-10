import { getPool, queryAll, queryOne } from "../../infrastructure/db/helpers.js";
import type {
  ProjectCardRow,
  TagRow,
  LocationRow,
  MediaSetRow,
  MediaImageRow,
  RouteRow,
  RouteLocationRow,
  UploadFileRow,
} from "./types.js";

export function createPublicRepository() {
  return {
    async listProjectsForPublic(): Promise<ProjectCardRow[]> {
      const pool = getPool();
      return queryAll<ProjectCardRow>(
        pool,
        `SELECT * FROM project WHERE status = 'published' ORDER BY created_at DESC`,
        []
      );
    },

    async findProjectDetailByIdOrSlug(projectIdOrSlug: string): Promise<ProjectCardRow | null> {
      const pool = getPool();
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

      return project;
    },

    async findTagsByProjectId(projectId: string): Promise<TagRow[]> {
      const pool = getPool();
      return queryAll<TagRow>(
        pool,
        `SELECT * FROM project_tag WHERE project_id = ?`,
        [projectId]
      );
    },

    async findTagsByProjectIds(projectIds: string[]): Promise<TagRow[]> {
      if (projectIds.length === 0) return [];
      const pool = getPool();
      const placeholders = projectIds.map(() => "?").join(",");
      return queryAll<TagRow>(
        pool,
        `SELECT * FROM project_tag WHERE project_id IN (${placeholders})`,
        projectIds
      );
    },

    async findLocationsByProjectId(projectId: string): Promise<LocationRow[]> {
      const pool = getPool();
      return queryAll<LocationRow>(
        pool,
        `SELECT * FROM location WHERE project_id = ? ORDER BY visit_order`,
        [projectId]
      );
    },

    async findLocationsByProjectIds(projectIds: string[]): Promise<LocationRow[]> {
      if (projectIds.length === 0) return [];
      const pool = getPool();
      const placeholders = projectIds.map(() => "?").join(",");
      return queryAll<LocationRow>(
        pool,
        `SELECT * FROM location WHERE project_id IN (${placeholders})`,
        projectIds
      );
    },

    async findMediaSetsByProjectId(projectId: string): Promise<MediaSetRow[]> {
      const pool = getPool();
      return queryAll<MediaSetRow>(
        pool,
        `SELECT * FROM media_set WHERE project_id = ?`,
        [projectId]
      );
    },

    async findMediaSetsByProjectIds(projectIds: string[]): Promise<MediaSetRow[]> {
      if (projectIds.length === 0) return [];
      const pool = getPool();
      const placeholders = projectIds.map(() => "?").join(",");
      return queryAll<MediaSetRow>(
        pool,
        `SELECT * FROM media_set WHERE project_id IN (${placeholders})`,
        projectIds
      );
    },

    async findMediaSetById(mediaSetId: string): Promise<MediaSetRow | null> {
      const pool = getPool();
      return queryOne<MediaSetRow>(
        pool,
        `SELECT ms.* FROM media_set ms
         JOIN project p ON ms.project_id = p.id
         WHERE ms.id = ? AND p.status = 'published'`,
        [mediaSetId]
      );
    },

    async findMediaImagesByMediaSetId(mediaSetId: string): Promise<MediaImageRow[]> {
      const pool = getPool();
      return queryAll<MediaImageRow>(
        pool,
        `SELECT * FROM media_image WHERE media_set_id = ? ORDER BY sort_order`,
        [mediaSetId]
      );
    },

    async findMediaImagesByMediaSetIds(mediaSetIds: string[]): Promise<MediaImageRow[]> {
      if (mediaSetIds.length === 0) return [];
      const pool = getPool();
      const placeholders = mediaSetIds.map(() => "?").join(",");
      return queryAll<MediaImageRow>(
        pool,
        `SELECT * FROM media_image WHERE media_set_id IN (${placeholders})`,
        mediaSetIds
      );
    },

    async findRoutesByProjectId(projectId: string): Promise<RouteRow[]> {
      const pool = getPool();
      return queryAll<RouteRow>(
        pool,
        `SELECT * FROM route WHERE project_id = ?`,
        [projectId]
      );
    },

    async findRoutesByProjectIds(projectIds: string[]): Promise<RouteRow[]> {
      if (projectIds.length === 0) return [];
      const pool = getPool();
      const placeholders = projectIds.map(() => "?").join(",");
      return queryAll<RouteRow>(
        pool,
        `SELECT * FROM route WHERE project_id IN (${placeholders})`,
        projectIds
      );
    },

    async findRouteLocationsByRouteIds(routeIds: string[]): Promise<RouteLocationRow[]> {
      if (routeIds.length === 0) return [];
      const pool = getPool();
      const placeholders = routeIds.map(() => "?").join(",");
      return queryAll<RouteLocationRow>(
        pool,
        `SELECT * FROM route_location WHERE route_id IN (${placeholders}) ORDER BY sort_order`,
        routeIds
      );
    },

    async getMapRelationshipSource(): Promise<{
      projects: ProjectCardRow[];
      tags: TagRow[];
      locations: LocationRow[];
      mediaSets: MediaSetRow[];
      routes: RouteRow[];
      routeLocations: RouteLocationRow[];
      mediaImages: MediaImageRow[];
    }> {
      const pool = getPool();
      const projects = await queryAll<ProjectCardRow>(
        pool,
        `SELECT * FROM project WHERE status = 'published'`,
        []
      );

      if (projects.length === 0) {
        return { projects: [], tags: [], locations: [], mediaSets: [], routes: [], routeLocations: [], mediaImages: [] };
      }

      const projectIds = projects.map((p) => p.id);
      const projectPlaceholders = projectIds.map(() => "?").join(",");

      const tags = await queryAll<TagRow>(
        pool,
        `SELECT * FROM project_tag WHERE project_id IN (${projectPlaceholders})`,
        projectIds
      );

      const locations = await queryAll<LocationRow>(
        pool,
        `SELECT * FROM location WHERE project_id IN (${projectPlaceholders})`,
        projectIds
      );

      const mediaSets = await queryAll<MediaSetRow>(
        pool,
        `SELECT * FROM media_set WHERE project_id IN (${projectPlaceholders})`,
        projectIds
      );

      const routes = await queryAll<RouteRow>(
        pool,
        `SELECT * FROM route WHERE project_id IN (${projectPlaceholders})`,
        projectIds
      );

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

      return { projects, tags, locations, mediaSets, routes, routeLocations, mediaImages };
    },

    async findUploadFileById(fileId: string): Promise<UploadFileRow | null> {
      const pool = getPool();
      return queryOne<UploadFileRow>(
        pool,
        `SELECT * FROM upload_file WHERE id = ?`,
        [fileId]
      );
    },

    async findUploadFilesByIds(fileIds: string[]): Promise<UploadFileRow[]> {
      if (fileIds.length === 0) return [];
      const pool = getPool();
      const placeholders = fileIds.map(() => "?").join(",");
      return queryAll<UploadFileRow>(
        pool,
        `SELECT * FROM upload_file WHERE id IN (${placeholders})`,
        fileIds
      );
    },

    async findPublishedProjectCover(fileId: string): Promise<{ id: string } | null> {
      const pool = getPool();
      return queryOne<{ id: string }>(
        pool,
        `SELECT id FROM project WHERE cover_upload_file_id = ? AND status = 'published'`,
        [fileId]
      );
    },

    async findPublishedMediaSetCover(fileId: string): Promise<{ id: string } | null> {
      const pool = getPool();
      return queryOne<{ id: string }>(
        pool,
        `SELECT ms.id FROM media_set ms
         JOIN project p ON ms.project_id = p.id
         WHERE ms.cover_upload_file_id = ? AND p.status = 'published'`,
        [fileId]
      );
    },

    async findPublishedMediaImage(fileId: string): Promise<{ id: string } | null> {
      const pool = getPool();
      return queryOne<{ id: string }>(
        pool,
        `SELECT mi.id FROM media_image mi
         JOIN media_set ms ON mi.media_set_id = ms.id
         JOIN project p ON ms.project_id = p.id
         WHERE mi.upload_file_id = ? AND p.status = 'published'`,
        [fileId]
      );
    },
  };
}

export type PublicRepository = ReturnType<typeof createPublicRepository>;
