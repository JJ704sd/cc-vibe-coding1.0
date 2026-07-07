import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/common/ToastProvider';
import { CascadeDeleteDialog } from '@/components/common/CascadeDeleteDialog';
import type { ProjectCascadePreview } from '@/services/api/adminApi';
import { useProjectsPageController } from '@/features/admin/projects/useProjectsPageController';

function AdminProjectsPageInner() {
  const controller = useProjectsPageController();

  return (
    <div className="admin-layout page-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <AdminSidebar />
      <section style={{ display: 'grid', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
          <h1 className="section-title">项目管理</h1>
          <p className="muted">支持新建、编辑、删除。项目标题和摘要为必填项。</p>
          <input value={controller.title} onChange={(e) => controller.setTitle(e.target.value)} placeholder="项目标题" />
          <textarea value={controller.summary} onChange={(e) => controller.setSummary(e.target.value)} placeholder="项目摘要" />
          <textarea value={controller.description} onChange={(e) => controller.setDescription(e.target.value)} placeholder="项目描述，可留空" />
          <input
            value={controller.tagsText}
            onChange={(e) => controller.setTagsText(e.target.value)}
            placeholder="标签，使用英文逗号分隔"
            data-testid="project-tags-input"
          />
          <select value={controller.status} onChange={(e) => controller.setStatus(e.target.value as 'draft' | 'published')}>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>
          {controller.fieldError && <p data-testid="project-field-error" style={{ color: 'var(--danger)' }}>{controller.fieldError}</p>}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={controller.handleSave}>{controller.editingId ? '保存修改' : '新增项目'}</button>
            <button onClick={controller.startCreate}>{controller.editingId ? '取消编辑' : '清空表单'}</button>
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 className="section-title">项目列表</h2>
          {controller.loading ? <p className="muted">加载中...</p> : (
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              {controller.projects.map((project) => {
                const readiness = controller.readinessByProject[project.id] ?? { status: 'draft' as const, missing: [] };
                const badgeStyle =
                  readiness.status === 'ready'
                    ? { background: 'rgba(74,222,128,0.15)', color: 'rgba(74,222,128,0.95)' }
                    : readiness.status === 'incomplete'
                    ? { background: 'rgba(255,107,107,0.15)', color: 'rgba(255,107,107,0.95)' }
                    : { background: 'rgba(150,150,170,0.15)', color: 'rgba(200,200,220,0.85)' };
                const badgeLabel =
                  readiness.status === 'ready'
                    ? '已发布 · 完整'
                    : readiness.status === 'incomplete'
                    ? '已发布 · 未完整'
                    : '草稿';
                const tags = project.tags || [];
                return (
                  <div key={project.id} className="panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{project.title}</span>
                        <span
                          data-testid={`project-readiness-${project.id}`}
                          style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', ...badgeStyle }}
                        >
                          {badgeLabel}
                        </span>
                      </div>
                      <div className="muted">{project.summary}</div>
                      {tags.length > 0 && (
                        <div
                          data-testid={`project-tags-${project.id}`}
                          style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}
                        >
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: 'rgba(91,141,238,0.15)',
                                color: 'rgba(123,167,255,0.95)',
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {readiness.status === 'incomplete' && (
                        <div data-testid={`project-readiness-missing-${project.id}`} style={{ marginTop: '6px', fontSize: '0.8rem', color: 'rgba(255,107,107,0.95)' }}>
                          发布前请补齐：{readiness.missing.join('、')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => controller.startEdit(project)}>编辑</button>
                      <button
                        onClick={() => controller.requestDelete(project)}
                        data-testid={`project-delete-${project.id}`}
                        style={{ background: 'var(--danger)' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
              {controller.projects.length === 0 && <p className="muted">暂无项目</p>}
            </div>
          )}
        </div>
      </section>

      <CascadeDeleteDialog<ProjectCascadePreview>
        open={controller.cascadeTarget !== null}
        title="确认删除项目"
        entityName={controller.cascadeTarget?.name ?? ''}
        loading={controller.cascadeDeleting}
        errorMessage={controller.cascadeError}
        loadPreview={controller.loadPreview}
        renderSummary={(preview) => (
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '4px' }}>
            <li>地点：<strong>{preview.willDelete.locations}</strong> 个</li>
            <li>媒体组：<strong>{preview.willDelete.mediaSets}</strong> 个</li>
            <li>媒体图片：<strong>{preview.willDelete.mediaImages}</strong> 张</li>
            <li>轨迹：<strong>{preview.willDelete.routes}</strong> 条</li>
            <li>轨迹-地点关联：<strong>{preview.willDelete.routeLocations}</strong> 条</li>
          </ul>
        )}
        onCancel={controller.cancelCascadeDelete}
        onConfirm={controller.confirmCascadeDelete}
        confirmLabel="确认删除"
      />
    </div>
  );
}

export default function AdminProjectsPage() {
  return (
    <ToastProvider>
      <AdminProjectsPageInner />
    </ToastProvider>
  );
}