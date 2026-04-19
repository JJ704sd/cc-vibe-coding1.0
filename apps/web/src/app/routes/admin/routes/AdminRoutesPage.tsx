import { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { routesApi, projectsApi, type Route, type Project } from '@/services/api/adminApi';

/**
 * 轨迹管理页面
 *
 * 表单字段说明：
 * - projectId: 所属项目（必填）
 * - name: 轨迹名称（必填）
 * - description: 轨迹描述（选填）
 * - locationIds: 地点 ID 列表（当前为逗号分隔文本，后续改为拖拽排序 UI）
 * - lineStyle: 线型 solid|dashed
 * - color: 轨迹颜色（HEX）
 * - isFeatured: 是否精选
 *
 * 后续扩展方向：
 * - 拖拽式地点顺序调整 UI（替代当前逗号分隔文本）
 * - 地图可视化选点
 * - 轨迹预览
 */
  const [routes, setRoutes] = useState<Route[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationIdsText, setLocationIdsText] = useState('');
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>('solid');
  const [color, setColor] = useState('#72e3d2');
  const [isFeatured, setIsFeatured] = useState(false);

  const loadData = useCallback(async () => {
    const [rts, projs] = await Promise.all([
      routesApi.list(projectId || undefined),
      projectsApi.list(),
    ]);
    setRoutes(rts);
    setProjects(projs);
  }, [projectId]);

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
  }

  async function handleSave() {
    if (!projectId) { setError('请选择所属项目'); return; }
    if (!name.trim()) { setError('请输入轨迹名称'); return; }
    setError('');
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
      } else {
        await routesApi.create(data);
      }
      await loadData();
      startCreate();
    } catch {
      setError(editingId ? '保存失败' : '创建失败');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('确认删除这条轨迹吗？')) return;
    try {
      await routesApi.delete(id);
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
          {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={handleSave}>{editingId ? '保存修改' : '新增轨迹'}</button>
            <button onClick={startCreate}>{editingId ? '取消编辑' : '清空表单'}</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">轨迹列表</h2>
          {loading ? <p className="muted">加载中...</p> : (
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              {routes.map(route => (
                <div key={route.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div>{route.name}</div>
                    <div className="muted">地点数量：{(route.locations || []).length} · {route.color}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => startEdit(route)}>编辑</button>
                    <button onClick={() => handleDelete(route.id)}>删除</button>
                  </div>
                </div>
              ))}
              {routes.length === 0 && <p className="muted">暂无轨迹</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
