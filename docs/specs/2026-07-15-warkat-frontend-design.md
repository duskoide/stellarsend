# Warkat — Frontend Design Spec

**Date:** 2026-07-15 · **Status:** awaiting review · **Scope:** `apps/web`, plus one breaking change to `packages/shared`

> Design direction chosen from three rival mockups. Mockup:
> https://claude.ai/code/artifact/ce02db41-5625-440a-8206-56a0c0d29151
> (three-direction comparison: https://claude.ai/code/artifact/8df3e889-5ce4-4441-bdde-3d18b29ceec6)

---

## 1. Context and goals

The app works end-to-end and every screen exists. The problem is not function, it's that the UI is
**mobile-tolerant, not mobile-first**: a desktop layout in a `max-w-md` column. Symptoms in the current code:

- `NavBar.tsx` puts navigation at the top of a phone screen, out of thumb reach, with logout as a text link
  sitting beside primary destinations.
- `send/page.tsx:181` and `:196` use two stacked native `<select>` elements for the currency pair, which hides
  the any→any path-payment architecture that is the entire pitch.
- The amount is one form field among six, rather than the subject of the screen.
- `status/[id]/page.tsx` puts the tx hash in the second card and the timeline in the third — below the fold on a
  phone. That hash is the one artifact that wins the room.

**Goal:** a mobile-first *web app* (phone is the primary layout; desktop is a real layout, not a stretched phone)
built on a visual direction that makes the transfer read as a **document of record**, with the on-chain proof as
its validation stamp.

**Audience:** hackathon judges first. It must also not contain affordances a judge would catch as fake.

**Non-goal:** this spec does not change Stellar logic, the API surface beyond one validation fix, or the
mocked-anchor design.

---

## 2. Decisions locked in this round

| Decision | Choice | Why |
|---|---|---|
| Direction | **A · Warkat** (receipt / document of record) | Chosen by user over Laju (velocity) and Bukti (proof-terminal). |
| Design system | Corporate typeui.sh system is a **starting point**, may diverge | Enterprise blue-on-white isn't right for a remittance product; the token *structure* and a11y work survive, values change. |
| Body/UI face | **Inter** | User request. |
| Display face | **Source Serif 4** | Complements Inter; carries the document register Inter deliberately lacks. |
| Figure face | **Geist Mono** | Replaces IBM Plex Mono. Grotesk skeleton reads as Inter's sibling; true tabular figures. |
| Platform | **Mobile-first web app** | User correction. Bottom bar <768px, left rail ≥768px. |
| Dest currency | **User picks; recipient list filters to match** | See §7. |
| Mismatch bug | **Reject at transfer creation** | See §7. |
| Dark mode | **Out of scope for MVP**, documented gap | See §10. |

---

## 3. Design tokens and foundations

Ported into `apps/web/src/app/globals.css`, replacing the values but **keeping the existing structure** —
the `:focus-visible` ring, `prefers-reduced-motion`, and `prefers-contrast: more` blocks stay as written.

```css
:root {
  --background: 77 14% 90%;         /* #E8EAE3  paper */
  --surface: 72 20% 95%;            /* #F4F5F0  card */
  --foreground: 176 19% 14%;        /* #1D2B2A  ink */
  --muted-foreground: 167 7% 39%;   /* #5D6B68 */
  --border: 90 11% 78%;             /* #C6CCC0  rule — DECORATIVE ONLY, see below */
  --stamp: 2 70% 41%;               /* #B3241F  validation ink */
  --success: 144 39% 30%;           /* #2F6B47 */
  --warning: 39 100% 27%;           /* #8A5A00 */
  --radius: 2px;                    /* paper is cut, not rounded */
}
```

These HSL triples are machine-converted from the hex values, not eyeballed — copy them verbatim. `--danger`
and `--secondary` from the current file are **removed**: `--stamp` covers alerts (§4), and the corporate
violet accent has no role in a paper document. `--primary` is also removed — the primary action is ink, so
buttons use `--foreground` and there is no separate primary hue to drift out of sync.

**Contrast, measured (not assumed).** Against paper `#E8EAE3` / card `#F4F5F0`:

| Token | Paper | Card | Verdict |
|---|---|---|---|
| ink `#1D2B2A` | 12.09 | 13.39 | AA text |
| muted `#5D6B68` | 4.59 | 5.09 | AA text |
| stamp `#B3241F` | 5.43 | 6.01 | AA text |
| success `#2F6B47` | 5.22 | 5.78 | AA text |
| warning `#8A5A00` | 4.89 | 5.41 | AA text |
| rule `#C6CCC0` | 1.35 | 1.50 | **fails 1.4.11** |

**Rule (`--border`) is decorative only.** At 1.35:1 it cannot carry a control boundary under WCAG 1.4.11
(3:1 required). It may separate and group; it may never be the visible edge of an interactive element.
**Every control — buttons, currency selectors, inputs — outlines in `--foreground` (12.09:1).** This is a
hard rule, and the most likely thing to be broken by accident during implementation.

**Radius is 2px, globally.** The current system's `0.5rem` reads as software. Paper is cut, not rounded. The
one exception is the 50% swap button, which is a physical control on the slip, not a card.

**Type scale** (Source Serif 4 display / Inter body / Geist Mono figures):

| Role | Face | Size · weight |
|---|---|---|
| Amount hero (mobile / desktop) | Geist Mono | 33px / 40px · 500, `tabular-nums`, `-0.03em` |
| Document title | Source Serif 4 | 16px mobile / 19px desktop · 700 |
| Delivered amount | Geist Mono | 25px mobile / 32px desktop · 600 |
| Body / labels | Inter | 12.5–14px · 400/600 |
| Eyebrow (`.lbl`) | Geist Mono | 9px · uppercase, `0.13em` |
| Slip figures | Geist Mono | 12.5px · 500, `tabular-nums` |

All three load via `next/font/google` in `layout.tsx`, exactly as the current three do. `--font-sans` → Inter,
`--font-display` → Source Serif 4, `--font-mono` → Geist Mono. The `tailwind.config.ts` `fontFamily` block needs
no change; only the imports in `layout.tsx` change.

**Every figure gets `font-variant-numeric: tabular-nums`.** Amounts are compared down a column; digits must not
dance. This also matters for the polling status screen, where a changing timestamp must not reflow the row.

---

## 4. Colour semantics — a conflict, resolved

The mockup has a collision the spec corrects. In it, red is simultaneously **brand** (active nav, links,
"Change") and **the validation stamp** and **the error state** (the blocked-recipient panel). When red is
everywhere, a red error cannot stand out — the colour stops carrying meaning.

**Resolution: red becomes rare.**

- **`--stamp` (red)** — validation stamps and genuine alerts, *only*. Never navigation, never links.
- **The stamp's meaning is carried by its text, not its hue.** `SETTLED`, `TERVERIFIKASI`, `GAGAL` all stamp in
  the same official red; the word disambiguates. This satisfies "never colour alone" by construction rather
  than by bolting on an icon.
- **`--success` (green)** — completed steps in the chain of custody, and the "can receive IDR" filter note.
  Progress, not decoration.
- **`--warning` (amber)** — blocked states that are not errors: no recipient for the chosen currency, quote
  about to expire. The blocked-recipient panel moves from red to amber.
- **Navigation and links use ink.** Active nav = ink + weight + a 2px ink rule. Links = ink + underline.

**Consequence:** the mockup renders active nav, tab bar, "Verify on Stellar Expert →", and "Change" in red.
All become ink. This is a real visual change from the approved mockup — flagged for review, not slipped in.
The stamp keeps its red, which is the only place the boldness is spent.

---

## 5. Layout and responsive structure

One real breakpoint at **768px**, one refinement at **1180px**.

**< 768px — the primary case.** Single column, 375px reference. Bottom tab bar: Send · History · Account.
Logout moves under Account and stops competing with navigation. The bar needs
`padding-bottom: env(safe-area-inset-bottom)`.

**≥ 768px — the desk.** Bottom bar → left rail (210px): brand, three destinations, account at the foot.
The slip lies on a desk surface (a soft radial paper gradient) with a real drop shadow — it is a physical
object, and that is what makes a narrow document read as deliberate rather than unfinished.

**Desktop Send stays a single 460px column.** The temptation at 1040px is two columns; there are six fields,
and spreading them sideways makes the form harder to scan, not easier.

**≥ 1180px — Status earns a second column** (300px) for the chain of custody. This is the one screen where the
extra width does real work: the full event log is visible at once instead of scrolled.

Nothing is hidden on mobile. The custody chain appears on both; it stacks below the proof on a phone.

---

## 6. Screens

### 6.1 Send — the slip

Order, top to bottom: masthead → **amount hero** → currency pair → quote slip → recipient → CTA.

- **Amount is the subject of the screen**, not a field. Geist Mono, 33px mobile.
- **The currency next to the amount is a unit label, not a control** (`--muted-foreground`, no chevron).
  This is the fix for §7's design bug: the pair below is the only place currencies are chosen.
- **The pair is one control**: `From [VND ▾] ⇄ [IDR ▾] To`. Both sides are real buttons with visible chevrons
  and ink borders. The swap button reverses the corridor in one tap. Caption: `ROUTED VIA XLM · ANY PAIR` —
  this is where the path-payment architecture becomes visible to a judge.
- **Quote slip**: rate, our fee, network fee, then `They receive` on a dashed rule as the total. Reads as a
  till receipt.
- **Recipient block** shows the filter it is under: `▾ CAN RECEIVE IDR` in success green.
- **Empty state is designed** (§7): when no recipient matches the chosen destination, the panel says why in
  plain language, offers "Add a {CUR} recipient", and the CTA disables with `Choose a recipient to continue`.

Quote expiry stays as the code already has it: create → fund → submit remain **one action** behind one button
(`send/page.tsx:135` — the comment there is correct and the reasoning should survive the redesign). The
`STEP_LABEL` progression stays.

### 6.2 Status — the record

Order: masthead → delivered amount + **stamp** → **proof** → chain of custody → recipient-view link.

**The proof moves above the fold.** This is the single most important change in the spec. Hash in a dashed
mono box, `Verify on Stellar Expert →` in ink beneath it.

The stamp reports state and elapsed time (`SETTLED` / `ON-CHAIN · 4.8s`). Elapsed comes from the existing
computation at `status/[id]/page.tsx:23`, which is already correct — first event to `COMPLETED`.

Chain of custody renders the real `transferEvents` rows against `TRANSFER_STEPS`, each with its real timestamp:
**green dot = done, filled ink dot + bold label = current, hollow outline = pending.** (The mockup renders the
current step in red; that contradicts §4 and is corrected here — current is ink. Position and label weight
carry the state alongside the colour.) **No fabricated steps** — if an event has not been written, it renders
as pending.

### 6.3 Claim — the receipt

Centred: amount received (36px mono) → `TERVERIFIKASI` stamp → payout destination → CTA → hash.

The honest disclaimer at `claim/[id]/page.tsx:73` **stays, verbatim in substance**: the anchor payout is
simulated; the settlement is real. It moves into the ticket line under the CTA. Do not soften it.

Claim gets **no navigation rail** — the recipient is not the account holder in spirit. See §10.

### 6.4 Unchanged this round

Landing, login, register, history keep their current structure and inherit the new tokens and type. History gets
the rail/tab-bar treatment. Their redesign is out of scope.

---

## 7. Destination currency, and the defect behind it

**The design bug.** The amount hero carried `VND ▾` (chevron) while the pair's From/To were bare text. Source
currency had two appearances and one affordance; destination had an appearance and none. It read as a readout.
Fixed per §6.1.

**Why it cannot be automatic.** `Beneficiary` (`packages/shared/src/types.ts:17`) holds `fullName`, `method`,
`bankName`, `accountNumber` — no currency, no country. `schema.ts:34` matches. There is nothing to derive from.

**The defect.** `apps/api/src/routes/transfer.ts:66` fetches the quote and the beneficiary independently and
never checks they agree. Quote VND→PHP, attach a recipient with an Indonesian BCA account, and it submits:
pesos settle on-chain and the mock anchor "pays out" to a Rupiah account. Nothing rejects it. This has been live
since the route was written; neither the API tests nor the UI catch it, because the demo path always happens to
be VND→IDR with an Indonesian recipient.

**The fix — a breaking contract change.** `packages/shared/src/types.ts` is the frozen FE↔BE contract; per
`CLAUDE.md` this is stated explicitly and both sides move together:

1. `Beneficiary` gains `currency: FiatAssetCode`.
2. `CreateBeneficiaryRequest` gains `currency`.
3. Drizzle: `currency` column on `beneficiaries`, **not null**.
4. **Migration with a real backfill.** Every existing beneficiary is Indonesian, so `IDR` is the honest default
   — but it must be an explicit migration, not a nullable column the team forgets. Seed updated to match.
5. `POST /transfers` rejects `quote.destAsset !== beneficiary.currency` with 400 and a message naming both
   currencies. This closes the hole even if the UI regresses.
6. **Filtering is client-side.** `GET /beneficiaries` is unchanged. The list is a handful of rows already
   fetched at `send/page.tsx:63`; filtering it in the browser avoids touching the API surface, and switching
   currency then re-filters with no network round-trip and no loading state to design.
7. Beneficiary creation form gains a currency selector.
8. Send page filters the recipient list by `destAsset` and renders the empty state.

**Ordering:** the API validation (5) can land first and independently — it is a few lines and closes a real hole.
The UI work depends on 1–4.

---

## 8. Accessibility acceptance criteria

Testable, not aspirational. The current `globals.css` already earns most of this; the job is not to regress it.

- Every control boundary is `--foreground`, never `--border`. Verified by inspection of `.sel`, `.btn`, inputs.
- All text tokens meet AA against both paper and card — measured in §3; re-measure if any value moves.
- Touch targets ≥ 44px. The 30px swap button in the mockup **fails this** and must ship at 44px with the visual
  circle inset — flagged because it is the kind of thing that survives to production unnoticed.
- `:focus-visible` ring preserved from the existing `globals.css`, on every control including the pair buttons
  and swap.
- The pair buttons are real `<button>`s with accessible names ("Change source currency, currently VND").
- Status is never colour alone: stamp text, custody step names, and the filter note all carry words.
- `prefers-reduced-motion` respected — the current file's block stays; no new motion is introduced by this spec.
- `prefers-contrast: more` block retained; `--border` darkens to `--muted-foreground` as it already does.
- Currency selectors keep semantic HTML. Replacing native `<select>` with custom buttons means the popover must
  be keyboard-navigable and labelled — **if that cannot be done well in the time available, keep native
  `<select>` styled to match.** A pretty control that traps a keyboard user is worse than a plain one.

---

## 9. Content and tone

Concise, low-jargon, action-oriented. Money words, not system words.

- "They receive", not "destination amount".
- "Rate held 60 seconds", not "quote TTL".
- `ROUTED VIA XLM` is the one piece of chain vocabulary on the Send screen, and it earns its place — it is the
  architecture made visible.
- Errors say what happened and what to do: the existing stale-quote message at `send/page.tsx:156` is a good
  model and should be kept.
- Never soften the simulated-anchor disclaimer.
- Never fabricate a hash, rate, or elapsed time. If a value is absent, the UI shows absence.

---

## 10. Open questions and known gaps

1. **Dark mode is out of scope for the MVP** (locked in §2), and that is a real gap rather than an oversight.
   Paper is paper; a receipt that inverts stops being a receipt. Defensible for a demo; a web app ignoring
   `prefers-color-scheme` in 2026 gets noticed. Doing it properly means Warkat becomes *a lit desk at night* —
   genuine design work, not a token flip — so it is a post-MVP design exercise, not an implementation task to
   be squeezed in. Revisit only once the backbone is green.
2. **Bottom bar on mobile web needs real-device testing.** Bottom tabs are a native pattern; on mobile web they
   fight the browser's own chrome (iOS Safari's toolbar sits directly under them, and the viewport resizes as it
   hides). It wins for three destinations where Send dominates, but the fallback — a top bar at every breakpoint
   — must be tested in a hand, not in a narrow desktop window.
3. **The landing page sells a demo that cannot run.** `app/page.tsx` advertises "$0.00001" and the spec's script
   (`StellarSend-Spec.md` §9) opens with "$100", but `FIAT_ASSET_CODES` is IDR/VND/PHP — **there is no USD to
   send**. This spec uses VND→IDR throughout. Either the pitch script moves to VND→IDR, or USD is added as a
   sendable asset with an issuer and seeded liquidity. **This is a pitch decision, not a design one**, but it
   sets the hero number on every screen. `StellarSend-Spec.md` §9's "SG/MY/HK → ID" corridors have the same
   problem: no SGD, MYR, or HKD exists.
4. **`CLAUDE.md` says `fiat → USDC → path payment`; the bridge asset is XLM.** Confirmed intentional. The doc
   is stale and the UI must never print "USDC" — a judge who opens Stellar Expert sees XLM and catches it.
5. **Claim's auth model.** `claim/[id]/page.tsx:16` redirects to login, so the recipient is an account holder,
   yet the screen is designed as a standalone receipt with no nav. Consistent for the demo (same laptop, switch
   view), but the rail question depends on it. Confirm the demo flow before building.

---

## 11. QA checklist

Executable in code review.

- [ ] No control's visible border is `--border`; all are `--foreground`.
- [ ] Swap button hit area ≥ 44px despite a 30px visual.
- [ ] Every figure has `tabular-nums`; amounts align down the slip.
- [ ] Radius is 2px everywhere except the swap button.
- [ ] Red appears only on stamps and alerts — grep for `--stamp` in nav, links, tab bar; there should be none.
- [ ] Bottom bar has `env(safe-area-inset-bottom)`; tested on a real phone.
- [ ] Currency pair: both sides have a visible chevron and an accessible name.
- [ ] Recipient list filters by `destAsset`; empty state renders with the amber panel and disabled CTA.
- [ ] `POST /transfers` 400s on a quote/beneficiary currency mismatch — with a test.
- [ ] Migration backfills `currency` on existing beneficiaries; seed produces valid rows.
- [ ] Proof is above the fold on a 375px viewport, on both Status and Claim.
- [ ] Simulated-anchor disclaimer present and unsoftened.
- [ ] No screen renders a hash, rate, or elapsed time that did not come from the API.
- [ ] `globals.css` retains focus-visible, reduced-motion, and prefers-contrast blocks.
- [ ] Keyboard: tab through Send end to end, including the pair and swap, without a trap.
