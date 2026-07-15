# Warkat frontend — Task 9: Status screen

**Move the on-chain proof above the fold. This is the single most important screen in the app.**

Depends on: Tasks 6 (Stamp, CustodyChain). Next: `frontend-10.md` (Claim).

> **Handoff brief — self-contained.** You are picking this up cold. Everything you need is here or linked. Read it start to finish before touching code.

## The project in one paragraph

**StellarSend** is cross-border remittance on Stellar: fiat in → **Stellar path payment** (bridged via native XLM) → IDR out → local anchor payout. It is a hackathon entry (APAC Stellar Hackathon 2026, Track 1). The demo must produce a **real, verifiable testnet transaction hash** that opens on Stellar Expert — that contrast (fee of 0.00001 XLM, ~5s settle, versus Western Union's 5–10% and 2 days) *is* the pitch. Anchors are mocked by design; the on-chain settlement is real.

You are working on **Warkat**, a frontend redesign that treats a transfer as a **document of record** — a paper receipt — with the on-chain proof as its **validation stamp**. It is a **mobile-first web app**: the phone is the primary layout, and desktop is a real layout rather than a stretched phone.

- **Design spec:** `docs/specs/2026-07-15-warkat-frontend-design.md` — read §3 (tokens), §4 (colour), §5 (night theme), §7 (screens).
- **Full plan:** `docs/plans/2026-07-15-warkat-foundation.md`
- **Project rules:** `CLAUDE.md` — read it, it overrides your defaults.

## Repo facts

- Root `/home/pn/Projects/stellarhackathon`. pnpm workspaces; web app at `apps/web` (Next.js 14 App Router, edge runtime, Tailwind 3.4).
- **Branch `design/warkat-frontend`. Stay on it.** Do **not** checkout, merge, push, stash, rebase, or reset. A previous agent pushed to a public remote and moved the default branch without authorisation — do not repeat that. If you think something should be merged or pushed, say so; do not do it.
- **A human is actively editing this same working directory.** Stage narrowly — `git add <specific paths>`, **never `git add -A` or `git add .`**. Commit promptly. If `git status` shows changes you did not make (e.g. `README.md`), leave them alone.
- **Do not modify** `apps/web/src/app/globals.css` or `apps/web/tests/tokens.test.ts` unless your task explicitly says to.
- Test runner is Vitest (`pnpm --filter web test`). There were **no tests in this repo before this project**; the 88 that exist assert design-token contrast and CSS cascade resolution.

## Global constraints — these bind every task

Copied from the plan. Violating one is a defect even if your task's text does not repeat it.

1. **Money is `string`, 7 decimals, always.** Never a float, never `number` math (`CLAUDE.md`).
2. **Never fabricate a tx hash, quote, rate, or elapsed time.** If a value is absent, the UI shows absence. A fake demo is worse than a broken one.
3. **Every control's visible border is `--foreground`, never `--border`.** `--border` is **1.35:1** and fails WCAG 1.4.11's 3:1 for the visible boundary of an interactive element. It may separate and group non-interactive containers (Card, Slip, rails); it may never outline a button, input, select, or textarea. *This is the single most likely rule to break by accident.*
4. **`--radius` is `2px` globally.** Paper is cut, not rounded. The only exception is the swap button (50%).
5. **Every figure carries `tabular-nums`.**
6. **Red (`--stamp` / `--danger`) appears only on validation stamps and genuine alerts** — never navigation, never links. Nav and links are ink. The stamp's meaning is carried by its **text** (`SETTLED` / `TERVERIFIKASI` / `GAGAL`), not its hue — that is how "never colour alone" is satisfied.
7. **Touch targets ≥44px** (WCAG 2.5.8), with the visual inset *inside* the target where the visual is smaller.
8. **No Tailwind `dark:` utilities.** `tailwind.config.ts` has **no `darkMode` setting**, so a `dark:` class silently does nothing. Theme differences live entirely in tokens (e.g. `--slip-shadow` is a real shadow in light and `none` in night). Do not add `darkMode` config.
9. **Do not soften the simulated-anchor disclaimer** on the claim page.

## Already shipped (do not rebuild)

`globals.css` tokens (light + night, four theme blocks) · `tests/tokens.test.ts` (88 tests) · fonts (Inter / Source Serif 4 / Geist Mono — the last from Vercel's `geist` package, **not** `next/font/google`, where it does not exist on Next 14.2.35) · UI primitives (`Button`, `Card`, `Alert`, `Input`) · `AppShell` (bottom bar <768px, left rail ≥768px) · `ThemeToggle` + `/account` · `Slip` / `Stamp` / `CustodyChain` · `CurrencyPair` / `CurrencyPicker`.

## Known open defects you are inheriting

- **`CurrencyPicker` focus management is incomplete.** It declares `role="dialog" aria-modal="true"` but (a) never returns focus to the trigger on close, and (b) does not trap Tab within the sheet. `aria-modal` tells assistive tech the rest of the page is inert; it is not. A fix was started and abandoned. **See `frontend-8.md` — whoever wires the picker owns this.**
- **Flash of un-navigated content on cold load** (`AppShell`): `token` starts `null`, so an authenticated route paints once without nav, then the nav pops in. Pre-existing (inherited from the old `NavBar`), no hydration mismatch, but a real layout jump. Follow-up, not a blocker.
- **`CustodyChain` on the FAILED path**: steps that *did* happen still show real timestamps under hollow "pending-style" dots, so a step that happened looks like one that did not. `TRANSFER_STEPS` omits `FAILED`/`REFUNDED` by design. Task 9 renders failure separately — make sure the two read coherently.
- **`SlipLine` has no overflow guard** (no `truncate` / `min-w-0`), so a long label or value could wrap mid-number. Dormant until real amounts land.
- **Browser rendering is unverified for everything so far.** No agent in this project has had a browser. Typecheck + 88 tests + build all pass, but nobody has *seen* the app. Task 11 exists for this.

## How to work

- **TDD where there is a real invariant to test**; do not stage TDD theatre. A visual redesign is verified by looking at it. If you cannot write a test that can actually fail, do not write one.
- **Report VERIFIED vs ASSUMED explicitly.** If you cannot run a browser, say the visual step is unverified — do not claim it passed. `CLAUDE.md` requires this.
- **If a step in this brief is wrong, say so — do not guess and do not silently patch.** The last agent found a real contradiction in its own brief and flagged it; that was correct and it saved a broken control from shipping.

---


## Task-specific warnings — read before you start

**This screen is why the project exists.** Today the tx hash is the *second* card and the timeline the *third* — below the fold on a phone. That hash is the one artifact that wins the room; a judge verifies it live on Stellar Expert. **Above the fold at 375px, in full.** Do not truncate it: `formatTxHash` is deliberately dropped here, because shortening the one thing a judge wants to read is the wrong trade on a proof panel.

**Never fabricate elapsed time.** The existing computation at `status/[id]/page.tsx:23` is correct — first event to `COMPLETED`. If either event is missing there is no elapsed time, and the stamp does not claim one. Do not interpolate, estimate, or fall back to "a few seconds".

**`CustodyChain` and the FAILED path — check these read coherently.** `TRANSFER_STEPS` (`packages/shared/src/constants.ts:45`) omits `FAILED` and `REFUNDED`, so `indexOf(status)` returns `-1` and every step renders hollow. That is intended: a failed transfer has no custody chain. **But** steps that genuinely happened before the failure still show real timestamps under hollow "pending-style" dots — a step that happened looks like one that did not. You render failure separately; make sure a user reading both cannot be misled about what actually occurred on chain.

**`CustodyChain` trusts the API's ordering.** It builds `new Map(events.map(e => [e.status, e]))`, so the *last* event per status wins. `apps/api/src/routes/transfer.ts:274-276` orders by `createdAt` ascending, which makes that correct today — but it is an unenforced contract. Do not add a second caller with unsorted data without re-sorting.

**Delete `TxStatusStepper.tsx`** — this task removes its last import. Verify with a grep before deleting; a stale import fails the typecheck, which is your signal.

## Your task

## Task 9: Status screen

**Files:**
- Modify: `apps/web/src/app/(sender)/status/[id]/page.tsx`

**Interfaces:**
- Consumes: `Stamp`, `CustodyChain`, `Slip`/`SlipLine`.
- Produces: nothing downstream.

> **The single most important change in this plan: the proof moves above the fold.** Today the hash is the second card and the timeline the third — below the fold on a phone. That hash is what wins the room.

- [ ] **Step 1: Rebuild the page body**

Replace the `return (...)` block of `apps/web/src/app/(sender)/status/[id]/page.tsx` (lines 31–102) with:

```tsx
  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-3.5 px-4 py-6 md:max-w-[800px] md:flex-row md:items-start md:gap-6 md:py-10">
      <main className="flex w-full flex-col gap-3.5 md:max-w-[460px]">
        <div className="flex items-baseline justify-between border-b-2 border-foreground pb-2">
          <h1 className="font-display text-base font-bold">Transfer record</h1>
          <span className="font-mono text-[9px] tracking-[0.06em] text-muted-foreground">
            #{transfer.id.slice(-4).toUpperCase()}
          </span>
        </div>

        <div className="flex items-start justify-between gap-2.5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
              {done ? "Delivered" : "Sending"}
            </p>
            <p className="font-mono text-[25px] font-semibold tracking-[-0.03em] tabular-nums">
              {formatCurrency(transfer.destAmount, transfer.destAsset)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              from {formatCurrency(transfer.sourceAmount, transfer.sourceAsset)}
            </p>
          </div>
          {/* Elapsed only exists once we have both events. No events, no claim. */}
          {done && elapsed && <Stamp text="SETTLED" sub={`ON-CHAIN · ${elapsed}`} />}
        </div>

        {/* THE PROOF. Above the fold. A judge verifies this live. */}
        {transfer.stellarTxHash && (
          <div className="flex flex-col gap-1.5 rounded-md border border-foreground bg-surface p-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
              Stellar transaction hash
            </p>
            <p className="break-all rounded-md border border-dashed border-border bg-background px-1.5 py-1.5 font-mono text-[10px] leading-relaxed">
              {transfer.stellarTxHash}
            </p>
            <a
              href={stellarExpertTxUrl(transfer.stellarTxHash)}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold underline"
            >
              Verify on Stellar Expert →
            </a>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Slip>
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Route</p>
            <p className="pt-0.5 font-mono text-[13px] font-medium">
              {transfer.sourceAsset} → XLM → {transfer.destAsset}
            </p>
          </Slip>
          <Slip>
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Rate</p>
            <p className="pt-0.5 font-mono text-[13px] font-medium tabular-nums">{transfer.exchangeRate}</p>
          </Slip>
        </div>

        {!done && (
          <a
            href={`/claim/${transfer.id}`}
            className="min-h-11 rounded-md border border-foreground px-4 py-3 text-center text-sm font-semibold"
          >
            Open recipient&apos;s view →
          </a>
        )}
      </main>

      {/* Desktop earns a second column: the whole chain at once, not scrolled. */}
      <aside className="flex w-full flex-col gap-2 rounded-md border border-border bg-surface p-4 shadow-[var(--slip-shadow)] md:w-[300px] md:shrink-0">
        <div className="flex items-baseline justify-between border-b-2 border-foreground pb-2">
          <h2 className="font-display text-sm font-bold">Chain of custody</h2>
          <span className="font-mono text-[9px] text-muted-foreground">{events.length} EVENTS</span>
        </div>
        <CustodyChain status={transfer.status} events={events} />
      </aside>
    </div>
  );
```

Update imports at the top of the file:

```ts
import { Stamp } from "@/components/Stamp";
import { CustodyChain } from "@/components/CustodyChain";
import { Slip } from "@/components/Slip";
import { formatCurrency, stellarExpertTxUrl } from "@/lib/format";
```

Remove the now-unused `TxStatusStepper`, `Card`, `CardTitle`, `Badge`, `formatFee`, and `formatTxHash` imports.

> `formatTxHash` is dropped on purpose: the full hash now renders. Truncating the one artifact a judge wants to read is the wrong trade on a proof panel.

- [ ] **Step 2: Delete the old stepper**

```bash
rm apps/web/src/components/TxStatusStepper.tsx
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors. A failure means a stale import survives.

- [ ] **Step 4: Verify with a real transfer**

Complete a real send (Task 8's flow) and land on `/status/<id>`.
- On a 375px viewport **without scrolling**: the delivered amount, the stamp, and the full tx hash are all visible.
- The Stellar Expert link opens the real transaction.
- The custody chain shows only steps that have real events; the rest are hollow.
- At 1200px: two columns.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(sender\)/status/ apps/web/src/components/
git commit -m "feat(web): Warkat Status screen — proof above the fold

The tx hash was the second card and the timeline the third: below the fold on
a phone. It is now visible without scrolling at 375px, in full. Desktop earns
a second column for the custody chain."
```

---
