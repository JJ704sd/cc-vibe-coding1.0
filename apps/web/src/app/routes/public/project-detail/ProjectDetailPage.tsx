import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LocationDetailPanel } from '@/components/project/LocationDetailPanel';
import { MediaSetCard } from '@/components/project/MediaSetCard';
import { usePublicData } from '@/services/storage/usePublicData';

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const reader = usePublicData();
  const state = reader.getState();
  const publishedProjects = reader.getPublishedProjects();
  const project = publishedProjects.find((item) => item.id === projectId) ?? publishedProjects[0];

  const projectLocations = useMemo(() => state.locations.filter((location) => location.projectId === project?.id), [state.locations, project?.id]);
  const projectMediaSets = useMemo(() => state.mediaSets.filter((mediaSet) => mediaSet.projectId === project?.id), [state.mediaSets, project?.id]);
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <LocationDetailPanel location={selectedLocation} />
        {projectLocations.length > 0 && (
          <div className="glass" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text)' }}>时空轨迹</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projectLocations.map((location, index) => (
                <div key={location.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: location.id === selectedLocationId ? 'var(--accent)' : 'var(--glass-border)',
                    color: location.id === selectedLocationId ? 'white' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{location.name}</div>
                    <div className="muted" style={{ fontSize: '0.75rem' }}>
                      {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
