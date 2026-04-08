import { useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { createMediaSetDraft } from '@/services/storage/adminEditorDrafts';
import { validateImageDraft, validateMediaSetDraft } from '@/services/storage/adminValidation';
import { useAdminData } from '@/services/storage/useAdminData';

export function AdminMediaPage() {
  const { state, saveMediaSet, deleteMediaSet, saveMediaImage, deleteMediaImage, reorderMediaImages } = useAdminData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMediaSetId, setSelectedMediaSetId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => createMediaSetDraft());
  const [errors, setErrors] = useState<Partial<Record<keyof ReturnType<typeof createMediaSetDraft>, string>>>({});
  const [imageCaption, setImageCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageLatitude, setImageLatitude] = useState('');
  const [imageLongitude, setImageLongitude] = useState('');
  const [imageErrors, setImageErrors] = useState<Partial<Record<'caption' | 'url', string>>>({});
  const [batchUrls, setBatchUrls] = useState('');
  const [showBatch, setShowBatch] = useState(false);

  const selectedMediaSet = useMemo(
    () => state.mediaSets.find((mediaSet) => mediaSet.id === selectedMediaSetId) ?? null,
    [selectedMediaSetId, state.mediaSets],
  );
  const selectedImages = useMemo(() => {
    if (!selectedMediaSet) {
      return [];
    }
    return [...state.mediaImages.filter((image) => image.mediaSetId === selectedMediaSet.id)].sort((left, right) => left.sortOrder - right.sortOrder);
  }, [selectedMediaSet, state.mediaImages]);

  function startCreate() {
    setEditingId(null);
    setDraft(createMediaSetDraft());
    setErrors({});
  }

  function startEdit(mediaSetId: string) {
    const mediaSet = state.mediaSets.find((item) => item.id === mediaSetId);
    if (!mediaSet) {
      return;
    }
    setEditingId(mediaSetId);
    setSelectedMediaSetId(mediaSetId);
    setDraft(createMediaSetDraft(mediaSet));
    setErrors({});
  }

  function saveDraft() {
    const nextErrors = validateMediaSetDraft(draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const now = new Date().toISOString();
    const existingMediaSet = state.mediaSets.find((mediaSet) => mediaSet.id === editingId);
    const id = existingMediaSet?.id ?? `media-${Date.now()}`;

    saveMediaSet({
      id,
      projectId: draft.projectId,
      locationId: draft.locationId || null,
      type: draft.type,
      title: draft.title.trim(),
      description: draft.description.trim() || '待补充媒体组说明',
      coverImage: existingMediaSet?.coverImage ?? 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80',
      imageIds: existingMediaSet?.imageIds ?? [],
      isFeatured: draft.isFeatured,
      createdAt: existingMediaSet?.createdAt ?? now,
      updatedAt: now,
    });

    setSelectedMediaSetId(id);
    startCreate();
  }

  function addImage() {
    if (!selectedMediaSet) {
      return;
    }

    const nextErrors = validateImageDraft({ caption: imageCaption, url: imageUrl });
    if (Object.keys(nextErrors).length > 0) {
      setImageErrors(nextErrors);
      return;
    }

    const now = new Date().toISOString();
    saveMediaImage({
      id: `image-${Date.now()}`,
      mediaSetId: selectedMediaSet.id,
      url: imageUrl.trim() || 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80',
      thumbnailUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=300&q=80',
      altText: imageCaption.trim(),
      caption: imageCaption.trim(),
      latitude: parseFloat(imageLatitude) || undefined,
      longitude: parseFloat(imageLongitude) || undefined,
      sortOrder: selectedImages.length + 1,
      createdAt: now,
    });
    setImageCaption('');
    setImageUrl('');
    setImageLatitude('');
    setImageLongitude('');
    setImageErrors({});
  }

  function addBatchImages() {
    if (!selectedMediaSet) {
      return;
    }

    const urls = batchUrls.split('\n').map((url) => url.trim()).filter((url) => url.length > 0);
    if (urls.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    let sortOrder = selectedImages.length + 1;
    urls.forEach((url) => {
      saveMediaImage({
        id: `image-${Date.now()}-${sortOrder}`,
        mediaSetId: selectedMediaSet.id,
        url: url,
        thumbnailUrl: url,
        altText: '',
        caption: '',
        sortOrder: sortOrder,
        createdAt: now,
      });
      sortOrder++;
    });
    setBatchUrls('');
    setImageErrors({});
  }

  function moveImage(imageId: string, delta: number) {
    if (!selectedMediaSet) {
      return;
    }
    const currentIndex = selectedImages.findIndex((image) => image.id === imageId);
    const nextIndex = currentIndex + delta;
    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= selectedImages.length) {
      return;
    }
    const reorderedIds = [...selectedImages.map((image) => image.id)];
    const [movedId] = reorderedIds.splice(currentIndex, 1);
    reorderedIds.splice(nextIndex, 0, movedId);
    reorderMediaImages(selectedMediaSet.id, reorderedIds);
  }

  function confirmDeleteMediaSet(mediaSetId: string) {
    if (typeof window !== 'undefined' && !window.confirm('确认删除这个媒体组吗？')) {
      return;
    }
    deleteMediaSet(mediaSetId);
  }

  function confirmDeleteImage(imageId: string) {
    if (typeof window !== 'undefined' && !window.confirm('确认删除这张图片吗？')) {
      return;
    }
    deleteMediaImage(imageId);
  }

  return (
    <div className="page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">媒体管理</h1>
          <select value={draft.projectId} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
            <option value="">选择所属项目</option>
            {state.projects.map((project) => (<option key={project.id} value={project.id}>{project.title}</option>))}
          </select>
          {errors.projectId ? <p style={{ color: 'var(--danger)' }}>{errors.projectId}</p> : null}
          <select value={draft.locationId} onChange={(event) => setDraft((current) => ({ ...current, locationId: event.target.value }))}>
            <option value="">不绑定主地点</option>
            {state.locations.map((location) => (<option key={location.id} value={location.id}>{location.name}</option>))}
          </select>
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="媒体组标题" />
          {errors.title ? <p style={{ color: 'var(--danger)' }}>{errors.title}</p> : null}
          <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="媒体组描述，可留空" />
          <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as 'spin360' | 'gallery' }))}>
            <option value="gallery">gallery</option>
            <option value="spin360">spin360</option>
          </select>
          <label className="muted" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="checkbox" checked={draft.isFeatured} onChange={(event) => setDraft((current) => ({ ...current, isFeatured: event.target.checked }))} />
            设为精选媒体组
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={saveDraft}>{editingId ? '保存修改' : '新增媒体组'}</button>
            <button onClick={startCreate}>{editingId ? '取消编辑' : '清空表单'}</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">媒体组列表</h2>
          <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
            {state.mediaSets.map((mediaSet) => (
              <div key={mediaSet.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div>{mediaSet.title}</div>
                  <div className="muted">{mediaSet.type} · 图片 {state.mediaImages.filter((image) => image.mediaSetId === mediaSet.id).length} 张</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setSelectedMediaSetId(mediaSet.id)}>管理图片</button>
                  <button onClick={() => startEdit(mediaSet.id)}>编辑</button>
                  <button onClick={() => confirmDeleteMediaSet(mediaSet.id)}>删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h2 className="section-title">图片管理</h2>
          <p className="muted">当前选中媒体组：{selectedMediaSet?.title ?? '未选择'}</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setShowBatch(false)} style={!showBatch ? { background: 'var(--accent)', color: 'white' } : {}}>单张添加</button>
            <button onClick={() => setShowBatch(true)} style={showBatch ? { background: 'var(--accent)', color: 'white' } : {}}>批量添加</button>
          </div>

          {!showBatch ? (
            <>
              <input value={imageCaption} onChange={(event) => setImageCaption(event.target.value)} placeholder="图片标题" disabled={!selectedMediaSet} />
              {imageErrors.caption ? <p style={{ color: 'var(--danger)' }}>{imageErrors.caption}</p> : null}
              <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="图片 URL，留空则使用占位图" disabled={!selectedMediaSet} />
              {imageErrors.url ? <p style={{ color: 'var(--danger)' }}>{imageErrors.url}</p> : null}
              <input value={imageLatitude} onChange={(e) => setImageLatitude(e.target.value)} placeholder="纬度（可选）" disabled={!selectedMediaSet} />
              <input value={imageLongitude} onChange={(e) => setImageLongitude(e.target.value)} placeholder="经度（可选）" disabled={!selectedMediaSet} />
              <button onClick={addImage} disabled={!selectedMediaSet}>新增图片</button>
            </>
          ) : (
            <>
              <textarea
                value={batchUrls}
                onChange={(event) => setBatchUrls(event.target.value)}
                placeholder="每行一个图片URL，批量添加多张图片"
                disabled={!selectedMediaSet}
                style={{ minHeight: '120px', resize: 'vertical' }}
              />
              <button onClick={addBatchImages} disabled={!selectedMediaSet || !batchUrls.trim()}>
                批量添加 {batchUrls.split('\n').filter((u) => u.trim()).length} 张图片
              </button>
            </>
          )}
          <div style={{ display: 'grid', gap: '12px' }}>
            {selectedImages.map((image, index) => (
              <div key={image.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div>{image.caption}</div>
                  <div className="muted">
                  顺序：{image.sortOrder}
                  {image.latitude !== undefined && <span> · {image.latitude}, {image.longitude}</span>}
                </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => moveImage(image.id, -1)} disabled={index === 0}>上移</button>
                  <button onClick={() => moveImage(image.id, 1)} disabled={index === selectedImages.length - 1}>下移</button>
                  <button onClick={() => confirmDeleteImage(image.id)}>删除图片</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
