# StellarSend — Task Board

APAC Stellar Hackathon 2026 · Track 1 · Deadline **23 July 2026** · ~2-week MVP

Team: **5 people** — 2 Frontend (FE1, FE2) + 3 Flex (BE1, BE2, INFRA/BE3)

---

## Owners

| Tag | Role | Primary ownership |
|---|---|---|
| **FE1** | Frontend — Sender flow | Landing, auth pages, Send form, Quote page, `WalletConnect`, `useQuote`, `api.ts` |
| **FE2** | Frontend — Receiver + shared UI | Claim/history, `TxStatusStepper`, `useTxStatus`, shadcn/ui setup, `format.ts`, Tailwind |
| **BE1** | Flex — Stellar core (strongest eng) | `pathPayment.ts`, `assets.ts`, `account.ts`, Horizon, **`nodejs_compat` spike** |
| **BE2** | Flex — API + data | Hono routes, Drizzle schema/migrations, seed, JWT auth |
| **INFRA/BE3** | Flex — Infra + async + glue | Cloudflare setup, Queues, Cron, mock anchor, Turso, deploy, Sentry; floating integrator |

> Rule: BE1 is the **single owner** of path-payment code. Others consume it through a typed interface — no two people editing Stellar signing logic.

---

## Stage 0 — Foundations & Spikes (Days 1–2)

Goal: kill the two biggest unknowns before building on them.

| # | Task | Owner | Status | Exit criteria |
|---|---|---|---|---|
| 0.1 | **Spike:** sign + submit a Path Payment inside a Worker with `nodejs_compat`. Fallback `@noble/ed25519` + WebCrypto if `Keypair` fails | BE1 | [x] | Real testnet tx hash visible on Stellar Expert |
| 0.2 | Scaffold monorepo, `wrangler.toml`, Turso (local file libSQL), deploy hello-world Worker + Pages | INFRA/BE3 | ☐ | Deploy pipeline green end-to-end |
| 0.3 | Define `packages/shared/types.ts` + Drizzle schema; first migration + seed (accounts, trustlines, friendbot, seeded IDR order book) | BE2 | ☐ | Migration + seed run clean; shared types frozen |
| 0.4 | Scaffold Next.js + Tailwind + shadcn; static Send / Status / Claim screens on mocked API | FE1, FE2 | ☐ | Screens render on mock data |

**Gate:** real path-payment tx hash + green pipeline + agreed shared types + FE on mocks. If the Worker spike fails → escalate: decide whether to stay on Workers.

---

## Stage 1 — Vertical Slice: Quote → Submit (Days 3–6)

Goal: sender happy path end-to-end, ugly but working.

| # | Task | Owner | Status | Exit criteria |
|---|---|---|---|---|
| 1.1 | `POST /quote` via `strictSendPaths` (rate + fee + destAmount + expiresAt) | BE1 | [x] | Real quote from Horizon |
| 1.2 | `POST /transfers/:id/submit` builds + submits path payment | BE1 | [x] | On-chain tx hash returned |
| 1.3 | `/auth` (register/login/JWT), `POST /transfers`, `/beneficiaries`, `transferEvents` writes | BE2 | [x] | Endpoints pass manual test |
| 1.4 | Send form → real quote → confirm → tx hash + Stellar Expert link | FE1 | ☐ | Sender completes flow in UI |
| 1.5 | `POST /transfers/:id/fund` mock anchor deposit; Queues wired for settlement polling | INFRA/BE3 | [x] | Fund transitions status |

**Gate:** login → real quote → submit → on-chain tx hash. This is the demo backbone.

---

## Stage 2 — Receiver + Status + Payout (Days 7–10)

Goal: close the loop.

| # | Task | Owner | Status | Exit criteria |
|---|---|---|---|---|
| 2.1 | Status stepper polling `GET /transfers/:id`; receiver claim → payout method → COMPLETED | FE2 | ☐ | Status reaches COMPLETED in UI |
| 2.2 | Mock anchor withdraw callback `POST /webhooks/anchor`; payout queue; Cron reconcile (idempotent) | INFRA/BE3 | ☐ | Stuck transfers reconcile |
| 2.3 | `GET /claims/:id`, `POST /claims/:id/payout` | BE2 | [x] | Claim + payout endpoints work |
| 2.4 | Harden path payment: timeouts, retry, quote-expiry re-quote before submit | BE1 | ☐ | Stale quote handled gracefully |

**Gate:** full end-to-end — sender sends, receiver claims, status COMPLETED, verifiable on-chain.

**Local testnet verification (2026-07-14):** completed the full flow with tx hash `dd75832013f37606efacd8dfde27a59a25b3500d1aaac40c6eec6f3023ca1b33`. Deployed rehearsal remains open.

---

## Stage 3 — Harden, Polish, Demo Prep (Days 11–14)

| # | Task | Owner | Status | Exit criteria |
|---|---|---|---|---|
| 3.1 | Bug-bash the 5-min demo script (spec §9) on the **deployed** env, repeatedly | All | ☐ | Runs 3x clean on deployed URL |
| 3.2 | UI polish: error/empty/loading states, currency format, mobile check | FE1, FE2 | ☐ | No dead states in demo path |
| 3.3 | Sentry, prod Turso, final deploy, seed order-book liquidity, write `demo-script.md` | INFRA/BE3 | ☐ | Prod stable + rehearsal doc |
| 3.4 | Buffer for Worker-only issues ("works locally, not on Worker") | BE1, INFRA/BE3 | ☐ | — |
| 3.5 | *If time:* one nice-to-have (Freighter / real demo anchor / multi-currency) — one at a time | flex | ☐ | Never at expense of rehearsed demo |

**Gate:** demo runs flawlessly 3x on the deployed URL with a verifiable on-chain link.

---

## MVP scope lock (spec §8)

**WAJIB (must demo end-to-end):** auth · Send page · real Horizon quote · testnet path payment w/ tx hash · status stepper · receiver claim + mock payout.

**NICE TO HAVE:** real demo anchor (SEP-24) · Freighter self-custody · email/WA notif · multi-currency source.

**SKIP (roadmap in pitch):** prod KYC/AML · remittance licensing · real bank payout.

---

## Standing risk watch (spec §11)

- **Worker `nodejs_compat` / ed25519 is do-or-die → Day 1 (task 0.1).** Everything downstream assumes it works. *(Verified during scaffolding: `wrangler dev`/`deploy --dry-run` bundle and boot cleanly with the SDK imports — the remaining risk is signing + submitting an actual transaction, still owned by BE1.)*
- **Local DB gotcha (found during scaffolding):** the Worker's `@libsql/client/web` rejects `file:` URLs — only `libsql:`/`http(s):`/`ws(s):` work at runtime. Use `turso dev` (local libSQL server over HTTP) for `wrangler dev`; `file:./local.db` only works in Node-run scripts (drizzle-kit, seed). See README "Local DB gotcha".
- Secret keys (`DISTRIBUTOR_SECRET`, issuer secrets) live **server-side only** in Worker bindings — never in FE or `packages/shared`.
- Mock anchor has a clear owner (INFRA/BE3) from Stage 1 — both fund + payout depend on it.
- Contract-first: freeze `packages/shared/types.ts` in Stage 0 so 2 FE devs never idle waiting on endpoints.
- Amounts stored as `text` (7 decimals) + string/decimal.js math — no floats.
- Queue consumers idempotent (at-least-once); Cron reconciles stuck transfers.
