# Warkat frontend — Task 10: Claim screen and the fee copy

**Rebuild the recipient's receipt, and fix a units error that is currently on the landing page.**

Depends on: Tasks 6 (Stamp, Slip). Next: `frontend-11.md` (verification).

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

**The fee units fix is not cosmetic.** `app/page.tsx:5` and `CLAUDE.md:16` both state the network fee as **`$0.00001`**. Stellar's base fee is 100 stroops = **0.00001 XLM**, which at XLM ≈ $0.10–0.40 is roughly **$0.000002**. The dollar sign is an XLM quantity in disguise. It *overstates* the fee, so it is conservative rather than a lie — but at a **Stellar** hackathon every judge in the room knows the base fee is 100 stroops. It is a units error in the exact domain the project claims competence in, sitting on the landing page. Fix both files together.

If you add a dollar equivalent, it needs a stated XLM price assumption — otherwise a hardcoded figure goes stale and becomes another thing to defend. Preferring `0,00001 XLM` alone is fine.

**Do not soften the simulated-anchor disclaimer.** `claim/[id]/page.tsx:73` currently says the anchor payout is simulated and the settlement is real. Keep that meaning verbatim. It is the difference between an honest demo and a misleading one, and `CLAUDE.md` is explicit: never fake a passing result. Moving it is fine; weakening the wording is not.

**The claim page has no nav** — `AppShell` treats `/claim/*` as bare, because the recipient is not the account holder in spirit. Do not add a rail or tab bar to it.

**Verify no dollar-denominated fee survives anywhere:**
```bash
grep -rn '\$0\.00001' --include=*.tsx --include=*.ts --include=*.md . | grep -v node_modules | grep -v docs/specs | grep -v docs/handoff
```
Expect no output. (`docs/specs/` and `docs/handoff/` are excluded because they quote the old string in order to explain the error.)

## Your task

## Task 10: Claim screen and the fee copy

**Files:**
- Modify: `apps/web/src/app/(receiver)/claim/[id]/page.tsx`, `apps/web/src/app/page.tsx:5`, `CLAUDE.md:16`

**Interfaces:**
- Consumes: `Stamp`, `Slip`.
- Produces: nothing.

- [ ] **Step 1: Rebuild the claim body**

In `apps/web/src/app/(receiver)/claim/[id]/page.tsx`, replace the `return (...)` block (lines 62–116) with:

```tsx
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col gap-3.5 px-4 py-8">
      <div className="flex items-baseline justify-between border-b-2 border-foreground pb-2">
        <h1 className="font-display text-base font-bold">
          {completed ? "Uang diterima" : "Claim your funds"}
        </h1>
        <span className="font-mono text-[9px] tracking-[0.06em] text-muted-foreground">
          #{params.id.slice(-4).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5 py-4 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
          Money received
        </p>
        <p className="font-mono text-[36px] font-semibold tracking-[-0.035em] tabular-nums">
          {formatCurrency(claim.destAmount, claim.destAsset)}
        </p>
      </div>

      {completed && (
        <div className="grid place-items-center py-1">
          <Stamp text="TERVERIFIKASI" sub="STELLAR TESTNET LEDGER" />
        </div>
      )}

      {failed && <Alert variant="danger">This transfer failed. No funds were disbursed.</Alert>}

      {waiting && (
        <Alert variant="neutral" className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground" />
          </span>
          Waiting for the payment to settle on Stellar…
        </Alert>
      )}

      {inFlight && <Alert variant="neutral">Payout in progress — simulating anchor disbursement…</Alert>}

      {claimable && (
        <>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button className="w-full" loading={submitting} onClick={handlePayout}>
            {submitting ? "Requesting…" : "Claim to bank account"}
          </Button>
        </>
      )}

      {/* Do not soften this. The settlement is real; the payout is not. */}
      <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground">
        The anchor payout step is simulated in this demo. In production a licensed anchor pays out fiat
        after receiving the on-chain transfer. The settlement above is real and on-chain.
      </p>

      {completed && claim.stellarTxHash && (
        <a
          href={stellarExpertTxUrl(claim.stellarTxHash)}
          target="_blank"
          rel="noreferrer"
          className="mt-auto block break-all rounded-md border border-dashed border-border bg-surface px-2 py-1.5 font-mono text-[9px] underline"
        >
          {claim.stellarTxHash} · verify →
        </a>
      )}
    </main>
  );
```

Update imports: add `Stamp`, drop `Card`/`CardTitle` and `formatTxHash`.

- [ ] **Step 2: Fix the fee units on the landing page**

In `apps/web/src/app/page.tsx`, replace line 5:

```ts
  { label: "Network fee", value: "0.00001 XLM", note: "vs. 5–10% wire fees" },
```

> **Why:** Stellar's base fee is 100 stroops = 0.00001 **XLM** — roughly $0.000002, not $0.00001. The dollar sign was an XLM quantity in disguise. It overstated the fee, so it was conservative rather than a lie, but at a *Stellar* hackathon every judge knows the base fee. See spec §11.

- [ ] **Step 3: Fix the same claim in CLAUDE.md**

In `CLAUDE.md`, line 16, replace `Fee ≈ $0.00001` with `Fee ≈ 0.00001 XLM (~$0.000002)`.

- [ ] **Step 4: Verify no dollar-denominated fee survives**

Run:

```bash
grep -rn '\$0\.00001' --include=*.tsx --include=*.ts --include=*.md . | grep -v node_modules | grep -v docs/specs
```

Expected: **no output.** (`docs/specs/` is excluded because §11 quotes the old string in order to explain the error.)

- [ ] **Step 5: Typecheck, test, build**

Run: `pnpm --filter web typecheck && pnpm --filter web test && pnpm --filter web build`
Expected: all pass. The build is the real gate — it catches unused imports the typecheck may allow.

- [ ] **Step 6: Verify the claim flow**

Complete a real transfer through to claim.
- The amount is the largest element; the stamp appears on completion.
- The simulated-anchor disclaimer is present and unsoftened.
- No nav rail or bottom bar (AppShell treats `/claim/*` as bare).
- Both themes readable.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(receiver\)/claim/ apps/web/src/app/page.tsx CLAUDE.md
git commit -m "feat(web): Warkat Claim screen; fee is 0.00001 XLM, not \$0.00001

The base fee is 100 stroops = 0.00001 XLM (~\$0.000002). The dollar sign was an
XLM quantity in disguise — conservative, but wrong, and every judge at a Stellar
hackathon knows the base fee. Simulated-anchor disclaimer kept verbatim."
```

---
