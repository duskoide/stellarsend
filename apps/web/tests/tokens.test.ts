import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Strip CSS comments before any indexOf-based lookup. Without this, a comment
// that merely *mentions* a selector (e.g. explaining why the light attribute
// block exists) can be matched instead of the real rule — see blockAfter.
const css = readFileSync(join(__dirname, "../src/app/globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Read a token, failing loudly if globals.css never declares it. */
function must(tokens: Record<string, string>, name: string): string {
  const value = tokens[name];
  if (value === undefined) throw new Error(`--${name} is not declared in this theme block`);
  return value;
}

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
    // Both groups are mandatory in the pattern (no `?`), so a match always has them.
    out[m[1]!] = m[2]!.trim();
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
  // Fixed "h s% l%" shape (see the doc comment above) — split always yields 3 parts.
  const [hs, ss, ls] = css.split(/\s+/);
  const h = parseFloat(hs!), s = parseFloat(ss!) / 100, l = parseFloat(ls!) / 100;
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
  // A 2-element literal sorted in place is still a 2-element array.
  const [hi, lo] = [luminance(hslToRgb(a)), luminance(hslToRgb(b))].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
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
    expect(contrast(must(tok, fg), must(tok, bg))).toBeGreaterThanOrEqual(4.5);
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
      must(tok, "slip-shadow");
    }
  });

  it("is none in dark — a shadow cannot lift an object on a dark ground", () => {
    expect(must(darkMedia, "slip-shadow")).toBe("none");
  });
});

describe("prefers-contrast: more", () => {
  // A theme is active one of four ways, and the high-contrast overrides must
  // cover all four independently — this is exactly what the original bug
  // missed: a single `:root` block leaked stale, near-invisible values into
  // dark mode, and was silently unreachable once a theme was chosen via
  // `:root[data-theme]` (0,2,0 always beats the media block's 0,1,0).
  //
  // Locate each block with the same indexOf + tokensAfter approach blockAfter
  // uses internally, but with an explicit `from` — `blockAfter` alone always
  // matches the FIRST occurrence of a needle, and ":root[data-theme=...]"
  // each appear twice in this file (once in the real theme block, once here).
  const hcDarkMediaMarker = css.indexOf(
    "prefers-contrast: more) and (prefers-color-scheme: dark)",
  );
  // The literal "prefers-contrast: more) {" (bare media, no "and ...") occurs
  // twice: once for the light default :root override, once opening the block
  // that holds both attribute overrides. Searching from after the dark-media
  // block skips the first and lands on the second.
  const hcAttrMarker = css.indexOf("prefers-contrast: more) {", hcDarkMediaMarker);

  const hcLight = blockAfter("prefers-contrast: more) {");
  const hcDarkMedia = blockAfter("prefers-contrast: more) and (prefers-color-scheme: dark)");
  const hcLightAttr = tokensAfter(css.indexOf(':root[data-theme="light"]', hcAttrMarker));
  const hcDarkAttr = tokensAfter(css.indexOf(':root[data-theme="dark"]', hcAttrMarker));

  const CASES = [
    ["light default :root", hcLight, light],
    ["light :root[data-theme=light]", hcLightAttr, lightAttr],
    ["dark prefers-color-scheme media", hcDarkMedia, darkMedia],
    ["dark :root[data-theme=dark]", hcDarkAttr, darkAttr],
  ] as const;

  it.each(CASES)(
    "%s: --muted-foreground clears 4.5:1 (WCAG AA) on background/surface/muted",
    (_name, hc, base) => {
      for (const ground of ["background", "surface", "muted"] as const) {
        expect(
          contrast(must(hc, "muted-foreground"), must(base, ground)),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it.each(CASES)(
    "%s: --border clears 3:1 (WCAG 1.4.11 non-text) on background",
    (_name, hc, base) => {
      expect(contrast(must(hc, "border"), must(base, "background"))).toBeGreaterThanOrEqual(3);
    },
  );

  it("no high-contrast value is the old corporate-blue leftover (regression)", () => {
    for (const hc of [hcLight, hcLightAttr, hcDarkMedia, hcDarkAttr]) {
      expect(must(hc, "border")).not.toBe("215 16% 40%");
      expect(must(hc, "muted-foreground")).not.toBe("222 47% 11%");
    }
  });

  it("the explicit-theme attribute overrides match their bare/media counterparts", () => {
    // If these drift, a toggle user and an OS-preference user get different
    // high-contrast treatments for the same theme.
    expect(hcLightAttr).toEqual(hcLight);
    expect(hcDarkAttr).toEqual(hcDarkMedia);
  });
});
