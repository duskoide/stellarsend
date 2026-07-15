"use client";

import { useId } from "react";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  assetCode: string;
  label?: string;
}

export function AmountInput({ value, onChange, assetCode, label }: AmountInputProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <div className="flex items-baseline gap-2 border-b border-foreground pb-2.5">
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            // allow only digits + one decimal point
            if (/^\d*\.?\d*$/.test(v)) onChange(v);
          }}
          className="w-full min-w-0 bg-transparent font-mono text-[33px] font-medium tracking-[-0.03em] tabular-nums text-foreground outline-none"
        />
        {/* A unit label. The pair below owns currency selection. */}
        <span className="ml-auto shrink-0 font-mono text-[13px] font-medium text-muted-foreground">
          {assetCode}
        </span>
      </div>
    </div>
  );
}
