import { useParams } from 'react-router-dom';
import { SpinViewer } from '@/components/media/SpinViewer';
import { usePublicData } from '@/services/storage/usePublicData';

export function SpinViewPage() {
  const { mediaSetId } = useParams();
  const reader = usePublicData();
  const publishedProjects = reader.getPublishedProjects();
  const publishedProjectIds = new Set(publishedProjects.map((project) => project.id));
  const state = reader.getState();
  const spinMediaSets = state.mediaSets.filter(
    (item) => item.type === 'spin360' && publishedProjectIds.has(item.projectId),
  );
  const mediaSet = spinMediaSets.find((item) => item.id === mediaSetId) ?? spinMediaSets[0] ?? null;
  const images = mediaSet ? reader.getMediaSetImages(mediaSet.id) : [];

  if (!mediaSet) {
    return (
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◈</div>
        <h2 className="section-title mt-4">暂无可展示的 360 媒体组</h2>
        <p className="muted mt-2">请先在后台为已发布项目创建 spin360 类型媒体组，并补充图片帧。</p>
        <a href="/admin" className="btn-accent mt-4" style={{
          display: 'inline-flex', padding: '12px 24px', textDecoration: 'none', borderRadius: '16px',
        }}>
          前往后台
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="glass animate-in" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span className="badge badge-warm">spin360</span>
          <h1 className="section-title" style={{ margin: 0 }}>{mediaSet.title}</h1>
        </div>
        <p className="muted">{mediaSet.description}</p>
      </div>
      <SpinViewer images={images} />
    </div>
  );
}
