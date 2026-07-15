# StellarSend

**Cross-border remittance for Indonesian students abroad.**  
Send money home from anywhere to IDR — powered by Stellar Path Payments.

**APAC Stellar Hackathon 2026 · Track 1: Local Finance & Real World Access**

---

## The Problem

Indonesian students and TKI (migrant workers) abroad send money home through traditional remittance services that charge **5–10% in fees** and take **2–5 days** to settle. For a student sending Rp 2,000,000 home, that can mean losing Rp 100,000–200,000 per transfer — money that matters.

## The Solution

StellarSend replaces the traditional remittance rail with Stellar's Path Payment:

| | Western Union | StellarSend |
|---|---|---|
| **Fee** | 5–10% | ~$0.00001 |
| **Settlement** | 2–5 days | ~5 seconds |
| **Transparency** | Opaque | Fully on-chain, verifiable |

A sender selects a beneficiary, gets a live quote from Horizon, funds the transfer, and the backend executes a multi-hop path payment (`source asset → XLM → destination asset`). The receiver claims the payout through a local anchor — all tracked on-chain with a full audit trail.

## Live Demo

**🌐 Try it now:** https://stellarsend.duskoide.org

**Latest verified testnet transaction:**
- **Hash:** `2afbdd9d1a53eca106e604818dcf642bc381c1afd7ecbb3cd1e52497759c61d9`
- **View on Stellar Expert:** https://stellar.expert/explorer/testnet/tx/2afbdd9d1a53eca106e604818dcf642bc381c1afd7ecbb3cd1e52497759c61d9

### Happy Path Flow

```
Register → Add Beneficiary → Get Quote → Create Transfer
    → Fund (mock anchor) → Submit Path Payment → Settle → Claim/Payout
```

Every step produces a verifiable event on the transaction audit timeline.

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Sender    │         │  StellarSend     │         │  Receiver   │
│  (Web App)  │◄───────►│   Backend API    │◄───────►│  (Web App)  │
└─────────────┘         └────────┬─────────┘         └─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
      ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
      │  Stellar     │   │  Sending     │   │  Receiving   │
      │  Horizon     │   │  Anchor      │   │  Anchor (ID) │
      │  (Testnet)   │   │  (mock)      │   │  (mock)      │
      └──────────────┘   └──────────────┘   └──────────────┘
              │
              ▼
      ┌──────────────┐
      │ Stellar      │
      │ Network      │
      │ (Testnet)    │
      └──────────────┘
```

- **Frontend:** Next.js 14 (Cloudflare Pages) — sender + receiver flows
- **Backend:** Hono API (Cloudflare Workers) — quotes, path payments, settlement queues
- **Database:** Turso (libSQL) + Drizzle ORM
- **Settlement:** Cloudflare Queues + Cron reconciliation for idempotent payout
- **Anchors:** Mocked for the hackathon (SEP-24/31 flow shape preserved)

## On-chain Identifiers

This project uses **classic Stellar operations** (Horizon Path Payments, SEP-24/31 anchor flows) and does **not** deploy a Soroban smart contract. Therefore, there is no `C...` contract address.

The following identifiers are verifiable on Stellar Testnet:

| Identifier | Type | Value / How to obtain |
|---|---|---|
| Verified path-payment tx | Transaction | `2afbdd9d1a53eca106e604818dcf642bc381c1afd7ecbb3cd1e52497759c61d9` |
| IDR Issuer | Account | Printed by `pnpm --filter api db:seed` as `IDR_ISSUER` |
| VND Issuer | Account | Printed by `pnpm --filter api db:seed` as `VND_ISSUER` |
| PHP Issuer | Account | Printed by `pnpm --filter api db:seed` as `PHP_ISSUER` |
| Distributor / Signer | Account | Printed by `pnpm --filter api db:seed` as `DISTRIBUTOR_SECRET` (public key) |
| Receiving Anchor | Account | Printed by `pnpm --filter api db:seed` as `RECEIVING_ANCHOR_PUBKEY` |

## What Makes This Track-1 Relevant

- **Real-world problem:** Remittance is the #1 use case for Stellar in Southeast Asia. Indonesian students and TKI are a real, underserved demographic.
- **Local currency focus:** IDR, VND, and PHP tokens demonstrate multi-currency support with local anchor cash-out.
- **SEP compliance:** The mock anchor implements the SEP-24 (deposit) and SEP-31 (receive) flow shapes, showing readiness for real anchor integration.
- **Speed + cost:** The demo produces a real testnet tx hash that any judge can verify on Stellar Expert in under 5 seconds.

## Project Structure

```
stellarsend/
├── apps/
│   ├── web/        # Next.js 14 frontend (sender + receiver)
│   └── api/        # Hono API on Cloudflare Workers
├── packages/
│   └── shared/     # shared types + constants (FE + BE frozen contract)
└── docs/
```

See [`StellarSend-Spec.md`](./StellarSend-Spec.md) for the full technical blueprint and [`docs/task-board.md`](./docs/task-board.md) for the build log.

---

## For Developers

### Prerequisites

- Node.js >= 20, `pnpm` >= 9
- `wrangler` + `turso` CLIs
- Stellar **testnet** (no Docker required)

### Configuration

All Stellar secrets are **server-side only**. Five values are printed by `db:seed`:

| Secret | Meaning |
|---|---|
| `DISTRIBUTOR_SECRET` | Keypair that signs and pays the path payment |
| `IDR_ISSUER` / `VND_ISSUER` / `PHP_ISSUER` | Public keys of the three local-currency issuers |
| `RECEIVING_ANCHOR_PUBKEY` | On-chain destination of the path payment (SEP-31 shape) |

See [`.env.example`](./.env.example) for the full template.

### Local Development

```bash
pnpm install
cp .env.example .env

# 1. Turso DB (Worker runtime needs HTTP URL; file: URLs fail at runtime):
turso dev --db-file local.db

# 2. Schema + seed:
pnpm --filter api drizzle:push
pnpm --filter api db:seed   # prints env vars — copy into apps/api/.dev.vars

# 3. Run (two terminals):
pnpm --filter web dev       # http://localhost:3000
pnpm --filter api dev       # http://localhost:8787
```

### Deploy

```bash
# API Worker
pnpm --filter api deploy

# Web (Pages) — deploy from branch main for production domain:
pnpm --filter web pages:build
npx wrangler pages deploy .vercel/output/static --project-name=stellarsend-web --branch=main
```

### Tech Notes

- **`nodejs_compat`** is enabled in `apps/api/wrangler.toml` so `@stellar/stellar-sdk` (ed25519 `Keypair`, `Buffer`) works in the V8 isolate.
- **Bridge asset is XLM.** Path payments must include a native XLM hop; IDR/VND/PHP liquidity against XLM is seeded by `db:seed`.
- **Amounts are `text`, 7 decimals** — never floats.
- **Queues are idempotent** (at-least-once delivery); a Cron Trigger reconciles stuck transfers.
