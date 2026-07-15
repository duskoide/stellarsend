import { forwardRef } from "react";
import clsx from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field invalid: red border + aria-invalid, independent of any message shown elsewhere. */
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={error || undefined}
        className={clsx(
          "flex min-h-11 w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "disabled:opacity-50 disabled:pointer-events-none",
          // Control borders must be --foreground (12.09:1 light / 10.49:1 night) to pass
          // WCAG 1.4.11's 3:1 contrast ratio. --border is 1.35:1, suitable only for grouping.
          error ? "border-danger" : "border-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
