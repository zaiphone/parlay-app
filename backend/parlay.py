
import argparse
import itertools
import os
import sys
from typing import Optional
import requests

# ── Config ────────────────────────────────────────────────────────────────────

SPORTS = ["americanfootball_nfl", "basketball_nba", "soccer_epl"]

API_BASE = "https://api.the-odds-api.com/v4"

# Only suggest legs where we estimate we have at least this much edge.
MIN_LEG_EDGE = 0.02        # 2% EV on a single leg
MIN_PARLAY_EV = 0.04       # 4% EV on the combined parlay
MAX_LEGS = 3               # Keep parlays small — more legs = more variance
MIN_LEGS = 2


# ── Maths ─────────────────────────────────────────────────────────────────────

def implied_prob(american_odds: int) -> float:
    """Convert American odds to implied probability (includes bookmaker margin)."""
    if american_odds < 0:
        return (-american_odds) / (-american_odds + 100)
    return 100 / (american_odds + 100)


def estimate_true_prob(home_odds: int, away_odds: int, draw_odds: Optional[int] = None) -> dict:
    """
    [LEGACY — single-book version, no longer called by extract_legs]

    Remove the bookmaker's vig (margin) to get a fairer true probability
    from ONE book's odds. The multi-book version inside extract_legs now
    does this averaging across all books instead. Kept for reference.

    The book inflates all implied probs so they sum to >1. We normalise
    them back to 1 to get our best estimate of the true probability.
    """
    probs = {
        "home": implied_prob(home_odds),
        "away": implied_prob(away_odds),
    }
    if draw_odds is not None:
        probs["draw"] = implied_prob(draw_odds)

    total = sum(probs.values())
    return {k: v / total for k, v in probs.items()}


def leg_ev(true_prob: float, american_odds: int) -> float:
    """Expected value of a single leg. Positive = +EV."""
    payout = (100 / -american_odds) if american_odds < 0 else (american_odds / 100)
    return (true_prob * payout) - (1 - true_prob)


def parlay_ev(legs: list[dict]) -> float:
    """
    EV of a parlay = combined true prob × combined payout − combined loss prob.

    We use the vig-free true probs, then price the payout using the
    combined implied prob (what the book is actually offering).
    """
    combined_true = 1.0
    combined_implied = 1.0
    for leg in legs:
        combined_true *= leg["true_prob"]
        combined_implied *= implied_prob(leg["odds"])

    if combined_implied == 0:
        return -1.0

    payout = (1 / combined_implied) - 1
    return (combined_true * payout) - (1 - combined_true)


def to_american(decimal_odds: float) -> int:
    """Convert decimal odds to American format for display."""
    if decimal_odds >= 2.0:
        return round((decimal_odds - 1) * 100)
    return round(-100 / (decimal_odds - 1))


# ── Data fetching ──────────────────────────────────────────────────────────────

def fetch_odds(api_key: str, sport: str) -> list[dict]:
    """Fetch moneyline odds for a sport from The Odds API."""
    url = f"{API_BASE}/sports/{sport}/odds"
    params = {
        "apiKey": api_key,
        "regions": "us",
        "markets": "h2h",       # h2h = moneyline
        "oddsFormat": "american",
        "dateFormat": "iso",
    }
    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.HTTPError as e:
        print(f"  API error for {sport}: {e}", file=sys.stderr)
        return []
    except requests.RequestException as e:
        print(f"  Network error: {e}", file=sys.stderr)
        return []


# ── Leg extraction ─────────────────────────────────────────────────────────────

def average_book_probs(bookmakers: list[dict], outcome_names: list[str]) -> dict:
    """
    Average the implied probability of each outcome across every bookmaker.

    Averaging across many books gives a better consensus estimate than any
    single book's line. Returns a dict mapping outcome name -> avg implied prob.
    Outcomes missing from a given book are simply skipped for that book.
    """
    prob_lists: dict[str, list[float]] = {name: [] for name in outcome_names}

    for bookmaker in bookmakers:
        markets = bookmaker.get("markets", [])
        h2h = next((m for m in markets if m["key"] == "h2h"), None)
        if not h2h:
            continue
        prices = {o["name"]: o["price"] for o in h2h["outcomes"]}
        # Only use this book if it prices every outcome (avoids skewing the avg)
        if all(prices.get(name) is not None for name in outcome_names):
            for name in outcome_names:
                prob_lists[name].append(implied_prob(prices[name]))

    return {
        name: (sum(vals) / len(vals)) if vals else None
        for name, vals in prob_lists.items()
    }


def best_odds_for(bookmakers: list[dict], outcome_name: str) -> Optional[int]:
    """
    Find the best (highest payout) odds for an outcome across all books.

    This is line shopping: the user should bet at whichever book offers the
    best price, so EV is calculated against the best available number.
    Best payout = lowest implied probability.
    """
    best_price = None
    best_implied = None
    for bookmaker in bookmakers:
        for market in bookmaker.get("markets", []):
            if market["key"] != "h2h":
                continue
            for outcome in market["outcomes"]:
                if outcome["name"] != outcome_name:
                    continue
                imp = implied_prob(outcome["price"])
                if best_implied is None or imp < best_implied:
                    best_implied = imp
                    best_price = outcome["price"]
    return best_price


def extract_legs(games: list[dict], sport: str) -> list[dict]:
    """
    Pull candidate +EV legs from raw API response.

    For each game: averages the implied probability across ALL bookmakers,
    strips the vig, then calculates EV against the BEST available odds
    (line shopping). This is a far better estimate than a single book's line.
    """
    legs = []

    for game in games:
        home = game.get("home_team")
        away = game.get("away_team")
        commence = game.get("commence_time", "")[:16].replace("T", " ")

        bookmakers = game.get("bookmakers", [])
        if not bookmakers:
            continue

        # Build the list of outcomes — soccer (EPL) also has a Draw
        outcome_names = [home, away]
        has_draw = any(
            o["name"] == "Draw"
            for b in bookmakers
            for m in b.get("markets", []) if m["key"] == "h2h"
            for o in m["outcomes"]
        )
        if has_draw:
            outcome_names.append("Draw")

        # Average implied probs across all books, then strip vig (normalise to 1)
        avg_probs = average_book_probs(bookmakers, outcome_names)
        if avg_probs.get(home) is None or avg_probs.get(away) is None:
            continue

        total = sum(v for v in avg_probs.values() if v is not None)
        true_probs = {
            name: (v / total) for name, v in avg_probs.items() if v is not None
        }

        # Only build moneyline legs for home and away (skip betting the draw)
        for side, prob_key in [(home, home), (away, away)]:
            tp = true_probs[prob_key]
            odds = best_odds_for(bookmakers, side)
            if odds is None:
                continue
            ev = leg_ev(tp, odds)
            if ev >= MIN_LEG_EDGE:
                legs.append({
                    "label": f"{side} ML",
                    "game": f"{away} @ {home}",
                    "time": commence,
                    "sport": sport,
                    "odds": odds,
                    "true_prob": tp,
                    "ev": ev,
                })

    return legs


# ── Parlay builder ─────────────────────────────────────────────────────────────

def build_parlays(legs: list[dict]) -> list[dict]:
    """
    Generate all 2- and 3-leg combos from candidate legs and rank by EV.

    Skips combinations where two legs are from the same game (correlated).
    """
    parlays = []

    for n in range(MIN_LEGS, MAX_LEGS + 1):
        for combo in itertools.combinations(legs, n):
            # Reject same-game legs (correlated outcomes)
            games = [leg["game"] for leg in combo]
            if len(games) != len(set(games)):
                continue

            ev = parlay_ev(list(combo))
            if ev < MIN_PARLAY_EV:
                continue

            # Combined implied odds for display
            combined_implied = 1.0
            for leg in combo:
                combined_implied *= implied_prob(leg["odds"])
            display_odds = to_american(1 / combined_implied)

            parlays.append({
                "legs": list(combo),
                "ev": ev,
                "display_odds": f"+{display_odds}" if display_odds > 0 else str(display_odds),
                "n_legs": n,
            })

    return sorted(parlays, key=lambda p: p["ev"], reverse=True)


# ── Display ────────────────────────────────────────────────────────────────────

def print_parlays(parlays: list[dict]) -> None:
    if not parlays:
        print("\nNo +EV parlays found today. Check back later or lower MIN_LEG_EDGE.")
        return

    print(f"\n{'─'*60}")
    print(f"  Top {min(len(parlays), 5)} parlay suggestions")
    print(f"{'─'*60}")

    for i, p in enumerate(parlays[:5], 1):
        ev_pct = f"+{p['ev']*100:.1f}%"
        print(f"\n#{i}  {p['n_legs']}-leg parlay  |  EV {ev_pct}  |  {p['display_odds']}")
        for leg in p["legs"]:
            sport_short = leg["sport"].split("_")[-1].upper()
            print(f"   • [{sport_short}] {leg['label']}  {leg['odds']:+d}  "
                  f"(true prob {leg['true_prob']*100:.1f}%)  —  {leg['game']}")

    print(f"\n{'─'*60}\n")


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Parlay suggestion tool")
    parser.add_argument("--api-key", default=os.getenv("ODDS_API_KEY"), help="The Odds API key")
    args = parser.parse_args()

    if not args.api_key:
        print("Error: provide --api-key or set ODDS_API_KEY env var", file=sys.stderr)
        sys.exit(1)

    all_legs: list[dict] = []

    for sport in SPORTS:
        print(f"Fetching {sport}...")
        games = fetch_odds(args.api_key, sport)
        legs = extract_legs(games, sport)
        print(f"  {len(games)} games  →  {len(legs)} +EV legs found")
        all_legs.extend(legs)

    print(f"\nBuilding parlays from {len(all_legs)} candidate legs...")
    parlays = build_parlays(all_legs)
    print_parlays(parlays)


if __name__ == "__main__":
    main()