import { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/common/ToastProvider';
import { useToast } from '@/components/common/useToast';
import { CascadeDeleteDialog } from '@/components/common/CascadeDeleteDialog';
import {
  locationsApi,
  projectsApi,
  type Location,
  type Project,
  type LocationCascadePreview,
} from '@/services/api/adminApi';

interface LocationDeleteState {
  id: string;
  name: string;
}

function AdminLocationsPageInner() {
  const toast = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [addressText, setAddressText] = useState('');
  const [visitOrderText, setVisitOrderText] = useState('');
  const [fieldError, setFieldError] = useState('');

  const [cascadeTarget, setCascadeTarget] = useState<LocationDeleteState | null>(null);
  const [cascadeDeleting, setCascadeDeleting] = useState(false);
  const [cascadeError, setCascadeError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [locs, projs] = await Promise.all([
        locationsApi.list(projectId || undefined),
        projectsApi.list(),
      ]);
      setLocations(locs);
      setProjects(projs);
    } catch {
      toast.error('加载失败');
    }
  }, [projectId, toast]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  function startEdit(loc: Location) {
    setEditingId(loc.id);
    setProjectId(loc.project_id);
    setName(loc.name);
    setDescription(loc.description);
    setLatitudeText(String(loc.latitude));
    setLongitudeText(String(loc.longitude));
    setAddressText(loc.address_text);
    setVisitOrderText(loc.visit_order !== null ? String(loc.visit_order) : '');
    setFieldError('');
  }

  function startCreate() {
    setEditingId(null);
    setProjectId('');
    setName('');
    setDescription('');
    setLatitudeText('');
    setLongitudeText('');
    setAddressText('');
    setVisitOrderText('');
    setFieldError('');
  }

  async function handleSave() {
    if (!projectId) { setFieldError('请选择所属项目'); return; }
    if (!name.trim()) { setFieldError('请输入地点名称'); return; }
    if (!latitudeText) { setFieldError('请输入纬度'); return; }
    if (!longitudeText) { setFieldError('请输入经度'); return; }
    setFieldError('');
    try {
      const data = {
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || '待补充地点说明',
        latitude: parseFloat(latitudeText),
        longitude: parseFloat(longitudeText),
        address_text: addressText.trim(),
        visit_order: visitOrderText ? parseInt(visitOrderText) : undefined,
      };
      if (editingId) {
        await locationsApi.update(editingId, data);
        toast.success('已保存');
      } else {
        await locationsApi.create(data);
        toast.success('已创建');
      }
      await loadData();
      startCreate();
    } catch {
      toast.error(editingId ? '保存失败' : '创建失败');
    }
  }

  function requestDelete(loc: Location) {
    setCascadeError(null);
    setCascadeTarget({ id: loc.id, name: loc.name });
  }

  async function confirmCascadeDelete() {
    if (!cascadeTarget) return;
    setCascadeDeleting(true);
    try {
      await locationsApi.delete(cascadeTarget.id);
      await loadData();
      toast.success('已删除');
      setCascadeTarget(null);
    } catch (e) {
      setCascadeError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setCascadeDeleting(false);
    }
  }

  return (
    <div className="admin-layout page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">地点管理</h1>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">选择所属项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="地点名称" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="地点描述，可留空" />
          <input value={latitudeText} onChange={e => setLatitudeText(e.target.value)} placeholder="纬度" />
          <input value={longitudeText} onChange={e => setLongitudeText(e.target.value)} placeholder="经度" />
          <input value={addressText} onChange={e => setAddressText(e.target.value)} placeholder="地址说明" />
          <input value={visitOrderText} onChange={e => setVisitOrderText(e.target.value)} placeholder="访问顺序，可留空" />
          {fieldError && <p data-testid="location-field-error" style={{ color: 'var(--danger)' }}>{fieldError}</p>}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={handleSave}>{editingId ? '保存修改' : '新增地点'}</button>
            <button onClick={startCreate}>{editingId ? '取消编辑' : '清空表单'}</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">地点列表</h2>
          {loading ? <p className="muted">加载中...</p> : (
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              {locations.map(loc => (
                <div key={loc.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div>{loc.name}</div>
                    <div className="muted">{loc.address_text} · {loc.latitude}, {loc.longitude}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => startEdit(loc)}>编辑</button>
                    <button
                      onClick={() => requestDelete(loc)}
                      data-testid={`location-delete-${loc.id}`}
                      style={{ background: 'var(--danger)' }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {locations.length === 0 && <p className="muted">暂无地点</p>}
            </div>
          )}
        </div>
      </section>

      <CascadeDeleteDialog<LocationCascadePreview>
        open={cascadeTarget !== null}
        title="确认删除地点"
        entityName={cascadeTarget?.name ?? ''}
        loading={cascadeDeleting}
        errorMessage={cascadeError}
        loadPreview={() => locationsApi.cascadePreview(cascadeTarget!.id)}
        renderSummary={preview => (
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '4px' }}>
            <li>关联媒体组：<strong>{preview.willDelete.mediaSets}</strong> 个</li>
            <li>关联媒体图片：<strong>{preview.willDelete.mediaImages}</strong> 张</li>
          </ul>
        )}
        onCancel={() => { if (!cascadeDeleting) setCascadeTarget(null); }}
        onConfirm={confirmCascadeDelete}
        confirmLabel="确认删除"
      />
    </div>
  );
}

export default function AdminLocationsPage() {
  return (
    <ToastProvider>
      <AdminLocationsPageInner />
    </ToastProvider>
  );
}