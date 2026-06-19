import type { LegCount } from '../types';

interface ControlsProps {
  betAmount: string;
  onBetChange: (v: string) => void;
  legCount: LegCount;
  onLegCountChange: (n: LegCount) => void;
}

const A = '#22c55e';
const BET_CHIPS = [10, 25, 50, 100];
const LEG_OPTIONS: LegCount[] = [2, 3];

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.6px',
  color: 'var(--muted)',
  textTransform: 'uppercase',
  marginBottom: 11,
};

const panelStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '16px 17px',
};

/** Bet amount + leg count controls. Purely client-side; affects payout math only. */
export function Controls({ betAmount, onBetChange, legCount, onLegCountChange }: ControlsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 14,
        marginBottom: 26,
      }}
    >
      {/* Bet amount */}
      <div style={panelStyle}>
        <div style={labelStyle}>Bet amount</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg)',
              border: '1px solid var(--border-2)',
              borderRadius: 11,
              padding: '0 14px',
              flex: 1,
            }}
          >
            <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: A }}>
              $
            </span>
            <input
              type="number"
              min={1}
              value={betAmount}
              onChange={(e) => onBetChange(e.target.value)}
              aria-label="Bet amount in dollars"
              className="mono"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 22,
                fontWeight: 700,
                width: '100%',
                padding: '11px 0 11px 4px',
                outline: 'none',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {BET_CHIPS.map((v) => {
            const active = betAmount === String(v);
            return (
              <button
                key={v}
                onClick={() => onBetChange(String(v))}
                className="mono"
                style={{
                  flex: 1,
                  cursor: 'pointer',
                  borderRadius: 9,
                  padding: '8px 0',
                  fontSize: 13,
                  fontWeight: 700,
                  border: `1px solid ${active ? 'rgba(34,197,94,.5)' : 'var(--border-2)'}`,
                  background: active ? 'rgba(34,197,94,.13)' : 'var(--bg)',
                  color: active ? A : 'var(--muted)',
                }}
              >
                ${v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Number of legs */}
      <div style={panelStyle}>
        <div style={labelStyle}>Number of legs</div>
        <div style={{ display: 'flex', gap: 9 }}>
          {LEG_OPTIONS.map((n) => {
            const active = legCount === n;
            return (
              <button
                key={n}
                onClick={() => onLegCountChange(n)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  borderRadius: 11,
                  padding: '11px 0',
                  border: `1px solid ${active ? A : 'var(--border-2)'}`,
                  background: active ? 'rgba(34,197,94,.12)' : 'var(--bg)',
                  color: active ? A : 'var(--text)',
                  boxShadow: active ? 'inset 0 0 18px rgba(34,197,94,.12)' : 'none',
                  fontFamily: 'Archivo, sans-serif',
                }}
              >
                <span className="mono" style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>
                  {n}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>LEGS</span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 11, lineHeight: 1.4 }}>
          More legs → bigger payout, lower hit rate.
        </div>
      </div>
    </div>
  );
}
