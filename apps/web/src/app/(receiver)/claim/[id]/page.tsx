"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Stamp } from "@/components/Stamp";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api, getToken } from "@/lib/api";
import { formatCurrency, stellarExpertTxUrl } from "@/lib/format";
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
    <main className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col gap-3.5 px-4 py-8">
      <div className="flex items-baseline justify-between border-b-2 border-foreground pb-2">
        <h1 className="font-display text-base font-bold">
          {completed ? "Uang diterima" : "Claim your funds"}
        </h1>
        <span className="font-mono text-[9px] tracking-[0.06em] text-muted-foreground">
          #{params.id.slice(-4).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5 py-4 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
          Money received
        </p>
        <p className="font-mono text-[36px] font-semibold tracking-[-0.035em] tabular-nums">
          {formatCurrency(claim.destAmount, claim.destAsset)}
        </p>
      </div>

      {completed && (
        <div className="grid place-items-center py-1">
          <Stamp text="TERVERIFIKASI" sub="STELLAR TESTNET LEDGER" />
        </div>
      )}

      {failed && <Alert variant="danger">This transfer failed. No funds were disbursed.</Alert>}

      {waiting && (
        <Alert variant="neutral" className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground" />
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

      {/* Do not soften this. The settlement is real; the payout is not. */}
      <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground">
        The anchor payout step is simulated in this demo. In production a licensed anchor pays out fiat
        after receiving the on-chain transfer. The settlement above is real and on-chain.
      </p>

      {completed && claim.stellarTxHash && (
        <a
          href={stellarExpertTxUrl(claim.stellarTxHash)}
          target="_blank"
          rel="noreferrer"
          className="mt-auto block break-all rounded-md border border-dashed border-foreground bg-surface px-2 py-1.5 font-mono text-[9px] underline"
        >
          {claim.stellarTxHash} · verify →
        </a>
      )}
    </main>
  );
}
