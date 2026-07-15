# Warkat frontend — Task 8: Send screen

**Wire the currency pair and the receipt slip into the Send page, and make the amount the hero.**

Depends on: Tasks 6 (Slip) + 7 (CurrencyPair). Next: `frontend-9.md` (Status).

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

**You own the `CurrencyPicker` focus bug.** You are the first task to give the picker a real caller, so its accessibility becomes live here. As shipped it declares `role="dialog" aria-modal="true"` but:
- never returns focus to the trigger on close (Escape, selection, or click-outside → focus lands on `<body>`, keyboard user loses their place)
- does not trap Tab inside the sheet, so Tab walks out into the page behind it, which is still fully interactive

`aria-modal="true"` is a promise to assistive tech that the rest of the page is inert. Right now it is a lie. **Fix both** (a ref per trigger in `CurrencyPair` + focus return after unmount; a dependency-free Tab wrap in `CurrencyPicker`), or — per the design spec §10 — **fall back to a native `<select>` styled to match**. A pretty control that strands a keyboard user is worse than a plain one. Do not ship it as-is and do not quietly drop the `aria-modal` attribute to make the problem disappear.

**Preserve the existing quote logic exactly.** `send/page.tsx:135` runs create → fund → submit as **one action** behind one button, deliberately: quotes expire in 60 seconds and splitting the steps invites a pause long enough to invalidate the rate. Keep `STEP_LABEL`, keep the stale-quote error message (`:156`), keep the beneficiary loading. **This task changes presentation only.**

**The fee numbers are real and already verified.** `quote.ts:32` sets `FEE_RATE = 0.00005` (0.005%). On ₫2.500.000 the fee is **₫125** — not ₫2.500. Fee comes off the top and only the remainder is routed (`quote.ts:58`). The network fee renders as **`0,00001 XLM`**, never `$0.00001` — see `frontend-10.md`, that is an XLM quantity, not dollars.

**`SlipLine` has no overflow guard.** You are the first task to put real amounts in it. If a long value wraps mid-number, add `min-w-0` / `truncate` — a wrapped amount on a receipt is a correctness problem, not a cosmetic one.

**Delete `QuoteCard.tsx`.** This task removes its only caller (`send/page.tsx:329`); leaving it is dead code.

## Your task

## Task 8: Send screen

**Files:**
- Modify: `apps/web/src/app/(sender)/send/page.tsx`

**Interfaces:**
- Consumes: `CurrencyPair` (Task 7), `Slip`/`SlipLine` (Task 6), tokens (Task 1).
- Produces: nothing downstream.

> **Preserve the existing logic exactly.** The one-action create→fund→submit (`send/page.tsx:135`) exists because quotes expire in 60s; the comment there is correct. Keep `STEP_LABEL`, the stale-quote message at `:156`, and the beneficiary loading. **This task changes presentation only.**

- [ ] **Step 1: Replace the currency selects with the pair**

In `apps/web/src/app/(sender)/send/page.tsx`, delete the `<div className="grid grid-cols-2 gap-3">` block containing the two `<select>` elements (lines 178–207) and put in its place:

```tsx
        <CurrencyPair
          source={sourceAsset}
          dest={destAsset}
          options={FIAT_ASSET_CODES}
          onSourceChange={handleSourceAssetChange}
          onDestChange={handleDestAssetChange}
          onSwap={() => {
            const [s, d] = [destAsset, sourceAsset];
            setSourceAsset(s);
            setDestAsset(d);
            quote.reset();
          }}
        />
```

Add the import:

```ts
import { CurrencyPair } from "@/components/CurrencyPair";
```

- [ ] **Step 2: Make the amount the hero**

Replace the `<AmountInput ... />` usage with a hero field. In `apps/web/src/components/AmountInput.tsx`, replace the input's className so the figure is the subject of the screen, and render the currency as a **unit, not a control**:

```tsx
      <div className="flex items-baseline gap-2 border-b border-border pb-2.5">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent font-mono text-[33px] font-medium tracking-[-0.03em] tabular-nums text-foreground outline-none"
        />
        {/* A unit label. The pair below owns currency selection. */}
        <span className="ml-auto shrink-0 font-mono text-[13px] font-medium text-muted-foreground">
          {assetCode}
        </span>
      </div>
```

- [ ] **Step 3: Rebuild the quote as a slip**

Replace the `<QuoteCard quote={quote.data} />` usage with:

```tsx
          <Slip>
            <SlipLine label="Rate" value={`1 ${sourceAsset} = ${quote.data.exchangeRate} ${destAsset}`} />
            <SlipLine label="Our fee (0,005%)" value={formatFee(quote.data.feeAmount, sourceAsset)} />
            {/* 100 stroops = 0.00001 XLM. NOT dollars — see spec §11. */}
            <SlipLine label="Network fee" value="0,00001 XLM" />
            <SlipLine
              label="They receive"
              value={formatCurrency(quote.data.destAmount, destAsset)}
              total
            />
          </Slip>
```

Add imports:

```ts
import { Slip, SlipLine } from "@/components/Slip";
import { formatCurrency, formatFee } from "@/lib/format";
```

`QuoteCard` now has no callers — delete it rather than leaving a dead component:

```bash
rm apps/web/src/components/QuoteCard.tsx
```

Remove its import from `send/page.tsx` too.

- [ ] **Step 4: Constrain the page for the desk**

Change the `<main>` className (line 167) from `mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-12` to:

```tsx
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-3.5 px-4 py-6 md:py-10">
```

> Desktop Send stays a single narrow column on purpose (spec §6). Six fields spread across 1040px is harder to scan, not easier.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 6: Verify the real flow end to end**

Run the API locally (`turso dev --db-file local.db` in one shell, `pnpm --filter api dev` in another), then `pnpm --filter web dev`.

- Log in, open `/send`.
- Amount is the largest thing on screen; its currency has **no chevron**.
- Tap `From` → picker opens; no search field (3 options, below the threshold).
- Tap swap → currencies reverse and the quote resets.
- Get a real quote. The slip shows a real rate, a real fee, `0,00001 XLM`, and a real destination amount. **If any value is absent, it must show absence — never a placeholder.**
- At 375px and 1200px the column stays ≤460px.

- [ ] **Step 7: Commit**

```bash
git add -A apps/web/src/app/\(sender\)/send/ apps/web/src/components/
git commit -m "feat(web): Warkat Send screen

Amount becomes the hero; the two native selects become one pair control with
a swap. Network fee reads 0,00001 XLM — it is an XLM quantity, never dollars.
Quote/submit logic is unchanged: create->fund->submit stays one action because
quotes expire in 60s."
```

---
