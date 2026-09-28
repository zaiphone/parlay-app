ParlayEV

A full-stack +EV parlay builder for NFL and NBA. It pulls live odds from multiple sportsbooks, strips out the bookmaker margin (vig), and ranks parlays by expected value.

[Live app]: https://parlayev.vercel.app

For educational and analytical purposes only. Not financial or betting advice. Sports betting involves risk and may be restricted where you live. Please gamble responsibly.

What it does
Fetches live moneyline odds for upcoming games from The Odds API.
Removes the vig from each bookmaker's line to get no-vig implied probabilities.
Averages across books to build a consensus probability, and line-shops to find the best available price per leg.
Corrects for favourite-longshot bias, since raw implied probabilities overrate longshots.
Vetoes moneyline legs using in-house NBA and NFL win-probability models (logistic regression trained on historical results, with live ESPN results feeding the features).
Builds multi-leg parlays from the surviving legs and ranks them by EV for your wager.

The UI lets you pick a sport, set a bet amount, include or exclude individual games from the slate, and share a result. Each card shows EV, combined odds, and which bookmaker offers each leg.

How the maths works
Vig removal: each book's implied probabilities are normalised so they sum to 1.
Consensus probability: averaged across books.
Longshot bias correction: probabilities are adjusted with a power transform (LONGSHOT_BIAS_POWER = 1.08).
Winnability filters: legs below MIN_LEG_PROB = 0.25 and parlays below MIN_PARLAY_PROB = 0.15 are dropped, so results aren't dominated by lottery tickets.
Parlay EV: legs are treated as independent, so parlay win probability is the product of leg probabilities, and EV = p × payout − (1 − p) × stake. Only same-sport legs are combined, and only upcoming games are considered.
Model veto: a leg is rejected if the in-house win-probability model disagrees with the market consensus beyond a set threshold.
Tech stack
Layer	Choice
Backend	Python, FastAPI, Uvicorn
Modelling	scikit-learn, Pandas, NumPy
Data	The Odds API (odds), ESPN (results)
Frontend	React, TypeScript, Vite
Hosting	Render (API), Vercel (web)

The backend caches odds in memory to stay within The Odds API free-tier quota.

Project structure
backend/
  main.py          # FastAPI app, routes, CORS, caching
  parlay.py        # vig removal, consensus, bias correction, EV, parlay ranking
  models/          # NBA and NFL win-probability models
frontend/
  src/             # React + TypeScript UI

Adjust the paths above to match your repo.

Running locally

Backend

bash
conda create -n parlayev python=3.11 -c conda-forge
conda activate parlayev
pip install -r backend/requirements.txt
cp .env.example .env        # add ODDS_API_KEY
uvicorn backend.main:app --reload

Frontend

bash
cd frontend
npm install
npm run dev

Set the API base URL in the frontend's env file to your local backend, and add your frontend origin to the backend's CORS allow-list.

what I think would make the tool more useful:

Player props (needs correlation and overround handling)
Additional sports
