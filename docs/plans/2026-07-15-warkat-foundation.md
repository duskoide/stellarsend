# Warkat Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `apps/web` in the Warkat design direction — a mobile-first web app where a transfer reads as a document of record and the on-chain proof is its validation stamp — in both light and night themes.

**Architecture:** Port the token *structure* already in `globals.css` (focus rings, reduced-motion, prefers-contrast all survive) and change only the values. Components are styled through tokens exclusively, so the night theme is a token block rather than a second set of rules. Layout flips one axis at 768px: bottom tab bar → left rail.

**Tech Stack:** Next.js 14 (App Router, edge runtime), Tailwind, `next/font/google`, Vitest (introduced here), TypeScript.

**Spec:** `docs/specs/2026-07-15-warkat-frontend-design.md`. Read §3–§7 before starting.

**Scope note — this is plan 1 of 2.** This plan is frontend-only and changes **no** shared types, no API, no schema. The currency expansion (3→11 assets, `Beneficiary.currency`, the `transfer.ts` mismatch fix, recipient filtering) is a separate subsystem and gets its own plan — it touches `packages/shared`, `apps/api`, migrations, and the seed. Splitting means this plan ships a complete, demo-ready redesign on its own, which matters because `CLAUDE.md` puts multi-currency under NICE-TO-HAVE *after the backbone is green*, and the deadline is 23 July 2026. The `CurrencyPicker` built in Task 7 takes its options as a prop, so plan 2 widens the list without touching it.

## Global Constraints

Every task's requirements implicitly include these. Copied from the spec.

- **Money is `string`, 7 decimals, always.** Never a float, never `number` math. (`CLAUDE.md`)
- **Never fabricate a tx hash, quote, rate, or elapsed time.** If a value is absent, the UI shows absence.
- **Every control's visible border is `--foreground`, never `--border`.** `--border` is 1.35:1 and fails WCAG 1.4.11's 3:1 for control boundaries. It may separate and group; it may never be the edge of an interactive element. *This is the single most likely rule to be broken by accident.*
- **`--radius` is `2px` globally.** Paper is cut, not rounded. The only exception is the swap button (50%).
- **Every figure carries `tabular-nums`.**
- **Red (`--stamp`/`--danger`) appears only on validation stamps and genuine alerts.** Never navigation, never links. Nav/links are ink.
- **Touch targets ≥44px** (WCAG 2.5.8), with the visual inset inside the target where the visual is smaller.
- **Components are styled through tokens only.** Never write a component rule inside a `prefers-color-scheme` block.
- **Do not soften the simulated-anchor disclaimer** on the claim page.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/vitest.config.ts` | **Create.** Node-env test runner; no jsdom (nothing here needs a DOM). |
| `apps/web/tests/tokens.test.ts` | **Create.** Parses `globals.css` and asserts every text/ground pair clears AA in both themes, and that dark defines every token light defines. |
| `apps/web/src/app/globals.css` | **Modify.** Token values only; structure preserved. Gains a dark block. |
| `apps/web/tailwind.config.ts` | **Modify.** Add `stamp` colour. |
| `apps/web/src/app/layout.tsx:2,9-27,40` | **Modify.** Font imports and the `<html>` variable list. |
| `apps/web/src/components/ui/{button,card,alert,input}.tsx` | **Modify.** Radius + variant mapping. `input` is a CONTROL: its border must be `--foreground`. |
| `apps/web/src/components/AppShell.tsx` | **Create.** Replaces `NavBar`. Bottom bar <768px, left rail ≥768px. |
| `apps/web/src/components/ThemeToggle.tsx` | **Create.** Three-state system/light/dark; stamps `data-theme`. |
| `apps/web/src/components/QuoteCard.tsx` | **Delete.** Task 8 replaces it with `Slip`. |
| `apps/web/src/components/CurrencyPicker.tsx` | **Create.** Searchable sheet. Options are a prop. |
| `apps/web/src/components/CurrencyPair.tsx` | **Create.** From/swap/To. Owns both currency choices. |
| `apps/web/src/components/Slip.tsx` | **Create.** The receipt line-item block, shared by Send and Status. |
| `apps/web/src/components/Stamp.tsx` | **Create.** The validation stamp. Meaning is its text, not its hue. |
| `apps/web/src/components/CustodyChain.tsx` | **Create.** Replaces `TxStatusStepper`. |
| `apps/web/src/app/(sender)/send/page.tsx` | **Modify.** |
| `apps/web/src/app/(sender)/status/[id]/page.tsx` | **Modify.** |
| `apps/web/src/app/(receiver)/claim/[id]/page.tsx` | **Modify.** |
| `apps/web/src/app/page.tsx:5` | **Modify.** Fee units. |
| `CLAUDE.md:16` | **Modify.** Fee units. |

---

## Task 1: Test harness and design tokens

**Files:**
- Create: `apps/web/vitest.config.ts`, `apps/web/tests/tokens.test.ts`
- Modify: `apps/web/package.json`, `apps/web/src/app/globals.css`, `apps/web/tailwind.config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the token names every later task uses — `--background --surface --foreground --primary --primary-foreground --secondary --secondary-foreground --success --success-foreground --warning --warning-foreground --danger --danger-foreground --stamp --muted --muted-foreground --border --ring --radius`. Tailwind classes: `bg-background bg-surface text-foreground bg-primary text-stamp bg-muted text-muted-foreground border-border ring`.

> **Why a test for colours?** These exact pairs have already failed twice during design: `--border` at 1.35:1 cannot bound a control, and `muted-foreground` on `muted` failed at 4.20 with the original `#5D6B68`. A test is the only thing that stops a future value nudge from silently breaking AA.

- [ ] **Step 1: Add Vitest**

```bash
pnpm --filter web add -D vitest@^2
```

Then add to `apps/web/package.json` `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create the Vitest config**

Create `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

// Node env on purpose: the only invariants worth testing here are pure
// (token contrast, formatting). Nothing needs a DOM, so we don't pay for jsdom.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Write the failing test**

Create `apps/web/tests/tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "../src/app/globals.css"), "utf8");

/** Pull `--name: h s% l%;` declarations out of the first {...} after `from`. */
function tokensAfter(from: number): Record<string, string> {
  const open = css.indexOf("{", css.indexOf(":root", from));
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const out: Record<string, string> = {};
  for (const m of css.slice(open + 1, end).matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

/** Tokens declared in the first `{...}` block after `needle`. */
function blockAfter(needle: string): Record<string, string> {
  const i = css.indexOf(needle);
  if (i === -1) throw new Error(`selector not found in globals.css: ${needle}`);
  return tokensAfter(i);
}

// Four blocks. The media query is the no-JS fallback; the data-theme blocks are
// what the toggle stamps, and they must beat the media query in BOTH directions
// — which is why `light` needs an attribute block too, not just `dark`.
const light = blockAfter(":root {");
const darkMedia = blockAfter("prefers-color-scheme: dark");
const darkAttr = blockAfter(':root[data-theme="dark"]');
const lightAttr = blockAfter(':root[data-theme="light"]');

function hslToRgb(css: string): [number, number, number] {
  const [hs, ss, ls] = css.split(/\s+/);
  const h = parseFloat(hs), s = parseFloat(ss) / 100, l = parseFloat(ls) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function luminance(rgb: [number, number, number]): number {
  const f = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(hslToRgb(a)), luminance(hslToRgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Every pair that actually renders as text on a ground somewhere in the app.
const PAIRS: Array<[string, string]> = [
  ["foreground", "background"],
  ["foreground", "surface"],
  ["foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "surface"],
  ["muted-foreground", "muted"],       // Alert variant="neutral" — failed at 4.20 once
  ["primary-foreground", "primary"],   // Button variant="primary"
  ["danger-foreground", "danger"],     // Button variant="danger"
  ["success-foreground", "success"],
  ["warning-foreground", "warning"],
  ["stamp", "background"],
  ["stamp", "surface"],
  ["success", "background"],
  ["success", "surface"],
  ["warning", "background"],
  ["danger", "background"],
];

describe.each([
  ["light", light],
  ["dark (media)", darkMedia],
  ["dark (attr)", darkAttr],
  ["light (attr)", lightAttr],
])("%s", (_name, tok) => {
  it.each(PAIRS)("%s on %s meets WCAG AA (4.5:1)", (fg, bg) => {
    expect(tok[fg], `--${fg} missing`).toBeDefined();
    expect(tok[bg], `--${bg} missing`).toBeDefined();
    expect(contrast(tok[fg], tok[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("theme parity", () => {
  it("the dark attribute block matches the dark media block exactly", () => {
    // If these drift, a user with the toggle on 'dark' sees a different app
    // from a user whose OS is dark. Same design, two code paths.
    expect(darkAttr).toEqual(darkMedia);
  });

  it("the light attribute block matches the light root exactly", () => {
    const { radius, ...lightColours } = light;
    expect(lightAttr).toEqual(lightColours);
  });

  it("dark redefines every colour token light defines", () => {
    const missing = Object.keys(light)
      .filter((k) => k !== "radius")
      .filter((k) => !(k in darkMedia));
    expect(missing).toEqual([]);
  });
});

describe("radius", () => {
  it("is 2px — paper is cut, not rounded", () => {
    expect(light.radius).toBe("2px");
  });
});

describe("the slip shadow is a token, not a dark: variant", () => {
  // The shadow lifts the slip off the desk in light. On a dark ground a shadow
  // cannot do that, so night uses a border instead — see spec §5. Carrying this
  // as a token rather than a `dark:` utility keeps components theme-agnostic
  // and means Tailwind needs no darkMode config at all.
  it("is defined in every theme block", () => {
    for (const [name, tok] of [["light", light], ["dark media", darkMedia], ["dark attr", darkAttr], ["light attr", lightAttr]] as const) {
      expect(tok["slip-shadow"], `--slip-shadow missing from ${name}`).toBeDefined();
    }
  });

  it("is none in dark — a shadow cannot lift an object on a dark ground", () => {
    expect(darkMedia["slip-shadow"]).toBe("none");
  });
});
```

- [ ] **Step 4: Run the test and watch it fail**

Run: `pnpm --filter web test`

Expected: FAIL. The current tokens are the corporate blue-on-white set, there is no dark block (so `dark` is empty and every dark case errors on `--foreground missing`), `--stamp` does not exist, and `--radius` is `0.5rem`.

- [ ] **Step 5: Write the tokens**

Replace the **first** `@layer base { :root { ... } }` block in `apps/web/src/app/globals.css` (lines 5–35) with this. **Leave the second `@layer base` block (lines 37–78) untouched** — the focus ring, reduced-motion, and prefers-contrast rules all survive as written.

```css
@layer base {
  /* Warkat — the transfer as a document of record.
     See docs/specs/2026-07-15-warkat-frontend-design.md §3.
     HSL triples are machine-converted from hex; do not retype them by hand.
     Contrast is enforced by tests/tokens.test.ts — if you change a value,
     the test tells you whether you may. */
  :root {
    --background: 77 14% 90%;           /* #E8EAE3  paper */
    --surface: 72 20% 95%;              /* #F4F5F0  card */
    --foreground: 176 19% 14%;          /* #1D2B2A  ink */

    /* The primary action is ink. There is no separate brand hue to drift. */
    --primary: 176 19% 14%;             /* #1D2B2A */
    --primary-foreground: 72 20% 95%;   /* #F4F5F0 */
    --secondary: 144 39% 30%;           /* #2F6B47 */
    --secondary-foreground: 72 20% 95%; /* #F4F5F0 */

    --success: 144 39% 30%;             /* #2F6B47  progress, completed steps */
    --success-foreground: 72 20% 95%;   /* #F4F5F0 */
    --warning: 39 100% 27%;             /* #8A5A00  blocked, not broken */
    --warning-foreground: 72 20% 95%;   /* #F4F5F0 */
    --danger: 2 70% 41%;                /* #B3241F */
    --danger-foreground: 72 20% 95%;    /* #F4F5F0 */

    /* Validation ink. Same value as --danger, different intent: --stamp is the
       rubber stamp (SETTLED / TERVERIFIKASI / GAGAL — the WORD carries the
       meaning), --danger is an error. Red appears nowhere else. §4. */
    --stamp: 2 70% 41%;                 /* #B3241F */

    --muted: 87 13% 86%;                /* #DDE1D8 */
    --muted-foreground: 167 8% 35%;     /* #53615E — darkened from #5D6B68,
                                           which failed AA on --muted (4.20) */
    --border: 90 11% 78%;               /* #C6CCC0  DECORATIVE ONLY — 1.35:1,
                                           never a control boundary. §3 */
    --ring: 176 19% 14%;                /* #1D2B2A */

    /* The shadow is what lifts the slip off the desk. It is a TOKEN, not a
       `dark:` utility, so components never know which theme they are in — and
       Tailwind needs no darkMode config. See §5. */
    --slip-shadow: 0 1px 1px rgb(29 43 42 / 0.10), 0 10px 26px rgb(29 43 42 / 0.11);

    --radius: 2px;                      /* paper is cut, not rounded */
  }

  /* CARBON COPY — the night theme. Not an inversion: inverting paper gives a
     glowing slab. The counter after hours; the light theme's PAPER becomes the
     chalk. §5.
     These three blocks must agree. The media query is the no-JS fallback; the
     attribute blocks are what the toggle stamps. `:root[data-theme="light"]`
     has higher specificity (0,2,0) than `:root` inside the media query (0,1,0),
     which is exactly why an explicit "light" choice survives a dark OS. */
  @media (prefers-color-scheme: dark) {
    :root {
      --background: 168 14% 7%;           /* #0F1413  the desk */
      --surface: 165 13% 18%;             /* #273330  the slip */
      --foreground: 90 11% 89%;           /* #E4E7E1  chalk = light's paper */
      --primary: 90 11% 89%;              /* #E4E7E1 */
      --primary-foreground: 165 13% 18%;  /* #273330 */
      --secondary: 147 43% 56%;           /* #5FBF8A */
      --secondary-foreground: 168 14% 7%; /* #0F1413 */
      --success: 147 43% 56%;             /* #5FBF8A */
      --success-foreground: 168 14% 7%;   /* #0F1413 */
      --warning: 39 67% 55%;              /* #D9A441 */
      --warning-foreground: 168 14% 7%;   /* #0F1413 */
      --danger: 5 79% 68%;                /* #EE7A6F */
      --danger-foreground: 168 14% 7%;    /* #0F1413 */
      /* #B3241F scores 4.13 on slate and FAILS. #EE7A6F is 4.77 — the least
         change that passes. Any lighter reads pink instead of official. */
      --stamp: 5 79% 68%;                 /* #EE7A6F */
      --muted: 165 13% 13%;               /* #1C2422 */
      --muted-foreground: 159 8% 64%;     /* #9DABA6 */
      --border: 163 10% 27%;              /* #3D4B47  decorative only */
      --ring: 90 11% 89%;                 /* #E4E7E1 */
      --slip-shadow: none;                /* the border lifts it here */
    }
  }

  /* Explicit "dark" — must be byte-identical to the media block above.
     tests/tokens.test.ts asserts this; if they drift, a toggle user and an
     OS-dark user see different apps. */
  :root[data-theme="dark"] {
    --background: 168 14% 7%;
    --surface: 165 13% 18%;
    --foreground: 90 11% 89%;
    --primary: 90 11% 89%;
    --primary-foreground: 165 13% 18%;
    --secondary: 147 43% 56%;
    --secondary-foreground: 168 14% 7%;
    --success: 147 43% 56%;
    --success-foreground: 168 14% 7%;
    --warning: 39 67% 55%;
    --warning-foreground: 168 14% 7%;
    --danger: 5 79% 68%;
    --danger-foreground: 168 14% 7%;
    --stamp: 5 79% 68%;
    --muted: 165 13% 13%;
    --muted-foreground: 159 8% 64%;
    --border: 163 10% 27%;
    --ring: 90 11% 89%;
    --slip-shadow: none;
  }

  /* Explicit "light" — this block is the whole reason data-theme exists.
     Without it, a user who chooses Light on a dark-mode OS still gets the
     media query. Must be byte-identical to :root above, minus --radius. */
  :root[data-theme="light"] {
    --background: 77 14% 90%;
    --surface: 72 20% 95%;
    --foreground: 176 19% 14%;
    --primary: 176 19% 14%;
    --primary-foreground: 72 20% 95%;
    --secondary: 144 39% 30%;
    --secondary-foreground: 72 20% 95%;
    --success: 144 39% 30%;
    --success-foreground: 72 20% 95%;
    --warning: 39 100% 27%;
    --warning-foreground: 72 20% 95%;
    --danger: 2 70% 41%;
    --danger-foreground: 72 20% 95%;
    --stamp: 2 70% 41%;
    --muted: 87 13% 86%;
    --muted-foreground: 167 8% 35%;
    --border: 90 11% 78%;
    --ring: 176 19% 14%;
    --slip-shadow: 0 1px 1px rgb(29 43 42 / 0.10), 0 10px 26px rgb(29 43 42 / 0.11);
  }
}
```

- [ ] **Step 6: Add the `stamp` colour to Tailwind**

In `apps/web/tailwind.config.ts`, inside `theme.extend.colors` (after the `muted` entry, line 39):

```ts
        stamp: "hsl(var(--stamp))",
```

- [ ] **Step 7: Run the tests and watch them pass**

Run: `pnpm --filter web test`

Expected: PASS — 64 contrast cases (16 pairs × 4 blocks), 3 parity cases, radius, and 2 slip-shadow cases.

- [ ] **Step 8: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/tests/tokens.test.ts apps/web/package.json apps/web/src/app/globals.css apps/web/tailwind.config.ts
git commit -m "feat(web): Warkat design tokens, both themes, with contrast tests

Ports the token structure and changes only values. Adds Vitest and a test
asserting every text/ground pair clears AA in both themes — these pairs have
already failed twice: --border cannot bound a control (1.35:1), and
muted-foreground on muted failed at 4.20, so it darkens to #53615E."
```

---

## Task 2: Typography

**Files:**
- Modify: `apps/web/src/app/layout.tsx` (line 2 import; lines 9-27 font constants; line 40 `<html>` className)
- Modify: `apps/web/tailwind.config.ts` (the `fontFamily.mono` entry)

**Interfaces:**
- Consumes: nothing.
- Produces: `--font-sans` (Inter), `--font-display` (Source Serif 4), `--font-geist-mono` (Geist Mono). Tailwind's `font-sans` / `font-display` / `font-mono` classes resolve to these.

> **Geist Mono is NOT in `next/font/google` on Next 14.2.35.** Verified empirically before this task was dispatched — importing `Geist_Mono` fails with:
> `TS2305: Module '"next/font/google/index.js"' has no exported member 'Geist_Mono'`.
> It postdates this Next version's bundled font list. `Inter` and `Source_Serif_4` are both present and compile fine.
>
> The fix is Vercel's official **`geist` package** — already installed (`geist@1.7.2`, SIL Open Font License) — which ships Geist Mono with `next/font` integration. This preserves the approved design instead of substituting a different mono.
>
> **`geist` hardcodes its variable as `--font-geist-mono`; the name is not configurable** (see `node_modules/geist/dist/mono.js:5`). So there is no `--font-mono`, and `tailwind.config.ts` must point at `--font-geist-mono` directly.
>
> **Do NOT alias it inside the `:root` block in `globals.css`.** That block is parsed by `tests/tokens.test.ts`, and an extra custom property there breaks the theme-parity assertions (`lightAttr` would not match `:root`). The Tailwind config is the right place.

- [ ] **Step 1: Swap the font imports**

`geist` is already in `apps/web/package.json` — do not re-add it. In `apps/web/src/app/layout.tsx`, replace line 2 (the `next/font/google` import) with:

```ts
import { Inter, Source_Serif_4 } from "next/font/google";
import { GeistMono } from "geist/font/mono";
```

Then replace lines 9-27 (the "Corporate design system type scale" comment plus the three font constants) with:

```ts
// Warkat type system — see docs/specs/2026-07-15-warkat-frontend-design.md §3.
// Inter carries body/UI. Source Serif 4 brings the document register Inter
// deliberately lacks. Geist Mono strikes the figures — grotesk-structured, so
// it reads as Inter's sibling rather than a code font that wandered in.
//
// Geist Mono comes from Vercel's `geist` package, not next/font/google: it is
// absent from Next 14's bundled font list. It exposes --font-geist-mono, a name
// it does not let us change, so tailwind.config.ts points font-mono at that.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
```

- [ ] **Step 2: Update the `<html>` variable list**

`layout.tsx:40` composes the font variables onto `<html>`. Replace it:

```tsx
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} ${GeistMono.variable}`}>
```

> `GeistMono` is an object imported from the package, not a function you call — there is no `geistMono` constant to declare.

- [ ] **Step 3: Point Tailwind's `font-mono` at the Geist variable**

In `apps/web/tailwind.config.ts`, in `theme.extend.fontFamily`, replace the `mono` entry:

```ts
        // Geist Mono ships its own CSS variable name from the `geist` package
        // and does not allow renaming it, so point at --font-geist-mono rather
        // than aliasing inside globals.css (whose :root block is parsed by
        // tests/tokens.test.ts and must contain only theme tokens).
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
```

Leave `sans` and `display` exactly as they are.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors. A failure here means a stale `openSans` / `poppins` / `plexMono` reference survives, or `GeistMono` is being called as a function.

- [ ] **Step 5: Tokens still pass**

Run: `pnpm --filter web test`
Expected: still passing, unchanged count. If theme-parity assertions break, you added a property to a `:root` token block — move it to the Tailwind config instead.

- [ ] **Step 6: Verify the fonts actually load**

Run `pnpm --filter web dev`, open `http://localhost:3000`.

Expected: headings render in a serif (Source Serif 4), body in Inter, and any `font-mono` element in Geist Mono. In devtools → Network, filter by `font` — you should see the families fetched. **A silent fallback to system-ui looks fine at a glance and is the failure mode to watch for**, so confirm in the Computed panel that `font-family` resolves to the real family names, not `system-ui`.

For the mono specifically, check an element with `font-mono` — Geist Mono is served from the package (self-hosted by Next), not from Google's CDN, so it will appear as a local `/_next/static/media/...` request rather than a `fonts.gstatic.com` one. That is expected and is one of its advantages: no third-party runtime dependency during the demo.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/layout.tsx apps/web/tailwind.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): Inter / Source Serif 4 / Geist Mono type system

Geist Mono is absent from next/font/google on Next 14.2.35, so it comes from
Vercel's official geist package (SIL OFL) instead. It exposes --font-geist-mono
and will not let us rename it, so tailwind's font-mono points there directly
rather than aliasing in globals.css, whose :root block the token tests parse."
```

---

## Task 3: UI primitives

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx:22-33`, `apps/web/src/components/ui/card.tsx:5-8`, `apps/web/src/components/ui/alert.tsx:3-9`, `apps/web/src/components/ui/input.tsx:19`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: `<Button variant="primary"|"secondary"|"ghost"|"danger" loading={boolean}>` (unchanged API), `<Card>`, `<CardTitle>`, `<Alert variant="success"|"warning"|"danger"|"info"|"neutral">` (unchanged API). **Do not change these signatures** — `send`, `status`, and `claim` all call them.

> The primitives keep their prop APIs. Only the classes change. `Button variant="primary"` now renders ink because `--primary` *is* ink.

- [ ] **Step 1: Square off the Card**

In `apps/web/src/components/ui/card.tsx`, in the `Card` function, replace the `clsx(...)` argument:

```ts
    className={clsx(
      // Paper is cut, not rounded: rounded-md is --radius (2px) after Task 1.
      // The shadow comes from a token, never a `dark:` variant — the component
      // does not know which theme it is in. In light the shadow lifts the slip
      // off the desk; in night --slip-shadow is `none` and the border does that
      // job, because a shadow cannot lift an object on a dark ground (spec §5).
      "rounded-md border border-border bg-surface p-5 shadow-[var(--slip-shadow)]",
      className,
    )}
```

In `CardTitle`, switch to the display face:

```ts
  return <h3 className={clsx("font-display text-base font-bold tracking-tight", className)} {...props} />;
```

- [ ] **Step 2: Retune the Button**

In `apps/web/src/components/ui/button.tsx`, replace the `clsx(...)` block (lines 22–33) with:

```ts
        className={clsx(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold",
          "transition-colors disabled:pointer-events-none disabled:opacity-40",
          // Every control's border is --foreground. --border is 1.35:1 and
          // fails WCAG 1.4.11 for control boundaries. See spec §3.
          variant === "primary" &&
            "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95",
          variant === "secondary" &&
            "border border-foreground bg-transparent text-foreground hover:bg-muted active:bg-muted/80",
          variant === "ghost" &&
            "bg-transparent text-foreground hover:bg-muted active:bg-muted/80",
          variant === "danger" &&
            "bg-danger text-danger-foreground hover:bg-danger/90 active:bg-danger/95",
          className,
        )}
```

- [ ] **Step 3: Remap Alert variants**

In `apps/web/src/components/ui/alert.tsx`, replace the `VARIANT` map (lines 3–9):

```ts
// Warkat semantics (spec §4): red is rare — alerts and stamps only.
// "info" is ink, not a brand hue: an informational note on paper is just ink.
const VARIANT = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  info: "border-foreground/20 bg-muted text-foreground",
  neutral: "border-border bg-muted text-muted-foreground",
} as const;
```

- [ ] **Step 4: Typecheck and test**

Run: `pnpm --filter web typecheck && pnpm --filter web test`
Expected: no type errors; token tests still pass.

- [ ] **Step 5: Verify in the browser, both themes**

Run: `pnpm --filter web dev` and open `/auth/login`.
Expected: square (2px) corners, ink primary button, Inter labels. Then toggle your OS to dark mode and reload — the page should become the slate/chalk night theme with no white flash and no unreadable text.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/
git commit -m "feat(web): retune UI primitives for Warkat

Prop APIs unchanged — only classes. Control borders move to --foreground
because --border is 1.35:1 and fails WCAG 1.4.11 for control boundaries."
```

---

## Task 4: App shell — bottom bar on mobile, left rail on desktop

**Files:**
- Create: `apps/web/src/components/AppShell.tsx`
- Modify: `apps/web/src/app/layout.tsx` (swap `NavBar` for `AppShell`)
- Delete: `apps/web/src/components/NavBar.tsx`

**Interfaces:**
- Consumes: `getToken`, `clearToken` from `@/lib/api` (already used by `NavBar.tsx:5`).
- Produces: `<AppShell>{children}</AppShell>` — wraps page content, renders nav, and returns children bare on public paths.

> `NavBar.tsx` puts nav at the *top* of a phone screen, out of thumb reach, with logout as a text link beside primary destinations. This replaces it. Logout moves under Account and stops competing with navigation.

- [ ] **Step 1: Create the shell**

Create `apps/web/src/components/AppShell.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { getToken, clearToken } from "@/lib/api";

// Pages with no navigation. Claim is here on purpose: the recipient is not
// the account holder in spirit, so the claim screen is a standalone receipt.
const BARE_PATHS = ["/", "/auth/login", "/auth/register"];
const isBare = (p: string) => BARE_PATHS.includes(p) || p.startsWith("/claim/");

const DESTINATIONS = [
  { href: "/send", label: "Send", icon: "✎" },
  { href: "/history", label: "History", icon: "☰" },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
  }, [pathname]);

  if (isBare(pathname) || !token) return <>{children}</>;

  const active = (href: string) =>
    href === "/send"
      ? pathname.startsWith("/send") || pathname.startsWith("/quote")
      : pathname.startsWith(href);

  const logout = () => {
    clearToken();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop: the rail. Same destinations as the bar, different axis. */}
      <nav className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 md:flex">
        <Link href="/send" className="border-b border-border px-2 pb-3.5 pt-1 font-display text-base font-bold">
          StellarSend
        </Link>
        <div className="mt-2 flex flex-col gap-1">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              aria-current={active(d.href) ? "page" : undefined}
              className={clsx(
                "flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm",
                // Active is ink + weight + a rule. Never red: red is stamps
                // and alerts only (spec §4).
                active(d.href)
                  ? "bg-background font-semibold text-foreground shadow-[inset_2px_0_0_hsl(var(--foreground))]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span aria-hidden>{d.icon}</span>
              {d.label}
            </Link>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-2.5">
          <button
            onClick={logout}
            className="min-h-11 rounded-md px-2 text-left text-xs text-muted-foreground underline hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </nav>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile: the bar. env(safe-area-inset-bottom) keeps it clear of the
          home indicator — this is a web app, so the browser's own chrome sits
          below it and this MUST be checked on a real phone, not a narrow
          desktop window. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {DESTINATIONS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            aria-current={active(d.href) ? "page" : undefined}
            className={clsx(
              "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[10px]",
              active(d.href)
                ? "font-semibold text-foreground shadow-[inset_0_2px_0_hsl(var(--foreground))]"
                : "text-muted-foreground",
            )}
          >
            <span aria-hidden className="text-[15px] leading-tight">{d.icon}</span>
            {d.label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[10px] text-muted-foreground"
        >
          <span aria-hidden className="text-[15px] leading-tight">◍</span>
          Account
        </button>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Swap it into the layout**

In `apps/web/src/app/layout.tsx`, replace the `NavBar` import with:

```ts
import AppShell from "@/components/AppShell";
```

and replace `<NavBar />` plus its sibling `{children}` so children are wrapped:

```tsx
<Providers>
  <AppShell>{children}</AppShell>
</Providers>
```

- [ ] **Step 3: Delete the old nav**

```bash
rm apps/web/src/components/NavBar.tsx
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors. A failure means something still imports `NavBar`.

- [ ] **Step 5: Verify both breakpoints**

Run: `pnpm --filter web dev`. Log in, then:
- At 375px wide: bottom bar with Send / History / Account. No top nav.
- At 1200px wide: left rail, no bottom bar. Active destination has an ink rule, **not red**.
- On `/`, `/auth/login`, and `/claim/<id>`: no nav at all.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/AppShell.tsx apps/web/src/app/layout.tsx
git rm --cached apps/web/src/components/NavBar.tsx 2>/dev/null || true
git add -A apps/web/src/components/
git commit -m "feat(web): AppShell — bottom bar on mobile, left rail on desktop

Replaces NavBar, which put navigation at the top of a phone screen out of
thumb reach with logout beside primary destinations."
```

---

## Task 5: Theme toggle

**Files:**
- Create: `apps/web/src/components/ThemeToggle.tsx`, `apps/web/src/app/(sender)/account/page.tsx`
- Modify: `apps/web/src/app/layout.tsx` (no-flash script), `apps/web/src/components/AppShell.tsx` (mount the toggle; point the mobile Account tab at the new page)

**Interfaces:**
- Consumes: the `data-theme` blocks from Task 1; `AppShell` from Task 4.
- Produces: `<ThemeToggle className?={string} />`. Writes `localStorage["theme"]` = `"light" | "dark"`, or removes the key for system. Stamps/removes `data-theme` on `document.documentElement`.

> **Three states, not two.** `system` removes the attribute entirely so the media query decides; `light`/`dark` stamp it and win on specificity — `:root[data-theme="light"]` is (0,2,0) against the media query's `:root` at (0,1,0). Without the `light` attribute block from Task 1, a user choosing Light on a dark-mode OS would still get dark; that block is the whole point.
>
> **Do not add `darkMode` to `tailwind.config.ts`.** There are no `dark:` utilities — the theme lives entirely in tokens. Adding `darkMode: 'selector'` would be config for nothing.

- [ ] **Step 1: Add the no-flash script**

In `apps/web/src/app/layout.tsx`, inside `<head>` (add one if the file has none), **before** any stylesheet:

```tsx
        <script
          // Runs before first paint: without it the page renders with the OS
          // theme and then snaps to the stored choice — a visible flash on
          // every load. Deliberately not a component: React would be too late.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
```

> No `matchMedia` here on purpose: if there is no stored choice we leave the attribute unset and let the media query do it, which is instant and needs no JS.

- [ ] **Step 2: Create the toggle**

Create `apps/web/src/components/ThemeToggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type Theme = "system" | "light" | "dark";

const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };
const ICON: Record<Theme, string> = { system: "◐", light: "☀", dark: "☾" };

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    // Remove the attribute so the media query takes over again.
    root.removeAttribute("data-theme");
    localStorage.removeItem("theme");
  } else {
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  // Always start at "system": the server cannot know localStorage, so any other
  // initial value would mismatch on hydration. The inline script in layout.tsx
  // has already stamped the real theme, so there is nothing to correct visually.
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setTheme(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  const cycle = () => {
    const next = NEXT[theme];
    apply(next);
    setTheme(next);
  };

  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}. Activate to switch to ${LABEL[NEXT[theme]]}.`}
      className={clsx(
        "flex min-h-11 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <span aria-hidden className="text-sm">{ICON[theme]}</span>
      {LABEL[theme]}
    </button>
  );
}
```

- [ ] **Step 3: Mount it in the shell**

In `apps/web/src/components/AppShell.tsx`, import it:

```ts
import { ThemeToggle } from "./ThemeToggle";
```

In the **desktop rail**, replace the `<div className="mt-auto flex items-center gap-2 border-t border-border pt-2.5">` block with:

```tsx
        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-2">
          <ThemeToggle />
          <button
            onClick={logout}
            className="flex min-h-11 items-center rounded-md px-2 text-left text-xs text-muted-foreground underline hover:text-foreground"
          >
            Log out
          </button>
        </div>
```

**Also build a minimal `/account` screen, and point the mobile tab at it.** This resolves two problems the Task 4 review surfaced:

1. The mobile bar's third tab is labelled **"Account" but only logs you out** — there is no account screen. That is a mislabel, and a regression in exposure: the old `NavBar` had logout as a small side link, whereas this bar gives it a full-width tab in the thumb zone, sized like Send and History, with no confirmation. A stray tap costs the session.
2. The theme toggle otherwise lives only in the desktop rail, leaving mobile users unable to override their OS — a real gap in a mobile-first app.

One small screen fixes both. Create `apps/web/src/app/(sender)/account/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Slip } from "@/components/Slip";
import { clearToken } from "@/lib/api";

export default function AccountPage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-3.5 px-4 py-6 md:py-10">
      <div className="flex items-baseline justify-between border-b-2 border-foreground pb-2">
        <h1 className="font-display text-base font-bold">Account</h1>
      </div>

      <Slip className="flex flex-col gap-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
          Appearance
        </span>
        <ThemeToggle className="-ml-2" />
      </Slip>

      {/* Logout is destructive and deliberately NOT a primary tab: it lives here,
          one level in, where a stray thumb cannot reach it. */}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          clearToken();
          router.push("/");
        }}
      >
        Log out
      </Button>
    </main>
  );
}
```

> `Slip` comes from Task 6, which runs after this one. **If Task 6 has not landed yet, use a plain `<div className="rounded-md border border-border bg-surface p-3">` instead and leave a `TODO(next): use Slip once Task 6 lands`** — do not invent your own Slip.

Then in `AppShell.tsx`, make Account a real destination rather than a disguised logout button. Add it to `DESTINATIONS`:

```tsx
const DESTINATIONS = [
  { href: "/send", label: "Send", icon: "✎" },
  { href: "/history", label: "History", icon: "☰" },
  { href: "/account", label: "Account", icon: "◍" },
] as const;
```

and **delete the mobile bar's `<button onClick={logout}>`** entirely — the bar becomes three `DESTINATIONS` links. The desktop rail keeps its own logout button in the footer alongside the toggle (a rail is not a thumb zone), so `logout` stays in use there.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 5: Verify all three states, and the flash**

Run: `pnpm --filter web dev`, log in, view at ≥768px.

1. Set your OS to **dark**. Load the app → dark. The toggle reads **System**.
2. Click → **Light**. The page turns light **even though the OS is dark**. *This is the case the `[data-theme="light"]` block exists for; if it stays dark, that block is missing or is losing on specificity.*
3. Click → **Dark**. Click → **System**; the page follows the OS again.
4. Choose **Light**, then hard-reload. **There must be no dark flash before it settles.** A flash means the inline script is missing, is after the stylesheet, or is not in `<head>`.
5. In devtools, confirm `<html>` gains/loses `data-theme` and `localStorage.theme` tracks it.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ThemeToggle.tsx apps/web/src/components/AppShell.tsx apps/web/src/app/layout.tsx
git commit -m "feat(web): three-state theme toggle (system/light/dark)

Stamps data-theme on <html>; system removes it so the media query decides.
The [data-theme=light] block is what lets an explicit Light choice survive a
dark OS — it wins on specificity (0,2,0) over :root inside the media query.
Inline head script prevents the flash; React would run too late."
```

---

## Task 6: Slip, Stamp, and CustodyChain

**Files:**
- Create: `apps/web/src/components/Slip.tsx`, `apps/web/src/components/Stamp.tsx`, `apps/web/src/components/CustodyChain.tsx`
- Delete: `apps/web/src/components/TxStatusStepper.tsx` (after Task 9 stops importing it)

**Interfaces:**
- Consumes: `TransferStatus`, `TRANSFER_STEPS` from `@stellarsend/shared/constants`; `TransferEvent` from `@stellarsend/shared`.
- Produces:
  - `<Slip>{children}</Slip>` and `<SlipLine label={string} value={ReactNode} total?={boolean} />`
  - `<Stamp text={string} sub?={string} />`
  - `<CustodyChain status={TransferStatus} events={TransferEvent[]} />`

- [ ] **Step 1: Create Slip**

Create `apps/web/src/components/Slip.tsx`:

```tsx
import clsx from "clsx";

/** The receipt block: a bordered panel of label/figure lines. */
export function Slip({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-md border border-border bg-surface p-3", className)} {...props} />;
}

export function SlipLine({
  label,
  value,
  total = false,
}: {
  label: string;
  value: React.ReactNode;
  /** The line under the dashed rule — what they actually receive. */
  total?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-baseline justify-between gap-3 py-1 text-xs",
        total && "mt-1.5 border-t border-dashed border-border pt-2",
      )}
    >
      <span className={clsx(total ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={clsx(
          "font-mono font-medium tabular-nums",
          total ? "text-base font-semibold" : "text-xs",
        )}
      >
        {value}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create Stamp**

Create `apps/web/src/components/Stamp.tsx`:

```tsx
/**
 * The validation stamp — the one place red is spent (spec §4).
 * Its MEANING is carried by `text`, never by its colour: SETTLED, TERVERIFIKASI
 * and GAGAL all stamp in the same official red and the word disambiguates.
 * That satisfies "never colour alone" by construction.
 */
export function Stamp({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="inline-flex -rotate-3 flex-col items-center gap-px rounded-md border-[2.5px] border-stamp px-2.5 py-1.5 text-stamp">
      <span className="font-mono text-xs font-semibold tracking-[0.1em]">{text}</span>
      {sub && <span className="font-mono text-[7.5px] tracking-[0.07em]">{sub}</span>}
    </div>
  );
}
```

- [ ] **Step 3: Create CustodyChain**

Create `apps/web/src/components/CustodyChain.tsx`:

```tsx
import clsx from "clsx";
import { TRANSFER_STEPS, type TransferStatus } from "@stellarsend/shared/constants";
import type { TransferEvent } from "@stellarsend/shared";

const LABEL: Record<string, string> = {
  PENDING: "Pending",
  FUNDED: "Funded",
  SUBMITTED: "Submitted to Stellar",
  SETTLED: "Settled on ledger",
  PAYOUT_PENDING: "Payout pending",
  COMPLETED: "Completed",
};

/**
 * Renders the REAL transferEvents rows against TRANSFER_STEPS. A step with no
 * event renders as pending — never invent one (CLAUDE.md: never fabricate).
 * Green = done, filled ink + bold = current, hollow = pending. Position and
 * weight carry the state alongside colour, so it reads without hue.
 */
export function CustodyChain({
  status,
  events,
}: {
  status: TransferStatus;
  events: TransferEvent[];
}) {
  const seen = new Map(events.map((e) => [e.status, e]));
  const currentIndex = TRANSFER_STEPS.indexOf(status);

  return (
    <ol className="flex flex-col">
      {TRANSFER_STEPS.map((step, i) => {
        const event = seen.get(step);
        const done = i < currentIndex;
        const current = i === currentIndex;
        const last = i === TRANSFER_STEPS.length - 1;

        return (
          <li key={step} className="grid grid-cols-[16px_1fr] items-start gap-2.5">
            <div className="flex h-full flex-col items-center">
              <span
                aria-hidden
                className={clsx(
                  "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px]",
                  done && "border-success bg-success",
                  current && "border-foreground bg-foreground",
                  !done && !current && "border-border",
                )}
              />
              {!last && (
                <span
                  aria-hidden
                  className={clsx("min-h-[13px] w-[1.5px] flex-1", done ? "bg-success" : "bg-border")}
                />
              )}
            </div>
            <div className="pb-2">
              <p
                className={clsx(
                  "text-xs",
                  current && "font-semibold",
                  !done && !current && "text-muted-foreground",
                )}
              >
                {LABEL[step] ?? step}
              </p>
              {/* Absent event => no timestamp. We do not guess one. */}
              {event && (
                <p className="font-mono text-[9.5px] tabular-nums text-muted-foreground">
                  {new Date(event.createdAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

> If `TRANSFER_STEPS` does not include `FAILED`/`REFUNDED` (it does not — see `constants.ts:45`), `currentIndex` is `-1` for a failed transfer and every step renders as pending. That is correct and honest: a failed transfer has no custody chain to show. Task 7 renders the failure separately.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/Slip.tsx apps/web/src/components/Stamp.tsx apps/web/src/components/CustodyChain.tsx
git commit -m "feat(web): Slip, Stamp, CustodyChain components

Stamp carries meaning in its text, not its hue. CustodyChain renders real
transferEvents only — a step with no event stays pending rather than being
invented."
```

---

## Task 7: CurrencyPicker and CurrencyPair

**Files:**
- Create: `apps/web/src/components/CurrencyPicker.tsx`, `apps/web/src/components/CurrencyPair.tsx`

**Interfaces:**
- Consumes: `FIAT_ASSET_CODES`, `FiatAssetCode` from `@stellarsend/shared/constants`.
- Produces:
  - `<CurrencyPicker open={boolean} title={string} options={readonly FiatAssetCode[]} value={FiatAssetCode} onSelect={(c: FiatAssetCode) => void} onClose={() => void} />`
  - `<CurrencyPair source={FiatAssetCode} dest={FiatAssetCode} options={readonly FiatAssetCode[]} onSourceChange={(c) => void} onDestChange={(c) => void} onSwap={() => void} />`
  - `CURRENCY_NAMES: Record<string, string>`

> **`options` is a prop, not a hardcoded list.** Plan 2 widens the asset set to 11; this component must not need touching when it does. Search appears at ≥8 options — below that it is noise.

- [ ] **Step 1: Create the picker**

Create `apps/web/src/components/CurrencyPicker.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { FiatAssetCode } from "@stellarsend/shared/constants";

export const CURRENCY_NAMES: Record<string, string> = {
  IDR: "Indonesian Rupiah",
  VND: "Vietnamese Dong",
  PHP: "Philippine Peso",
};

/** Below this, search is noise rather than help. */
const SEARCH_THRESHOLD = 8;

export function CurrencyPicker({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  options: readonly FiatAssetCode[];
  value: FiatAssetCode;
  onSelect: (c: FiatAssetCode) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      searchRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (c) => c.toLowerCase().includes(q) || (CURRENCY_NAMES[c] ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-foreground/50 md:items-center md:justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[80vh] w-full flex-col border-t-2 border-foreground bg-surface md:h-auto md:max-h-[70vh] md:max-w-sm md:rounded-md md:border-2"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-[15px] font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-11 w-11 shrink-0 place-items-center font-mono text-[15px] text-muted-foreground"
          >
            ✕
          </button>
        </div>

        {options.length >= SEARCH_THRESHOLD && (
          <div className="shrink-0 px-4 pb-2 pt-3">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${options.length} currencies…`}
              aria-label="Search currencies"
              className="min-h-11 w-full rounded-md border border-foreground bg-transparent px-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {shown.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              No currency matches “{query}”.
            </p>
          ) : (
            shown.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onSelect(c);
                  onClose();
                }}
                aria-current={c === value ? "true" : undefined}
                className={clsx(
                  "flex min-h-11 w-full items-center gap-3 border-b border-border px-4 text-left",
                  c === value && "bg-background",
                )}
              >
                <span className="w-10 shrink-0 font-mono text-[13.5px] font-semibold">{c}</span>
                <span
                  className={clsx(
                    "flex-1 text-xs",
                    c === value ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {CURRENCY_NAMES[c] ?? c}
                </span>
                {c === value && <span className="text-sm font-bold text-success" aria-hidden>✓</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the pair**

Create `apps/web/src/components/CurrencyPair.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { FiatAssetCode } from "@stellarsend/shared/constants";
import { CurrencyPicker } from "./CurrencyPicker";

/**
 * The pair owns BOTH currency choices. The amount field shows its currency as
 * a plain unit label and never as a control — showing the source picker twice
 * is what made the destination look unchoosable (spec §9).
 */
export function CurrencyPair({
  source,
  dest,
  options,
  onSourceChange,
  onDestChange,
  onSwap,
}: {
  source: FiatAssetCode;
  dest: FiatAssetCode;
  options: readonly FiatAssetCode[];
  onSourceChange: (c: FiatAssetCode) => void;
  onDestChange: (c: FiatAssetCode) => void;
  onSwap: () => void;
}) {
  const [openSide, setOpenSide] = useState<"source" | "dest" | null>(null);

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2">
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">From</span>
          <button
            onClick={() => setOpenSide("source")}
            aria-label={`Change send currency, currently ${source}`}
            className="inline-flex min-h-[30px] items-center gap-1.5 rounded-md border border-foreground bg-background px-2 py-0.5 font-mono text-[15px] font-semibold"
          >
            {source} <span aria-hidden className="text-[9px] opacity-70">▼</span>
          </button>
        </div>

        {/* 44px target, 30px visual inset inside it — WCAG 2.5.8. */}
        <button
          onClick={onSwap}
          aria-label="Swap send and receive currencies"
          className="grid h-11 w-11 shrink-0 place-items-center"
        >
          <span
            aria-hidden
            className="grid h-[30px] w-[30px] place-items-center rounded-full border border-foreground bg-background text-xs"
          >
            ⇄
          </span>
        </button>

        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">To</span>
          <button
            onClick={() => setOpenSide("dest")}
            aria-label={`Change receive currency, currently ${dest}`}
            className="inline-flex min-h-[30px] items-center gap-1.5 rounded-md border border-foreground bg-background px-2 py-0.5 font-mono text-[15px] font-semibold"
          >
            {dest} <span aria-hidden className="text-[9px] opacity-70">▼</span>
          </button>
        </div>
      </div>

      {/* The architecture, made visible. This is the pitch on the screen. */}
      <p className="mt-1.5 text-center font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
        Routed via XLM · any pair
      </p>

      <CurrencyPicker
        open={openSide === "source"}
        title="Send currency"
        options={options}
        value={source}
        onSelect={onSourceChange}
        onClose={() => setOpenSide(null)}
      />
      <CurrencyPicker
        open={openSide === "dest"}
        title="Receive currency"
        options={options}
        value={dest}
        onSelect={onDestChange}
        onClose={() => setOpenSide(null)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/CurrencyPicker.tsx apps/web/src/components/CurrencyPair.tsx
git commit -m "feat(web): CurrencyPair and CurrencyPicker

Both sides are real controls with visible affordances. Options are a prop so
the 3->11 asset expansion does not touch this component."
```

---

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
