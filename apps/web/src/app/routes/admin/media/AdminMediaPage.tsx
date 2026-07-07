import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/common/ToastProvider';
import { CascadeDeleteDialog } from '@/components/common/CascadeDeleteDialog';
import { useMediaPageController } from '@/features/admin/media/useMediaPageController';

function AdminMediaPageInner() {
  const controller = useMediaPageController();

  return (
    <div className="admin-layout page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">媒体管理</h1>
          <select
            value={controller.projectId}
            onChange={(e) => controller.setProjectId(e.target.value)}
            disabled={controller.saving}
          >
            <option value="">选择所属项目</option>
            {controller.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <select
            value={controller.locationId}
            onChange={(e) => controller.setLocationId(e.target.value)}
            disabled={controller.saving || !controller.projectId}
            data-testid="mediaset-location-select"
          >
            <option value="">不绑定主地点</option>
            {controller.locationsForProject.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <input
            value={controller.title}
            onChange={(e) => controller.setTitle(e.target.value)}
            placeholder="媒体组标题"
            disabled={controller.saving}
          />
          <textarea
            value={controller.description}
            onChange={(e) => controller.setDescription(e.target.value)}
            placeholder="媒体组描述，可留空"
            disabled={controller.saving}
          />
          <select
            value={controller.type}
            onChange={(e) => controller.setType(e.target.value as 'gallery' | 'spin360')}
            disabled={controller.saving}
          >
            <option value="gallery">gallery</option>
            <option value="spin360">spin360</option>
          </select>
          <label className="muted" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={controller.isFeatured}
              onChange={(e) => controller.setIsFeatured(e.target.checked)}
              disabled={controller.saving}
            />
            设为精选媒体组
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={controller.handleSave} disabled={controller.saving}>
              {controller.saving ? '保存中...' : controller.editingId ? '保存修改' : '新增媒体组'}
            </button>
            <button onClick={controller.startCreate} disabled={controller.saving}>
              取消编辑
            </button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">媒体组列表</h2>
          {controller.loading ? (
            <p className="muted">加载中...</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              {controller.mediaSets.map((ms) => {
                const imageCount = controller.mediaImages.filter((i) => i.media_set_id === ms.id).length;
                const isEmpty = imageCount === 0;
                return (
                  <div
                    key={ms.id}
                    className="panel"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: '1 1 320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{ms.title}</span>
                        {isEmpty && (
                          <span
                            data-testid={`mediaset-empty-${ms.id}`}
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: 'rgba(255,107,107,0.15)',
                              color: 'rgba(255,107,107,0.95)',
                            }}
                          >
                            无图片
                          </span>
                        )}
                      </div>
                      <div className="muted">
                        {ms.type} · {controller.getProjectName(ms.project_id)} · 图片 {imageCount} 张
                      </div>
                      {isEmpty && (
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'rgba(255,107,107,0.95)' }}>
                          发布前请至少上传一张图片，否则公开页面会显示空媒体组。
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => controller.setSelectedMediaSetId(ms.id)}>管理图片</button>
                      <button onClick={() => controller.startEdit(ms)}>编辑</button>
                      <button
                        onClick={() => controller.requestDeleteMediaSet(ms)}
                        data-testid={`mediaset-delete-${ms.id}`}
                        style={{ background: 'var(--danger)' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
              {controller.mediaSets.length === 0 && <p className="muted">暂无媒体组</p>}
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h2 className="section-title">图片管理</h2>
          <p className="muted">当前选中媒体组：{controller.selectedMediaSet?.title ?? '未选择'}</p>

          {controller.selectedMediaSetId ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                    图片标题
                  </label>
                  <input
                    value={controller.imageCaption}
                    onChange={(e) => controller.setImageCaption(e.target.value)}
                    placeholder="图片标题（选填）"
                    disabled={controller.uploading}
                  />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                    alt文字
                  </label>
                  <input
                    value={controller.imageAltText}
                    onChange={(e) => controller.setImageAltText(e.target.value)}
                    placeholder="alt文字（选填）"
                    disabled={controller.uploading}
                  />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                    纬度（选填）
                  </label>
                  <input
                    value={controller.imageLatitude}
                    onChange={(e) => controller.setImageLatitude(e.target.value)}
                    placeholder="如：31.2304"
                    disabled={controller.uploading}
                  />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
                    经度（选填）
                  </label>
                  <input
                    value={controller.imageLongitude}
                    onChange={(e) => controller.setImageLongitude(e.target.value)}
                    placeholder="如：121.4737"
                    disabled={controller.uploading}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  ref={controller.fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void controller.handleUploadImage(file);
                  }}
                  disabled={controller.uploading}
                  style={{ color: 'rgba(220,220,240,0.7)', fontSize: '0.875rem' }}
                />
                {controller.uploading && (
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    {controller.uploadProgress}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="muted" style={{ fontSize: '0.875rem' }}>
              请先从上方选择一个媒体组，再上传图片。
            </p>
          )}

          <div style={{ display: 'grid', gap: '12px', marginTop: '8px' }}>
            {controller.selectedImages.map((image, index) => (
              <div
                key={image.id}
                className="panel"
                draggable
                onDragStart={() => controller.handleDragStart(image.id)}
                onDragOver={(e) => controller.handleDragOver(e, image.id)}
                onDragLeave={controller.handleDragLeave}
                onDrop={(e) => controller.handleDrop(e, image.id)}
                data-testid={`media-image-row-${image.id}`}
                data-dragging={controller.dragImageId === image.id ? 'true' : 'false'}
                data-drop-target={controller.dragOverImageId === image.id ? 'true' : 'false'}
                style={{
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: controller.dragImageId === image.id ? 0.5 : 1,
                  borderColor: controller.dragOverImageId === image.id ? 'var(--accent)' : undefined,
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
                    onClick={() => controller.handleMoveImage(image.id, -1)}
                    disabled={index === 0 || controller.reordering}
                    data-testid={`media-image-up-${image.id}`}
                    aria-label="上移"
                    style={{ padding: '6px 10px' }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => controller.handleMoveImage(image.id, 1)}
                    disabled={index === controller.selectedImages.length - 1 || controller.reordering}
                    data-testid={`media-image-down-${image.id}`}
                    aria-label="下移"
                    style={{ padding: '6px 10px' }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => controller.requestDeleteImage(image)}
                    disabled={controller.imageDeleting}
                    data-testid={`media-image-delete-${image.id}`}
                    style={{ background: 'var(--danger)' }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {controller.selectedImages.length === 0 && controller.selectedMediaSetId && (
              <p className="muted">此媒体组暂无图片</p>
            )}
          </div>
        </div>
      </section>

      <CascadeDeleteDialog
        open={controller.cascadeTarget !== null}
        title="确认删除媒体组"
        entityName={controller.cascadeTarget?.name ?? ''}
        loading={controller.cascadeDeleting}
        errorMessage={controller.cascadeError}
        loadPreview={controller.loadCascadePreview}
        renderSummary={(preview) => (
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '4px' }}>
            <li>
              媒体图片：<strong>{preview.willDelete.mediaImages}</strong> 张
            </li>
          </ul>
        )}
        onCancel={controller.cancelCascadeDelete}
        onConfirm={() => {
          void controller.confirmCascadeDelete();
        }}
        confirmLabel="确认删除"
      />

      <CascadeDeleteDialog
        open={controller.imageDeleteTarget !== null}
        title="确认删除图片"
        entityName={controller.imageDeleteTarget?.caption ?? ''}
        loading={controller.imageDeleting}
        loadPreview={controller.loadImageDeletePreview}
        renderSummary={() => <span>该图片记录将被永久删除，操作不可撤销。</span>}
        onCancel={controller.cancelImageDelete}
        onConfirm={() => {
          void controller.confirmImageDelete();
        }}
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