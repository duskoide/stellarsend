"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AmountInput } from "@/components/AmountInput";
import { QuoteCard } from "@/components/QuoteCard";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useQuote } from "@/hooks/useQuote";
import { api, getToken } from "@/lib/api";
import { ASSET_CODE } from "@stellarsend/shared/constants";
import type { Beneficiary } from "@stellarsend/shared";

type Step = "idle" | "creating" | "funding" | "submitting";

const STEP_LABEL: Record<Step, string> = {
  idle: "Confirm & send",
  creating: "Creating transfer…",
  funding: "Funding…",
  submitting: "Submitting to Stellar…",
};

export default function SendPage() {
  const router = useRouter();
  const recipientId = useId();
  const [amount, setAmount] = useState("100");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [showNewBen, setShowNewBen] = useState(false);
  const [newBen, setNewBen] = useState({ fullName: "", bankName: "", accountNumber: "" });
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const quote = useQuote();

  // Load the user's saved recipients so nobody has to paste an opaque ID.
  useEffect(() => {
    if (!getToken()) {
      router.push("/auth/login");
      return;
    }
    api.beneficiaries
      .list()
      .then((list) => {
        setBeneficiaries(list);
        if (list[0]) setBeneficiaryId(list[0].id);
        else setShowNewBen(true);
      })
      .catch(() => setShowNewBen(true));
  }, [router]);

  const handleAddBeneficiary = async () => {
    setError(null);
    try {
      const created = await api.beneficiaries.create({
        fullName: newBen.fullName,
        method: "BANK_TRANSFER",
        bankName: newBen.bankName,
        accountNumber: newBen.accountNumber,
      });
      setBeneficiaries((b) => [...b, created]);
      setBeneficiaryId(created.id);
      setShowNewBen(false);
      setNewBen({ fullName: "", bankName: "", accountNumber: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add recipient");
    }
  };

  const handleGetQuote = () => {
    setError(null);
    if (!amount) return;
    quote.mutate({
      sourceAsset: ASSET_CODE.USDC,
      sourceAmount: amount,
      destAsset: ASSET_CODE.IDR,
    });
  };

  // Quotes expire in 60s, so create → fund → submit runs as ONE action. Splitting these
  // into separate buttons invites a pause long enough to invalidate the quote.
  const handleConfirm = async () => {
    if (!quote.data || !beneficiaryId) return;
    setError(null);
    try {
      setStep("creating");
      const transfer = await api.transfers.create({
        quoteId: quote.data.quoteId,
        beneficiaryId,
      });

      setStep("funding");
      await api.transfers.fund(transfer.id);

      setStep("submitting");
      await api.transfers.submit(transfer.id); // → real tx hash, shown on the status page

      router.push(`/status/${transfer.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transfer failed";
      // Stale quote is expected if the user lingered — make the fix obvious.
      setError(
        msg.toLowerCase().includes("expired")
          ? "That quote expired (rates are locked for 60s). Tap “Get quote” again."
          : msg,
      );
      setStep("idle");
    }
  };

  const busy = step !== "idle";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-12">
      <Card className="space-y-4">
        <CardTitle>Send money</CardTitle>

        <AmountInput
          label="Amount"
          value={amount}
          onChange={setAmount}
          assetCode={ASSET_CODE.USDC}
        />

        {/* Recipient picker — no opaque IDs. */}
        <div className="space-y-2">
          <label htmlFor={recipientId} className="text-sm font-medium text-muted-foreground">
            Recipient
          </label>
          {beneficiaries.length > 0 && !showNewBen && (
            <>
              <select
                id={recipientId}
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className="w-full min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName} — {b.bankName} {b.accountNumber}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewBen(true)}
                className="rounded-sm text-xs text-primary underline"
              >
                + Add a new recipient
              </button>
            </>
          )}

          {showNewBen && (
            <div className="space-y-2 rounded-md border border-dashed border-border p-3">
              <Input
                aria-label="Recipient name"
                placeholder="Recipient name (e.g. Ibu Siti)"
                value={newBen.fullName}
                onChange={(e) => setNewBen({ ...newBen, fullName: e.target.value })}
              />
              <Input
                aria-label="Bank name"
                placeholder="Bank (e.g. BCA)"
                value={newBen.bankName}
                onChange={(e) => setNewBen({ ...newBen, bankName: e.target.value })}
              />
              <Input
                aria-label="Account number"
                placeholder="Account number"
                value={newBen.accountNumber}
                onChange={(e) => setNewBen({ ...newBen, accountNumber: e.target.value })}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleAddBeneficiary}
                  disabled={!newBen.fullName || !newBen.accountNumber}
                >
                  Save recipient
                </Button>
                {beneficiaries.length > 0 && (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowNewBen(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={handleGetQuote}
          loading={quote.isPending}
          disabled={!amount || busy}
        >
          {quote.isPending ? "Fetching live rate…" : "Get quote"}
        </Button>

        {quote.error && <Alert variant="danger">{(quote.error as Error).message}</Alert>}
      </Card>

      {quote.data && (
        <>
          <QuoteCard quote={quote.data} />

          {error && <Alert variant="danger">{error}</Alert>}

          <Button
            className="w-full"
            onClick={handleConfirm}
            loading={busy}
            disabled={!beneficiaryId}
          >
            {STEP_LABEL[step]}
          </Button>

          {busy && (
            <p className="text-center text-xs text-muted-foreground">
              Signing and broadcasting to the Stellar network…
            </p>
          )}
        </>
      )}
    </main>
  );
}
