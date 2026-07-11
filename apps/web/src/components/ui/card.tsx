import clsx from "clsx";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded-lg border border-border bg-background p-6 shadow-sm", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={clsx("text-lg font-semibold", className)} {...props} />;
}
