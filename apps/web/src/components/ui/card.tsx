import clsx from "clsx";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        // Paper is cut, not rounded: rounded-md is --radius (2px) after Task 1.
        // The shadow comes from a token, never a `dark:` variant — the component
        // does not know which theme it is in. In light the shadow lifts the slip
        // off the desk; in night --slip-shadow is `none` and the border does that
        // job, because a shadow cannot lift an object on a dark ground (spec §5).
        "rounded-md border border-border bg-surface p-5 shadow-[var(--slip-shadow)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={clsx("font-display text-base font-bold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={clsx("text-sm text-muted-foreground", className)} {...props} />;
}
