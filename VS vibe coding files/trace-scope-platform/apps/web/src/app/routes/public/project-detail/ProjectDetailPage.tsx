import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LocationDetailPanel } from '@/components/project/LocationDetailPanel';
import { MediaSetCard } from '@/components/project/MediaSetCard';
import { usePublicData } from '@/services/storage/usePublicData';

export function ProjectDetailPage() {
  const [nightMode] = useState(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 5.5 || h > 18.5;
  });
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
    <div className="page-shell" style={{
      display: 'grid',
      gap: '24px',
      paddingBottom: '64px',
      background: nightMode ? '#0f1629' : '#f0f4f8',
      transition: 'background 2s ease',
      fontFamily: "'Work Sans', sans-serif",
    }}>
      <section className="glass animate-in" style={{
        padding: '32px',
        background: nightMode ? 'rgba(15, 22, 41, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        transition: 'all 0.25s ease',
      }}>
        <p className="muted" style={{
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          fontSize: '0.7rem',
        }}>
          项目详情
        </p>
        <h1 className="section-title" style={{ marginTop: '8px', fontFamily: "'Cormorant Garamond', serif" }}>{project.title}</h1>
        <p className="muted mt-4" style={{ lineHeight: 1.7, fontFamily: "'Work Sans', sans-serif" }}>{project.description}</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <LocationDetailPanel location={selectedLocation} />
        {projectLocations.length > 0 && (
          <div className="glass" style={{
            padding: '20px',
            background: nightMode ? 'rgba(15, 22, 41, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.25s ease',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: nightMode ? '#E8ECEF' : 'var(--text)', fontFamily: "'Cormorant Garamond', serif" }}>时空轨迹</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projectLocations.map((location, index) => (
                <div key={location.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: location.id === selectedLocationId ? (nightMode ? '#7BA7FF' : '#f85a4e') : (nightMode ? 'rgba(123, 167, 255, 0.3)' : 'var(--glass-border)'),
                    color: location.id === selectedLocationId ? 'white' : (nightMode ? '#B8C5D6' : 'var(--text-secondary)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    flexShrink: 0,
                    transition: 'all 0.25s ease',
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: nightMode ? '#E8ECEF' : 'var(--text)', fontSize: '0.9rem', fontFamily: "'Work Sans', sans-serif" }}>{location.name}</div>
                    <div className="muted" style={{ fontSize: '0.75rem', fontFamily: "'Work Sans', sans-serif" }}>
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
        <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: '16px', fontFamily: "'Cormorant Garamond', serif" }}>地点列表</h2>
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
        <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: '16px', fontFamily: "'Cormorant Garamond', serif" }}>媒体组列表</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {projectMediaSets.map((mediaSet) => (
            <MediaSetCard key={mediaSet.id} mediaSet={mediaSet} />
          ))}
        </div>
      </section>
    </div>
  );
}
