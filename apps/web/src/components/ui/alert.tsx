import clsx from "clsx";

// Warkat semantics (spec §4): red is rare — alerts and stamps only.
// "info" is ink, not a brand hue: an informational note on paper is just ink.
const VARIANT = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  info: "border-foreground/20 bg-muted text-foreground",
  neutral: "border-border bg-muted text-muted-foreground",
} as const;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof VARIANT;
}

// Consistent status messaging (error, success, in-progress) — one place to
// keep the semantic-token mapping instead of ad hoc red-50/emerald-50 classes.
export function Alert({ className, variant = "info", role, ...props }: AlertProps) {
  return (
    <div
      role={role ?? (variant === "danger" ? "alert" : "status")}
      className={clsx(
        "rounded-md border px-3 py-2.5 text-sm",
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}
