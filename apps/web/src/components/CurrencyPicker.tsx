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
