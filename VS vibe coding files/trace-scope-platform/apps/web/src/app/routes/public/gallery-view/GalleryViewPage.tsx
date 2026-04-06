import { useParams } from 'react-router-dom';
import { GalleryViewer } from '@/components/media/GalleryViewer';
import { usePublicData } from '@/services/storage/usePublicData';

export function GalleryViewPage() {
  const { mediaSetId } = useParams();
  const reader = usePublicData();
  const publishedProjects = reader.getPublishedProjects();
  const publishedProjectIds = new Set(publishedProjects.map((project) => project.id));
  const state = reader.getState();
  const galleryMediaSets = state.mediaSets.filter(
    (item) => item.type === 'gallery' && publishedProjectIds.has(item.projectId),
  );
  const mediaSet = galleryMediaSets.find((item) => item.id === mediaSetId) ?? galleryMediaSets[0] ?? null;
  const images = mediaSet ? reader.getMediaSetImages(mediaSet.id) : [];

  if (!mediaSet) {
    return (
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◇</div>
        <h2 className="section-title mt-4">暂无可展示的图集媒体组</h2>
        <p className="muted mt-2">请先在后台为已发布项目创建 gallery 类型媒体组，并补充图片。</p>
        <a href="/admin" className="btn-accent mt-4" style={{
          display: 'inline-flex', padding: '12px 24px', textDecoration: 'none', borderRadius: '16px',
        }}>
          前往后台
        </a>
      </div>
    );
  }

  return (
      <div className="glass animate-in" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span className="badge badge-accent">gallery</span>
          <h1 className="section-title" style={{ margin: 0 }}>{mediaSet.title}</h1>
        </div>
        <p className="muted">{mediaSet.description}</p>
      </div>
      <GalleryViewer images={images} />
  );
}
