# StellarSend

Cross-border remittance on Stellar — send money from abroad to Indonesia fast and cheap, using Stellar as the payment rail and local anchors for cash-in/cash-out to IDR.

APAC Stellar Hackathon 2026 · Track 1: Local Finance & Real World Access.

See [`StellarSend-Spec.md`](./StellarSend-Spec.md) for the full technical blueprint and [`docs/task-board.md`](./docs/task-board.md) for the team task board.

## Structure

```
stellarsend/
├── apps/
│   ├── web/        # Next.js 14 frontend (sender + receiver) → Cloudflare Pages
│   └── api/        # Hono API on Cloudflare Workers
├── packages/
│   └── shared/     # shared types + constants (FE + BE)
└── docs/
```

## Prerequisites

- Node.js >= 20, `pnpm` >= 9
- Stellar testnet (no Docker required — local dev DB is a libSQL file)

## Quick start

```bash
pnpm install
cp .env.example .env

# DB — two different clients are involved (see .env.example note):
#  1. `turso dev` starts a local libSQL server over HTTP for the Worker at runtime.
turso dev --db-file local.db          # keep running in its own terminal
#  2. drizzle-kit / seed run under Node and can push straight to that server:
pnpm --filter api drizzle:push        # create tables (set TURSO_URL=http://127.0.0.1:8080)
pnpm --filter api db:seed             # fund accounts, issue IDR/VND/PHP, seed XLM bridge liquidity, print env vars

# After db:seed, copy the printed IDR_ISSUER, VND_ISSUER, PHP_ISSUER,
# DISTRIBUTOR_SECRET, and RECEIVING_ANCHOR_PUBKEY into apps/api/.dev.vars,
# then restart wrangler dev.

# Run (two terminals, alongside `turso dev`)
pnpm --filter web dev                 # Next.js dev
pnpm --filter api dev                 # wrangler dev (nodejs_compat on)
```

Deploy:

```bash
pnpm --filter web pages:deploy     # Cloudflare Pages
pnpm --filter api deploy           # wrangler deploy
```

## Notes

- Backend runs on Cloudflare Workers — `nodejs_compat` is enabled so `@stellar/stellar-sdk` (ed25519 `Keypair`, `Buffer`) works in the V8 isolate. Prove the sign+submit spike on day 1.
- **Local DB gotcha (confirmed during scaffolding):** the Worker uses `@libsql/client/web`, which only supports `libsql:`/`http(s):`/`ws(s):` URLs — not `file:`. Run `turso dev` for local Worker development; only Node-run scripts (drizzle-kit, seed) can use a bare `file:./local.db`.
- Amounts are stored as `text` (7 decimals) to preserve Stellar precision; use string/`decimal.js` math, never floats.
- For the MVP, anchors are mocked (SEP-24/31 flow shape preserved) to avoid production KYC blockers.
