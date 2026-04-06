import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { createProjectDraft } from '@/services/storage/adminEditorDrafts';
import { validateProjectDraft } from '@/services/storage/adminValidation';
import { useAdminData } from '@/services/storage/useAdminData';

export function AdminProjectsPage() {
  const { state, saveProject, deleteProject, reset } = useAdminData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => createProjectDraft());
  const [errors, setErrors] = useState<Partial<Record<keyof ReturnType<typeof createProjectDraft>, string>>>({});

  function startCreate() {
    setEditingId(null);
    setDraft(createProjectDraft());
    setErrors({});
  }

  function startEdit(projectId: string) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }
    setEditingId(projectId);
    setDraft(createProjectDraft(project));
    setErrors({});
  }

  function saveDraft() {
    const nextErrors = validateProjectDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const now = new Date().toISOString();
    const existingProject = state.projects.find((project) => project.id === editingId);
    const id = existingProject?.id ?? `project-${Date.now()}`;

    saveProject({
      id,
      title: draft.title.trim(),
      slug: existingProject?.slug ?? id,
      summary: draft.summary.trim(),
      description: draft.description.trim() || draft.summary.trim(),
      coverImage: existingProject?.coverImage ?? 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
      tags: draft.tagsText.split(',').map((item) => item.trim()).filter(Boolean),
      status: draft.status,
      locationIds: existingProject?.locationIds ?? [],
      mediaSetIds: existingProject?.mediaSetIds ?? [],
      routeIds: existingProject?.routeIds ?? [],
      createdAt: existingProject?.createdAt ?? now,
      updatedAt: now,
    });
    startCreate();
  }

  function confirmDelete(projectId: string) {
    if (typeof window !== 'undefined' && !window.confirm('确认删除这个项目吗？')) {
      return;
    }
    deleteProject(projectId);
  }

  return (
    <div className="page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">项目管理</h1>
          <p className="muted">支持新建、编辑、删除。项目标题和摘要为必填项。</p>
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="项目标题" />
          {errors.title ? <p style={{ color: 'var(--danger)' }}>{errors.title}</p> : null}
          <textarea value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="项目摘要" />
          {errors.summary ? <p style={{ color: 'var(--danger)' }}>{errors.summary}</p> : null}
          <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="项目描述，可留空" />
          <input value={draft.tagsText} onChange={(event) => setDraft((current) => ({ ...current, tagsText: event.target.value }))} placeholder="标签，使用英文逗号分隔" />
          <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as 'draft' | 'published' }))}>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={saveDraft}>{editingId ? '保存修改' : '新增项目'}</button>
            <button onClick={startCreate}>{editingId ? '取消编辑' : '清空表单'}</button>
            <button onClick={reset}>重置为种子数据</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">项目列表</h2>
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            {state.projects.map((project) => (
              <div key={project.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div>{project.title}</div>
                  <div className="muted">{project.status} · {project.summary}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => startEdit(project.id)}>编辑</button>
                  <button onClick={() => confirmDelete(project.id)}>删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
