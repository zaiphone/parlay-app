/** A single leg of a parlay — one bet on one outcome. */
export interface Leg {
  /** Human-readable label, e.g. "Chiefs ML" */
  label: string;
  /** Full game string, e.g. "Ravens @ Chiefs" */
  game: string;
  /** ISO 8601 datetime string of kick-off / tip-off */
  time: string;
  /** Sport identifier — 'nfl' | 'nba' | 'epl' */
  sport: string;
  /** American odds, e.g. -115 or +240 */
  odds: number;
  /** Vig-removed true probability, 0–1 */
  true_prob: number;
  /** Expected value of this leg, 0–1 */
  ev: number;
}

/** A combined parlay suggestion returned by GET /api/parlays. */
export interface Parlay {
  legs: Leg[];
  /** Combined expected value across all legs, 0–1 */
  ev: number;
  /** Combined American odds string, e.g. "+580" */
  display_odds: string;
  /** Number of legs */
  n_legs: number;
}

export type FetchState = 'idle' | 'loading' | 'success' | 'error';

export type LegCount = 2 | 3;

/** A unique game derived from the parlay slate, for the include/exclude grid. */
export interface SlateGame {
  /** Stable key (the game string) */
  key: string;
  away: string;
  home: string;
  awayAbbr: string;
  homeAbbr: string;
  matchup: string;
  time: string;
}

/** A parlay enriched with bet-dependent display values for the result card. */
export interface BuiltParlay {
  source: Parlay;
  rank: number;
  evStr: string;
  oddsStr: string;
  payoutStr: string;
  toWinStr: string;
}
