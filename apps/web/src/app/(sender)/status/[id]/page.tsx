"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { TxStatusStepper } from "@/components/TxStatusStepper";
import { useTxStatus } from "@/hooks/useTxStatus";
import { formatCurrency, formatTxHash, stellarExpertTxUrl } from "@/lib/format";

export default function StatusPage({ params }: { params: { id: string } }) {
  const { data: transfer, isLoading, error } = useTxStatus(params.id);

  if (isLoading) {
    return <main className="p-8 text-center text-muted-foreground">Loading…</main>;
  }
  if (error || !transfer) {
    return <main className="p-8 text-center text-red-600">Transfer not found.</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-12">
      <Card className="space-y-4">
        <CardTitle>Transfer status</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sending {formatCurrency(transfer.sourceAmount, transfer.sourceAsset)} →{" "}
          {formatCurrency(transfer.destAmount, transfer.destAsset)}
        </p>
        <TxStatusStepper status={transfer.status} />
        {transfer.stellarTxHash && (
          <a
            href={stellarExpertTxUrl(transfer.stellarTxHash)}
            target="_blank"
            rel="noreferrer"
            className="block text-sm text-primary underline"
          >
            View on Stellar Expert ({formatTxHash(transfer.stellarTxHash)})
          </a>
        )}
      </Card>

      <Card className="space-y-2">
        <CardTitle>Timeline</CardTitle>
        <ul className="space-y-1 text-sm">
          {transfer.events.map((e) => (
            <li key={e.id} className="flex justify-between text-muted-foreground">
              <span>{e.status}</span>
              <span>{new Date(e.createdAt).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
