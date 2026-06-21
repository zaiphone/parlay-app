// ── Odds math (ported from the design's DCLogic) ──────────────

/** American odds → decimal odds. -110 → 1.909, +150 → 2.5 */
export function americanToDecimal(a: number): number {
  return a > 0 ? a / 100 + 1 : 100 / Math.abs(a) + 1;
}

/** American odds → implied probability (with vig). */
export function americanToImplied(a: number): number {
  return a > 0 ? 100 / (a + 100) : Math.abs(a) / (Math.abs(a) + 100);
}

/** Parse a display odds string like "+580" or "-120" into decimal odds. */
export function displayOddsToDecimal(display: string): number {
  const n = parseInt(display.replace('+', ''), 10);
  if (isNaN(n)) return 1;
  return americanToDecimal(n);
}

/** Format American odds: -115 → "-115", 240 → "+240" */
export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

// ── Formatting ────────────────────────────────────────────────

/** Currency: 1234.5 → "$1,234.50" */
export function money(v: number): string {
  return (
    '$' +
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/** EV (0–1) → signed percentage "+8.2%" */
export function formatEV(ev: number): string {
  const pct = (ev * 100).toFixed(1);
  return ev >= 0 ? `+${pct}%` : `${pct}%`;
}

/** Probability (0–1) → "62.3%" (one decimal) */
export function formatProb(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

// ── Game parsing ──────────────────────────────────────────────

/** Abbreviate a team name to 3 uppercase letters. "Ravens" → "RAV" */
function abbr(team: string): string {
  const clean = team.replace(/[^A-Za-z ]/g, '').trim();
  return clean.slice(0, 3).toUpperCase();
}

/** Parse "Ravens @ Chiefs" into away/home + abbreviations. */
export function parseGame(game: string): {
  away: string;
  home: string;
  awayAbbr: string;
  homeAbbr: string;
} {
  const parts = game.split('@').map((s) => s.trim());
  const away = parts[0] ?? game;
  const home = parts[1] ?? '';
  return { away, home, awayAbbr: abbr(away), homeAbbr: abbr(home) };
}

/** Short local time from ISO, e.g. "7:30 PM". Falls back to raw string. */
export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Short local date + time from ISO, e.g. "Sun, Aug 10 · 1:00 PM". */
export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${date} · ${time}`;
  } catch {
    return iso;
  }
}

/** "X min ago" style relative time. */
export function timeAgo(since: Date): string {
  const secs = Math.floor((Date.now() - since.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Sport metadata ────────────────────────────────────────────

export const SPORT_ORDER = ['nba', 'nfl', 'epl'] as const;

export function sportLabel(sport: string): string {
  return sport.toUpperCase();
}

// ── Sport display names ───────────────────────────────────────

// Maps the Odds API sport keys this app uses → short display labels.
const SPORT_LABELS: Record<string, string> = {
  'americanfootball_nfl': 'NFL',
  'basketball_nba':       'NBA',
  'soccer_epl':           'EPL',
};

/**
 * Convert a raw Odds API sport key to a short display label.
 * "americanfootball_nfl" → "NFL"
 * Unknown keys fall back to the last segment uppercased.
 */
export function sportDisplayLabel(sport: string): string {
  const key = sport.toLowerCase();
  if (SPORT_LABELS[key]) return SPORT_LABELS[key];
  const parts = key.split('_');
  return parts[parts.length - 1].toUpperCase();
}
