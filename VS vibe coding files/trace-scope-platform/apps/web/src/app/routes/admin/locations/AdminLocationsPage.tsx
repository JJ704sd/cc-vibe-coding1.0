import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { createLocationDraft } from '@/services/storage/adminEditorDrafts';
import { validateLocationDraft } from '@/services/storage/adminValidation';
import { useAdminData } from '@/services/storage/useAdminData';

export function AdminLocationsPage() {
  const { state, saveLocation, deleteLocation } = useAdminData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => createLocationDraft());
  const [errors, setErrors] = useState<Partial<Record<keyof ReturnType<typeof createLocationDraft>, string>>>({});

  function startCreate() {
    setEditingId(null);
    setDraft(createLocationDraft());
    setErrors({});
  }

  function startEdit(locationId: string) {
    const location = state.locations.find((item) => item.id === locationId);
    if (!location) {
      return;
    }
    setEditingId(locationId);
    setDraft(createLocationDraft(location));
    setErrors({});
  }

  function saveDraft() {
    const nextErrors = validateLocationDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const now = new Date().toISOString();
    const existingLocation = state.locations.find((location) => location.id === editingId);
    const id = existingLocation?.id ?? `location-${Date.now()}`;

    saveLocation({
      id,
      projectId: draft.projectId,
      name: draft.name.trim(),
      slug: existingLocation?.slug ?? id,
      description: draft.description.trim() || '待补充地点说明',
      latitude: Number(draft.latitudeText),
      longitude: Number(draft.longitudeText),
      addressText: draft.addressText.trim(),
      mediaSetIds: existingLocation?.mediaSetIds ?? [],
      visitOrder: draft.visitOrderText.trim() ? Number(draft.visitOrderText) : null,
      createdAt: existingLocation?.createdAt ?? now,
      updatedAt: now,
    });
    startCreate();
  }

  function confirmDelete(locationId: string) {
    if (typeof window !== 'undefined' && !window.confirm('确认删除这个地点吗？')) {
      return;
    }
    deleteLocation(locationId);
  }

  return (
    <div className="page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">地点管理</h1>
          <select value={draft.projectId} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
            <option value="">选择所属项目</option>
            {state.projects.map((project) => (<option key={project.id} value={project.id}>{project.title}</option>))}
          </select>
          {errors.projectId ? <p style={{ color: 'var(--danger)' }}>{errors.projectId}</p> : null}
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="地点名称" />
          {errors.name ? <p style={{ color: 'var(--danger)' }}>{errors.name}</p> : null}
          <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="地点描述，可留空" />
          <input value={draft.latitudeText} onChange={(event) => setDraft((current) => ({ ...current, latitudeText: event.target.value }))} placeholder="纬度" />
          {errors.latitudeText ? <p style={{ color: 'var(--danger)' }}>{errors.latitudeText}</p> : null}
          <input value={draft.longitudeText} onChange={(event) => setDraft((current) => ({ ...current, longitudeText: event.target.value }))} placeholder="经度" />
          {errors.longitudeText ? <p style={{ color: 'var(--danger)' }}>{errors.longitudeText}</p> : null}
          <input value={draft.addressText} onChange={(event) => setDraft((current) => ({ ...current, addressText: event.target.value }))} placeholder="地址说明" />
          {errors.addressText ? <p style={{ color: 'var(--danger)' }}>{errors.addressText}</p> : null}
          <input value={draft.visitOrderText} onChange={(event) => setDraft((current) => ({ ...current, visitOrderText: event.target.value }))} placeholder="访问顺序，可留空" />
          {errors.visitOrderText ? <p style={{ color: 'var(--danger)' }}>{errors.visitOrderText}</p> : null}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={saveDraft}>{editingId ? '保存修改' : '新增地点'}</button>
            <button onClick={startCreate}>{editingId ? '取消编辑' : '清空表单'}</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">地点列表</h2>
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            {state.locations.map((location) => (
              <div key={location.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div>{location.name}</div>
                  <div className="muted">{location.addressText} · {location.latitude}, {location.longitude}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => startEdit(location.id)}>编辑</button>
                  <button onClick={() => confirmDelete(location.id)}>删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
