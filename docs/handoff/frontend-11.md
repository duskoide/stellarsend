# Warkat frontend — Task 11: Full-surface verification

**The gate. Nobody has seen this app in a browser yet.**

Depends on: everything. This is the last task before the branch is finishable.

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

**You are the first person or agent in this entire project to open the app in a browser.** Every task so far passed typecheck, 88 tests, and a clean build — and none of that proves a single pixel renders correctly. Silent font fallback, a broken theme toggle, a bar overlapping content, an unreadable stamp: all of these build perfectly green. **Your job is to actually look.**

Treat "typecheck + tests + build pass" as necessary and **not** sufficient. If you cannot run a browser either, **say so plainly and mark the branch as visually unverified** rather than signing it off — that is a legitimate, useful outcome. Do not claim a visual check you did not perform; `CLAUDE.md` requires separating VERIFIED from ASSUMED.

**The highest-risk items, in order:**

1. **Theme toggle, all three states.** Set the OS to **dark**, then choose **Light** in the toggle. The page must turn light *despite the dark OS*. That is the case `:root[data-theme="light"]` exists for — it wins on specificity (0,2,0) over the media query's `:root` (0,1,0). If it stays dark, that block is missing or losing.
2. **No flash on reload.** Choose Light, hard-reload. Any dark flash means the inline `<head>` script is missing, misplaced, or after the stylesheet.
3. **Bottom bar on a REAL phone.** The bar reserves `pb-[calc(3.25rem+env(safe-area-inset-bottom))]`. `env()` resolves to **0 in a narrow desktop window** and to ~34px on a notched iPhone — so a desktop check proves nothing here. If it feels wrong in the hand, the fallback is a top bar at every breakpoint; say so rather than shipping something awkward.
4. **Keyboard through Send, end to end**, including both currency buttons and the swap. **The picker's focus trap and focus-return were an open defect** — confirm whoever wired it actually fixed it, or that it fell back to a native `<select>`. A control that strands a keyboard user must not ship.
5. **Both themes, every screen**, and the stamp legible on both grounds.

**Known gaps to confirm, not to fix here:** flash of un-navigated content on cold load (pre-existing); `CustodyChain` showing real timestamps under hollow dots on the FAILED path.

## Your task

## Task 11: Full-surface verification

**Files:** none — this task changes nothing. It is the gate.

- [ ] **Step 1: Run the full check**

```bash
pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web build
```

Expected: all green.

- [ ] **Step 2: Walk the QA checklist**

Open `docs/specs/2026-07-15-warkat-frontend-design.md` §14 and walk every item that this plan covers. The currency/asset items (`FIAT_ASSET_CODES` defined once, issuer map, THIN BOOK, seed order books, demo corridor) belong to plan 2 — skip those.

Pay particular attention to the ones most likely to be silently wrong:

```bash
# No control may be bordered with --border. Every hit needs an eyeball:
# is this element interactive? If yes, it must be border-foreground.
grep -rn 'border-border' apps/web/src --include=*.tsx
```

- [ ] **Step 3: Real-device check on the bottom bar**

Serve on your LAN (`pnpm --filter web dev -- -H 0.0.0.0`) and open the app **on an actual phone**.

Expected: the bottom bar clears the home indicator and does not fight the browser toolbar as it hides and shows. **This cannot be verified in a narrow desktop window** — the viewport resize behaviour only happens on a real mobile browser. If it feels wrong in the hand, the fallback is a top bar at every breakpoint; say so rather than shipping something awkward.

- [ ] **Step 4: Both themes, every screen, both ways of choosing**

Walk `/`, `/auth/login`, `/send`, `/status/<id>`, `/claim/<id>` in light and dark — **once by changing the OS theme, and once by using the toggle**, since those are two different code paths (media query vs `data-theme`) and the test only proves the token values match, not that the app renders them.

Expected: no unreadable text, no flash on reload, the stamp legible on both grounds, and the slip visibly lifted from the desk in both (shadow in light, border in night).

**Record the known gap:** the toggle is desktop-only. A mobile user follows their OS with no override, because the toggle lives in the rail and there is no account screen. Report it; do not fix it by adding a fourth tab.

- [ ] **Step 5: Keyboard-only pass**

Tab through `/send` end to end.
Expected: a visible focus ring on every control including both pair buttons and the swap; the picker opens, Escape closes it, focus returns to the trigger; no trap.

> If the picker cannot meet this, **swap it for a native `<select>`** styled to match (spec §10). A pretty control that traps a keyboard user is worse than a plain one. This is a real decision point, not a formality.

- [ ] **Step 6: Commit any fixes and report**

Report what you verified versus what you assumed, per `CLAUDE.md`'s working agreement. Name anything you could not check.

---

## Self-Review

**Spec coverage.** §3 tokens → Task 1. §3 type scale → Task 2. §4 colour semantics → Tasks 1, 3, 4 (nav is ink), 6 (Stamp). §5 night theme → Tasks 1, 5. §6 layout → Tasks 4, 8, 9. §7.1 Send → Task 8. §7.2 Status → Task 9. §7.3 Claim → Task 10. §7.4 (landing/auth/history inherit) → Tasks 1–3. §10 a11y → Tasks 4, 5, 7, 11. §11 fee → Tasks 8, 10. §12 tone → Tasks 8–10. §14 QA → Task 11.

**Deferred to plan 2 (currency expansion), by design:** §8 (11 assets, picker options, THIN BOOK), §9 (`Beneficiary.currency`, mismatch validation, recipient filtering), and the §14 items covering those. `CurrencyPicker` (Task 7) takes `options` as a prop and shows search at ≥8, so it absorbs the widening without modification.

**Known gap, deliberate.** The theme toggle is desktop-only — it lives in the rail, and there is no account screen to host it on mobile (Task 5, recorded in Task 11). Also, the recipient block on Send keeps its current markup in this plan: the "can receive IDR" filter note needs `Beneficiary.currency`, which does not exist yet. It arrives in plan 2.

**Type consistency.** `FiatAssetCode` is used identically in Tasks 7 and 8. `CurrencyPicker` props (`open`/`title`/`options`/`value`/`onSelect`/`onClose`) match `CurrencyPair`'s two call sites. `CustodyChain({status, events})` matches Task 9's call. `Slip`/`SlipLine` signatures match Tasks 8–10. `Stamp({text, sub})` matches Tasks 9 and 10. `ThemeToggle` (Task 5) is consumed only by `AppShell` (Task 4). Button/Alert/Card prop APIs are explicitly unchanged, so existing callers keep compiling.
