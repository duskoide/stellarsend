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
