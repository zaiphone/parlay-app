import { sportDisplayLabel } from '../utils';
import { useState, useEffect } from 'react';
import type { LegCount } from '../types';
import { useParlays } from '../hooks/useParlays';
import { useParlayBuilder } from '../hooks/useParlayBuilder';
import { Header } from '../components/Header';
import { SportTabs } from '../components/SportTabs';
import { Controls } from '../components/Controls';
import { GameSlate } from '../components/GameSlate';
import { ParlayResult } from '../components/ParlayResult';
import { SkeletonCard } from '../components/SkeletonCard';

const A = '#22c55e';

export function BuilderPage() {
  const { parlays, bookmakers, state, error, lastUpdated, refetch } = useParlays();

  const [sport, setSport] = useState<string>('nba');
  const [betAmount, setBetAmount] = useState<string>('25');
  const [legCount, setLegCount] = useState<LegCount>(2);
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);

  const { sports, slate, includedCount, results, notEnough } = useParlayBuilder({
    parlays,
    sport,
    legCount,
    betAmount,
    excluded,
  });

  // Once data loads, snap the active sport to one that actually exists.
  useEffect(() => {
    if (sports.length > 0 && !sports.some((s) => s.key === sport)) {
      setSport(sports[0].key);
    }
  }, [sports, sport]);

  const toggleGame = (key: string) =>
    setExcluded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(34,197,94,.08), transparent 60%), #08090b',
        color: 'var(--text)',
        padding: '28px 18px 80px',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <Header
          isRefreshing={state === 'loading' && parlays.length > 0}
          lastUpdated={lastUpdated}
          onRefresh={() => refetch()}
        />

        {/* ── Loading (first load) ─────────────────────── */}
        {state === 'loading' && parlays.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Error ────────────────────────────────────── */}
        {state === 'error' && parlays.length === 0 && (
          <div
            style={{
              background: 'rgba(239,68,68,.08)',
              border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 14,
              padding: 28,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
              Could not load suggestions
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              {error ?? 'Check that the backend is running and your API key is set.'}
            </div>
            <button
              onClick={() => refetch()}
              style={{
                background: 'rgba(34,197,94,.13)',
                border: '1px solid rgba(34,197,94,.4)',
                borderRadius: 9,
                padding: '9px 18px',
                color: A,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Archivo, sans-serif',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Loaded ───────────────────────────────────── */}
        {parlays.length > 0 && (
          <>
            {sports.length > 0 && (
              <SportTabs sports={sports} active={sport} onChange={setSport} />
            )}

            <Controls
              betAmount={betAmount}
              onBetChange={setBetAmount}
              legCount={legCount}
              onLegCountChange={setLegCount}
            />

            {slate.length > 0 && (
              <GameSlate
                sport={sport}
                games={slate}
                excluded={excluded}
                includedCount={includedCount}
                onToggle={toggleGame}
              />
            )}

            {/* Results header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.3px' }}>
                Top 5 <span style={{ color: A }}>+EV</span> parlays
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  padding: '4px 10px',
                }}
              >
                {legCount}-leg · ${betAmount || '0'}
              </div>
            </div>

            {/* Not enough games included */}
            {notEnough && (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px dashed var(--border-2)',
                  borderRadius: 14,
                  padding: 34,
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 13,
                }}
              >
                Include at least{' '}
                <b style={{ color: 'var(--text)' }}>{legCount}</b> games to build a{' '}
                {legCount}-leg parlay.
              </div>
            )}

            {/* No parlays for this selection */}
            {!notEnough && results.length === 0 && (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px dashed var(--border-2)',
                  borderRadius: 14,
                  padding: 34,
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                No {legCount}-leg +EV parlays for {sportDisplayLabel(sport)} right now. Try the other leg
                count, switch sports, or re-include games.
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {results.map((p) => (
                  <ParlayResult key={p.rank} parlay={p} betAmount={betAmount} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer: bookmakers + disclaimer */}
        <div
          style={{
            marginTop: 30,
            paddingTop: 18,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* Which books priced this data */}
          {bookmakers.length > 0 && (
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                textAlign: 'center',
                lineHeight: 1.5,
                maxWidth: 620,
              }}
            >
              Odds sourced from: {bookmakers.join(' · ')}
            </div>
          )}

          {/* Mechanics note */}
          <div
            className="mono"
            style={{ fontSize: 10, color: 'var(--faint)', textAlign: 'center', lineHeight: 1.6 }}
          >
            EV = model win probability × decimal odds − 1. Odds refresh every 10 minutes.
          </div>

          {/* Disclaimer toggle */}
          <button
            onClick={() => setShowDisclaimer((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted-2)',
              fontSize: 10,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'Archivo, sans-serif',
              padding: 0,
            }}
          >
            {showDisclaimer ? 'Hide disclaimer' : 'Disclaimer & responsible gambling'}
          </button>

          {showDisclaimer && (
            <div
              style={{
                fontSize: 10,
                color: 'var(--faint)',
                textAlign: 'center',
                lineHeight: 1.7,
                maxWidth: 560,
                padding: '4px 8px',
              }}
            >
              ParlayEV is an informational tool, not financial, investment, betting, or
              legal advice. Expected-value figures are statistical estimates derived from
              public bookmaker odds and are not guarantees of any outcome or profit.
              Nothing here is a recommendation to place any wager. Sports betting carries
              financial risk and may not be legal in your jurisdiction — you are responsible
              for complying with all applicable laws. Must be 21+ where legal. If gambling
              is affecting you or someone you know, call 1-800-GAMBLER.
            </div>
          )}

          {/* Always-visible legal one-liner */}
          <div
            style={{
              fontSize: 9,
              color: 'var(--muted-2)',
              textAlign: 'center',
              lineHeight: 1.6,
              marginTop: 4,
              maxWidth: 560,
            }}
          >
            For entertainment and informational purposes only · Not financial, betting, or
            legal advice · 21+ where legal · Check your local laws · 1-800-GAMBLER
          </div>
        </div>
      </div>
    </div>
  );
}
