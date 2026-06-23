import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/common/ToastProvider';
import { useToast } from '@/components/common/useToast';
import { CascadeDeleteDialog } from '@/components/common/CascadeDeleteDialog';
import {
  projectsApi,
  locationsApi,
  mediaSetsApi,
  routesApi,
  type Project,
  type ProjectCascadePreview,
} from '@/services/api/adminApi';
import { computeProjectReadiness, type ReadinessStatus } from '@/features/admin/projectReadiness';

interface ProjectDeleteState {
  id: string;
  name: string;
}

function AdminProjectsPageInner() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [fieldError, setFieldError] = useState('');

  const [countsByProject, setCountsByProject] = useState<
    Record<string, { locations: number; mediaSets: number; routes: number }>
  >({});

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
      const next: Record<string, { locations: number; mediaSets: number; routes: number }> = {};
      for (const project of projectData) {
        next[project.id] = {
          locations: 0,
          mediaSets: 0,
          routes: 0,
        };
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
      toast.error('加载失败');
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    loadProjects().finally(() => setLoading(false));
  }, [loadProjects]);

  function startEdit(project: Project) {
    setEditingId(project.id);
    setTitle(project.title);
    setSummary(project.summary);
    setDescription(project.description);
    setTagsText((project.tags || []).join(', '));
    setStatus(project.status as 'draft' | 'published');
    setFieldError('');
  }

  function startCreate() {
    setEditingId(null);
    setTitle('');
    setSummary('');
    setDescription('');
    setTagsText('');
    setStatus('draft');
    setFieldError('');
  }

  async function handleSave() {
    if (!title.trim()) { setFieldError('请输入标题'); return; }
    if (!summary.trim()) { setFieldError('请输入摘要'); return; }
    setFieldError('');
    try {
      const data = {
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim() || summary.trim(),
        status,
        tags: tagsText.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (editingId) {
        await projectsApi.update(editingId, data);
        toast.success('已保存');
      } else {
        await projectsApi.create(data);
        toast.success('已创建');
      }
      await loadProjects();
      startCreate();
    } catch (e) {
      toast.error(editingId ? '保存失败' : '创建失败');
    }
  }

  function requestDelete(project: Project) {
    setCascadeError(null);
    setCascadeTarget({ id: project.id, name: project.title });
  }

  async function confirmCascadeDelete() {
    if (!cascadeTarget) return;
    setCascadeDeleting(true);
    try {
      await projectsApi.delete(cascadeTarget.id);
      await loadProjects();
      toast.success('已删除');
      setCascadeTarget(null);
    } catch (e) {
      setCascadeError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setCascadeDeleting(false);
    }
  }

  const readinessByProject = useMemo(() => {
    const map: Record<string, { status: ReadinessStatus; missing: string[] }> = {};
    for (const project of projects) {
      const counts = countsByProject[project.id] ?? { locations: 0, mediaSets: 0, routes: 0 };
      map[project.id] = computeProjectReadiness(project, counts);
    }
    return map;
  }, [projects, countsByProject]);

  return (
    <div className="admin-layout page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">项目管理</h1>
          <p className="muted">支持新建、编辑、删除。项目标题和摘要为必填项。</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="项目标题" />
          <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="项目摘要" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="项目描述，可留空" />
          <input
            value={tagsText}
            onChange={e => setTagsText(e.target.value)}
            placeholder="标签，使用英文逗号分隔"
            data-testid="project-tags-input"
          />
          <select value={status} onChange={e => setStatus(e.target.value as 'draft' | 'published')}>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>
          {fieldError && <p data-testid="project-field-error" style={{ color: 'var(--danger)' }}>{fieldError}</p>}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={handleSave}>{editingId ? '保存修改' : '新增项目'}</button>
            <button onClick={startCreate}>{editingId ? '取消编辑' : '清空表单'}</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">项目列表</h2>
          {loading ? <p className="muted">加载中...</p> : (
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              {projects.map(project => {
                const readiness = readinessByProject[project.id] ?? { status: 'draft' as const, missing: [] };
                const badgeStyle =
                  readiness.status === 'ready'
                    ? { background: 'rgba(74,222,128,0.15)', color: 'rgba(74,222,128,0.95)' }
                    : readiness.status === 'incomplete'
                    ? { background: 'rgba(255,107,107,0.15)', color: 'rgba(255,107,107,0.95)' }
                    : { background: 'rgba(150,150,170,0.15)', color: 'rgba(200,200,220,0.85)' };
                const badgeLabel =
                  readiness.status === 'ready'
                    ? '已发布 · 完整'
                    : readiness.status === 'incomplete'
                    ? '已发布 · 未完整'
                    : '草稿';
                const tags = project.tags || [];
                return (
                  <div key={project.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{project.title}</span>
                        <span
                          data-testid={`project-readiness-${project.id}`}
                          style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', ...badgeStyle }}
                        >
                          {badgeLabel}
                        </span>
                      </div>
                      <div className="muted">{project.summary}</div>
                      {tags.length > 0 && (
                        <div
                          data-testid={`project-tags-${project.id}`}
                          style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}
                        >
                          {tags.map(tag => (
                            <span
                              key={tag}
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: 'rgba(91,141,238,0.15)',
                                color: 'rgba(123,167,255,0.95)',
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {readiness.status === 'incomplete' && (
                        <div data-testid={`project-readiness-missing-${project.id}`} style={{ marginTop: '6px', fontSize: '0.8rem', color: 'rgba(255,107,107,0.95)' }}>
                          发布前请补齐：{readiness.missing.join('、')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => startEdit(project)}>编辑</button>
                      <button
                        onClick={() => requestDelete(project)}
                        data-testid={`project-delete-${project.id}`}
                        style={{ background: 'var(--danger)' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 && <p className="muted">暂无项目</p>}
            </div>
          )}
        </div>
      </section>

      <CascadeDeleteDialog<ProjectCascadePreview>
        open={cascadeTarget !== null}
        title="确认删除项目"
        entityName={cascadeTarget?.name ?? ''}
        loading={cascadeDeleting}
        errorMessage={cascadeError}
        loadPreview={() => projectsApi.cascadePreview(cascadeTarget!.id)}
        renderSummary={preview => (
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '4px' }}>
            <li>地点：<strong>{preview.willDelete.locations}</strong> 个</li>
            <li>媒体组：<strong>{preview.willDelete.mediaSets}</strong> 个</li>
            <li>媒体图片：<strong>{preview.willDelete.mediaImages}</strong> 张</li>
            <li>轨迹：<strong>{preview.willDelete.routes}</strong> 条</li>
            <li>轨迹-地点关联：<strong>{preview.willDelete.routeLocations}</strong> 条</li>
          </ul>
        )}
        onCancel={() => { if (!cascadeDeleting) setCascadeTarget(null); }}
        onConfirm={confirmCascadeDelete}
        confirmLabel="确认删除"
      />
    </div>
  );
}

export default function AdminProjectsPage() {
  return (
    <ToastProvider>
      <AdminProjectsPageInner />
    </ToastProvider>
  );
}