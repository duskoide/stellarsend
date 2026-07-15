import clsx from "clsx";
import { TRANSFER_STEPS, type TransferStatus } from "@stellarsend/shared/constants";
import type { TransferEvent } from "@stellarsend/shared";

const LABEL: Record<string, string> = {
  PENDING: "Pending",
  FUNDED: "Funded",
  SUBMITTED: "Submitted to Stellar",
  SETTLED: "Settled on ledger",
  PAYOUT_PENDING: "Payout pending",
  COMPLETED: "Completed",
};

/**
 * Renders the REAL transferEvents rows against TRANSFER_STEPS. A step with no
 * event renders as pending — never invent one (CLAUDE.md: never fabricate).
 * Green = done, filled ink + bold = current, hollow = pending. Position and
 * weight carry the state alongside colour, so it reads without hue.
 */
export function CustodyChain({
  status,
  events,
}: {
  status: TransferStatus;
  events: TransferEvent[];
}) {
  const seen = new Map(events.map((e) => [e.status, e]));
  const currentIndex = TRANSFER_STEPS.indexOf(status);

  return (
    <ol className="flex flex-col">
      {TRANSFER_STEPS.map((step, i) => {
        const event = seen.get(step);
        const done = i < currentIndex;
        const current = i === currentIndex;
        const last = i === TRANSFER_STEPS.length - 1;

        return (
          <li key={step} className="grid grid-cols-[16px_1fr] items-start gap-2.5">
            <div className="flex h-full flex-col items-center">
              <span
                aria-hidden
                className={clsx(
                  "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px]",
                  done && "border-success bg-success",
                  current && "border-foreground bg-foreground",
                  !done && !current && "border-border",
                )}
              />
              {!last && (
                <span
                  aria-hidden
                  className={clsx("min-h-[13px] w-[1.5px] flex-1", done ? "bg-success" : "bg-border")}
                />
              )}
            </div>
            <div className="pb-2">
              <p
                className={clsx(
                  "text-xs",
                  current && "font-semibold",
                  !done && !current && "text-muted-foreground",
                )}
              >
                {LABEL[step] ?? step}
              </p>
              {/* Absent event => no timestamp. We do not guess one. */}
              {event && (
                <p className="font-mono text-[9.5px] tabular-nums text-muted-foreground">
                  {new Date(event.createdAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
