"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api, getToken } from "@/lib/api";
import { formatCurrency, formatTxHash, stellarExpertTxUrl } from "@/lib/format";
export default function ClaimPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  // Redirect to login if not authenticated, preserving the claim URL as a return target.
  useEffect(() => {
    if (!getToken()) router.push(`/auth/login?next=/claim/${params.id}`);
  }, [router, params.id]);

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
      await api.claims.payout(params.id, { method: "BANK_TRANSFER" });
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
    return <main className="p-8 text-center text-danger">Claim not found.</main>;
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
          <Alert variant="success">
            <p className="font-semibold">✓ On-chain settlement verified</p>
            <p className="mt-0.5 text-xs opacity-90">
              The anchor payout step is simulated in this demo. In production a licensed anchor
              pays out fiat after receiving the on-chain transfer.
            </p>
          </Alert>
        )}

        {completed && claim.stellarTxHash && (
          <a
            href={stellarExpertTxUrl(claim.stellarTxHash)}
            target="_blank"
            rel="noreferrer"
            className="block break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-primary underline"
          >
            {formatTxHash(claim.stellarTxHash, 8)}
          </a>
        )}

        {failed && <Alert variant="danger">This transfer failed. No funds were disbursed.</Alert>}

        {waiting && (
          <Alert variant="neutral" className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Waiting for the payment to settle on Stellar…
          </Alert>
        )}

        {inFlight && <Alert variant="neutral">Payout in progress — simulating anchor disbursement…</Alert>}

        {claimable && (
          <>
            {error && <Alert variant="danger">{error}</Alert>}
            <Button className="w-full" loading={submitting} onClick={handlePayout}>
              {submitting ? "Requesting…" : "Claim to bank account"}
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
