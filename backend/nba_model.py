
"""
nba_model.py — Loads the trained NBA win-probability model and predicts
probabilities for upcoming games using recent team history.
"""

import json
import joblib
import pandas as pd

MODEL_PATH = "nba_win_probability_model.pkl"
SCALER_PATH = "nba_win_probability_scaler.pkl"
FEATURES_PATH = "nba_model_features.json"
RESULTS_CSV = "nba_results_2022-10-18_2026-06-20.csv"

_model = joblib.load(MODEL_PATH)
_scaler = joblib.load(SCALER_PATH)
with open(FEATURES_PATH) as f:
    _feature_list = json.load(f)

_results_df = pd.read_csv(RESULTS_CSV)
_results_df["date"] = pd.to_datetime(_results_df["date"])


def predict_home_win_prob(home_team: str, away_team: str, game_date) -> float | None:
    """
    Return the model's home-win probability for an upcoming game, or None
    if either team doesn't yet have enough recent history to compute features.
    """
    game_date = pd.to_datetime(game_date)
    past_games = _results_df[_results_df["date"] < game_date].sort_values("date")

    def team_recent_stats(team):
        team_games = []
        for _, g in past_games.iterrows():
            if g["home_team"] == team:
                team_games.append({"date": g["date"], "scored": g["home_score"],
                                    "allowed": g["away_score"], "won": g["home_win"]})
            elif g["away_team"] == team:
                team_games.append({"date": g["date"], "scored": g["away_score"],
                                    "allowed": g["home_score"], "won": 1 - g["home_win"]})
        if len(team_games) < 3:
            return None
        recent = team_games[-6:]
        wins = sum(g["won"] for g in recent)
        pts_for = sum(g["scored"] for g in recent) / len(recent)
        pts_against = sum(g["allowed"] for g in recent) / len(recent)
        rest_days = (game_date - team_games[-1]["date"]).days
        return {
            "win_pct": wins / len(recent),
            "net_rating": pts_for - pts_against,
            "back_to_back": int(rest_days <= 1),
        }

    home_stats = team_recent_stats(home_team)
    away_stats = team_recent_stats(away_team)
    if home_stats is None or away_stats is None:
        return None

    h2h_games = past_games[
        ((past_games["home_team"] == home_team) & (past_games["away_team"] == away_team)) |
        ((past_games["home_team"] == away_team) & (past_games["away_team"] == home_team))
    ].sort_values("date").tail(3)
    if len(h2h_games) == 0:
        h2h_home_win_pct = 0.5
    else:
        home_wins = sum(1 for _, g in h2h_games.iterrows()
                         if (g["home_team"] == home_team and g["home_win"] == 1)
                         or (g["away_team"] == home_team and g["home_win"] == 0))
        h2h_home_win_pct = home_wins / len(h2h_games)

    row = pd.DataFrame([{
        "home_net_rating": home_stats["net_rating"],
        "net_rating_diff": home_stats["net_rating"] - away_stats["net_rating"],
        "h2h_home_win_pct": h2h_home_win_pct,
        "away_net_rating": away_stats["net_rating"],
        "home_back_to_back": home_stats["back_to_back"],
        "away_back_to_back": away_stats["back_to_back"],
        "home_win_pct": home_stats["win_pct"],
    }])[_feature_list]

    row_scaled = _scaler.transform(row)
    return float(_model.predict_proba(row_scaled)[0][1])