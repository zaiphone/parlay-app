"""
nfl_model.py — Loads the trained NFL win-probability model and predicts
probabilities for upcoming games using live recent results from ESPN.
"""

import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import joblib
import pandas as pd
import requests

MODEL_PATH = "nfl_win_probability_model.pkl"
SCALER_PATH = "nfl_win_probability_scaler.pkl"
FEATURES_PATH = "nfl_model_features.json"

ROLLING_WINDOW = 4
MIN_GAMES_HISTORY = 3
H2H_WINDOW = 2
RESULTS_LOOKBACK_DAYS = 120      # NFL plays weekly, so needs a wide window
CACHE_TTL_SECONDS = 6 * 60 * 60  # refresh ESPN results every 6 hours

_model = joblib.load(MODEL_PATH)
_scaler = joblib.load(SCALER_PATH)
with open(FEATURES_PATH) as f:
    _feature_list = json.load(f)

_cache = {"data": None, "timestamp": 0.0}
_cache_lock = threading.Lock()


def _fetch_day(day: date) -> list[dict]:
    """Completed NFL games for one day from ESPN's public scoreboard."""
    url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
    try:
        resp = requests.get(url, params={"dates": day.strftime("%Y%m%d")}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException:
        return []

    rows = []
    for event in data.get("events", []):
        comps = event.get("competitions", [])
        if not comps or not comps[0].get("status", {}).get("type", {}).get("completed", False):
            continue
        competitors = comps[0].get("competitors", [])
        home = next((c for c in competitors if c.get("homeAway") == "home"), None)
        away = next((c for c in competitors if c.get("homeAway") == "away"), None)
        if not home or not away:
            continue
        home_name, away_name = home["team"]["displayName"], away["team"]["displayName"]
        if home_name in ("AFC", "NFC") or away_name in ("AFC", "NFC"):
            continue  # Pro Bowl
        try:
            home_score, away_score = int(home["score"]), int(away["score"])
        except (KeyError, ValueError):
            continue
        rows.append({
            "date": pd.Timestamp(day), "home_team": home_name, "away_team": away_name,
            "home_score": home_score, "away_score": away_score,
            "home_win": int(home_score > away_score),
        })
    return rows


def _fetch_recent_results() -> pd.DataFrame:
    end = date.today()
    days = [end - timedelta(days=i) for i in range(RESULTS_LOOKBACK_DAYS + 1)]
    days = [d for d in days if d.month not in (7, 8)]  # skip preseason, same as training
    # Fetch days in parallel — 120 one-at-a-time requests would take ~30+ seconds
    with ThreadPoolExecutor(max_workers=10) as pool:
        results = pool.map(_fetch_day, days)
    return pd.DataFrame([row for day_rows in results for row in day_rows])


def _get_recent_results() -> pd.DataFrame:
    if _cache["data"] is not None and time.time() - _cache["timestamp"] < CACHE_TTL_SECONDS:
        return _cache["data"]
    with _cache_lock:
        if _cache["data"] is not None and time.time() - _cache["timestamp"] < CACHE_TTL_SECONDS:
            return _cache["data"]
        _cache["data"] = _fetch_recent_results()
        _cache["timestamp"] = time.time()
        return _cache["data"]


def predict_home_win_prob(home_team: str, away_team: str, game_date) -> float | None:
    """Model's home-win probability, or None if there isn't enough recent history."""
    game_date = pd.to_datetime(game_date)
    results_df = _get_recent_results()
    if results_df.empty:
        return None
    past_games = results_df[results_df["date"] < game_date].sort_values("date")

    def team_recent_stats(team):
        team_games = []
        for _, g in past_games.iterrows():
            if g["home_team"] == team:
                team_games.append({"date": g["date"], "scored": g["home_score"],
                                   "allowed": g["away_score"], "won": g["home_win"]})
            elif g["away_team"] == team:
                team_games.append({"date": g["date"], "scored": g["away_score"],
                                   "allowed": g["home_score"], "won": 1 - g["home_win"]})
        if len(team_games) < MIN_GAMES_HISTORY:
            return None
        recent = team_games[-ROLLING_WINDOW:]
        rest_days = (game_date - team_games[-1]["date"]).days
        streak, last = 0, team_games[-1]["won"]
        for g in reversed(team_games):
            if g["won"] == last:
                streak += 1
            else:
                break
        return {
            "win_pct": sum(g["won"] for g in recent) / len(recent),
            "net_rating": sum(g["scored"] - g["allowed"] for g in recent) / len(recent),
            "short_rest": int(rest_days <= 5),
            "coming_off_bye": int(12 <= rest_days <= 21),
            "win_streak": streak if last == 1 else -streak,
        }

    home_stats = team_recent_stats(home_team)
    away_stats = team_recent_stats(away_team)
    if home_stats is None or away_stats is None:
        return None

    h2h_games = past_games[
        ((past_games["home_team"] == home_team) & (past_games["away_team"] == away_team)) |
        ((past_games["home_team"] == away_team) & (past_games["away_team"] == home_team))
    ].tail(H2H_WINDOW)
    if len(h2h_games) == 0:
        h2h_home_win_pct = 0.5
    else:
        home_wins = sum(1 for _, g in h2h_games.iterrows()
                        if (g["home_team"] == home_team and g["home_win"] == 1)
                        or (g["away_team"] == home_team and g["home_win"] == 0))
        h2h_home_win_pct = home_wins / len(h2h_games)

    # Build every feature, then keep only the ones the trained model uses
    row = pd.DataFrame([{
        "home_win_pct": home_stats["win_pct"],
        "home_net_rating": home_stats["net_rating"],
        "home_short_rest": home_stats["short_rest"],
        "home_coming_off_bye": home_stats["coming_off_bye"],
        "home_win_streak": home_stats["win_streak"],
        "away_win_pct": away_stats["win_pct"],
        "away_net_rating": away_stats["net_rating"],
        "away_short_rest": away_stats["short_rest"],
        "away_coming_off_bye": away_stats["coming_off_bye"],
        "away_win_streak": away_stats["win_streak"],
        "win_pct_diff": home_stats["win_pct"] - away_stats["win_pct"],
        "net_rating_diff": home_stats["net_rating"] - away_stats["net_rating"],
        "h2h_home_win_pct": h2h_home_win_pct,
    }])[_feature_list]

    return float(_model.predict_proba(_scaler.transform(row))[0][1])