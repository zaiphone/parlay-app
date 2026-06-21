import { timeAgo } from '../utils';

interface HeaderProps {
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

const A = '#22c55e';

/** Top bar: brand mark + live status pill (click to refresh). */
export function Header({ isRefreshing, lastUpdated, onRefresh }: HeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 26 }}>
      {/* Logo mark */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: A,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(34,197,94,.5)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            background: 'var(--bg)',
            transform: 'rotate(45deg)',
            borderRadius: 2,
          }}
        />
      </div>

      <div>
        <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: '-.5px', lineHeight: 1 }}>
          PARLAY<span style={{ color: A }}>EV</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            fontWeight: 500,
            letterSpacing: '.3px',
            marginTop: 2,
          }}
        >
          +EV parlay builder · upcoming slate
        </div>
      </div>

      {/* Live / refresh pill */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        title={lastUpdated ? `Updated ${timeAgo(lastUpdated)} — click to refresh` : 'Refresh'}
        className="mono"
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'var(--muted)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          background: 'transparent',
          cursor: isRefreshing ? 'wait' : 'pointer',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isRefreshing ? '#f59e0b' : A,
            animation: 'glowpulse 1.8s infinite',
          }}
        />
        {isRefreshing ? 'UPDATING' : 'LIVE ODDS'}
      </button>
    </div>
  );
}
