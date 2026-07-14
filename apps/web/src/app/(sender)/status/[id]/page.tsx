"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { TxStatusStepper } from "@/components/TxStatusStepper";
import { useTxStatus } from "@/hooks/useTxStatus";
import { formatCurrency, formatFee, formatTxHash, stellarExpertTxUrl } from "@/lib/format";

export default function StatusPage({ params }: { params: { id: string } }) {
  const { data: transfer, isLoading, error } = useTxStatus(params.id);

  if (isLoading) {
    return <main className="p-8 text-center text-muted-foreground">Loading…</main>;
  }
  if (error || !transfer) {
    return <main className="p-8 text-center text-red-600">Transfer not found.</main>;
  }

  const done = transfer.status === "COMPLETED";
  const events = transfer.events ?? [];

  // Wall-clock time from creation to delivery — the number that beats Western Union's 2 days.
  const elapsed = (() => {
    const first = events[0];
    const last = events.find((e) => e.status === "COMPLETED");
    if (!first || !last) return null;
    const secs = Math.max(1, Math.round((last.createdAt - first.createdAt) / 1000));
    return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
  })();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-12">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle>Transfer status</CardTitle>
          {done && elapsed && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Delivered in {elapsed}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">
            {formatCurrency(transfer.sourceAmount, transfer.sourceAsset)}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="text-lg font-semibold">
            {formatCurrency(transfer.destAmount, transfer.destAsset)}
          </span>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          Fee {formatFee(transfer.feeAmount, transfer.sourceAsset)} · rate{" "}
          {Number(transfer.exchangeRate).toLocaleString()}
        </p>

        <TxStatusStepper status={transfer.status} events={events} />
      </Card>

      {/* The proof. This link is the pitch — a judge can verify it themselves, live. */}
      {transfer.stellarTxHash && (
        <Card className="space-y-2">
          <CardTitle>On-chain proof</CardTitle>
          <a
            href={stellarExpertTxUrl(transfer.stellarTxHash)}
            target="_blank"
            rel="noreferrer"
            className="block break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-primary underline"
          >
            {formatTxHash(transfer.stellarTxHash, 10)}
          </a>
          <p className="text-xs text-muted-foreground">
            Verify on Stellar Expert →
          </p>
        </Card>
      )}

      {/* Hand off to the recipient's view. Keeps the demo flowing without typing URLs. */}
      {!done && (
        <a
          href={`/claim/${transfer.id}`}
          className="rounded-md border border-input px-4 py-3 text-center text-sm font-medium hover:bg-muted"
        >
          Open recipient&apos;s view →
        </a>
      )}

      <Card className="space-y-2">
        <CardTitle>Timeline</CardTitle>
        <ul className="space-y-1.5 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="font-medium">{e.status}</span>
                {e.message && (
                  <span className="block text-xs text-muted-foreground">{e.message}</span>
                )}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {new Date(e.createdAt).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
