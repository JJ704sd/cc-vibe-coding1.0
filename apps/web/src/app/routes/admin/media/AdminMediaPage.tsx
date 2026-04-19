import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { mediaSetsApi, mediaImagesApi, projectsApi, locationsApi, type MediaSet, type MediaImage, type Project, type Location } from '@/services/api/adminApi';

/**
 * 媒体管理页面
 *
 * 媒体组表单字段：
 * - projectId: 所属项目（必填）
 * - locationId: 主绑定地点（选填）
 * - title: 媒体组标题（必填）
 * - description: 描述（选填）
 * - type: 类型 gallery|spin360（必填）
 * - isFeatured: 是否精选
 *
 * 图片表单字段：
 * - caption: 图片标题
 * - altText: alt 文字
 * - latitude/longitude: 可选地理标记
 * - sortOrder: 上传顺序自动分配
 *
 * 后续扩展方向：
 * - 拖拽排序 UI（替代当前按 sort_order 文本显示）
 * - 批量上传
 * - 裁剪/压缩预处理
 */
  const [mediaSets, setMediaSets] = useState<MediaSet[]>([]);
  const [mediaImages, setMediaImages] = useState<MediaImage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMediaSetId, setSelectedMediaSetId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'gallery' | 'spin360'>('gallery');
  const [isFeatured, setIsFeatured] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [imageCaption, setImageCaption] = useState('');
  const [imageAltText, setImageAltText] = useState('');
  const [imageLatitude, setImageLatitude] = useState('');
  const [imageLongitude, setImageLongitude] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function flash(msg: string, duration = 2500) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), duration);
  }

  function flashError(msg: string, duration = 3000) {
    setError(msg);
    setTimeout(() => setError(''), duration);
  }

  const loadData = useCallback(async () => {
    const [sets, imgs, projs, locs] = await Promise.all([
      mediaSetsApi.list(),
      mediaImagesApi.list(),
      projectsApi.list(),
      locationsApi.list(),
    ]);
    setMediaSets(sets);
    setMediaImages(imgs);
    setProjects(projs);
    setLocations(locs);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const selectedMediaSet = useMemo(
    () => mediaSets.find(ms => ms.id === selectedMediaSetId) ?? null,
    [selectedMediaSetId, mediaSets],
  );

  const selectedImages = useMemo(() => {
    if (!selectedMediaSetId) return [];
    return [...mediaImages.filter(img => img.media_set_id === selectedMediaSetId)]
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [selectedMediaSetId, mediaImages]);

  function startEdit(ms: MediaSet) {
    setEditingId(ms.id);
    setSelectedMediaSetId(ms.id);
    setProjectId(ms.project_id);
    setLocationId(ms.location_id ?? '');
    setTitle(ms.title);
    setDescription(ms.description);
    setType(ms.type as 'gallery' | 'spin360');
    setIsFeatured(!!ms.is_featured);
  }

  function startCreate() {
    setEditingId(null);
    setSelectedMediaSetId(null);
    setProjectId('');
    setLocationId('');
    setTitle('');
    setDescription('');
    setType('gallery');
    setIsFeatured(false);
  }

  async function handleSave() {
    if (!projectId) { flashError('请选择所属项目'); return; }
    if (!title.trim()) { flashError('请输入标题'); return; }
    setSaving(true);
    try {
      const data = {
        project_id: projectId,
        location_id: locationId || undefined,
        type,
        title: title.trim(),
        description: description.trim() || '待补充媒体组说明',
        is_featured: isFeatured,
      };
      if (editingId) {
        await mediaSetsApi.update(editingId, data);
        flash('已保存');
      } else {
        await mediaSetsApi.create(data);
        flash('已创建');
      }
      await loadData();
      startCreate();
    } catch {
      flashError(editingId ? '保存失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMediaSet(id: string) {
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await mediaSetsApi.delete(id);
      if (selectedMediaSetId === id) setSelectedMediaSetId(null);
      await loadData();
      flash('已删除');
    } catch {
      flashError('删除失败');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDeleteImage(id: string) {
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await mediaImagesApi.delete(id);
      await loadData();
      flash('已删除');
    } catch {
      flashError('删除图片失败');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleUploadImage(file: File) {
    if (!selectedMediaSetId) { flashError('请先选择一个媒体组'); return; }
    setUploading(true);
    setUploadProgress('上传中...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error(`上传失败: ${res.status}`);
      const uploadResult = await res.json() as { id: string };
      setUploadProgress('添加图片记录...');
      const sortOrder = selectedImages.length + 1;
      await mediaImagesApi.create({
        media_set_id: selectedMediaSetId,
        upload_file_id: uploadResult.id,
        alt_text: imageAltText.trim() || file.name,
        caption: imageCaption.trim() || file.name,
        sort_order: sortOrder,
        latitude: imageLatitude ? parseFloat(imageLatitude) : undefined,
        longitude: imageLongitude ? parseFloat(imageLongitude) : undefined,
      });
      await loadData();
      setImageCaption('');
      setImageAltText('');
      setImageLatitude('');
      setImageLongitude('');
      flash('上传成功！');
    } catch (e) {
      flashError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function getProjectName(id: string) {
    return projects.find(p => p.id === id)?.title ?? id;
  }

  return (
    <div className="admin-layout page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        {success && (
          <div style={{ padding: '10px 16px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', color: 'rgba(74,222,128,0.9)', fontSize: '0.875rem' }}>
            ✓ {success}
          </div>
        )}
        {error && (
          <div style={{ padding: '10px 16px', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', color: 'rgba(255,107,107,0.9)', fontSize: '0.875rem' }}>
            ✗ {error}
          </div>
        )}

        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">媒体管理</h1>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} disabled={saving}>
            <option value="">选择所属项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select value={locationId} onChange={e => setLocationId(e.target.value)} disabled={saving}>
            <option value="">不绑定主地点</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="媒体组标题" disabled={saving} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="媒体组描述，可留空" disabled={saving} />
          <select value={type} onChange={e => setType(e.target.value as 'gallery' | 'spin360')} disabled={saving}>
            <option value="gallery">gallery</option>
            <option value="spin360">spin360</option>
          </select>
          <label className="muted" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} disabled={saving} />
            设为精选媒体组
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : (editingId ? '保存修改' : '新增媒体组')}
            </button>
            <button onClick={startCreate} disabled={saving}>取消编辑</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">媒体组列表</h2>
          {loading ? <p className="muted">加载中...</p> : (
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              {mediaSets.map(ms => (
                <div key={ms.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div>{ms.title}</div>
                    <div className="muted">{ms.type} · {getProjectName(ms.project_id)} · 图片 {mediaImages.filter(i => i.media_set_id === ms.id).length} 张</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setSelectedMediaSetId(ms.id)}>管理图片</button>
                    <button onClick={() => startEdit(ms)}>编辑</button>
                    <button
                      onClick={() => handleDeleteMediaSet(ms.id)}
                      disabled={deletingIds.has(ms.id)}
                      style={deletingIds.has(ms.id) ? { opacity: 0.5 } : { background: 'var(--danger)' }}
                    >
                      {deletingIds.has(ms.id) ? '删除中...' : '删除'}
                    </button>
                  </div>
                </div>
              ))}
              {mediaSets.length === 0 && <p className="muted">暂无媒体组</p>}
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h2 className="section-title">图片管理</h2>
          <p className="muted">当前选中媒体组：{selectedMediaSet?.title ?? '未选择'}</p>

          {selectedMediaSetId ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>图片标题</label>
                  <input value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="图片标题（选填）" disabled={uploading} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>alt文字</label>
                  <input value={imageAltText} onChange={e => setImageAltText(e.target.value)} placeholder="alt文字（选填）" disabled={uploading} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>纬度（选填）</label>
                  <input value={imageLatitude} onChange={e => setImageLatitude(e.target.value)} placeholder="如：31.2304" disabled={uploading} />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>经度（选填）</label>
                  <input value={imageLongitude} onChange={e => setImageLongitude(e.target.value)} placeholder="如：121.4737" disabled={uploading} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file);
                  }}
                  disabled={uploading}
                  style={{ color: 'rgba(220,220,240,0.7)', fontSize: '0.875rem' }}
                />
                {uploading && <span className="muted" style={{ fontSize: '0.8rem' }}>{uploadProgress}</span>}
              </div>
            </>
          ) : (
            <p className="muted" style={{ fontSize: '0.875rem' }}>请先从上方选择一个媒体组，再上传图片。</p>
          )}

          <div style={{ display: 'grid', gap: '12px', marginTop: '8px' }}>
            {selectedImages.map(image => (
              <div key={image.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div>{image.caption || image.alt_text}</div>
                  <div className="muted">
                    顺序：{image.sort_order}
                    {image.latitude && image.longitude && <span> · {image.latitude}, {image.longitude}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteImage(image.id)}
                  disabled={deletingIds.has(image.id)}
                  style={deletingIds.has(image.id) ? { opacity: 0.5 } : { background: 'var(--danger)' }}
                >
                  {deletingIds.has(image.id) ? '删除中...' : '删除'}
                </button>
              </div>
            ))}
            {selectedImages.length === 0 && selectedMediaSetId && <p className="muted">此媒体组暂无图片</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
