import { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/common/ToastProvider';
import { useToast } from '@/components/common/useToast';
import { CascadeDeleteDialog } from '@/components/common/CascadeDeleteDialog';
import { routesApi, projectsApi, type Route, type Project, type RouteCascadePreview } from '@/services/api/adminApi';

interface RouteDeleteState {
  id: string;
  name: string;
}

function AdminRoutesPageInner() {
  const toast = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationIdsText, setLocationIdsText] = useState('');
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>('solid');
  const [color, setColor] = useState('#72e3d2');
  const [isFeatured, setIsFeatured] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const [cascadeTarget, setCascadeTarget] = useState<RouteDeleteState | null>(null);
  const [cascadeDeleting, setCascadeDeleting] = useState(false);
  const [cascadeError, setCascadeError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [rts, projs] = await Promise.all([
        routesApi.list(projectId || undefined),
        projectsApi.list(),
      ]);
      setRoutes(rts);
      setProjects(projs);
    } catch {
      toast.error('加载失败');
    }
  }, [projectId, toast]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  function startEdit(route: Route) {
    setEditingId(route.id);
    setProjectId(route.project_id);
    setName(route.name);
    setDescription(route.description);
    setLocationIdsText((route.locations || []).map(l => l.location_id).join(', '));
    setLineStyle(route.line_style as 'solid' | 'dashed');
    setColor(route.color);
    setIsFeatured(!!route.is_featured);
    setFieldError('');
  }

  function startCreate() {
    setEditingId(null);
    setProjectId('');
    setName('');
    setDescription('');
    setLocationIdsText('');
    setLineStyle('solid');
    setColor('#72e3d2');
    setIsFeatured(false);
    setFieldError('');
  }

  async function handleSave() {
    if (!projectId) { setFieldError('请选择所属项目'); return; }
    if (!name.trim()) { setFieldError('请输入轨迹名称'); return; }
    setFieldError('');
    try {
      const data = {
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || '待补充轨迹说明',
        line_style: lineStyle,
        color: color.trim(),
        is_featured: isFeatured,
        location_ids: locationIdsText.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (editingId) {
        await routesApi.update(editingId, data);
        toast.success('已保存');
      } else {
        await routesApi.create(data);
        toast.success('已创建');
      }
      await loadData();
      startCreate();
    } catch {
      toast.error(editingId ? '保存失败' : '创建失败');
    }
  }

  function requestDelete(route: Route) {
    setCascadeError(null);
    setCascadeTarget({ id: route.id, name: route.name });
  }

  async function confirmCascadeDelete() {
    if (!cascadeTarget) return;
    setCascadeDeleting(true);
    try {
      await routesApi.delete(cascadeTarget.id);
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
          <h1 className="section-title">轨迹管理</h1>
          <select value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">选择所属项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="轨迹名称" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="轨迹描述，可留空" />
          <input value={locationIdsText} onChange={e => setLocationIdsText(e.target.value)} placeholder="地点 ID，使用英文逗号分隔" />
          <select value={lineStyle} onChange={e => setLineStyle(e.target.value as 'solid' | 'dashed')}>
            <option value="solid">solid</option>
            <option value="dashed">dashed</option>
          </select>
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="#72e3d2" />
          <label className="muted" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
            设为精选轨迹
          </label>
          {fieldError && <p data-testid="route-field-error" style={{ color: 'var(--danger)' }}>{fieldError}</p>}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={handleSave}>{editingId ? '保存修改' : '新增轨迹'}</button>
            <button onClick={startCreate}>{editingId ? '取消编辑' : '清空表单'}</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">轨迹列表</h2>
          {loading ? <p className="muted">加载中...</p> : (
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              {routes.map(route => {
                const locationCount = (route.locations || []).length;
                const isEmpty = locationCount === 0;
                return (
                  <div key={route.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{route.name}</span>
                        {isEmpty && (
                          <span
                            data-testid={`route-empty-${route.id}`}
                            style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,107,107,0.15)', color: 'rgba(255,107,107,0.95)' }}
                          >
                            无关联地点
                          </span>
                        )}
                      </div>
                      <div className="muted">地点数量：{locationCount} · {route.color}</div>
                      {isEmpty && (
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'rgba(255,107,107,0.95)' }}>
                          发布前请关联至少一个地点，否则轨迹无法在地图上绘制。
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => startEdit(route)}>编辑</button>
                      <button
                        onClick={() => requestDelete(route)}
                        data-testid={`route-delete-${route.id}`}
                        style={{ background: 'var(--danger)' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
              {routes.length === 0 && <p className="muted">暂无轨迹</p>}
            </div>
          )}
        </div>
      </section>

      <CascadeDeleteDialog<RouteCascadePreview>
        open={cascadeTarget !== null}
        title="确认删除轨迹"
        entityName={cascadeTarget?.name ?? ''}
        loading={cascadeDeleting}
        errorMessage={cascadeError}
        loadPreview={() => routesApi.cascadePreview(cascadeTarget!.id)}
        renderSummary={preview => (
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '4px' }}>
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

export default function AdminRoutesPage() {
  return (
    <ToastProvider>
      <AdminRoutesPageInner />
    </ToastProvider>
  );
}