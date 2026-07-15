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

**Non-goal:** this spec does not change path-payment or signing logic, or the mocked-anchor design. It does
change the asset set, one API validation, and one shared type — each called out explicitly below.

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
| Dest currency | **User picks; recipient list filters to match** | See §9. |
| Mismatch bug | **Reject at transfer creation** | See §9. |
| Dark mode | **In scope** — "carbon copy", a second design, not an inversion | See §5. |
| Asset set | **All SEA currencies + USD** (11) | User decision. See §8. |
| Currency control | **Searchable picker sheet**, not a chevron button | 11 options is past where a plain list works. See §8. |
| Fee display | **`0,00001 XLM`**, never `$0.00001` | Units error. See §11. |

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

The first cut of this direction had a collision. Red was simultaneously **brand** (active nav, links, "Change"),
**the validation stamp**, and **the error state** (the blocked-recipient panel). When red is everywhere, a red
error cannot stand out — the colour stops carrying meaning and becomes decoration.

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

**Consequence:** active nav, tab bar, "Verify on Stellar Expert →", and "Change" move from red to ink; the
blocked-recipient panel moves from red to amber; the current custody step moves from red to ink. This was a real
visual change from the first approved mockup, and **the mockup has been updated to match** — red now appears in
exactly two places in its stylesheet, the token definition and the `.stamp` rule. The stamp keeps its red, which
is the only place the boldness is spent.

---

## 5. The night theme — "carbon copy"

**Not an inversion.** Inverting paper produces a glowing white slab, which is the reason the first cut of this
spec dropped dark mode. Instead the metaphor moves: **the counter after hours.** The slip becomes a carbon copy
on a slate desk, and the roles swap — **the light theme's paper colour `#E8EAE3` becomes the chalk.** The two
themes share a colour playing opposite parts, which is what makes them feel like one design rather than two.

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: 168 14% 7%;    /* #0F1413  the desk, after hours */
    --surface: 165 13% 18%;      /* #273330  the slip — a carbon copy */
    --foreground: 90 11% 89%;    /* #E4E7E1  the chalk = the light theme's paper */
    --muted-foreground: 159 8% 64%;  /* #9DABA6 */
    --border: 163 10% 27%;       /* #3D4B47  decorative only, as in light */
    --stamp: 5 79% 68%;          /* #EE7A6F  see below */
    --success: 147 43% 56%;      /* #5FBF8A */
    --warning: 39 67% 55%;       /* #D9A441 */
  }
}
```

Per the artifact/theming convention, `:root[data-theme="dark"]` and `:root[data-theme="light"]` must redefine
the same tokens so an explicit toggle beats the media query in both directions. **Style components through the
tokens only** — never inside the media query — so every component is written once.

**Contrast, measured** against desk `#0F1413` / slip `#273330`:

| Token | Desk | Slip | Verdict |
|---|---|---|---|
| chalk `#E4E7E1` | 14.88 | 10.49 | AA text |
| muted `#9DABA6` | 7.80 | 5.50 | AA text |
| stamp `#EE7A6F` | 6.77 | 4.77 | AA text |
| success `#5FBF8A` | 8.24 | 5.81 | AA text |
| warning `#D9A441` | 8.26 | 5.83 | AA text |
| rule `#3D4B47` | 2.03 | 1.43 | decorative only — same rule as light |

**Two things the night theme cost, and neither is a token swap:**

1. **The stamp red had to move.** `#B3241F` scores **4.13 on slate** — it fails. It lightens to `#EE7A6F`
   (4.77): the least change that passes. Anything lighter reads pink rather than official, so this value is not
   free to nudge.
2. **The slip needs a border in this theme.** It separates from the desk by only **1.42:1**, and a drop shadow
   cannot lift an object on a dark ground. `.doc` drops its shadow and gains a `--border` edge. This is the one
   structural difference between the themes, and it is deliberate.

The light theme keeps its drop shadow and no border. Do not unify these — they are solving the same problem
with the tools each ground affords.

---

## 6. Layout and responsive structure

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

## 7. Screens

### 7.1 Send — the slip

Order, top to bottom: masthead → **amount hero** → currency pair → quote slip → recipient → CTA.

- **Amount is the subject of the screen**, not a field. Geist Mono, 33px mobile.
- **The currency next to the amount is a unit label, not a control** (`--muted-foreground`, no chevron).
  This is the fix for §9's design bug: the pair below is the only place currencies are chosen.
- **The pair is one control**: `From [VND ▾] ⇄ [IDR ▾] To`. Both sides are real buttons with visible chevrons
  and ink borders. The swap button reverses the corridor in one tap. Caption: `ROUTED VIA XLM · ANY PAIR` —
  this is where the path-payment architecture becomes visible to a judge.
- **Quote slip**: rate, our fee, network fee, then `They receive` on a dashed rule as the total. Reads as a
  till receipt.
- **Recipient block** shows the filter it is under: `▾ CAN RECEIVE IDR` in success green.
- **Empty state is designed** (§9): when no recipient matches the chosen destination, the panel says why in
  plain language, offers "Add a {CUR} recipient", and the CTA disables with `Choose a recipient to continue`.

Quote expiry stays as the code already has it: create → fund → submit remain **one action** behind one button
(`send/page.tsx:135` — the comment there is correct and the reasoning should survive the redesign). The
`STEP_LABEL` progression stays.

### 7.2 Status — the record

Order: masthead → delivered amount + **stamp** → **proof** → chain of custody → recipient-view link.

**The proof moves above the fold.** This is the single most important change in the spec. Hash in a dashed
mono box, `Verify on Stellar Expert →` in ink beneath it.

The stamp reports state and elapsed time (`SETTLED` / `ON-CHAIN · 4.8s`). Elapsed comes from the existing
computation at `status/[id]/page.tsx:23`, which is already correct — first event to `COMPLETED`.

Chain of custody renders the real `transferEvents` rows against `TRANSFER_STEPS`, each with its real timestamp:
**green dot = done, filled ink dot + bold label = current, hollow outline = pending.** Position and label weight
carry the state alongside the colour, so the step is legible without it. **No fabricated steps** — if an event
has not been written, it renders as pending.

### 7.3 Claim — the receipt

Centred: amount received (36px mono) → `TERVERIFIKASI` stamp → payout destination → CTA → hash.

The honest disclaimer at `claim/[id]/page.tsx:73` **stays, verbatim in substance**: the anchor payout is
simulated; the settlement is real. It moves into the ticket line under the CTA. Do not soften it.

Claim gets **no navigation rail** — the recipient is not the account holder in spirit. See §13.

### 7.4 Unchanged this round

Landing, login, register, history keep their current structure and inherit the new tokens and type. History gets
the rail/tab-bar treatment. Their redesign is out of scope.

---

## 8. The asset set — 11 currencies

**Decision: every SEA currency plus USD.** `FIAT_ASSET_CODES` goes from 3 to 11:

`BND · KHR · IDR · LAK · MYR · MMK · PHP · SGD · THB · VND` (ASEAN 10) `+ USD`

**Why this was needed — the pitch and the code disagreed.** The spec's story (line 12) is TKI and Indonesian
students *abroad* sending home; line 495 names **SG/MY/HK → ID** as target corridors; line 478 lists SGD/MYR/USD
as *future* work. What shipped was IDR/VND/PHP. TKI work in Malaysia, Singapore, Hong Kong, Taiwan, Saudi —
**not Vietnam.** So the demo showed a corridor the pitch never claimed, for a user who does not exist. A judge
asking "who sends VND to IDR?" gets no good answer. The expansion makes the demo match the story.

**Cost is linear, not quadratic.** The XLM bridge means each currency needs **one order book against XLM**;
11 books route all 110 pairs. This is the architecture paying off, and it is worth saying out loud in the pitch.

**Issuers are public keys, not secrets.** `new Asset("VND", env.VND_ISSUER)` takes a G-address. Issuer *secrets*
are needed only at seed time, never at Worker runtime. So 11 currencies do **not** mean 11 new Worker secrets.

**Required changes:**

1. **Collapse the duplicate definition first.** `FIAT_ASSET_CODES` exists in **both**
   `packages/shared/src/constants.ts:31` and `apps/api/src/stellar/assets.ts:6`. They agree today; going 3→11
   means editing both, and two sources of truth drift. `assets.ts` should import from shared. **Do this before
   the list grows, not after.**
2. Replace 11 separate `*_ISSUER` env vars with a single issuer map keyed by asset code. `env.ts` gains one var;
   `assets.ts`'s per-currency functions and switch collapse to a lookup.
3. `seed-stellar.ts`: issuer keypair, trustline, and XLM order book per currency.
4. `Beneficiary.currency` (§9) is typed `FiatAssetCode`, so it widens with the set automatically.

**The risk, stated plainly.** `CLAUDE.md` lists multi-currency under *NICE-TO-HAVE, only after the backbone is
green*, and `StellarSend-Spec.md:439` warns that XLM routing needs sufficient liquidity or you get spread and
slippage. **Every currency is another thin testnet book, and another way the live demo fails on stage.** The
deadline is 23 July 2026.

**Therefore: seed all 11, but nominate ONE demo-critical corridor and rehearse only that.** The rehearsal
checklist (`docs/demo-rehearsal.md`) should name it. Recommended: **MYR → IDR** — the largest real TKI corridor,
which makes the demo and the story the same thing.

### The picker

At 3 currencies a chevron button was fine. At 11 it is not — **search is mandatory above roughly 7 options** —
so the pair's currency control opens a **sheet**, not a dropdown:

- Bottom sheet on mobile (80% height); popover anchored to the control on desktop.
- Search field, focused on open, filtering on both code and name.
- Grouped: **Southeast Asia**, then **Global** (USD). Sticky group headers.
- Rows: code (Geist Mono 600) · name (Inter, muted) · check on the current selection.
- **Every row is a 44px target.** So is the close button.
- Keyboard: arrow keys move, Enter selects, Escape closes, focus returns to the trigger. **If a custom sheet
  cannot meet this in the time available, use a native `<select>`** — see §10. A pretty control that traps a
  keyboard user is worse than a plain one.
- States: no-results ("No currency matches '{q}'"), and the destination sheet marks currencies the *sender's*
  side cannot route to, if any.

### "THIN BOOK" — a proposal, conditional

The mockup marks BND/KHR/LAK/MMK with a `THIN BOOK` badge. Rationale: a thin order book means slippage or
no-path, and the picker warning you beforehand is honest — it also shows a judge you understand what a path
payment depends on.

**Condition: it must be driven by real liquidity data, or it must be cut.** A hardcoded badge is exactly the
fake affordance this project has avoided everywhere else, and `CLAUDE.md` is explicit — never fake a result.
Deriving it means checking order-book depth per asset at quote time or on a schedule. **If that is not built,
remove the badge.** Do not ship it hardcoded.

---

## 9. Destination currency, and the defect behind it

**The design bug.** The amount hero carried `VND ▾` (chevron) while the pair's From/To were bare text. Source
currency had two appearances and one affordance; destination had an appearance and none. It read as a readout.
Fixed per §7.1.

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

## 10. Accessibility acceptance criteria

Testable, not aspirational. The current `globals.css` already earns most of this; the job is not to regress it.

- Every control boundary is `--foreground`, never `--border`. Verified by inspection of `.sel`, `.btn`, inputs.
- All text tokens meet AA against both paper and card — measured in §3; re-measure if any value moves.
- Touch targets ≥ 44px (WCAG 2.5.8). The swap button is the trap: its visual circle is 30px, so the **44px hit
  area must be the button and the circle inset inside it**, never the other way round. Corrected in the mockup;
  it is the kind of thing that survives to production unnoticed.
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

## 11. The fee — two corrections

**1. The network fee is `0,00001 XLM`, never `$0.00001`.**

`app/page.tsx:5` and `CLAUDE.md:16` both state the network fee as **$0.00001**. Stellar's base fee is 100
stroops = **0.00001 XLM**. At XLM ≈ $0.10–0.40 that is roughly **$0.000002** — the dollar sign is an XLM
quantity in disguise. It *overstates* the fee, so it is conservative rather than a lie, but at a **Stellar**
hackathon every judge knows the base fee. It is a units error in the exact domain the project claims competence
in, and it is on the landing page.

**Fix:** display `0,00001 XLM`. Optionally add `≈ $0.000002` beneath, but only if an XLM price assumption is
stated — otherwise a hardcoded dollar figure goes stale and becomes another thing to defend. Update
`page.tsx:5` and `CLAUDE.md:16` together.

**2. The service fee is 0,005%, not 0,1%.**

`quote.ts:32` sets `FEE_RATE = 0.00005`. On ₫2.500.000 the fee is **₫125**. The first mockup showed ₫2.500 —
20× too high — while its "they receive" total was arithmetically consistent with ₫125, so the slip contradicted
itself. Corrected reference values, recomputed from the real rate:

| | |
|---|---|
| Send | ₫2.500.000 |
| Our fee (0,005%) | ₫125 |
| Net routed | ₫2.499.875 |
| Rate | 0,6294 |
| They receive | Rp 1.573.421 |

Fee comes off the top and only the remainder is routed (`quote.ts:58`) — any mockup or test fixture must
follow that order, not apply the fee to the output.

---

## 12. Content and tone

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

## 13. Open questions and known gaps

1. **Dark mode is now in scope** (§5) — resolved, not open. Recorded here only to note that the night theme is
   a **second design, not a filter over the first**, and deserves its own review pass rather than being assumed
   correct because the light theme was signed off.
2. **Bottom bar on mobile web needs real-device testing.** Bottom tabs are a native pattern; on mobile web they
   fight the browser's own chrome (iOS Safari's toolbar sits directly under them, and the viewport resizes as it
   hides). It wins for three destinations where Send dominates, but the fallback — a top bar at every breakpoint
   — must be tested in a hand, not in a narrow desktop window.
3. **The demo script still needs rewriting** — the asset expansion (§8) fixes the code, not the words.
   `StellarSend-Spec.md:489` opens with *"TKI kirim $100"* and `:491` says *"Sender input $100"*. USD is now
   sendable, so the script *can* run as written — but §8 recommends demoing **MYR → IDR**, which is the real
   TKI corridor and the one the story describes. Pick one and make the script, the seed, and
   `docs/demo-rehearsal.md` agree. **This is a pitch decision, not a design one**, but it sets the hero number
   on every screen.
   *Note:* `StellarSend-Spec.md:495` also names **HK** as a target corridor. HKD is not in the SEA set and is
   not being added — either drop it from the roadmap line or accept that it is roadmap-only.
4. **`CLAUDE.md` says `fiat → USDC → path payment`; the bridge asset is XLM.** Confirmed intentional. The doc
   is stale and the UI must never print "USDC" — a judge who opens Stellar Expert sees XLM and catches it.
5. **Claim's auth model.** `claim/[id]/page.tsx:16` redirects to login, so the recipient is an account holder,
   yet the screen is designed as a standalone receipt with no nav. Consistent for the demo (same laptop, switch
   view), but the rail question depends on it. Confirm the demo flow before building.

---

## 14. QA checklist

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
- [ ] Both themes: components are styled through tokens only — no component rule inside a
      `prefers-color-scheme` block. `data-theme` overrides beat the media query in both directions.
- [ ] Night theme: `.doc` has a border and no shadow; light theme has a shadow and no border.
- [ ] Night stamp is `#EE7A6F`, not `#B3241F` — the light value fails on slate (4.13).
- [ ] `FIAT_ASSET_CODES` is defined **once**; `assets.ts` imports from shared.
- [ ] Issuer lookup is a map, not 11 env vars or an 11-arm switch.
- [ ] Picker: search filters code *and* name; arrow/Enter/Escape work; focus returns to the trigger.
- [ ] Picker rows and the close button are ≥44px.
- [ ] `THIN BOOK` is either backed by real order-book depth **or absent**. Never hardcoded.
- [ ] No fee anywhere renders as `$0.00001` — `page.tsx:5` and `CLAUDE.md:16` included.
- [ ] Fee is computed off the top (`quote.ts:58` order); ₫2.500.000 → fee ₫125 → receive Rp 1.573.421.
- [ ] The seed produces a working order book for **every** currency it advertises, or the picker does not
      advertise it.
- [ ] `docs/demo-rehearsal.md` names the one demo-critical corridor, and it is the one rehearsed.
