interface MapRelationshipPanelProps {
  title: string;
  summary: string;
}

export function MapRelationshipPanel({ title, summary }: MapRelationshipPanelProps) {
  return (
    <aside className="map-relationship-panel glass">
      <h2 className="section-title-sm">{title}</h2>
      <p className="muted">{summary}</p>
    </aside>
  );
}
