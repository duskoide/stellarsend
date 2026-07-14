# STATE — Session Handoff

> **The context-window solution.** Long sessions die; this file doesn't.
> Read at session start. Rewrite at session end. Keep it under one screen — a stale
> or bloated STATE is worse than none.
>
> Rule: **never end a session without updating this.** A session that shipped code but
> left STATE stale has cost the next session more than it gained.

---

## 🎯 Right now

**Working on:** _(one sentence — the single active thread)_
> Rehearse the deployed demo three times and keep the verified local testnet proof as fallback.

**Blocked by:** _(or "nothing")_
> Nothing code-level blocks the local MVP. The full backbone now runs against testnet; deployed
> rehearsal and three clean demo runs are still outstanding.

**Next 3 actions:**
1. Deploy the Worker and Pages build with the verified environment bindings.
2. Run the five-minute demo script on the deployed URL three times without manual recovery.
3. Add a real anchor integration only after the deployed demo backbone is stable.

---

## 🔗 Backbone status — every step now has code

| Step | Endpoint / worker | Writes |
|---|---|---|
| Create | `POST /transfers` | `PENDING` |
| Fund | `POST /transfers/:id/fund` | `FUNDED` |
| Submit | `POST /transfers/:id/submit` → `submitPathPayment` | `SUBMITTED` + `stellarTxHash` |
| Settle | `queues/settlement` (polls Horizon) | `SETTLED` → enqueues payout |
| Payout | `queues/payout` → `services/anchor` | `PAYOUT_PENDING` → `COMPLETED` |
| Claim | `POST /claims/:id/payout` | `PAYOUT_PENDING` (guarded: SETTLED only) |

---

## ✅ Done (verified, not assumed)

Only list things you *actually ran*. "Wrote the code" ≠ done.

- [x] Monorepo scaffold, deploy pipeline (Pages + Worker) boots
- [x] Drizzle schema + first migration; seed script exists
- [x] Shared types frozen in `packages/shared/src/types.ts`
- [x] FE screens render on mocked data
- [x] **Worker signs + submits a real tx**
- [x] Real quote from Horizon `strictSendPaths`
- [x] Sender flow → on-chain tx hash
- [x] Receiver claim → COMPLETED
- [ ] Demo runs 3× clean on deployed URL

---

## 🧠 Decisions & discoveries (append-only — this is the memory)

Anything a fresh session would otherwise waste an hour rediscovering.

| Date | Finding | Consequence |
|---|---|---|
| scaffold | `@libsql/client/web` rejects `file:` URLs at Worker runtime | Use `turso dev` for `wrangler dev`; `file:` only in Node scripts |
| scaffold | Worker bundles + boots fine with `stellar-sdk` imports | Bundling is NOT the risk; *signing* still is |
| spike 0.1 | **stellar-sdk v16 uses `@noble/ed25519` + `@noble/hashes` as DIRECT deps.** `base/signing.js` imports zero Node built-ins — crypto is pure JS. | The `@noble/ed25519` "fallback" in the task board is **moot** — the SDK already *is* that. No rewrite needed. |
| spike 0.1 | `Keypair.fromSecret()`, `kp.sign()`, `tx.sign()` all ran green in Node with **every `node:` builtin hard-blocked** via a loader hook. | Signing does not need the Node runtime → will work in a V8 isolate. Risk #1 is effectively dead. |
| spike 0.1 | Only Node dep left is `Buffer` (from the `buffer` npm shim, not `node:crypto`) — covered by `nodejs_compat`. | Keep `nodejs_compat` on. Consider bumping `compatibility_date` (currently 2024-12-05) if any compat oddity appears. |
| — | ⚠️ **Still unproven:** submit-to-Horizon from inside a real Worker. Run `/_spike/sign-submit` under `wrangler dev` for the real hash. | Submit is just `fetch()` — low risk, but verify before trusting it. |
| submit wiring | **The receiver has no Stellar account, and shouldn't.** `beneficiaries` stores a *bank account*, and `users.stellarPubKey` is never populated. The TODO's "resolve destination pubkey" had no answer in the data model. | On-chain destination = **the receiving anchor** (`RECEIVING_ANCHOR_PUBKEY`, new env var). Anchor receives IDR on-chain → pays fiat off-chain. This is the SEP-31 shape and is architecturally correct, not a shortcut. |
| submit wiring | **`findBestPath()` was computed and then thrown away** — `buildPathPayment` passed no `path`, so multi-hop routes were silently unreachable. | `buildPathPayment` now takes `path: Asset[]`; `submitPathPayment` resolves the best path and passes the hops. Also returns `sourceAmountUsed` (actual spend ≠ quote). |
| submit wiring | **No order-book liquidity = no path = submit always fails.** The old seed never created offers. This would have looked like a code bug for hours. | New `drizzle/seed-stellar.ts` funds 5 accounts, issues USDC/IDR, posts 3 levels of IDR/USDC sell offers, and **asserts a path exists before exiting**. Run it before anything else. |
| submit wiring | Money math: added `withSlippage()` (2% headroom on `sendMax`) using **BigInt on 7dp integers**, not floats. Verified across edge cases. | Strict-receive fixes the *receiver's* amount; the *source* side can drift with the book. `sendMax` needs headroom or submit fails on a moved market. |
| quote | **Quote called the wrong Horizon endpoint.** It used `strictReceivePaths(send, dest, sourceAmount)` — but arg 3 is the *destination* amount, so it was asking "how much USDC to receive 100 **IDR**". Meaningless. | Rewritten to `strictSendPaths(sendAsset, netSource, [destAsset])` — the correct call for "I spend X, how much arrives?". Signature verified against installed `.d.ts`. |
| quote | 🔥 **The quote silently faked its rate.** `.catch(() => undefined)` swallowed path-finding failure, then fell back to a hardcoded `15870`. User sees a plausible rate → confirms → **submit fails** because no path exists. | Fallback **deleted**. No path ⇒ HTTP 400 with a clear message. A quote you can't execute is worse than an error. |
| stepper | **Nothing ever wrote `COMPLETED`.** `settlement.ts` had `TODO: enqueue payout`; the payout worker set `receivingAnchorRef` but never touched `status`. The chain died at SETTLED. | New `services/anchor.ts` (`mockAnchorWithdraw`). settlement → enqueues payout → worker → anchor → `PAYOUT_PENDING` → `COMPLETED`. Every status now has a writer. |
| stepper | Payout had no settlement guard — a claim could disburse fiat for a transfer that never settled. | `mockAnchorWithdraw` + `/claims/:id/payout` now refuse anything not `SETTLED`/`PAYOUT_PENDING`, and are idempotent (queue is at-least-once — double payout would be a real-money bug). |
| ⚠️ sdk | **Installed SDK is v13.3.0, not v16.** v13's `stellar-base` signing tries `require('sodium-native')` (a **native addon — impossible in a Worker**) and falls back to `tweetnacl` (pure JS) in a try/catch. It works (bundle is clean), but it's fragile. | Works today. **Consider upgrading to SDK v16**, whose signing is pure `@noble/ed25519` with no native path at all. |

---

## 🚧 Open questions

- [x] `Keypair.fromSecret()` and `tx.sign()` work under `nodejs_compat` in local `wrangler dev`.
- Is there a real IDR-token issuer from an APAC anchor partner we should use instead of self-issued?
- [x] Testnet liquidity is reproducible by seeding the USDC/IDR order book ourselves.

---

## 📋 Session log

Keep the last ~3. Delete older.

### Session N — YYYY-MM-DD
- **Goal:** …
- **Shipped:** …
- **Learned:** …
- **Left for next:** …

## ? FIRST REAL TX � 2026-07-12 20.45

hash: 6a93c2190b8cfc0ea67bc6abdbedc773d52dd6665b9dc33ac3dfa2753208eafc
https://stellar.expert/explorer/testnet/tx/6a93c2190b8cfc0ea67bc6abdbedc773d52dd6665b9dc33ac3dfa2753208eafc

100 USDC -> Rp1,592,000. Worker ed25519 signing CONFIRMED working.

## Latest verified local flow � 2026-07-14

hash: dd75832013f37606efacd8dfde27a59a25b3500d1aaac40c6eec6f3023ca1b33
https://stellar.expert/explorer/testnet/tx/dd75832013f37606efacd8dfde27a59a25b3500d1aaac40c6eec6f3023ca1b33

status: successful, Horizon ledger 3597707
quote: 100 USDC -> 1,599,920 IDR, service fee 0.0050000 USDC
flow: PENDING -> FUNDED -> SUBMITTED -> SETTLED -> PAYOUT_PENDING -> COMPLETED

