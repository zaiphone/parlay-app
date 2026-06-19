import { sportDisplayLabel } from '../utils';

interface SportTabsProps {
  sports: { key: string; gameCount: number }[];
  active: string;
  onChange: (sport: string) => void;
}

const A = '#22c55e';

/** Horizontal sport selector. Scrolls on narrow screens. */
export function SportTabs({ sports, active, onChange }: SportTabsProps) {
  return (
    <div
      className="no-scrollbar"
      role="tablist"
      aria-label="Sport"
      style={{
        display: 'flex',
        gap: 9,
        marginBottom: 22,
        overflowX: 'auto',
        paddingBottom: 2,
      }}
    >
      {sports.map(({ key, gameCount }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              cursor: 'pointer',
              borderRadius: 12,
              padding: '11px 18px',
              flexShrink: 0,
              border: `1px solid ${isActive ? A : 'var(--border)'}`,
              background: isActive ? A : 'var(--surface)',
              color: isActive ? 'var(--bg)' : 'var(--text)',
              fontFamily: 'Archivo, sans-serif',
              boxShadow: isActive ? '0 0 22px rgba(34,197,94,.4)' : 'none',
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '.5px' }}>
              {sportDisplayLabel(key)}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                marginTop: 3,
                color: isActive ? 'rgba(8,9,11,.7)' : 'var(--muted)',
              }}
            >
              {gameCount} games
            </span>
          </button>
        );
      })}
    </div>
  );
}
