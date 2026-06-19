import { sportDisplayLabel } from '../utils';
import type { SlateGame } from '../types';

interface GameSlateProps {
  sport: string;
  games: SlateGame[];
  excluded: Record<string, boolean>;
  includedCount: number;
  onToggle: (key: string) => void;
}

const A = '#22c55e';

/** Tap-to-include/exclude grid of today's games for the active sport. */
export function GameSlate({ sport, games, excluded, includedCount, onToggle }: GameSlateProps) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 13,
          gap: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '.3px' }}>
          Today's {sportDisplayLabel(sport)} slate
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, textAlign: 'right' }}>
          tap to include / exclude · {includedCount} of {games.length} in
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
          gap: 11,
          marginBottom: 34,
        }}
      >
        {games.map((g) => {
          const inc = !excluded[g.key];
          return (
            <button
              key={g.key}
              onClick={() => onToggle(g.key)}
              aria-pressed={inc}
              className="pcard"
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                borderRadius: 13,
                padding: 13,
                fontFamily: 'Archivo, sans-serif',
                color: 'var(--text)',
                border: `1px solid ${inc ? 'rgba(34,197,94,.4)' : 'var(--border)'}`,
                background: inc
                  ? 'linear-gradient(160deg, rgba(34,197,94,.07), #111317)'
                  : 'var(--surface-2)',
                opacity: inc ? 1 : 0.55,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginBottom: 9,
                }}
              >
                <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {g.time}
                </span>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: inc ? A : 'transparent',
                    border: `1px solid ${inc ? A : '#3a414b'}`,
                    boxShadow: inc ? '0 0 8px rgba(34,197,94,.6)' : 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-.3px' }}>
                  {g.awayAbbr}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted-2)', fontWeight: 600 }}>@</span>
                <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-.3px' }}>
                  {g.homeAbbr}
                </span>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  marginTop: 3,
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {g.matchup}
              </div>

              <div
                className="mono"
                style={{
                  fontSize: 10,
                  marginTop: 8,
                  width: '100%',
                  color: inc ? A : 'var(--muted-2)',
                }}
              >
                {inc ? 'INCLUDED' : 'EXCLUDED'}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
