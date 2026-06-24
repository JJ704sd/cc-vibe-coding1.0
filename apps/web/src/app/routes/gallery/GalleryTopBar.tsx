import { Link } from 'react-router-dom';

export interface GalleryTopBarProps {
  nightMode: boolean;
  isMapMode: boolean;
  showSearch: boolean;
  searchQuery: string;
  onSearchToggle: () => void;
  onSearchChange: (value: string) => void;
  onViewModeToggle: () => void;
  onNightModeToggle: () => void;
}

interface NavLinkItem {
  to: string;
  label: string;
}

const navLinks: NavLinkItem[] = [
  { to: '/map', label: 'Map' },
  { to: '/projects', label: 'Projects' },
  { to: '/admin', label: 'Admin' },
];

/**
 * Right-aligned floating control strip on the gallery home page:
 * - search toggle + filter input (map view only)
 * - view mode toggle (map <-> gallery)
 * - day/night toggle
 * - persistent nav links to /map / /projects / /admin
 *
 * Stateless: every state bit is owned by the parent (GalleryHome) so the
 * toggle wiring + search query stay next to the rest of the page state.
 *
 * Positioning wrapper (position: fixed, top/right safe-area, flexWrap: 'wrap')
 * is owned by the parent so the page keeps full control over responsive
 * layout; this component only renders the controls themselves.
 */
export function GalleryTopBar({
  nightMode,
  isMapMode,
  showSearch,
  searchQuery,
  onSearchToggle,
  onSearchChange,
  onViewModeToggle,
  onNightModeToggle,
}: GalleryTopBarProps) {
  return (
    <>
      {isMapMode && (
        <>
          <button
            type="button"
            aria-label={showSearch ? 'Hide map search' : 'Show map search'}
            title={showSearch ? 'Hide map search' : 'Show map search'}
            onClick={onSearchToggle}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              background: showSearch
                ? 'rgba(91,141,238,0.3)'
                : nightMode
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.1)',
              border: `1px solid ${showSearch ? 'rgba(91,141,238,0.5)' : nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
              color: 'rgba(255,255,255,0.85)',
              fontSize: '1rem',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
            }}
          >
            Search
          </button>
          {showSearch && (
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Filter selected media…"
              aria-label="Filter selected media"
              name="selected-media-filter"
              autoComplete="off"
              style={{
                width: 'min(200px, calc(100vw - 128px))',
                padding: '8px 14px',
                borderRadius: '14px',
                background: nightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                color: nightMode ? 'white' : 'black',
                fontSize: '0.85rem',
                outline: 'none',
                backdropFilter: 'blur(12px)',
                fontFamily: "'Work Sans', sans-serif",
              }}
            />
          )}
        </>
      )}

      <button
        type="button"
        aria-label={isMapMode ? 'Switch to gallery view' : 'Switch to map view'}
        title={isMapMode ? 'Switch to gallery view' : 'Switch to map view'}
        onClick={onViewModeToggle}
        style={{
          minWidth: '40px',
          height: '40px',
          padding: '0 14px',
          borderRadius: '14px',
          background: isMapMode ? 'rgba(91,141,238,0.3)' : nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
          border: `1px solid ${isMapMode ? 'rgba(91,141,238,0.5)' : nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
          color: isMapMode ? '#7BA7FF' : 'rgba(255,255,255,0.85)',
          fontSize: '0.82rem',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
        }}
      >
        {isMapMode ? 'Gallery' : 'Map'}
      </button>

      <button
        type="button"
        aria-label={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
        title={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
        onClick={onNightModeToggle}
        style={{
          minWidth: '40px',
          height: '40px',
          padding: '0 14px',
          borderRadius: '14px',
          background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
          border: `1px solid ${nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
          color: nightMode ? '#7BA7FF' : '#FFEEDD',
          fontSize: '0.82rem',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
        }}
      >
        {nightMode ? 'Day' : 'Night'}
      </button>

      {navLinks.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          style={{
            padding: '8px 18px',
            borderRadius: '14px',
            fontSize: '0.8rem',
            fontWeight: 500,
            fontFamily: "'Work Sans', sans-serif",
            backdropFilter: 'blur(12px)',
            background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
            border: `1px solid ${nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
            color: 'rgba(255,255,255,0.85)',
            textDecoration: 'none',
            transition: 'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease',
          }}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}