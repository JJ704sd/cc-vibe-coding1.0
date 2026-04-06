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
      <div className="glass" style={{ padding: '48px', textAlign: 'center' }}>
        <div className="empty-state-icon">◈</div>
        <h2 className="section-title mt-4">未找到可展示项目</h2>
        <p className="muted mt-2">当前没有已发布项目可供前台展示。</p>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ display: 'grid', gap: '24px', paddingBottom: '64px' }}>
      <section className="glass animate-in" style={{ padding: '32px' }}>
        <p className="muted" style={{
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          fontSize: '0.7rem',
        }}>
          项目详情
        </p>
        <h1 className="section-title" style={{ marginTop: '8px' }}>{project.title}</h1>
        <p className="muted mt-4" style={{ lineHeight: 1.7 }}>{project.description}</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass" style={{ padding: '20px' }}>
          <MapView
            locations={projectLocations}
            routes={projectRoutes}
            selectedLocationId={selectedLocationId}
            selectedRouteId={null}
            onLocationSelect={setSelectedLocationId}
          />
        </div>
        <LocationDetailPanel location={selectedLocation} />
      </div>

      <section>
        <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>地点列表</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {projectLocations.map((location) => (
            <button
              key={location.id}
              className="glass"
              onClick={() => setSelectedLocationId(location.id)}
              style={{
                padding: '10px 18px',
                borderRadius: '16px',
                border: location.id === selectedLocationId
                  ? '1px solid var(--accent)'
                  : '1px solid var(--glass-border)',
                background: location.id === selectedLocationId
                  ? 'rgba(91, 141, 238, 0.15)'
                  : 'var(--glass-bg)',
                color: location.id === selectedLocationId
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            >
              {location.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>媒体组列表</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {projectMediaSets.map((mediaSet) => (
            <MediaSetCard key={mediaSet.id} mediaSet={mediaSet} />
          ))}
        </div>
      </section>
    </div>
  );
}
