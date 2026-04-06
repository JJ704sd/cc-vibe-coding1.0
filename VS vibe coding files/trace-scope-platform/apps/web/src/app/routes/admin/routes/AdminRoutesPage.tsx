import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { createRouteDraft } from '@/services/storage/adminEditorDrafts';
import { validateRouteDraft } from '@/services/storage/adminValidation';
import { useAdminData } from '@/services/storage/useAdminData';

export function AdminRoutesPage() {
  const { state, saveRoute, deleteRoute } = useAdminData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => createRouteDraft());
  const [errors, setErrors] = useState<Partial<Record<keyof ReturnType<typeof createRouteDraft>, string>>>({});

  function startCreate() {
    setEditingId(null);
    setDraft(createRouteDraft());
    setErrors({});
  }

  function startEdit(routeId: string) {
    const route = state.routes.find((item) => item.id === routeId);
    if (!route) {
      return;
    }
    setEditingId(routeId);
    setDraft(createRouteDraft(route));
    setErrors({});
  }

  function saveDraft() {
    const nextErrors = validateRouteDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const now = new Date().toISOString();
    const existingRoute = state.routes.find((route) => route.id === editingId);
    const id = existingRoute?.id ?? `route-${Date.now()}`;

    saveRoute({
      id,
      projectId: draft.projectId,
      name: draft.name.trim(),
      description: draft.description.trim() || '待补充轨迹说明',
      locationIds: draft.locationIdsText.split(',').map((item) => item.trim()).filter(Boolean),
      lineStyle: draft.lineStyle,
      color: draft.color.trim(),
      isFeatured: draft.isFeatured,
      createdAt: existingRoute?.createdAt ?? now,
      updatedAt: now,
    });
    startCreate();
  }

  function confirmDelete(routeId: string) {
    if (typeof window !== 'undefined' && !window.confirm('确认删除这条轨迹吗？')) {
      return;
    }
    deleteRoute(routeId);
  }

  return (
    <div className="page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">轨迹管理</h1>
          <select value={draft.projectId} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
            <option value="">选择所属项目</option>
            {state.projects.map((project) => (<option key={project.id} value={project.id}>{project.title}</option>))}
          </select>
          {errors.projectId ? <p style={{ color: 'var(--danger)' }}>{errors.projectId}</p> : null}
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="轨迹名称" />
          {errors.name ? <p style={{ color: 'var(--danger)' }}>{errors.name}</p> : null}
          <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="轨迹描述，可留空" />
          <input value={draft.locationIdsText} onChange={(event) => setDraft((current) => ({ ...current, locationIdsText: event.target.value }))} placeholder="地点 ID，使用英文逗号分隔" />
          {errors.locationIdsText ? <p style={{ color: 'var(--danger)' }}>{errors.locationIdsText}</p> : null}
          <select value={draft.lineStyle} onChange={(event) => setDraft((current) => ({ ...current, lineStyle: event.target.value as 'solid' | 'dashed' }))}>
            <option value="solid">solid</option>
            <option value="dashed">dashed</option>
          </select>
          <input value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} placeholder="#72e3d2" />
          {errors.color ? <p style={{ color: 'var(--danger)' }}>{errors.color}</p> : null}
          <label className="muted" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="checkbox" checked={draft.isFeatured} onChange={(event) => setDraft((current) => ({ ...current, isFeatured: event.target.checked }))} />
            设为精选轨迹
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={saveDraft}>{editingId ? '保存修改' : '新增轨迹'}</button>
            <button onClick={startCreate}>{editingId ? '取消编辑' : '清空表单'}</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">轨迹列表</h2>
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            {state.routes.map((route) => (
              <div key={route.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div>{route.name}</div>
                  <div className="muted">地点数量：{route.locationIds.length} · {route.color}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => startEdit(route.id)}>编辑</button>
                  <button onClick={() => confirmDelete(route.id)}>删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
