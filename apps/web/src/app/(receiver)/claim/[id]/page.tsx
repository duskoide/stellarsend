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
  const [error, setError] = useState<string | null>(null);

  // Poll: the money arrives on-chain asynchronously (SUBMITTED → SETTLED), and payout
  // completes asynchronously too. Stop once we hit a terminal state.
  const { data: claim, isLoading } = useQuery({
    queryKey: ["claim", params.id],
    queryFn: () => api.claims.get(params.id),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "COMPLETED" || s === "FAILED" ? false : 2000;
    },
  });

  const handlePayout = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.claims.payout(params.id, { method });
      // Don't fake success — let polling report the real status.
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

  const status = claim.status;
  const completed = status === "COMPLETED";
  const failed = status === "FAILED";
  // Only settled funds can be paid out — the API enforces this, so mirror it in the UI
  // rather than letting the user click into a guaranteed error.
  const claimable = status === "SETTLED";
  const inFlight = status === "PAYOUT_PENDING";
  const waiting = status === "PENDING" || status === "FUNDED" || status === "SUBMITTED";

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full space-y-4">
        <CardTitle>{completed ? "Money received" : "Claim your funds"}</CardTitle>

        <p className="text-3xl font-bold text-primary">
          {formatCurrency(claim.destAmount, claim.destAsset)}
        </p>

        {completed && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">
              ✓ Disbursed to your account
            </p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Sent from abroad and delivered in seconds, for a fraction of a cent in network fees.
            </p>
          </div>
        )}

        {failed && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            This transfer failed. No funds were disbursed.
          </p>
        )}

        {waiting && (
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-sm text-muted-foreground">
              Waiting for the payment to settle on Stellar…
            </p>
          </div>
        )}

        {inFlight && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Payout in progress — disbursing to your account…
          </p>
        )}

        {claimable && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                How would you like to receive it?
              </label>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant={method === "BANK_TRANSFER" ? "primary" : "secondary"}
                  onClick={() => setMethod("BANK_TRANSFER")}
                >
                  Bank transfer
                </Button>
                <Button
                  className="flex-1"
                  variant={method === "EWALLET" ? "primary" : "secondary"}
                  onClick={() => setMethod("EWALLET")}
                >
                  E-wallet
                </Button>
              </div>
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
