import { getPool } from '../../infrastructure/db/db.js';
import type { Project, ProjectRow, TagRow, CreateProjectInput, FindProjectsOptions } from './types.js';

function rowToProject(row: ProjectRow, tags: string[] = []): Project {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    description: row.description,
    coverUploadFileId: row.cover_upload_file_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
  };
}

export function createProjectRepository() {
  return {
    async findAll(options: FindProjectsOptions = {}): Promise<Project[]> {
      const pool = getPool();
      let sql = `SELECT * FROM project WHERE 1=1`;
      const params: unknown[] = [];

      if (options.projectId) {
        sql += ` AND id = ?`;
        params.push(options.projectId);
      }
      if (options.status) {
        sql += ` AND status = ?`;
        params.push(options.status);
      }
      sql += ` ORDER BY created_at DESC`;

      const rows = await pool.query<ProjectRow>(sql, params);

      if (rows.length === 0) {
        return [];
      }

      const ids = rows.map((p) => p.id);
      const tags = await this.findTagsByProjectIds(ids);
      const tagsByProject: Record<string, string[]> = {};
      for (const tag of tags) {
        if (!tagsByProject[tag.project_id]) tagsByProject[tag.project_id] = [];
        tagsByProject[tag.project_id].push(tag.tag);
      }

      return rows.map((p) => rowToProject(p, tagsByProject[p.id] ?? []));
    },

    async findById(id: string): Promise<Project | null> {
      const pool = getPool();
      const rows = await pool.query<ProjectRow>(`SELECT * FROM project WHERE id = ?`, [id]);
      const row = rows[0];
      if (!row) return null;

      const tagRows = await pool.query<TagRow>(`SELECT tag FROM project_tag WHERE project_id = ?`, [id]);
      return rowToProject(row, tagRows.map((t) => t.tag));
    },

    async findBySlug(slug: string): Promise<Project | null> {
      const pool = getPool();
      const rows = await pool.query<ProjectRow>(`SELECT * FROM project WHERE slug = ?`, [slug]);
      const row = rows[0];
      if (!row) return null;

      const tagRows = await pool.query<TagRow>(`SELECT tag FROM project_tag WHERE project_id = ?`, [row.id]);
      return rowToProject(row, tagRows.map((t) => t.tag));
    },

    async upsertProject(input: CreateProjectInput & { id: string; slug: string; now: string }): Promise<Project> {
      const pool = getPool();
      await pool.execute(
        `INSERT INTO project (id, title, slug, summary, description, cover_upload_file_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.id,
          input.title,
          input.slug,
          input.summary,
          input.description,
          input.coverUploadFileId ?? null,
          input.status,
          input.now,
          input.now,
        ],
      );

      if (input.tags && input.tags.length > 0) {
        await this.insertTags(input.id, input.tags);
      }

      await pool.persist();
      return (await this.findById(input.id))!;
    },

    async updateProject(
      id: string,
      input: {
        title?: string;
        slug?: string;
        summary?: string;
        description?: string;
        status?: string;
        coverUploadFileId?: string;
        tags?: string[];
        now: string;
      },
    ): Promise<Project | null> {
      const pool = getPool();
      await pool.execute(
        `UPDATE project SET
          title = COALESCE(?, title),
          slug = COALESCE(?, slug),
          summary = COALESCE(?, summary),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          cover_upload_file_id = COALESCE(?, cover_upload_file_id),
          updated_at = ?
         WHERE id = ?`,
        [
          input.title ?? null,
          input.slug ?? null,
          input.summary ?? null,
          input.description ?? null,
          input.status ?? null,
          input.coverUploadFileId ?? null,
          input.now,
          id,
        ],
      );

      if (input.tags !== undefined) {
        await this.deleteTags(id);
        if (input.tags.length > 0) {
          await this.insertTags(id, input.tags);
        }
      }

      await pool.persist();
      return this.findById(id);
    },

    async deleteProject(id: string): Promise<void> {
      const pool = getPool();
      await pool.execute(`DELETE FROM project WHERE id = ?`, [id]);
      await pool.persist();
    },

    async findTagsByProjectIds(ids: string[]): Promise<TagRow[]> {
      if (ids.length === 0) return [];
      const pool = getPool();
      const placeholders = ids.map(() => '?').join(',');
      return pool.query<TagRow>(
        `SELECT * FROM project_tag WHERE project_id IN (${placeholders})`,
        ids,
      );
    },

    async insertTags(projectId: string, tags: string[]): Promise<void> {
      const pool = getPool();
      for (const tag of tags) {
        await pool.execute(`INSERT INTO project_tag (project_id, tag) VALUES (?, ?)`, [projectId, tag]);
      }
    },

    async deleteTags(projectId: string): Promise<void> {
      const pool = getPool();
      await pool.execute(`DELETE FROM project_tag WHERE project_id = ?`, [projectId]);
    },

    async findCoverFile(id: string): Promise<{ id: string } | null> {
      const pool = getPool();
      const rows = await pool.query<{ id: string }>(`SELECT id FROM upload_file WHERE id = ?`, [id]);
      return rows[0] ?? null;
    },
  };
}
