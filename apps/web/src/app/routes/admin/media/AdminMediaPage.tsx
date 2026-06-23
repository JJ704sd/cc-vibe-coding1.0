import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/common/ToastProvider';
import { useToast } from '@/components/common/useToast';
import { CascadeDeleteDialog } from '@/components/common/CascadeDeleteDialog';
import {
  mediaSetsApi,
  mediaImagesApi,
  projectsApi,
  locationsApi,
  type MediaSet,
  type MediaImage,
  type Project,
  type Location,
  type MediaSetCascadePreview,
} from '@/services/api/adminApi';

interface MediaSetDeleteState {
  id: string;
  name: string;
}

interface ImageDeleteState {
  id: string;
  caption: string;
}

function AdminMediaPageInner() {
  const toast = useToast();
  const [mediaSets, setMediaSets] = useState<MediaSet[]>([]);
  const [mediaImages, setMediaImages] = useState<MediaImage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [dragImageId, setDragImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const [cascadeTarget, setCascadeTarget] = useState<MediaSetDeleteState | null>(null);
  const [cascadeDeleting, setCascadeDeleting] = useState(false);
  const [cascadeError, setCascadeError] = useState<string | null>(null);

  const [imageDeleteTarget, setImageDeleteTarget] = useState<ImageDeleteState | null>(null);
  const [imageDeleting, setImageDeleting] = useState(false);

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

  const locationsForProject = useMemo(
    () => (projectId ? locations.filter(l => l.project_id === projectId) : locations),
    [locations, projectId],
  );

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
    if (!projectId) { toast.error('请选择所属项目'); return; }
    if (!title.trim()) { toast.error('请输入标题'); return; }
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
        toast.success('已保存');
      } else {
        await mediaSetsApi.create(data);
        toast.success('已创建');
      }
      await loadData();
      startCreate();
    } catch {
      toast.error(editingId ? '保存失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  }

  function requestDeleteMediaSet(ms: MediaSet) {
    setCascadeError(null);
    setCascadeTarget({ id: ms.id, name: ms.title });
  }

  async function confirmCascadeDelete() {
    if (!cascadeTarget) return;
    setCascadeDeleting(true);
    try {
      await mediaSetsApi.delete(cascadeTarget.id);
      if (selectedMediaSetId === cascadeTarget.id) setSelectedMediaSetId(null);
      await loadData();
      toast.success('已删除');
      setCascadeTarget(null);
    } catch (e) {
      setCascadeError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setCascadeDeleting(false);
    }
  }

  function requestDeleteImage(image: MediaImage) {
    setImageDeleteTarget({ id: image.id, caption: image.caption || image.alt_text || image.id });
  }

  async function confirmImageDelete() {
    if (!imageDeleteTarget) return;
    setImageDeleting(true);
    setDeletingIds(prev => new Set(prev).add(imageDeleteTarget.id));
    try {
      await mediaImagesApi.delete(imageDeleteTarget.id);
      await loadData();
      toast.success('已删除');
      setImageDeleteTarget(null);
    } catch {
      toast.error('删除图片失败');
    } finally {
      setImageDeleting(false);
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(imageDeleteTarget!.id);
        return next;
      });
    }
  }

  async function handleUploadImage(file: File) {
    if (!selectedMediaSetId) { toast.error('请先选择一个媒体组'); return; }
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
      toast.success('上传成功！');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function reorderImages(newOrder: MediaImage[]) {
    if (!selectedMediaSetId) return;
    const previousOrder = selectedImages;
    const optimistic = newOrder.map((img, idx) => ({ ...img, sort_order: idx + 1 }));
    setMediaImages(prev => {
      const others = prev.filter(img => img.media_set_id !== selectedMediaSetId);
      return [...others, ...optimistic];
    });
    setReordering(true);
    try {
      const ids = optimistic.map(img => img.id);
      const res = await mediaSetsApi.reorderImages(selectedMediaSetId, ids);
      setMediaImages(prev => {
        const others = prev.filter(img => img.media_set_id !== selectedMediaSetId);
        return [...others, ...res.images];
      });
      toast.success('已更新图片顺序');
    } catch (e) {
      setMediaImages(prev => {
        const others = prev.filter(img => img.media_set_id !== selectedMediaSetId);
        return [...others, ...previousOrder];
      });
      toast.error(e instanceof Error ? e.message : '更新图片顺序失败');
    } finally {
      setReordering(false);
    }
  }

  function handleDragStart(imageId: string) {
    setDragImageId(imageId);
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (overId !== dragOverImageId) {
      setDragOverImageId(overId);
    }
  }

  function handleDragLeave() {
    setDragOverImageId(null);
  }

  function handleDrop(e: React.DragEvent, dropTargetId: string) {
    e.preventDefault();
    if (!dragImageId || dragImageId === dropTargetId || reordering) {
      setDragImageId(null);
      setDragOverImageId(null);
      return;
    }
    const current = selectedImages;
    const fromIdx = current.findIndex(img => img.id === dragImageId);
    const toIdx = current.findIndex(img => img.id === dropTargetId);
    if (fromIdx < 0 || toIdx < 0) {
      setDragImageId(null);
      setDragOverImageId(null);
      return;
    }
    const next = [...current];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDragImageId(null);
    setDragOverImageId(null);
    void reorderImages(next);
  }

  function handleMoveImage(imageId: string, direction: -1 | 1) {
    if (reordering) return;
    const current = selectedImages;
    const idx = current.findIndex(img => img.id === imageId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    void reorderImages(next);
  }

  function getProjectName(id: string) {
    return projects.find(p => p.id === id)?.title ?? id;
  }

  return (
    <div className="admin-layout page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">媒体管理</h1>
          <select value={projectId} onChange={e => { setProjectId(e.target.value); setLocationId(''); }} disabled={saving}>
            <option value="">选择所属项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select
            value={locationId}
            onChange={e => setLocationId(e.target.value)}
            disabled={saving || !projectId}
            data-testid="mediaset-location-select"
          >
            <option value="">不绑定主地点</option>
            {locationsForProject.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
              {mediaSets.map(ms => {
                const imageCount = mediaImages.filter(i => i.media_set_id === ms.id).length;
                const isEmpty = imageCount === 0;
                return (
                  <div key={ms.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{ms.title}</span>
                        {isEmpty && (
                          <span
                            data-testid={`mediaset-empty-${ms.id}`}
                            style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,107,107,0.15)', color: 'rgba(255,107,107,0.95)' }}
                          >
                            无图片
                          </span>
                        )}
                      </div>
                      <div className="muted">{ms.type} · {getProjectName(ms.project_id)} · 图片 {imageCount} 张</div>
                      {isEmpty && (
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'rgba(255,107,107,0.95)' }}>
                          发布前请至少上传一张图片，否则公开页面会显示空媒体组。
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setSelectedMediaSetId(ms.id)}>管理图片</button>
                      <button onClick={() => startEdit(ms)}>编辑</button>
                      <button
                        onClick={() => requestDeleteMediaSet(ms)}
                        data-testid={`mediaset-delete-${ms.id}`}
                        style={{ background: 'var(--danger)' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
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
            {selectedImages.map((image, index) => (
              <div
                key={image.id}
                className="panel"
                draggable
                onDragStart={() => handleDragStart(image.id)}
                onDragOver={e => handleDragOver(e, image.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, image.id)}
                data-testid={`media-image-row-${image.id}`}
                data-dragging={dragImageId === image.id ? 'true' : 'false'}
                data-drop-target={dragOverImageId === image.id ? 'true' : 'false'}
                style={{
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: dragImageId === image.id ? 0.5 : 1,
                  borderColor: dragOverImageId === image.id ? 'var(--accent)' : undefined,
                  cursor: 'grab',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div>{image.caption || image.alt_text}</div>
                  <div className="muted">
                    顺序：{image.sort_order}
                    {image.latitude && image.longitude && <span> · {image.latitude}, {image.longitude}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveImage(image.id, -1)}
                    disabled={index === 0 || reordering}
                    data-testid={`media-image-up-${image.id}`}
                    aria-label="上移"
                    style={{ padding: '6px 10px' }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveImage(image.id, 1)}
                    disabled={index === selectedImages.length - 1 || reordering}
                    data-testid={`media-image-down-${image.id}`}
                    aria-label="下移"
                    style={{ padding: '6px 10px' }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => requestDeleteImage(image)}
                    disabled={imageDeleting}
                    data-testid={`media-image-delete-${image.id}`}
                    style={{ background: 'var(--danger)' }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {selectedImages.length === 0 && selectedMediaSetId && <p className="muted">此媒体组暂无图片</p>}
          </div>
        </div>
      </section>

      <CascadeDeleteDialog<MediaSetCascadePreview>
        open={cascadeTarget !== null}
        title="确认删除媒体组"
        entityName={cascadeTarget?.name ?? ''}
        loading={cascadeDeleting}
        errorMessage={cascadeError}
        loadPreview={() => mediaSetsApi.cascadePreview(cascadeTarget!.id)}
        renderSummary={preview => (
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '4px' }}>
            <li>媒体图片：<strong>{preview.willDelete.mediaImages}</strong> 张</li>
          </ul>
        )}
        onCancel={() => { if (!cascadeDeleting) setCascadeTarget(null); }}
        onConfirm={confirmCascadeDelete}
        confirmLabel="确认删除"
      />

      <CascadeDeleteDialog<{ image: { id: string; caption: string } }>
        open={imageDeleteTarget !== null}
        title="确认删除图片"
        entityName={imageDeleteTarget?.caption ?? ''}
        loading={imageDeleting}
        loadPreview={async () => ({ image: { id: imageDeleteTarget!.id, caption: imageDeleteTarget!.caption } })}
        renderSummary={() => <span>该图片记录将被永久删除，操作不可撤销。</span>}
        onCancel={() => { if (!imageDeleting) setImageDeleteTarget(null); }}
        onConfirm={confirmImageDelete}
        confirmLabel="确认删除"
      />
    </div>
  );
}

export default function AdminMediaPage() {
  return (
    <ToastProvider>
      <AdminMediaPageInner />
    </ToastProvider>
  );
}