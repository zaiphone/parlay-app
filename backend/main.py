"""
main.py — FastAPI wrapper around the parlay engine.

Exposes one endpoint: GET /api/parlays
The React frontend calls this URL and gets back parlay suggestions as JSON.

Run it:
    pip install fastapi uvicorn requests python-dotenv
    uvicorn main:app --reload

Then open http://localhost:8000/api/parlays in your browser.
Auto-generated docs live at http://localhost:8000/docs
"""

import os
import time
import threading
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Import the engine logic from parlay.py (same backend/ folder)
from parlay import SPORTS, fetch_odds, extract_legs, build_parlays

# Load ODDS_API_KEY from the .env file into the environment
load_dotenv()

app = FastAPI(title="Parlay Suggestions API")

# ── CORS ────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # fallback if you change the port
        "https://parlayev.vercel.app",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ── Routes ──────────────────────────────────────────────────────────────────


@app.get("/")
def root():
    """Health check — confirms the server is running."""
    return {"status": "ok", "message": "Parlay API is running. See /api/parlays"}


def _build_fresh_parlays():
    """
    Fetch today's odds for all sports, build +EV parlays, return as JSON.

    This runs the exact same engine logic as parlay.py, but returns the
    results instead of printing them. The frontend renders this JSON.
    """
    api_key = os.getenv("ODDS_API_KEY")
    if not api_key:
        # 500 = server misconfigured. my key should be in .env (or Railway).
        raise HTTPException(
            status_code=500,
            detail="ODDS_API_KEY is not set. Add it to your .env file.",
        )

    all_legs = []
    books_used = set()
    for sport in SPORTS:
        games = fetch_odds(api_key, sport)
        for game in games:
            for bm in game.get("bookmakers", []):
                books_used.add(bm.get("title", bm.get("key", "")))
        all_legs.extend(extract_legs(games, sport))

    parlays = build_parlays(all_legs)

    # Return the top 20 so the frontend isn't flooded, plus the books used
    return {
        "parlays": parlays[:20],
        "bookmakers": sorted(b for b in books_used if b),
    }


# ── Cache ───────────────────────────────────────────────────────────────────
CACHE_TTL_SECONDS = 3600  # so hourly
_cache = {"data": None, "timestamp": 0.0}
_cache_lock = threading.Lock()


@app.get("/api/parlays")
def get_parlays():
    """Serve cached parlays; only rebuild (and spend API credits) when stale."""
    if (
        _cache["data"] is not None
        and time.time() - _cache["timestamp"] < CACHE_TTL_SECONDS
    ):
        return _cache["data"]
    with _cache_lock:
        # recheck
        if (
            _cache["data"] is not None
            and time.time() - _cache["timestamp"] < CACHE_TTL_SECONDS
        ):
            return _cache["data"]
        _cache["data"] = _build_fresh_parlays()
        _cache["timestamp"] = time.time()
        return _cache["data"]
