# StellarSend

Cross-border remittance on Stellar — TKI and Indonesian students abroad send money
home fast and cheap, using Stellar as the payment rail and local anchors for
cash-in/cash-out to IDR.

**APAC Stellar Hackathon 2026 · Track 1: Local Finance & Real World Access.**

See [`StellarSend-Spec.md`](./StellarSend-Spec.md) for the full technical blueprint and
[`docs/task-board.md`](./docs/task-board.md) for the team task board.

## What works right now

A demo run produces a **real, verifiable testnet transaction hash** that opens on
Stellar Expert — the pitch in one sentence: fee ≈ $0.00001, settle in ~5s, versus
Western Union's 5–10% and 2 days.

The end-to-end happy path is verified across two deploy targets:

- **Cloudflare (managed):** API Worker `stellarsend-api.18224079.workers.dev` +
  Pages `stellarsend-web.pages.dev` (production branch `main`).
- **Homeserver (self-hosted via Cloudflare Tunnel):** API `stellarapi.duskoide.org`
  + Web `stellarsend.duskoide.org`, backed by user systemd units on the homeserver.

Latest verified on-chain tx: `2afbdd9d1a53eca106e604818dcf642bc381c1afd7ecbb3cd1e52497759c61d9`
→ https://stellar.expert/explorer/testnet/tx/2afbdd9d1a53eca106e604818dcf642bc381c1afd7ecbb3cd1e52497759c61d9

Flow: `register → beneficiary → quote (Horizon strict-send, XLM bridge) → create transfer
→ fund (mock anchor) → submit path payment → settle (queue) → claim/payout (mock anchor)
→ COMPLETED` with a 7-event audit timeline.

## Structure

```
stellarsend/
├── apps/
│   ├── web/        # Next.js 14 frontend (sender + receiver) → Cloudflare Pages
│   └── api/        # Hono API on Cloudflare Workers (wrangler dev / deploy)
├── packages/
│   └── shared/     # shared types + constants (FE + BE) — frozen contract
└── docs/
```

## Roles for this build

There is **no user role attribute**. Sender/receiver is **per-transaction context**:
every transfer has a `senderId` (creator) and an optional `receiverId`; any
authenticated user can both send and claim. The `users` table has no `role` column
and the JWT carries only `sub`.

## Prerequisites

- Node.js >= 20, `pnpm` >= 9 (enable via `corepack` or `npm i -g pnpm`)
- `wrangler` + `turso` CLIs for Cloudflare Workers / Turso DB management
- Stellar **testnet** (no Docker required)

## Configuration secrets

All Stellar secrets are **server-side only** — never in `apps/web` or `packages/shared`.
They live in `apps/api/.dev.vars` (local) or as wrangler secrets (deployed).

Five values are required and printed by `db:seed`:

| Secret | Meaning |
|---|---|
| `DISTRIBUTOR_SECRET` | Keypair that signs and pays the path payment (treasury/float) |
| `IDR_ISSUER` / `VND_ISSUER` / `PHP_ISSUER` | Public keys of the three local-currency issuers |
| `RECEIVING_ANCHOR_PUBKEY` | On-chain destination of the path payment (SEP-31 shape) |

Plus `TURSO_URL`, `TURSO_AUTH_TOKEN`, `HORIZON_URL`, `STELLAR_NETWORK`,
`JWT_SECRET`. See [`.env.example`](./.env.example) for the full template.

> The Send page defaults to **VND** as the source asset, so a missing
> `VND_ISSUER` / `PHP_ISSUER` will crash every quote — keep all three configured.

## Local development

```bash
pnpm install
cp .env.example .env

# 1. Turso DB — the Worker runtime needs an HTTP URL (file: URLs fail at runtime):
turso dev --db-file local.db          # serves http://127.0.0.1:8080 in its own terminal

# 2. Schema + seed (these run under Node and can use the HTTP server above):
pnpm --filter api drizzle:push        # create tables (TURSO_URL=http://127.0.0.1:8080)
pnpm --filter api db:seed             # fund accounts, issue IDR/VND/PHP, seed XLM bridge
                                       #   liquidity, verify all 6 routes, then PRINT env vars

# 3. Copy the printed IDR/VND/PHP_ISSUER + DISTRIBUTOR_SECRET +
#    RECEIVING_ANCHOR_PUBKEY into apps/api/.dev.vars, then:

# 4. Run (two terminals, alongside `turso dev`):
pnpm --filter web dev                 # Next.js dev (default http://localhost:3000)
pnpm --filter api dev                 # wrangler dev (nodejs_compat on, http://localhost:8787)
```

For the web client to call the API in local dev, set
`NEXT_PUBLIC_API_URL=http://localhost:8787/api/v1` before `next dev`.

## Deploy to Cloudflare

```bash
# API Worker
pnpm --filter api deploy              # wrangler deploy

# Set secrets on the Worker (do once + on rotation):
echo "S..." | wrangler secret put DISTRIBUTOR_SECRET
echo "G..." | wrangler secret put IDR_ISSUER
echo "G..." | wrangler secret put VND_ISSUER
echo "G..." | wrangler secret put PHP_ISSUER
echo "G..." | wrangler secret put RECEIVING_ANCHOR_PUBKEY
wrangler secret put TURSO_URL
wrangler secret put TURSO_AUTH_TOKEN

# Web (Pages) — IMPORTANT: deploy from branch `main` so it lands on the
# production domain, not a preview alias:
pnpm --filter web pages:build
npx wrangler pages deploy .vercel/output/static --project-name=stellarsend-web --branch=main
```

The web client's `api.ts` falls back to the deployed Worker URL when
`NEXT_PUBLIC_API_URL` is unset and `NODE_ENV=production`; the fallback is
hardcoded to `stellarsend-api.<account>.workers.dev/api/v1`.
`@cloudflare/next-on-pages` dead-code-eliminates the localhost branch, so the
served bundle only ever contains the production Worker URL.

> **Cloudflare Pages branch gotcha:** `wrangler pages deploy` without
> `--branch=main` deploys to a **preview** alias. The production domain keeps
> serving the previous production deployment. Always pass `--branch=main`
> (the project's production branch).

## Self-host via Cloudflare Tunnel (homeserver prod target)

This repo currently demo-runs on a homeserver, exposed through an existing
Cloudflare Tunnel ("Homeserver" tunnel) to two subdomains:

- `stellarapi.duskoide.org` → `http://127.0.0.1:8787` (Hono API, `wrangler dev`)
- `stellarsend.duskoide.org` → `http://127.0.0.1:3002` (Next.js dev)

Both run as **user systemd units** (`~/.config/systemd/user/`), with lingering
enabled so they survive logout/SSH disconnect:

- `stellarsend-api.service` — `pnpm exec wrangler dev --port 8787 --ip 127.0.0.1`
- `stellarsend-web.service` — `pnpm exec next dev -p 3002 -H 127.0.0.1`,
  with `NEXT_PUBLIC_API_URL=https://stellarapi.duskoide.org/api/v1`

Tunnel ingress is managed in the Cloudflare dashboard (Remote Management) and
auto-reloads, so adding the two hostnames above does **not** require editing
`/etc/cloudflared/config.yml` — dashboard config takes precedence there.

Operations (run on the homeserver as user `pn`):

```bash
# One-time: allow user units to run without an active login session
sudo loginctl enable-linger pn

# Start / status / logs / restart
systemctl --user start stellarsend-api stellarsend-web
systemctl --user status stellarsend-api
journalctl --user -u stellarsend-api -f        # live logs
systemctl --user restart stellarsend-web
```

Secrets on the homeserver live in `apps/api/.dev.vars` (gitignored), pointing at
the **cloud** Turso DB (`libsql://stellarsend-prod-duskoide...`), so the API
shares the same state as the deployed Worker if you want to.

## Cloudflare Tunnel setup from scratch (reference)

If the "Homeserver" tunnel did not already exist:

```bash
sudo cloudflared tunnel login                       # auth via browser → cert.pem
sudo cloudflared tunnel create Homeserver            # prints <UUID>
# Add DNS records (or do it in the dashboard):
sudo cloudflared tunnel route dns Homeserver stellarapi.duskoide.org
sudo cloudflared tunnel route dns Homeserver stellarsend.duskoide.org
# Install as a service:
sudo cloudflared service install
```

Then add the two ingress rules (`stellarapi`→8787, `stellarsend`→3002) either in
the dashboard or in `/etc/cloudflared/config.yml`.

## Tech notes

- **`nodejs_compat`** is enabled in `apps/api/wrangler.toml` so
  `@stellar/stellar-sdk` (ed25519 `Keypair`, `Buffer`) works in the V8 isolate.
  Signing + submission has been verified on the deployed Worker.
- **Bridge asset is XLM.** Path payments must include a native XLM hop; the quote
  and submit code reject direct source→destination offers. IDR/VND/PHP liquidity
  against XLM is seeded by `db:seed`. Bridge asset is meant to become configurable
  (XLM now, USDC/stablecoin later as a roadmap item — see spec §7.1).
- **Local DB gotcha:** the Worker's `@libsql/client/web` only supports
  `libsql:`/`http(s):`/`ws(s):` URLs — **not** `file:`. Use `turso dev`
  (HTTP server) for `wrangler dev`; `file:./local.db` works only for Node-run
  scripts (drizzle-kit, seed).
- **Amounts are `text`, 7 decimals** (Stellar precision), string/`decimal.js`
  math only — never floats.
- **Anchors are mocked** for the MVP (SEP-24/31 flow shape preserved) to avoid
  production KYC blockers. Replacing the mock = replacing `services/anchor.ts`,
  not the callers.
- **Quote expiry 60s**: quotes are re-validated at submit; stale quotes are
  rejected with a re-quote message.
- **Queues are idempotent** (at-least-once delivery); a Cron Trigger reconciles
  stuck transfers.