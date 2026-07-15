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
