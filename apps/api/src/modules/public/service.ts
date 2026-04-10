import type { LocalFileStorage } from "../../infrastructure/storage/localFileStorage.js";
import type { PublicRepository } from "./repository.js";
import type {
  ProjectCardRow,
  TagRow,
  LocationRow,
  MediaSetRow,
  MediaImageRow,
  RouteRow,
  RouteLocationRow,
} from "./types.js";

export class PublicService {
  constructor(
    private readonly repository: PublicRepository,
    private readonly storage: LocalFileStorage
  ) {}

  /**
   * Check if a file is reachable from any published content.
   * A file is considered public if it's referenced by:
   * - A published project's cover image
   * - A published project's media set's cover image
   * - A media image belonging to a published project's media set
   */
  async isFileReachableFromPublishedContent(fileId: string): Promise<boolean> {
    const projectCover = await this.repository.findPublishedProjectCover(fileId);
    if (projectCover) return true;

    const mediaSetCover = await this.repository.findPublishedMediaSetCover(fileId);
    if (mediaSetCover) return true;

    const mediaImage = await this.repository.findPublishedMediaImage(fileId);
    if (mediaImage) return true;

    return false;
  }

  async listProjects(): Promise<{
    items: Array<{
      id: string;
      slug: string;
      title: string;
      summary: string;
      coverImage: string | null;
      tags: string[];
      status: "published";
    }>;
  }> {
    const projects = await this.repository.listProjectsForPublic();

    if (projects.length === 0) {
      return { items: [] };
    }

    const ids = projects.map((p) => p.id);
    const tags = await this.repository.findTagsByProjectIds(ids);

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
  }

  async getProjectDetail(projectIdOrSlug: string): Promise<{
    project: {
      id: string;
      slug: string;
      title: string;
      summary: string;
      description: string;
      coverImage: string | null;
      tags: string[];
      status: "published";
    };
    locations: Array<{
      id: string;
      name: string;
      slug: string;
      description: string;
      latitude: number;
      longitude: number;
      addressText: string;
      visitOrder: number | null;
    }>;
    mediaSets: Array<{
      id: string;
      type: "spin360" | "gallery";
      title: string;
      description: string;
      coverImage: string | null;
      locationId: string | null;
      isFeatured: boolean;
    }>;
    routes: Array<{
      id: string;
      name: string;
      description: string;
      lineStyle: "solid" | "dashed";
      color: string;
      locationIds: string[];
      isFeatured: boolean;
    }>;
  }> {
    const project = await this.repository.findProjectDetailByIdOrSlug(projectIdOrSlug);
    if (!project) {
      throw Object.assign(new Error("Published project not found"), {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const [tags, locations, mediaSets, routes] = await Promise.all([
      this.repository.findTagsByProjectId(project.id),
      this.repository.findLocationsByProjectId(project.id),
      this.repository.findMediaSetsByProjectId(project.id),
      this.repository.findRoutesByProjectId(project.id),
    ]);

    let routeLocations: RouteLocationRow[] = [];
    if (routes.length > 0) {
      const routeIds = routes.map((r) => r.id);
      routeLocations = await this.repository.findRouteLocationsByRouteIds(routeIds);
    }

    const locationsByRoute: Record<string, string[]> = {};
    for (const rl of routeLocations) {
      if (!locationsByRoute[rl.route_id]) locationsByRoute[rl.route_id] = [];
      locationsByRoute[rl.route_id].push(rl.location_id);
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
        locationIds: locationsByRoute[r.id] ?? [],
        isFeatured: Boolean(r.is_featured),
      })),
    };
  }

  async getMediaSet(mediaSetId: string): Promise<{
    id: string;
    type: string;
    title: string;
    description: string;
    coverImage: string | null;
    locationId: string | null;
    isFeatured: boolean;
    images: Array<{
      id: string;
      caption: string;
      sortOrder: number;
      url: string | null;
      mimeType: string | null;
    }>;
  }> {
    const mediaSet = await this.repository.findMediaSetById(mediaSetId);
    if (!mediaSet) {
      throw Object.assign(new Error("Published media set not found"), {
        code: "NOT_FOUND",
        statusCode: 404,
      });
    }

    const images = await this.repository.findMediaImagesByMediaSetId(mediaSetId);

    if (images.length > 0) {
      const fileIds = images.map((img) => img.upload_file_id);
      const files = await this.repository.findUploadFilesByIds(fileIds);
      const filesById: Record<string, (typeof files)[0]> = {};
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

  async getMapRelationship(): Promise<{
    projects: Array<{
      id: string;
      title: string;
      slug: string;
      summary: string;
      description: string;
      coverImage: string | null;
      tags: string[];
      status: "published";
      locationIds: string[];
      mediaSetIds: string[];
      routeIds: string[];
      createdAt: string;
      updatedAt: string;
    }>;
    locations: Array<{
      id: string;
      projectId: string;
      name: string;
      slug: string;
      description: string;
      latitude: number;
      longitude: number;
      addressText: string;
      mediaSetIds: string[];
      visitOrder: number | null;
      createdAt: string;
      updatedAt: string;
    }>;
    mediaSets: Array<{
      id: string;
      projectId: string;
      locationId: string | null;
      type: "spin360" | "gallery";
      title: string;
      description: string;
      coverImage: string | null;
      imageIds: string[];
      isFeatured: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    routes: Array<{
      id: string;
      projectId: string;
      name: string;
      description: string;
      locationIds: string[];
      lineStyle: "solid" | "dashed";
      color: string;
      isFeatured: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    const { projects, tags, locations, mediaSets, routes, routeLocations, mediaImages } =
      await this.repository.getMapRelationshipSource();

    if (projects.length === 0) {
      return { projects: [], locations: [], mediaSets: [], routes: [] };
    }

    const tagsByProject: Record<string, string[]> = {};
    for (const tag of tags) {
      if (!tagsByProject[tag.project_id]) tagsByProject[tag.project_id] = [];
      tagsByProject[tag.project_id].push(tag.tag);
    }

    const locationIdsByProject: Record<string, string[]> = {};
    for (const loc of locations) {
      if (!locationIdsByProject[loc.project_id]) {
        locationIdsByProject[loc.project_id] = [];
      }
      locationIdsByProject[loc.project_id].push(loc.id);
    }

    const mediaSetIdsByLocation: Record<string, string[]> = {};
    for (const ms of mediaSets) {
      if (ms.location_id) {
        if (!mediaSetIdsByLocation[ms.location_id]) {
          mediaSetIdsByLocation[ms.location_id] = [];
        }
        mediaSetIdsByLocation[ms.location_id].push(ms.id);
      }
    }

    const routeIdsByProject: Record<string, string[]> = {};
    for (const route of routes) {
      if (!routeIdsByProject[route.project_id]) {
        routeIdsByProject[route.project_id] = [];
      }
      routeIdsByProject[route.project_id].push(route.id);
    }

    const imageIdsByMediaSet: Record<string, string[]> = {};
    for (const img of mediaImages) {
      if (!imageIdsByMediaSet[img.media_set_id]) {
        imageIdsByMediaSet[img.media_set_id] = [];
      }
      imageIdsByMediaSet[img.media_set_id].push(img.id);
    }

    return {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        description: p.description,
        coverImage: p.cover_upload_file_id,
        tags: tagsByProject[p.id] ?? [],
        status: "published" as const,
        locationIds: locationIdsByProject[p.id] ?? [],
        mediaSetIds: [],
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
  }

  async getReadableFile(fileId: string): Promise<{
    storageKey: string;
    mimeType: string;
    stream: NodeJS.ReadableStream;
  } | null> {
    const file = await this.repository.findUploadFileById(fileId);
    if (!file) return null;

    if (!(await this.isFileReachableFromPublishedContent(fileId))) {
      return null;
    }

    const fileResult = await this.storage.getFile(file.storage_key);
    if (!fileResult) return null;

    return {
      storageKey: file.storage_key,
      mimeType: fileResult.mimeType,
      stream: fileResult.stream,
    };
  }
}
