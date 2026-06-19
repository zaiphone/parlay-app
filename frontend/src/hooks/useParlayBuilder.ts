import { useMemo } from 'react';
import type { Parlay, SlateGame, BuiltParlay, LegCount } from '../types';
import {
  parseGame,
  formatTime,
  displayOddsToDecimal,
  money,
  formatEV,
} from '../utils';

interface BuilderInput {
  parlays: Parlay[];
  sport: string;
  legCount: LegCount;
  betAmount: string;
  excluded: Record<string, boolean>;
}

interface BuilderOutput {
  /** Sports present in the data, in display order. */
  sports: { key: string; gameCount: number }[];
  /** The include/exclude grid for the active sport. */
  slate: SlateGame[];
  includedCount: number;
  /** Top 5 +EV parlays for the current selection, with bet-scaled values. */
  results: BuiltParlay[];
  /** True when fewer games are included than legs required. */
  notEnough: boolean;
}

const SPORT_ORDER = ['nba', 'nfl', 'epl'];

/** Parse and clamp the bet amount input to a non-negative number. */
function parseBet(raw: string): number {
  const n = parseFloat(raw);
  return isNaN(n) || n < 0 ? 0 : n;
}

/**
 * Adapts the backend's pre-built parlays to the interactive builder UI.
 *
 * The backend is the source of truth for which parlays exist. This hook only
 * filters that set (by sport, leg count, and excluded games) and computes
 * bet-dependent display values client-side — it never invents parlays.
 */
export function useParlayBuilder({
  parlays,
  sport,
  legCount,
  betAmount,
  excluded,
}: BuilderInput): BuilderOutput {
  // Sports present, ordered nba → nfl → epl, then any extras alphabetically.
  const sports = useMemo(() => {
    const bySport = new Map<string, Set<string>>();
    for (const p of parlays) {
      for (const leg of p.legs) {
        const s = leg.sport.toLowerCase();
        if (!bySport.has(s)) bySport.set(s, new Set());
        bySport.get(s)!.add(leg.game);
      }
    }
    const keys = [...bySport.keys()].sort((a, b) => {
      const ia = SPORT_ORDER.indexOf(a);
      const ib = SPORT_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return keys.map((key) => ({ key, gameCount: bySport.get(key)!.size }));
  }, [parlays]);

  // Parlays that include at least one leg of the active sport.
  const sportParlays = useMemo(
    () => parlays.filter((p) => p.legs.some((l) => l.sport.toLowerCase() === sport)),
    [parlays, sport]
  );

  // Unique games of the active sport → the include/exclude grid.
  const slate = useMemo(() => {
    const seen = new Map<string, SlateGame>();
    for (const p of sportParlays) {
      for (const leg of p.legs) {
        if (leg.sport.toLowerCase() !== sport) continue;
        if (seen.has(leg.game)) continue;
        const parsed = parseGame(leg.game);
        seen.set(leg.game, {
          key: leg.game,
          ...parsed,
          matchup: leg.game,
          time: formatTime(leg.time),
        });
      }
    }
    return [...seen.values()];
  }, [sportParlays, sport]);

  const includedCount = slate.filter((g) => !excluded[g.key]).length;

  // Filter + rank + compute bet-scaled values.
  const results = useMemo<BuiltParlay[]>(() => {
    const bet = parseBet(betAmount);

    const filtered = sportParlays
      .filter((p) => p.n_legs === legCount)
      .filter((p) => !p.legs.some((l) => excluded[l.game]))
      .slice()
      .sort((a, b) => b.ev - a.ev)
      .slice(0, 5);

    return filtered.map((p, i) => {
      const dec = displayOddsToDecimal(p.display_odds);
      const payout = bet * dec;
      return {
        source: p,
        rank: i + 1,
        evStr: formatEV(p.ev),
        oddsStr: p.display_odds,
        payoutStr: money(payout),
        toWinStr: money(payout - bet),
      };
    });
  }, [sportParlays, legCount, betAmount, excluded]);

  return {
    sports,
    slate,
    includedCount,
    results,
    notEnough: includedCount < legCount,
  };
}
