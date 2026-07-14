"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  assetCode: string;
  label?: string;
}

export function AmountInput({ value, onChange, assetCode, label }: AmountInputProps) {
  const id = useId();
  const unitId = `${id}-unit`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          aria-describedby={unitId}
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            // allow only digits + one decimal point
            if (/^\d*\.?\d*$/.test(v)) onChange(v);
          }}
        />
        <span id={unitId} className="w-16 shrink-0 text-sm font-medium text-muted-foreground">
          {assetCode}
        </span>
      </div>
    </div>
  );
}
