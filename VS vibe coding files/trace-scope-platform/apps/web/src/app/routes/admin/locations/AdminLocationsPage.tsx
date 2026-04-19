import { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { locationsApi, projectsApi, type Location, type Project } from '@/services/api/adminApi';

/**
 * 地点管理页面
 *
 * 表单字段说明：
 * - projectId: 所属项目（必填）
 * - name: 地点名称（必填）
 * - description: 地点描述（选填）
 * - latitude: 纬度（必填，必须显式录入）
 * - longitude: 经度（必填，必须显式录入）
 * - addressText: 地址说明
 * - visitOrder: 访问顺序（选填，辅助字段）
 *
 * 后续扩展方向：
 * - 地图选点交互（点击地图自动填入经纬度）
 * - 地址自动地理编码
 * - 地点关联多个媒体组
 */
  const [locations, setLocations] = useState<Location[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [addressText, setAddressText] = useState('');
  const [visitOrderText, setVisitOrderText] = useState('');

  const loadData = useCallback(async () => {
    const [locs, projs] = await Promise.all([
      locationsApi.list(projectId || undefined),
      projectsApi.list(),
    ]);
    setLocations(locs);
    setProjects(projs);
  }, [projectId]);

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
  }

  async function handleSave() {
    if (!projectId) { setError('请选择所属项目'); return; }
    if (!name.trim()) { setError('请输入地点名称'); return; }
    if (!latitudeText) { setError('请输入纬度'); return; }
    if (!longitudeText) { setError('请输入经度'); return; }
    setError('');
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
      } else {
        await locationsApi.create(data);
      }
      await loadData();
      startCreate();
    } catch {
      setError(editingId ? '保存失败' : '创建失败');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('确认删除这个地点吗？')) return;
    try {
      await locationsApi.delete(id);
      await loadData();
    } catch {
      setError('删除失败');
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
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
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
                    <button onClick={() => handleDelete(loc.id)}>删除</button>
                  </div>
                </div>
              ))}
              {locations.length === 0 && <p className="muted">暂无地点</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
