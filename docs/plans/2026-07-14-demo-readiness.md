# Demo Readiness Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Prepare StellarSend for the 5-minute hackathon demo described in `StellarSend-Spec.md`: deployed or local URLs, repeatable setup, demo script, proof artifacts, and final rehearsal.

**Architecture:** Treat the working testnet backbone as the core demo asset. Document a repeatable setup, produce a concise judge-facing demo script, verify deployed/local parity, and record a real transaction hash plus timing metrics.

**Tech Stack:** Next.js 14, Hono/Cloudflare Workers, Wrangler, Turso/libSQL, Stellar testnet/Horizon, Stellar Expert.

---

## Task 1: Write the 5-Minute Demo Script

**TDD scenario:** Documentation task — verify against spec and actual UI flow.

**Files:**
- Create: `docs/demo-script.md`
- Reference: `StellarSend-Spec.md` §9

**Step 1: Create demo script document**

Create `docs/demo-script.md` with this structure:

```md
# StellarSend Demo Script

## Goal
Show that a sender can send 100 USDC and the recipient receives IDR in seconds with a verifiable Stellar transaction hash.

## 0:00–0:30 Problem
TKI / students sending money home lose 5–10% and wait days.

## 0:30–3:30 Live Demo
1. Sender logs in.
2. Sender opens Send page.
3. Sender adds/selects beneficiary.
4. Sender enters 100 USDC.
5. Sender gets live quote.
6. Sender confirms.
7. Status page shows tx hash and timeline.
8. Open Stellar Expert link.
9. Switch to receiver claim page.
10. Receiver claims to bank/e-wallet.
11. Status reaches COMPLETED.

## 3:30–4:30 Why Stellar
- path payments
- SEP anchor standards
- low fees
- 3–5s finality

## 4:30–5:00 Roadmap
- real Indonesian anchor
- KYC/AML
- SG/MY/HK → ID corridors
```

**Step 2: Add exact URLs/placeholders**

Include:
```md
- Local web: http://localhost:3000
- Local API: http://localhost:8787
- Stellar Expert testnet: https://stellar.expert/explorer/testnet/tx/<hash>
```

**Step 3: Add fallback script**

Add a section:
```md
## If live submit fails
Use pre-recorded tx hash: <latest verified hash>
Explain: testnet/friendbot/order-book indexing can be flaky, but the tx is real and verifiable.
```

**Step 4: Commit**

```bash
git add docs/demo-script.md
git commit -m "docs: add hackathon demo script"
```

---

## Task 2: Update README Quick Start to Match Reality

**TDD scenario:** Documentation/setup task — verify commands are accurate.

**Files:**
- Modify: `README.md`
- Reference: `apps/api/package.json`
- Reference: `.env.example`

**Current problem:** README mentions old seed/setup flow in places. After the backbone branch, the real setup requires `seed-stellar.ts`, copying printed vars, and `RECEIVING_ANCHOR_PUBKEY`.

**Step 1: Update prerequisites**

Add Turso CLI explicitly:
```md
- Turso CLI (`turso`) for local libSQL HTTP server: `turso dev --db-file local.db`
```

**Step 2: Update local setup**

Document exact order:
```bash
corepack pnpm install
cp .env.example apps/api/.dev.vars

turso dev --db-file local.db # terminal 1
TURSO_URL=http://127.0.0.1:8080 corepack pnpm --filter api drizzle:push
corepack pnpm --filter api db:seed
# copy printed USDC_ISSUER, IDR_ISSUER, DISTRIBUTOR_SECRET, RECEIVING_ANCHOR_PUBKEY into apps/api/.dev.vars

corepack pnpm --filter api dev # terminal 2
corepack pnpm --filter web dev # terminal 3
```

**Step 3: Add warning about `.dev.vars`**

```md
`apps/api/.dev.vars` is local-only and ignored. Never commit real secrets.
```

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update local setup for real Stellar seed"
```

---

## Task 3: Update STATE.md to Reflect Reality

**TDD scenario:** Documentation correction — compare with verified local run.

**Files:**
- Modify: `docs/STATE.md`

**Current problem:** `STATE.md` top section says the backbone has never touched network, but verified tx hashes exist.

**Step 1: Update current state**

Replace stale "Blocked by" with:
```md
> Nothing code-level for MVP backbone. Full local demo flow verified against Stellar testnet.
```

**Step 2: Update Done checklist**

Mark as done:
```md
- [x] Worker signs + submits a real tx
- [x] Real quote from Horizon strictSendPaths
- [x] Sender flow → on-chain tx hash
- [x] Receiver claim → COMPLETED
```

Keep deployed rehearsal unchecked until actually done:
```md
- [ ] Demo runs 3× clean on deployed URL
```

**Step 3: Add latest verified local run**

Add:
```md
## Latest verified local tx
hash: 97199b2a2483c4c8e8c0f7dbaae144ef43d12a0c678d4aa9abb1ce610998b78c
status: successful
flow: PENDING → FUNDED → SUBMITTED → SETTLED → PAYOUT_PENDING → COMPLETED
```

**Step 4: Commit**

```bash
git add docs/STATE.md
git commit -m "docs: reconcile state with verified testnet run"
```

---

## Task 4: Verify Deploy Readiness

**TDD scenario:** Build/deploy verification — do not claim deployed until commands pass.

**Files:**
- No code changes expected unless commands reveal issues.
- May modify: `apps/api/wrangler.toml`, Cloudflare dashboard/env secrets.

**Step 1: Run typechecks**

```bash
corepack pnpm -r typecheck
```
Expected: all packages pass.

**Step 2: Run web build**

```bash
corepack pnpm --filter web build
```
Expected: Next.js build succeeds.

**Step 3: Run Worker bundle check**

```bash
corepack pnpm --filter api exec wrangler deploy --dry-run
```
Expected: Worker bundles with `nodejs_compat`; no missing env binding type errors.

**Step 4: Confirm production env variables**

Required Worker vars/secrets:
```txt
TURSO_URL
TURSO_AUTH_TOKEN
HORIZON_URL
STELLAR_NETWORK
JWT_SECRET
DISTRIBUTOR_SECRET
USDC_ISSUER
IDR_ISSUER
RECEIVING_ANCHOR_PUBKEY
```

Use:
```bash
wrangler secret put TURSO_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put JWT_SECRET
wrangler secret put DISTRIBUTOR_SECRET
wrangler secret put USDC_ISSUER
wrangler secret put IDR_ISSUER
wrangler secret put RECEIVING_ANCHOR_PUBKEY
```

`HORIZON_URL` and `STELLAR_NETWORK` can remain in `wrangler.toml [vars]`.

**Step 5: Record result**

If all pass, update `docs/STATE.md` or PR comment with:
```md
Deploy readiness verified:
- typecheck: pass
- web build: pass
- worker dry-run: pass
```

---

## Task 5: Run Three Clean Demo Rehearsals

**TDD scenario:** Manual acceptance test against local or deployed env.

**Files:**
- Modify: `docs/demo-script.md` or `docs/STATE.md` with results.

**Step 1: Prepare stable env**

Use either deployed env or local env. Confirm:
```bash
curl http://localhost:8787/health
```
Expected:
```json
{"ok":true}
```

**Step 2: Rehearsal checklist**

Run the demo 3 times:

```md
## Rehearsal 1
- sender login/register: pass/fail
- beneficiary create/select: pass/fail
- quote: pass/fail
- submit tx hash: <hash>
- Stellar Expert opens: pass/fail
- receiver claim: pass/fail
- final status COMPLETED: pass/fail
- elapsed time: <seconds>
- notes: ...
```

Repeat for rehearsal 2 and 3.

**Step 3: Pick final demo tx hash**

Choose one recent successful tx as fallback proof.

**Step 4: Commit rehearsal notes**

```bash
git add docs/demo-script.md docs/STATE.md
git commit -m "docs: record demo rehearsal results"
```

---

## Task 6: Clean Up Local Secret Tracking

**TDD scenario:** Repo hygiene task — verify with git commands.

**Files:**
- Git index only; `.gitignore` already contains `.dev.vars`.

**Step 1: Verify `.dev.vars` is ignored**

```bash
git check-ignore -v apps/api/.dev.vars
```
Expected: prints `.gitignore` match.

**Step 2: Verify it is not tracked**

```bash
git ls-files apps/api/.dev.vars
```
Expected: no output.

**Step 3: If still tracked, untrack**

```bash
git rm --cached apps/api/.dev.vars
git commit -m "chore: stop tracking .dev.vars"
```

**Step 4: Verify status**

```bash
git status --short
```
Expected: no `.dev.vars` output.
