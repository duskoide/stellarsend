import { forwardRef } from "react";
import clsx from "clsx";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
          variant === "secondary" && "bg-muted text-foreground hover:bg-muted/80",
          variant === "ghost" && "hover:bg-muted",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
