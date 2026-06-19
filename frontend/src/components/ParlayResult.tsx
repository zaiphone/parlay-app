import { useState } from 'react';
import type { BuiltParlay } from '../types';
import { formatOdds, sportDisplayLabel } from '../utils';

interface ParlayResultProps {
  parlay: BuiltParlay;
  betAmount: string;
}

const A = '#22c55e';

/**
 * Build the parlay as a list of human-readable strings, one per leg, plus
 * a summary line. Used for the Share / copy action.
 */
function buildShareLines(parlay: BuiltParlay, betAmount: string): string[] {
  const legLines = parlay.source.legs.map(
    (leg) => `${leg.label} (${formatOdds(leg.odds)}) — ${leg.game}`
  );
  const summary = `${parlay.source.n_legs}-leg parlay · ${parlay.oddsStr} · ${parlay.evStr} EV · risk $${
    betAmount || '0'
  } to win ${parlay.toWinStr}`;
  return [...legLines, summary];
}

/** A single ranked +EV parlay result card. */
export function ParlayResult({ parlay, betAmount }: ParlayResultProps) {
  const { source, rank } = parlay;
  const top = rank === 1;
  const [shareLabel, setShareLabel] = useState('Share');

  const handleShare = async () => {
    const lines = buildShareLines(parlay, betAmount);
    const text = lines.join('\n');

    // Native share sheet (mobile) — best experience where available.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ParlayEV pick', text });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard (desktop).
    try {
      await navigator.clipboard.writeText(text);
      setShareLabel('Copied ✓');
      setTimeout(() => setShareLabel('Share'), 1800);
    } catch {
      setShareLabel('Copy failed');
      setTimeout(() => setShareLabel('Share'), 1800);
    }
  };

  return (
    <div
      style={{
        borderRadius: 15,
        overflow: 'hidden',
        background: 'var(--surface)',
        border: `1px solid ${top ? 'rgba(34,197,94,.45)' : 'var(--border)'}`,
        boxShadow: top ? '0 0 32px rgba(34,197,94,.1)' : 'none',
      }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '15px 17px',
          borderBottom: '1px solid var(--line)',
          flexWrap: 'wrap',
        }}
      >
        <div
          className="mono"
          style={{
            width: 34,
            height: 34,
            flex: 'none',
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            background: top ? A : '#1a1e24',
            color: top ? 'var(--bg)' : 'var(--muted)',
            boxShadow: top ? '0 0 16px rgba(34,197,94,.4)' : 'none',
          }}
        >
          #{rank}
        </div>

        <div style={{ flex: 1, minWidth: 90 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              fontWeight: 600,
              letterSpacing: '.4px',
              textTransform: 'uppercase',
            }}
          >
            Est. payout
          </div>
          <div className="mono" style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.05, marginTop: 1 }}>
            {parlay.payoutStr}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatBox value={parlay.evStr} label="EXP. VALUE" accent />
          <StatBox value={parlay.oddsStr} label="PARLAY ODDS" />
        </div>
      </div>

      {/* ── Legs ───────────────────────────────────────── */}
      <div>
        {source.legs.map((leg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 17px',
              borderBottom: '1px solid var(--line-2)',
            }}
          >
            <div
              className="mono"
              style={{
                flex: 'none',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '.5px',
                color: 'var(--muted)',
                border: '1px solid var(--border-2)',
                borderRadius: 6,
                padding: '5px 7px',
              }}
            >
              {sportDisplayLabel(leg.sport)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{leg.label}</div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {leg.game}
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>
                {formatOdds(leg.odds)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 17px',
          background: 'var(--surface-2)',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Risk{' '}
          <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>
            ${betAmount || '0'}
          </span>{' '}
          to win{' '}
          <span className="mono" style={{ color: A, fontWeight: 700 }}>
            {parlay.toWinStr}
          </span>
        </div>
        <button
          onClick={handleShare}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: A,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid rgba(34,197,94,.35)',
            borderRadius: 8,
            padding: '7px 13px',
            background: 'rgba(34,197,94,.08)',
            cursor: 'pointer',
            fontFamily: 'Archivo, sans-serif',
          }}
        >
          {shareLabel}
        </button>
      </div>
    </div>
  );
}

function StatBox({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? 'rgba(34,197,94,.13)' : 'var(--bg)',
        border: `1px solid ${accent ? 'rgba(34,197,94,.35)' : 'var(--border-2)'}`,
        borderRadius: 9,
        padding: '7px 11px',
        textAlign: 'center',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 15,
          fontWeight: 700,
          lineHeight: 1,
          color: accent ? A : 'var(--text)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '.5px',
          marginTop: 2,
          color: accent ? A : 'var(--muted)',
          opacity: accent ? 0.8 : 1,
        }}
      >
        {label}
      </div>
    </div>
  );
}
