"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { TransferStatus } from "@stellarsend/shared";

const STATUS_VARIANT: Record<TransferStatus, BadgeProps["variant"]> = {
  PENDING: "neutral",
  FUNDED: "neutral",
  SUBMITTED: "neutral",
  SETTLED: "neutral",
  PAYOUT_PENDING: "neutral",
  COMPLETED: "success",
  FAILED: "danger",
  REFUNDED: "warning",
};

export default function HistoryPage() {
  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => api.transfers.list(),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-12">
      <CardTitle>Transfer history</CardTitle>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {transfers?.map((t) => (
        <Link
          key={t.id}
          href={`/status/${t.id}`}
          className="rounded-lg transition-colors hover:bg-muted/50"
        >
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {formatCurrency(t.sourceAmount, t.sourceAsset)} →{" "}
                {formatCurrency(t.destAmount, t.destAsset)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(t.createdAt).toLocaleString()}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[t.status] ?? "neutral"}>{t.status}</Badge>
          </Card>
        </Link>
      ))}
      {transfers?.length === 0 && (
        <p className="text-sm text-muted-foreground">No transfers yet.</p>
      )}
    </main>
  );
}
