import type { Project } from '@/services/api/adminApi';

export type ReadinessStatus = 'draft' | 'ready' | 'incomplete';

export interface ProjectReadiness {
  status: ReadinessStatus;
  missing: string[];
}

export interface ProjectCounts {
  locations: number;
  mediaSets: number;
  routes: number;
}

/**
 * Decide how ready a project is to be shown to the public, based on its
 * status and the counts of related entities already attached to it.
 *
 * - draft: never inspected, the editor is still working
 * - ready: published and has at least one location, one media set, and one
 *   route, so the public surface can render the project without obvious
 *   empty states
 * - incomplete: published but missing one or more of the above, so the
 *   editor should fix the gaps before relying on the public page
 */
export function computeProjectReadiness(
  project: Pick<Project, 'status'>,
  counts: ProjectCounts,
): ProjectReadiness {
  if (project.status !== 'published') {
    return { status: 'draft', missing: [] };
  }
  const missing: string[] = [];
  if (counts.locations === 0) missing.push('未关联地点');
  if (counts.mediaSets === 0) missing.push('未关联媒体组');
  if (counts.routes === 0) missing.push('未关联路线');
  return { status: missing.length === 0 ? 'ready' : 'incomplete', missing };
}
