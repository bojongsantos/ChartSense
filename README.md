# ChartSense

AI-powered crypto chart analysis: supply & demand zone detection, real-time
scanning, setup conviction scoring, market context and sentiment in one
dashboard.

## Features

- **Chart Analysis** — live supply/demand setup detection per symbol, entry /
  SL / target planning, and AI Analysis output (Ringkasan Setup, Market
  Structure, Key Level, Momentum, Risk Management).
- **Conviction Score** — single source of truth for setup quality, rebuilt from
  the same formula used at detection (zone quality + freshness - touch
  penalty + base score, clamped to 20–96).
- **Scanner** — real-time setups across the watchlist, ranked by conviction,
  with technical signals captured during the scan.
- **Market Context & Sentiment** — BTC/ETH tickers, BTC dominance, funding
  rate, open interest, and Fear & Greed, cached client-side with TTL.
- **Free/Pro gating** — feature-level access control toggled in the UI.

## Tech Stack

- Next.js (App Router, Turbopack)
- React + TypeScript
- Tailwind CSS
- Data from public APIs: Binance (spot/futures), CoinGecko, Alternative.me FNG

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run lint     # ESLint
```

## Branches

- `main` — stable, production-ready state.
- `update/edit` — working branch for active updates and edits.
