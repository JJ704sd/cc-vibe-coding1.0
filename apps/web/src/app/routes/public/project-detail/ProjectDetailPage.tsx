import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LocationDetailPanel } from '@/components/project/LocationDetailPanel';
import { MediaSetCard } from '@/components/project/MediaSetCard';
import { MapView } from '@/components/map/MapView';
import { usePublicData } from '@/services/storage/usePublicData';

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const reader = usePublicData();
  const state = reader.getState();
  const publishedProjects = reader.getPublishedProjects();
  const project = publishedProjects.find((item) => item.id === projectId) ?? publishedProjects[0];

  const projectLocations = useMemo(() => state.locations.filter((location) => location.projectId === project?.id), [state.locations, project?.id]);
  const projectMediaSets = useMemo(() => state.mediaSets.filter((mediaSet) => mediaSet.projectId === project?.id), [state.mediaSets, project?.id]);
  const projectRoutes = useMemo(() => state.routes.filter((route) => route.projectId === project?.id), [state.routes, project?.id]);
  const [selectedLocationId, setSelectedLocationId] = useState(projectLocations[0]?.id ?? null);
  const selectedLocation = projectLocations.find((location) => location.id === selectedLocationId) ?? null;

  if (!project) {
    return (
      <div className="page-shell" style={{ paddingBottom: '48px' }}>
        <section className="panel" style={{ padding: '24px' }}>
          <h1 className="section-title">未找到可展示项目</h1>
          <p className="muted">当前没有已发布项目可供前台展示。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ display: 'grid', gap: '24px', paddingBottom: '48px' }}>
      <section className="panel" style={{ padding: '28px' }}><p className="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.16em' }}>项目详情</p><h1 className="section-title">{project.title}</h1><p className="muted">{project.description}</p></section>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}><MapView locations={projectLocations} routes={projectRoutes} /><LocationDetailPanel location={selectedLocation} /></div>
      <section><h2 className="section-title">地点列表</h2><div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>{projectLocations.map((location) => (<button key={location.id} className="panel" onClick={() => setSelectedLocationId(location.id)} style={{ padding: '12px 16px', borderColor: location.id === selectedLocationId ? 'var(--accent)' : 'var(--panel-border)' }}>{location.name}</button>))}</div></section>
      <section><h2 className="section-title">媒体组列表</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '16px' }}>{projectMediaSets.map((mediaSet) => (<MediaSetCard key={mediaSet.id} mediaSet={mediaSet} />))}</div></section>
    </div>
  );
}
