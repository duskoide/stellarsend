"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AmountInput } from "@/components/AmountInput";
import { QuoteCard } from "@/components/QuoteCard";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuote } from "@/hooks/useQuote";
import { api } from "@/lib/api";
import { ASSET_CODE } from "@stellarsend/shared/constants";

export default function SendPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const quote = useQuote();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetQuote = () => {
    if (!amount) return;
    quote.mutate({
      sourceAsset: ASSET_CODE.USDC,
      sourceAmount: amount,
      destAsset: ASSET_CODE.IDR,
    });
  };

  const handleConfirm = async () => {
    if (!quote.data || !beneficiaryId) return;
    setError(null);
    setSubmitting(true);
    try {
      const transfer = await api.transfers.create({
        quoteId: quote.data.quoteId,
        beneficiaryId,
      });
      router.push(`/status/${transfer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transfer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-12">
      <Card className="space-y-4">
        <CardTitle>Send money</CardTitle>
        <AmountInput
          label="Amount"
          value={amount}
          onChange={setAmount}
          assetCode={ASSET_CODE.USDC}
        />
        <Input
          placeholder="Beneficiary ID"
          value={beneficiaryId}
          onChange={(e) => setBeneficiaryId(e.target.value)}
        />
        <Button className="w-full" onClick={handleGetQuote} disabled={quote.isPending}>
          {quote.isPending ? "Fetching quote…" : "Get quote"}
        </Button>
        {quote.error && (
          <p className="text-sm text-red-600">{(quote.error as Error).message}</p>
        )}
      </Card>

      {quote.data && (
        <>
          <QuoteCard quote={quote.data} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={submitting || !beneficiaryId}
          >
            {submitting ? "Confirming…" : "Confirm & send"}
          </Button>
        </>
      )}
    </main>
  );
}
