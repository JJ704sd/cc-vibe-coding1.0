import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  projectsApi,
  locationsApi,
  mediaSetsApi,
  routesApi,
  type Project,
  type ProjectCascadePreview,
} from '@/services/api/adminApi';
import { computeProjectReadiness, type ReadinessStatus } from '@/features/admin/projectReadiness';
import { useToast } from '@/components/common/useToast';

export interface ProjectDeleteState {
  id: string;
  name: string;
}

export interface ProjectCounts {
  locations: number;
  mediaSets: number;
  routes: number;
}

export interface ProjectReadinessView {
  status: ReadinessStatus;
  missing: string[];
}

export interface UseProjectsPageController {
  // --- data ---
  projects: Project[];
  countsByProject: Record<string, ProjectCounts>;
  loading: boolean;

  // --- form state ---
  editingId: string | null;
  title: string;
  summary: string;
  description: string;
  tagsText: string;
  status: 'draft' | 'published';
  fieldError: string;

  // --- cascade state ---
  cascadeTarget: ProjectDeleteState | null;
  cascadeDeleting: boolean;
  cascadeError: string | null;

  // --- derived ---
  readinessByProject: Record<string, ProjectReadinessView>;

  // --- form actions ---
  setTitle: (value: string) => void;
  setSummary: (value: string) => void;
  setDescription: (value: string) => void;
  setTagsText: (value: string) => void;
  setStatus: (value: 'draft' | 'published') => void;
  startEdit: (project: Project) => void;
  startCreate: () => void;
  handleSave: () => Promise<void>;

  // --- cascade actions ---
  requestDelete: (project: Project) => void;
  cancelCascadeDelete: () => void;
  confirmCascadeDelete: () => Promise<void>;
  loadPreview: () => Promise<ProjectCascadePreview>;
}

/**
 * BUG-014 — encapsulates AdminProjectsPage state, async handlers, and the
 * readiness memo so the route component only renders JSX. Owns:
 *   - 12 useState buckets (projects / loading / form / counts / cascade)
 *   - loadProjects (4-way Promise.all + count aggregation)
 *   - mount effect (setLoading(true) → load → setLoading(false))
 *   - 5 form/CRUD handlers (startEdit / startCreate / handleSave /
 *     requestDelete / confirmCascadeDelete)
 *   - readinessByProject memo (delegates to features/admin/projectReadiness)
 *
 * Must be rendered inside a ToastProvider so useToast() resolves.
 */
export function useProjectsPageController(): UseProjectsPageController {
  const toast = useToast();
  // Stash the latest toast handle in a ref so callbacks that depend on it
  // (loadProjects / handleSave / confirmCascadeDelete) stay referentially
  // stable. Without this, useToast() returning a new object each render
  // would invalidate the useCallback deps, retrigger the mount effect, and
  // leave the page permanently in the "loading" state. Matches the pattern
  // used in AdminMediaPage.
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [fieldError, setFieldError] = useState('');

  const [countsByProject, setCountsByProject] = useState<Record<string, ProjectCounts>>({});

  const [cascadeTarget, setCascadeTarget] = useState<ProjectDeleteState | null>(null);
  const [cascadeDeleting, setCascadeDeleting] = useState(false);
  const [cascadeError, setCascadeError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const [projectData, locationData, mediaSetData, routeData] = await Promise.all([
        projectsApi.list(),
        locationsApi.list(),
        mediaSetsApi.list(),
        routesApi.list(),
      ]);
      setProjects(projectData);
      const next: Record<string, ProjectCounts> = {};
      for (const project of projectData) {
        next[project.id] = { locations: 0, mediaSets: 0, routes: 0 };
      }
      for (const loc of locationData) {
        const entry = next[loc.project_id];
        if (entry) entry.locations += 1;
      }
      for (const ms of mediaSetData) {
        const entry = next[ms.project_id];
        if (entry) entry.mediaSets += 1;
      }
      for (const route of routeData) {
        const entry = next[route.project_id];
        if (entry) entry.routes += 1;
      }
      setCountsByProject(next);
    } catch {
      toastRef.current.error('加载失败');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadProjects().finally(() => setLoading(false));
  }, [loadProjects]);

  const startEdit = useCallback((project: Project) => {
    setEditingId(project.id);
    setTitle(project.title);
    setSummary(project.summary);
    setDescription(project.description);
    setTagsText((project.tags || []).join(', '));
    setStatus(project.status as 'draft' | 'published');
    setFieldError('');
  }, []);

  const startCreate = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setSummary('');
    setDescription('');
    setTagsText('');
    setStatus('draft');
    setFieldError('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setFieldError('请输入标题');
      return;
    }
    if (!summary.trim()) {
      setFieldError('请输入摘要');
      return;
    }
    setFieldError('');
    try {
      const data = {
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim() || summary.trim(),
        status,
        tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      };
      if (editingId) {
        await projectsApi.update(editingId, data);
        toastRef.current.success('已保存');
      } else {
        await projectsApi.create(data);
        toastRef.current.success('已创建');
      }
      await loadProjects();
      startCreate();
    } catch {
      toastRef.current.error(editingId ? '保存失败' : '创建失败');
    }
  }, [description, editingId, loadProjects, startCreate, status, summary, tagsText, title]);

  const requestDelete = useCallback((project: Project) => {
    setCascadeError(null);
    setCascadeTarget({ id: project.id, name: project.title });
  }, []);

  const cancelCascadeDelete = useCallback(() => {
    if (!cascadeDeleting) setCascadeTarget(null);
  }, [cascadeDeleting]);

  const confirmCascadeDelete = useCallback(async () => {
    if (!cascadeTarget) return;
    setCascadeDeleting(true);
    try {
      await projectsApi.delete(cascadeTarget.id);
      await loadProjects();
      toastRef.current.success('已删除');
      setCascadeTarget(null);
    } catch (e) {
      setCascadeError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setCascadeDeleting(false);
    }
  }, [cascadeTarget, loadProjects]);

  const loadPreview = useCallback(async (): Promise<ProjectCascadePreview> => {
    if (!cascadeTarget) {
      throw new Error('No cascade target selected');
    }
    return projectsApi.cascadePreview(cascadeTarget.id);
  }, [cascadeTarget]);

  const readinessByProject = useMemo(() => {
    const map: Record<string, ProjectReadinessView> = {};
    for (const project of projects) {
      const counts = countsByProject[project.id] ?? { locations: 0, mediaSets: 0, routes: 0 };
      map[project.id] = computeProjectReadiness(project, counts);
    }
    return map;
  }, [projects, countsByProject]);

  return {
    // data
    projects,
    countsByProject,
    loading,

    // form state
    editingId,
    title,
    summary,
    description,
    tagsText,
    status,
    fieldError,

    // cascade state
    cascadeTarget,
    cascadeDeleting,
    cascadeError,

    // derived
    readinessByProject,

    // form actions
    setTitle,
    setSummary,
    setDescription,
    setTagsText,
    setStatus,
    startEdit,
    startCreate,
    handleSave,

    // cascade actions
    requestDelete,
    cancelCascadeDelete,
    confirmCascadeDelete,
    loadPreview,
  };
}