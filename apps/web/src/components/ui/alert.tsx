import clsx from "clsx";

const VARIANT = {
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  info: "border-primary/20 bg-primary/10 text-primary",
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
