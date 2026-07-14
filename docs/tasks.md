# StellarSend — Remaining Tasks (assignable)

> Split out from the repo findings. The scaffold (auth, DB, queues, UI shell, Stellar
> helpers) is done. These tasks close the **demo loop** so the app runs end-to-end on
> testnet with a verifiable on-chain tx hash.
>
> Each friend: `git pull`, branch from `master` (e.g. `feat/<slug>`), do your tasks,
> open a PR. No worktrees required.
>
> **Before anyone starts (shared):** set the Stellar secrets in `apps/api/.dev.vars`
> (copy from `.env.example`). `DISTRIBUTOR_SECRET`, `USDC_ISSUER`, `IDR_ISSUER` are
> currently `S...` / `G...` placeholders — Task 2 generates real ones and prints them.

---

## Owner map

| Owner | Tasks |
|---|---|
| **BE1** (Stellar signing — single owner) | T3 (wire submit), T5 (real quote) |
| **BE2** (data/seed) | T2 (seed liquidity) |
| **INFRA/BE3** (infra + glue) | T1 (dev DB fix), T4 (auto payout), T7 (demo coord) |
| **FE1** (sender flow) | T6 (beneficiary picker) |
| **FE2** (receiver/UI polish) | T7 support (UI polish + demo rehearsal) |

**Dependency order:** T1 (prereq for local API testing) → T2 → T3 & T5 (need liquidity) → T4 (independent) → T6 (independent) → T7.

---

## T1 — Fix local DB URL so the API boots  · INFRA/BE3

**Why:** `.dev.vars` has `TURSO_URL=file:./local.db`, but the Worker's `@libsql/client/web`
rejects `file:` URLs (README + code comment confirm). `wrangler dev` fails to open the DB.

**Files:** `apps/api/.dev.vars`, `README.md` (Quick start).

**Steps**
1. In `apps/api/.dev.vars`, set `TURSO_URL=http://127.0.0.1:8080`.
2. In README Quick start, add the `turso dev --db-file local.db` step **before** `pnpm --filter api dev`, and note `file:` only works for Node scripts (drizzle push/seed).

**Done when:** with `turso dev` running in one terminal, `pnpm --filter api dev` boots and `curl localhost:8787/health` returns `{"ok":true}` (no DB connection error).

---

## T2 — Seed real DEX liquidity  · BE2

**Why:** `seed.ts` only friendbot-funds a distributor and TODOs trustlines + order book.
Without liquidity, `strictReceivePaths()` finds nothing (quotes fall back to a hardcoded rate)
and on-chain submits fail at trustline/liquidity.

**Files:** `apps/api/drizzle/seed.ts`

**Steps**
1. Reuse or generate issuer keypairs for USDC + IDR; friendbot-fund them; print their public keys (like the distributor secret is printed) so they go into `.dev.vars` as `USDC_ISSUER` / `IDR_ISSUER`.
2. Establish trustlines from the distributor **and** a destination/receiver account to both issuers (`createTrustline` in `src/stellar/account.ts` exists).
3. Fund the destination account (friendbot) and give it the IDR trustline.
4. Issue some USDC to the distributor (issuer makes a payment) and seed DEX sell offers to create a path USDC → XLM → IDR (or direct USDC→IDR) so `strictReceivePaths` returns a route.

**Done when:** after `pnpm --filter api db:seed`, a `strictReceivePaths([USDC], IDR, <amount>)` call returns at least one record; submit (T3) settles on testnet.

---

## T3 — Wire the submit path payment  · BE1  (single owner of signing code)

**Why:** `POST /transfers/:id/submit` only records a `SUBMITTED` event and returns a TODO — it
never calls `submitPathPayment()`, never persists `stellarTxHash`, never enqueues settlement.
This is the do-or-die spike (spec §7/§11) and the judge differentiator.

**Files:** `apps/api/src/routes/transfer.ts` (`/:id/submit`), uses `src/stellar/pathPayment.ts` (`submitPathPayment` — already implemented).

**Steps**
1. Decide the destination account (where IDR lands). For MVP it's a receiving/distributor account the team controls — add its public key to `.dev.vars` (e.g. `RECEIVING_ACCOUNT`) or reuse the seeded destination from T2.
2. In `/submit`, call `submitPathPayment(env, { sourceSecret: env.DISTRIBUTOR_SECRET, destPublicKey, sendAsset: usdc(env), sendMax: <sourceAmount + fee buffer>, destAsset: idr(env), destAmount: row.destAmount })`.
3. Persist the returned `stellarTxHash` on the transfer, set status `SUBMITTED`, and `await c.env.QUEUE_SETTLEMENT.send({ transferId, stellarTxHash })`.

**Done when:** `POST /transfers/:id/submit` returns a real `stellarTxHash`; Stellar Expert shows the tx; the settlement consumer (`src/queues/settlement.ts`, already implemented) flips status to `SETTLED`.

---

## T4 — Make payout auto-complete  · INFRA/BE3

**Why:** `handlePayout` sets `PAYOUT_PENDING` and acks but never calls the mock anchor, so
transfers never reach `COMPLETED` without a manual `POST /webhooks/anchor`.

**Files:** `apps/api/src/queues/payout.ts` (+ optionally extract a helper from `src/routes/webhook.ts`).

**Steps**
1. Extract the "mark COMPLETED" transition (currently inline in `webhook.ts`) into a shared helper, e.g. `completeTransfer(db, transferId, message)`.
2. In `handlePayout`, after initiating the mock withdraw, call that helper so the transfer moves to `COMPLETED` (the mock anchor "completes" immediately). Keep it idempotent (already guards on `COMPLETED`).

**Done when:** after a receiver claims + selects a method, the transfer reaches `COMPLETED` with no manual webhook call. (Verify via `GET /transfers/:id` and the status stepper.)

---

## T5 — Real quote math  · BE1

**Why:** `quote.ts` calls `findBestPath(sendAsset, destAsset, body.sourceAmount)` — passing the
*source* amount as the `destAmount` arg of a strict-receive path (wrong dimension), then
computes `rate = destination_amount / source_amount` and multiplies. It's guarded by a `catch`
+ **hardcoded fallback rate `15870`**, so quotes aren't real.

**Files:** `apps/api/src/routes/quote.ts`

**Steps**
1. Replace with a correct lookup: given `sourceAmount`, use `strictSendPaths([sendAsset], destAsset, sourceAmount)` (or `strictReceivePaths` with the locked dest amount) and take the best (cheapest) record. Compute `destAmount` + `rate` from that record with `decimal.js`.
2. Keep a fallback **only** when Horizon errors — don't hardcode a rate.

**Done when:** quote returns rate/destAmount derived from the real path (matches what T3 submits on-chain). Depends on T2 liquidity existing.

---

## T6 — Beneficiary picker (web)  · FE1

**Why:** The Send page makes the user type a raw `beneficiaryId` into a text input, even though
`GET /beneficiaries` exists. No way to select/create a beneficiary in the UI.

**Files:** `apps/web/src/app/(sender)/send/page.tsx`, `apps/web/src/lib/api.ts` (already has `beneficiaries.list/create`), `apps/web/src/hooks/useQuote.ts` (or a new `useBeneficiaries`).

**Steps**
1. Fetch `GET /beneficiaries` on mount (TanStack Query).
2. Replace the `beneficiaryId` `<Input>` with a `<select>` of saved beneficiaries.
3. Add a minimal inline "add beneficiary" form (name, method, bank, account number) → `POST /beneficiaries`, then refresh the list.

**Done when:** a sender picks a saved beneficiary from a dropdown (or adds one inline) and the id flows into `api.transfers.create`.

---

## T7 — Walk the 5-min demo  · All (INFRA/BE3 coords, FE2 polishes)

**Script (spec §9):** register sender + receiver → sender adds beneficiary → get quote (real rate, <$0.01 fee) → submit → capture `stellarTxHash` + open Stellar Expert link → receiver claims → pick method → `COMPLETED`.

**Steps**
1. Run the full flow on the dev (or deployed) env 3× clean.
2. FE2: confirm no dead/loading/error states in the demo path; mobile check.
3. Capture one real tx hash + Stellar Expert URL for the pitch.

**Done when:** the loop runs 3× clean with a verifiable on-chain link.

---

## Quick reference — key files
- Submit wiring: `apps/api/src/routes/transfer.ts`
- Path payment (build/sign/submit): `apps/api/src/stellar/pathPayment.ts`
- Assets/horizon: `apps/api/src/stellar/assets.ts`, `apps/api/src/stellar/horizon.ts`
- Seed: `apps/api/drizzle/seed.ts`
- Payout consumer: `apps/api/src/queues/payout.ts`
- Webhook completion: `apps/api/src/routes/webhook.ts`
- Send UI: `apps/web/src/app/(sender)/send/page.tsx`
- API client: `apps/web/src/lib/api.ts`
