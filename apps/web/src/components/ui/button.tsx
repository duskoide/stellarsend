import { forwardRef } from "react";
import clsx from "clsx";
import { Spinner } from "./spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Shows an inline spinner and disables the control without changing layout. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={clsx(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
          "transition-colors disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95",
          variant === "secondary" &&
            "bg-muted text-foreground hover:bg-muted/70 active:bg-muted/80",
          variant === "ghost" &&
            "bg-transparent text-foreground hover:bg-muted active:bg-muted/80",
          variant === "danger" &&
            "bg-danger text-danger-foreground hover:bg-danger/90 active:bg-danger/95",
          className,
        )}
        {...props}
      >
        {loading && <Spinner className="h-4 w-4" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
