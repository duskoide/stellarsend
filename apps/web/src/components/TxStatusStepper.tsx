"use client";

import clsx from "clsx";
import { TRANSFER_STEPS } from "@stellarsend/shared/constants";
import type { TransferStatus, TransferEvent } from "@stellarsend/shared";
import { Alert } from "@/components/ui/alert";

const LABELS: Record<string, string> = {
  PENDING: "Created",
  FUNDED: "Funded",
  SUBMITTED: "Submitted to Stellar",
  SETTLED: "Settled on-chain",
  PAYOUT_PENDING: "Payout in progress",
  COMPLETED: "Money delivered",
};

const HINTS: Record<string, string> = {
  PENDING: "Transfer created from a locked quote",
  FUNDED: "Sender's funds received",
  SUBMITTED: "Path payment broadcast to the network",
  SETTLED: "Confirmed in a Stellar ledger — irreversible",
  PAYOUT_PENDING: "Anchor disbursing to the bank / e-wallet",
  COMPLETED: "Recipient has the funds",
};

export function TxStatusStepper({
  status,
  events = [],
}: {
  status: TransferStatus;
  events?: TransferEvent[];
}) {
  if (status === "FAILED" || status === "REFUNDED") {
    // Show the real reason — a silent failure is the worst thing to demo.
    const last = [...events].reverse().find((e) => e.status === status);
    return (
      <Alert variant="danger" className="space-y-1">
        <p className="font-semibold">
          Transfer {status === "FAILED" ? "failed" : "refunded"}
        </p>
        {last?.message && <p className="text-xs opacity-90">{last.message}</p>}
      </Alert>
    );
  }

  const currentIdx = TRANSFER_STEPS.indexOf(status);
  // Timestamp per step, from the append-only event log.
  const timeOf = (step: string) => {
    const e = events.find((ev) => ev.status === step);
    return e ? new Date(e.createdAt).toLocaleTimeString() : null;
  };

  return (
    <ol className="relative flex flex-col">
      {TRANSFER_STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const last = idx === TRANSFER_STEPS.length - 1;
        const ts = timeOf(step);

        return (
          <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
            {/* connector */}
            {!last && (
              <span
                aria-hidden
                className={clsx(
                  "absolute left-[11px] top-6 h-full w-px",
                  done ? "bg-primary" : "bg-muted",
                )}
              />
            )}

            <span
              className={clsx(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? "✓" : idx + 1}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={clsx(
                    "text-sm",
                    done && "font-medium",
                    active && "font-semibold",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {LABELS[step] ?? step}
                </span>
                {ts && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{ts}</span>}
              </div>

              {/* Only the active step explains itself — keeps the list scannable. */}
              {active && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  {HINTS[step]}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
