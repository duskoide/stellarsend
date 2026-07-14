# StellarSend — Agent Context

> **Read this first, every session.** This is the durable brief. It is intentionally short
> so it survives context pressure. Everything else is loaded on demand.

## What this is

Cross-border remittance on Stellar. TKI / students abroad send money home to Indonesia:
fiat → USDC → **Stellar path payment** → IDR token → local anchor payout to bank/e-wallet.

**APAC Stellar Hackathon 2026 · Track 1 (Local Finance & Real World Access) · Deadline 23 July 2026.**

## The one thing that matters

The demo must produce a **real, verifiable testnet transaction hash** that opens on Stellar Expert.
Fee ≈ $0.00001, settle in ~5s, versus Western Union's 5–10% and 2 days. That contrast *is* the pitch.

Any work that does not move toward a verifiable on-chain tx hash is a distraction until the
happy path is green.

## Current state (update this line as it changes)

- ✅ Scaffold, Drizzle schema + migration, Hono routes, Next.js pages, shared types
- ✅ `pathPayment.ts` implemented (`buildPathPayment` / `submitPathPayment` / `findBestPath`)
- ✅ **`POST /transfers/:id/submit` is wired** — persists a real testnet tx hash and enqueues settlement.
- ✅ **Worker ed25519 signing + submission verified** in local `wrangler dev` against testnet.
- ⚠️ Anchors are mocked by design (avoids prod KYC blocker). Keep the SEP-24/31 flow *shape*.

## Architecture (do not re-litigate)

```
Next.js 14 (Cloudflare Pages)  →  Hono API (Cloudflare Workers)  →  Horizon (testnet)
                                        ↓
                              Turso / libSQL + Drizzle
                              Queues (settlement, payout) + Cron reconcile
```

- **Monorepo:** `apps/web`, `apps/api`, `packages/shared` (pnpm workspaces).
- **`packages/shared/src/types.ts` is the frozen FE↔BE contract.** Changing it is a breaking
  change — say so explicitly and update both sides in the same change.
- **Money is `string`, 7 decimals, always.** Stored as `text`. Never a float. Never `number` math.
  Use string/decimal math. This is the #1 source of silent money bugs.
- Secrets (`DISTRIBUTOR_SECRET`, issuer secrets) are **server-side Worker bindings only**.
  Never in `apps/web`, never in `packages/shared`.

## Known landmines (learned the hard way — do not rediscover)

1. **Worker ed25519 / `nodejs_compat` — verified locally; deployed rehearsal remains.**
   `Keypair.fromSecret()` + `tx.sign()` and Horizon submission have now produced a real
   testnet transaction from local `wrangler dev`. Repeat the same check after deployment;
   do not paper over a deployed-only failure.
2. **`file:` URLs do not work at Worker runtime.** `@libsql/client/web` accepts only
   `libsql:` / `http(s):` / `ws(s):`. Run `turso dev --db-file local.db` (HTTP server) for
   `wrangler dev`. `file:./local.db` works *only* in Node-run scripts (drizzle-kit, seed).
3. **Quotes go stale.** Re-quote before submit; handle expiry rather than submitting a dead rate.
4. **Queue consumers are at-least-once → must be idempotent.** Cron reconciles stuck transfers.

## Skills — load these, they are the source of truth for Stellar

Stellar skill pack lives in `.agents/skills/`. **Read the relevant `SKILL.md` before writing
Stellar code** — it beats your training data, which is likely stale on SDK specifics.

| Task | Skill |
|---|---|
| Wallets, signing, submitting, `stellar-sdk` (browser + Node) | `.agents/skills/dapp/SKILL.md` |
| SEPs — which standard applies (SEP-10/24/31) | `.agents/skills/standards/SKILL.md` |
| Assets, trustlines, issuing IDR/USDC test tokens | `.agents/skills/assets/SKILL.md` |
| Reading chain data, Horizon/RPC, paths, balances | `.agents/skills/data/SKILL.md` |

Not relevant to this MVP: `smart-contracts`, `zk-proofs`, `agentic-payments` (no Soroban here —
classic Stellar operations only).

## Docs

- `StellarSend-Spec.md` — full blueprint. §7 path payment, §8 scope lock, §9 demo script.
- `docs/task-board.md` — stages, owners, gates.

## Scope lock — say no to everything else

**MUST (demo backbone):** auth · Send page · real Horizon quote · testnet path payment **with tx
hash** · status stepper · receiver claim + mock payout.

**NICE-TO-HAVE (only after backbone is green, one at a time):** real SEP-24 anchor · Freighter ·
notifications · multi-currency.

**OUT (roadmap slide, not code):** prod KYC/AML · remittance licensing · real bank payout.

## Working agreement

- Small, reviewable changes. One concern at a time.
- **Do not invent Stellar API signatures.** Check the skill or the installed SDK types first.
- If something is a stub or mock, label it `TODO(owner)` — never fake a passing result.
- **Never fabricate a tx hash, quote, or rate.** A fake demo is worse than a broken one.
- Prefer editing existing files over creating new ones. No new abstractions without a reason.
- After a change, state what you verified vs. what you assumed.
