const pulse: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 6,
};

/** Placeholder result card shown while /api/parlays is in flight. */
export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 15,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '15px 17px',
          borderBottom: '1px solid var(--line)',
          alignItems: 'center',
        }}
      >
        <div style={{ ...pulse, width: 34, height: 34, borderRadius: 9 }} />
        <div style={{ ...pulse, width: 120, height: 30 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ ...pulse, width: 56, height: 40 }} />
          <div style={{ ...pulse, width: 56, height: 40 }} />
          <div style={{ ...pulse, width: 56, height: 40 }} />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 17px',
            borderBottom: '1px solid var(--line-2)',
            alignItems: 'center',
          }}
        >
          <div style={{ ...pulse, width: 38, height: 24 }} />
          <div style={{ ...pulse, flex: 1, height: 20 }} />
          <div style={{ ...pulse, width: 50, height: 24 }} />
        </div>
      ))}
    </div>
  );
}
