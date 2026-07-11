import clsx from "clsx";
import { TRANSFER_STEPS } from "@stellarsend/shared/constants";
import type { TransferStatus } from "@stellarsend/shared";

const LABELS: Record<string, string> = {
  PENDING: "Created",
  FUNDED: "Funded",
  SUBMITTED: "Submitted",
  SETTLED: "Settled on-chain",
  PAYOUT_PENDING: "Payout pending",
  COMPLETED: "Completed",
};

export function TxStatusStepper({ status }: { status: TransferStatus }) {
  if (status === "FAILED" || status === "REFUNDED") {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        Transfer {status.toLowerCase()}
      </div>
    );
  }

  const currentIdx = TRANSFER_STEPS.indexOf(status);

  return (
    <ol className="flex flex-col gap-3">
      {TRANSFER_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={clsx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {idx + 1}
            </span>
            <span className={clsx("text-sm", done ? "font-medium" : "text-muted-foreground")}>
              {LABELS[step] ?? step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
