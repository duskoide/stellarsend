# MVP Gap Closure Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Close the remaining code-level MVP gaps against `StellarSend-Spec.md`: receiver-driven claim, demo-safe fee display, correct seed command, and claim auth UX.

**Architecture:** Keep the existing working testnet backbone intact. Make the smallest changes that align the product with the demo script: settlement stops at `SETTLED`, receiver claim triggers mock payout, quote/UI clearly communicate near-zero fees, and setup commands point to the real liquidity seed.

**Tech Stack:** Hono + Cloudflare Workers, Cloudflare Queues, Drizzle/Turso, `@stellar/stellar-sdk`, Next.js 14, TanStack Query, TypeScript.

---

## Task 1: Make Receiver Claim Trigger Payout

**TDD scenario:** Modifying working code — run existing typecheck first, then verify by local end-to-end flow.

**Files:**
- Modify: `apps/api/src/queues/settlement.ts`
- Verify: `apps/api/src/routes/payout.ts`
- Verify UI: `apps/web/src/app/(receiver)/claim/[id]/page.tsx`

**Current problem:** `settlement.ts` auto-enqueues payout immediately after `SETTLED`, so the receiver often sees `COMPLETED` before clicking "Claim now". Spec/demo requires receiver to claim and choose method.

**Step 1: Run current API typecheck**

Run:
```bash
corepack pnpm --filter api typecheck
```
Expected: PASS.

**Step 2: Modify settlement worker**

In `apps/api/src/queues/settlement.ts`, remove this block:
```ts
// Auto-payout: settled funds are with the receiving anchor, so disburse.
// If the receiver already chose a method, honour it; otherwise default to bank.
await env.QUEUE_PAYOUT.send({
  transferId,
  method: row.payoutMethod ?? "BANK_TRANSFER",
});
```

Replace with an event-only/no-op comment:
```ts
// Stop at SETTLED. The receiver claim flow triggers payout via
// POST /claims/:id/payout, matching the demo script.
```

**Step 3: Verify payout route still sends queue**

Confirm `apps/api/src/routes/payout.ts` still does:
```ts
await c.env.QUEUE_PAYOUT.send({ transferId: tid, method: body.method });
```
Expected: unchanged.

**Step 4: Run typecheck**

Run:
```bash
corepack pnpm --filter api typecheck
```
Expected: PASS.

**Step 5: Manual verification**

Run local flow:
```bash
# start turso dev, api, web as usual
# register sender + receiver
# send flow: quote -> create -> fund -> submit
# poll transfer status
```
Expected before receiver claim: transfer reaches `SETTLED`, not `COMPLETED`.

Then call:
```bash
curl -X POST http://localhost:8787/api/v1/claims/<transferId>/payout \
  -H "Authorization: Bearer <receiverToken>" \
  -H "Content-Type: application/json" \
  -d '{"method":"BANK_TRANSFER"}'
```
Expected after queue delivery: `PAYOUT_PENDING -> COMPLETED`.

**Step 6: Commit**

```bash
git add apps/api/src/queues/settlement.ts
git commit -m "fix(api): require receiver claim before payout"
```

---

## Task 2: Make Fee Story Match the Pitch

**TDD scenario:** Modifying visible product behavior — typecheck plus manual quote verification.

**Files:**
- Modify: `apps/api/src/routes/quote.ts`
- Modify: `apps/web/src/components/QuoteCard.tsx`
- Optional modify: `apps/web/src/app/(sender)/status/[id]/page.tsx`

**Current problem:** Spec demo says fee `< $0.01`, but API charges `0.5%`, so `$100` displays `0.5 USDC` fee. This contradicts the pitch.

**Decision:** For MVP, set app fee to near-zero and label it as a demo/service fee. The real Stellar network fee is already tiny, but the current UI only shows app fee.

**Step 1: Change quote fee rate**

In `apps/api/src/routes/quote.ts`, replace:
```ts
const FEE_RATE = new Decimal("0.005");
```
with:
```ts
const FEE_RATE = new Decimal("0.00005"); // 0.005% demo service fee: $0.005 on $100
```

For `100 USDC`, expected fee: `0.0050000`, which displays as `< $0.01` if formatted precisely.

**Step 2: Adjust QuoteCard fee copy**

In `apps/web/src/components/QuoteCard.tsx`, change label from:
```tsx
<span className="text-muted-foreground">Fee</span>
```
to:
```tsx
<span className="text-muted-foreground">Service fee</span>
```

Add small helper copy under fee or below quote:
```tsx
<p className="text-xs text-muted-foreground">
  Stellar network fee is less than $0.01 on testnet; rate is locked for 60 seconds.
</p>
```

**Step 3: Run typechecks**

```bash
corepack pnpm --filter api typecheck
corepack pnpm --filter web typecheck
```
Expected: both PASS.

**Step 4: Manual quote verification**

Call:
```bash
curl -X POST http://localhost:8787/api/v1/quote \
  -H "Content-Type: application/json" \
  -d '{"sourceAsset":"USDC","sourceAmount":"100","destAsset":"IDR"}'
```
Expected: `feeAmount` approximately `0.0050000`, not `0.5000000`.

**Step 5: Commit**

```bash
git add apps/api/src/routes/quote.ts apps/web/src/components/QuoteCard.tsx
git commit -m "fix: align demo fee display with MVP pitch"
```

---

## Task 3: Wire Real Stellar Seed Command

**TDD scenario:** Trivial script/config change — verify command executes.

**Files:**
- Modify: `apps/api/package.json`
- Modify: `README.md`
- Optional modify: `docs/STATE.md`

**Current problem:** `db:seed` points to old `drizzle/seed.ts`, but the real liquidity seed is `drizzle/seed-stellar.ts`.

**Step 1: Update scripts**

In `apps/api/package.json`, replace:
```json
"db:seed": "tsx src/../drizzle/seed.ts"
```
with:
```json
"db:seed": "tsx drizzle/seed-stellar.ts",
"db:seed:old": "tsx src/../drizzle/seed.ts"
```

If JSON ordering matters, keep scripts grouped near drizzle commands.

**Step 2: Update README quick start**

In `README.md`, update seed instructions to say:
```bash
pnpm --filter api drizzle:push
pnpm --filter api db:seed  # funds testnet accounts, issues USDC/IDR, seeds DEX liquidity, prints env vars
```

Add note:
```md
After `db:seed`, copy `USDC_ISSUER`, `IDR_ISSUER`, `DISTRIBUTOR_SECRET`, and `RECEIVING_ANCHOR_PUBKEY` into `apps/api/.dev.vars` and restart `wrangler dev`.
```

**Step 3: Verify command starts**

Run only if you are okay creating fresh testnet accounts:
```bash
corepack pnpm --filter api db:seed
```
Expected: seed script prints keys and verifies strictSend/strictReceive paths.

If avoiding a new seed run, verify script resolution only:
```bash
corepack pnpm --filter api exec tsx --help
```
and visually confirm package script.

**Step 4: Commit**

```bash
git add apps/api/package.json README.md
git commit -m "chore(api): point db seed command at Stellar liquidity seed"
```

---

## Task 4: Improve Claim Auth UX

**TDD scenario:** Frontend behavior change — typecheck plus manual route verification.

**Files:**
- Modify: `apps/web/src/app/(receiver)/claim/[id]/page.tsx`
- Optional modify: `apps/web/src/lib/api.ts`

**Current problem:** `/claim/:id` calls protected endpoints. If unauthenticated, the UI currently falls into a generic missing/error state rather than guiding the user to login.

**Step 1: Import auth helper and router**

In `claim/[id]/page.tsx`, add:
```tsx
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import { useEffect } from "react";
```

Current file already imports `useState`; change to:
```tsx
import { useEffect, useState } from "react";
```

**Step 2: Redirect unauthenticated users**

Inside component:
```tsx
const router = useRouter();

useEffect(() => {
  if (!getToken()) router.push(`/auth/login?next=/claim/${params.id}`);
}, [router, params.id]);
```

**Step 3: Preserve return-to URL on login**

In `apps/web/src/app/auth/login/page.tsx`, read `next` query param with `useSearchParams()` and route there after successful login:
```tsx
const searchParams = useSearchParams();
const next = searchParams.get("next") ?? "/send";
...
router.push(next);
```

**Step 4: Run web typecheck**

```bash
corepack pnpm --filter web typecheck
```
Expected: PASS.

**Step 5: Manual verification**

Open logged-out:
```txt
http://localhost:3000/claim/<transferId>
```
Expected: redirects to `/auth/login?next=/claim/<transferId>`.

After login, expected: returns to claim page.

**Step 6: Commit**

```bash
git add apps/web/src/app/'(receiver)'/claim/'[id]'/page.tsx apps/web/src/app/auth/login/page.tsx
git commit -m "fix(web): redirect unauthenticated claim users to login"
```

---

## Task 5: Verify Complete MVP Flow After Fixes

**TDD scenario:** Manual integration verification; no automated E2E suite exists.

**Files:**
- No direct file modifications expected.

**Step 1: Start services**

```bash
# terminal 1
cd apps/api
turso dev --db-file local.db

# terminal 2
corepack pnpm --filter api dev

# terminal 3
corepack pnpm --filter web dev
```

**Step 2: Execute browser demo path**

1. Login/register sender.
2. Go to `/send`.
3. Add beneficiary.
4. Get quote.
5. Confirm send.
6. Observe status page with tx hash + Stellar Expert link.
7. Before claiming, status should stop at `SETTLED`.
8. Open recipient view.
9. Receiver logs in if necessary.
10. Choose bank/e-wallet, click claim.
11. Status reaches `COMPLETED`.

**Step 3: Record proof**

Save:
- tx hash,
- Stellar Expert URL,
- quote numbers,
- elapsed time from timeline.

**Step 4: Commit final verification note if needed**

If updating docs:
```bash
git add docs/STATE.md
git commit -m "docs: update verified MVP flow status"
```
