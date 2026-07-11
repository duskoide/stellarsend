"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { PayoutMethod } from "@stellarsend/shared/constants";

export default function ClaimPage({ params }: { params: { id: string } }) {
  const [method, setMethod] = useState<PayoutMethod>("BANK_TRANSFER");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: claim, isLoading } = useQuery({
    queryKey: ["claim", params.id],
    queryFn: () => api.claims.get(params.id),
  });

  const handlePayout = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.claims.payout(params.id, { method });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <main className="p-8 text-center text-muted-foreground">Loading…</main>;
  }
  if (!claim) {
    return <main className="p-8 text-center text-red-600">Claim not found.</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full space-y-4">
        <CardTitle>Claim your funds</CardTitle>
        <p className="text-2xl font-semibold text-primary">
          {formatCurrency(claim.destAmount, claim.destAsset)}
        </p>
        {done ? (
          <p className="text-sm text-green-700">
            Payout requested — you&apos;ll be notified once it lands.
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                variant={method === "BANK_TRANSFER" ? "primary" : "secondary"}
                onClick={() => setMethod("BANK_TRANSFER")}
              >
                Bank transfer
              </Button>
              <Button
                variant={method === "EWALLET" ? "primary" : "secondary"}
                onClick={() => setMethod("EWALLET")}
              >
                E-wallet
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" onClick={handlePayout} disabled={submitting}>
              {submitting ? "Requesting…" : "Claim now"}
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
