ParlayEV

A full-stack sports betting analytics web app that fetches live odds, removes the bookmaker's margin, and surfaces ranked positive expected value (+EV) parlay suggestions across multiple sports.


For entertainment and informational purposes only. Not financial, betting, or legal advice. 21+ where legal. Check your local laws.




What it does

Bookmakers bake a margin (the vig) into every line, so the implied probabilities of a game sum to more than 100%. ParlayEV strips that margin out to estimate the "true" probability of each outcome, compares it against the best price available across many bookmakers, and flags bets where the math is in the bettor's favour. It then assembles those legs into 2- and 3-leg parlays, scores each combination's expected value, and returns the strongest suggestions.

The engine works entirely from live market data — it derives probabilities from the consensus of many bookmakers rather than a single book's opinion.


How the model works


Convert each bookmaker's American odds into an implied probability.
Average that implied probability across every available bookmaker, for a consensus estimate that no single book's line can skew.
Remove the vig by normalising the probabilities so they sum to 100% — this is the estimated true probability.
Correct for favourite-longshot bias, which otherwise makes underdogs perpetually look +EV.
Line-shop — calculate EV against the best available price across all books, since that's what a bettor could actually take.
Filter legs and parlays by minimum edge, minimum win probability, and minimum combined hit probability.
Rank the surviving parlays by expected value.


Markets supported


Moneyline (h2h)
Point spreads (spreads)
Totals / over-under (totals)


Same-game legs are never combined into a parlay, since correlated outcomes break the independence assumption the EV math relies on.


Tech stack

Backend


Python — the analytics engine
FastAPI — REST API wrapper
Uvicorn — ASGI server
requests — fetches odds from The Odds API
python-dotenv — environment / secret management


Frontend


React + TypeScript
Vite — build tooling
Tailwind CSS — styling


Data


The Odds API — live odds from 40+ bookmakers


Deployment


Railway — backend hosting
Vercel — frontend hosting (global CDN)
