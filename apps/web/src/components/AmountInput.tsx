"use client";

import { Input } from "@/components/ui/input";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  assetCode: string;
  label?: string;
}

export function AmountInput({ value, onChange, assetCode, label }: AmountInputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
      <div className="flex items-center gap-2">
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            // allow only digits + one decimal point
            if (/^\d*\.?\d*$/.test(v)) onChange(v);
          }}
        />
        <span className="w-16 shrink-0 text-sm font-medium text-muted-foreground">
          {assetCode}
        </span>
      </div>
    </div>
  );
}
