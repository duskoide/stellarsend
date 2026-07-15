# Warkat frontend — handoff briefs

Self-contained briefs for the remaining tasks of the Warkat frontend redesign.
Each is written for an agent (or person) with **zero context**: repo facts,
design intent, global constraints, inherited defects, full code, and a
definition of done. Hand one over as-is.

| Brief | Task | Depends on |
|---|---|---|
| [frontend-8.md](frontend-8.md) | Send screen — pair + slip wired in, amount as hero | Tasks 6, 7 (shipped) |
| [frontend-9.md](frontend-9.md) | Status screen — **proof above the fold** | Task 6 (shipped) |
| [frontend-10.md](frontend-10.md) | Claim screen + the `$0.00001` → `0,00001 XLM` fix | Task 6 (shipped) |
| [frontend-11.md](frontend-11.md) | Full-surface verification — **the gate** | 8, 9, 10 |

Run them in order. Tasks 8–10 are independent of each other in principle, but
they share `Slip`/`Stamp` and all land on the same branch — run one at a time.

## Background

- **Design spec:** [`../specs/2026-07-15-warkat-frontend-design.md`](../specs/2026-07-15-warkat-frontend-design.md)
- **Full plan (Tasks 1–11):** [`../plans/2026-07-15-warkat-foundation.md`](../plans/2026-07-15-warkat-foundation.md)
- **Progress ledger:** `.superpowers/sdd/progress.md` (git-ignored scratch — the
  authoritative record of what shipped, what each review found, and why)
- **Project rules:** [`../../CLAUDE.md`](../../CLAUDE.md)

Tasks 1–7 are done and on `design/warkat-frontend`. `master` currently carries
Tasks 1–2.

## Two things every brief repeats, because they keep biting

1. **`--border` is 1.35:1 and may never outline a control.** Controls use
   `--foreground`. This has already been violated twice.
2. **Green gates prove nothing about pixels.** Nobody has opened this app in a
   browser. Typecheck, 88 tests, and a clean build all pass while a font
   silently falls back or a bar covers content. That is what `frontend-11.md`
   is for.

## Open defects carried in

- **`CurrencyPicker` claims `aria-modal="true"` but neither traps focus nor
  returns it to the trigger.** A fix was started and abandoned. `frontend-8.md`
  owns it.
- Flash of un-navigated content on cold load (pre-existing, from the old NavBar).
- `CustodyChain` on the FAILED path shows real timestamps under hollow
  "pending-style" dots.
- `SlipLine` has no overflow guard for long values.
