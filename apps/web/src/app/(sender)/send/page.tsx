"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AmountInput } from "@/components/AmountInput";
import { CurrencyPair } from "@/components/CurrencyPair";
import { Slip, SlipLine } from "@/components/Slip";
import { formatCurrency, formatFee } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useQuote } from "@/hooks/useQuote";
import { api, getToken } from "@/lib/api";
import {
  ASSET_CODE,
  FIAT_ASSET_CODES,
  PAYOUT_METHOD,
  type FiatAssetCode,
  type PayoutMethod,
} from "@stellarsend/shared/constants";
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
  const [sourceAsset, setSourceAsset] = useState<FiatAssetCode>(ASSET_CODE.VND);
  const [destAsset, setDestAsset] = useState<FiatAssetCode>(ASSET_CODE.IDR);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [beneficiaryLoading, setBeneficiaryLoading] = useState(true);
  const [beneficiaryError, setBeneficiaryError] = useState<string | null>(null);
  const [showNewBen, setShowNewBen] = useState(false);
  const [addingBeneficiary, setAddingBeneficiary] = useState(false);
  const [newBen, setNewBen] = useState<{
    fullName: string;
    bankName: string;
    accountNumber: string;
    method: PayoutMethod;
  }>({ fullName: "", bankName: "", accountNumber: "", method: "BANK_TRANSFER" });
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const quote = useQuote();

  // Load the user's saved recipients so nobody has to paste an opaque ID.
  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      router.push("/auth/login");
      return;
    }

    setBeneficiaryLoading(true);
    setBeneficiaryError(null);
    api.beneficiaries
      .list()
      .then((list) => {
        if (cancelled) return;
        setBeneficiaries(list);
        if (list[0]) setBeneficiaryId(list[0].id);
        else setShowNewBen(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setBeneficiaryError(
          err instanceof Error ? err.message : "Could not load saved recipients",
        );
        setShowNewBen(true);
      })
      .finally(() => {
        if (!cancelled) setBeneficiaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleAddBeneficiary = async () => {
    setError(null);
    setAddingBeneficiary(true);
    try {
      const created = await api.beneficiaries.create({
        fullName: newBen.fullName,
        method: newBen.method,
        bankName: newBen.bankName,
        accountNumber: newBen.accountNumber,
      });
      setBeneficiaries((b) => [...b, created]);
      setBeneficiaryId(created.id);
      setShowNewBen(false);
      setNewBen({ fullName: "", bankName: "", accountNumber: "", method: "BANK_TRANSFER" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add recipient");
    } finally {
      setAddingBeneficiary(false);
    }
  };

  const handleCancelNewBeneficiary = () => {
    setError(null);
    setShowNewBen(false);
  };

  const handleGetQuote = () => {
    setError(null);
    if (!amount) return;
    quote.mutate({
      sourceAsset,
      sourceAmount: amount,
      destAsset,
    });
  };

  const handleSourceAssetChange = (next: FiatAssetCode) => {
    setSourceAsset(next);
    quote.reset();
  };

  const handleDestAssetChange = (next: FiatAssetCode) => {
    setDestAsset(next);
    quote.reset();
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
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-3.5 px-4 py-6 md:py-10">
      <Card className="space-y-4">
        <CardTitle>Send money</CardTitle>

        <AmountInput
          label="Amount to send"
          value={amount}
          onChange={setAmount}
          assetCode={sourceAsset}
        />

        <CurrencyPair
          source={sourceAsset}
          dest={destAsset}
          options={FIAT_ASSET_CODES}
          onSourceChange={handleSourceAssetChange}
          onDestChange={handleDestAssetChange}
          onSwap={() => {
            const [s, d] = [destAsset, sourceAsset];
            setSourceAsset(s);
            setDestAsset(d);
            quote.reset();
          }}
        />

        {/* Recipient picker — no opaque IDs. */}
        <div className="space-y-2">
          <label htmlFor={recipientId} className="text-sm font-medium text-muted-foreground">
            Recipient
          </label>
          {beneficiaryLoading && (
            <p className="text-sm text-muted-foreground">Loading saved recipients…</p>
          )}
          {beneficiaryError && <Alert variant="danger">{beneficiaryError}</Alert>}
          {!beneficiaryLoading && beneficiaries.length > 0 && !showNewBen && (
            <>
              <select
                id={recipientId}
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className="w-full min-h-11 rounded-md border border-foreground bg-surface px-3 py-2 text-sm"
              >
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName} — {b.bankName} {b.accountNumber}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowNewBen(true);
                }}
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
              <label
                htmlFor={`${recipientId}-method`}
                className="block text-sm font-medium text-muted-foreground"
              >
                Payout method
              </label>
              <select
                id={`${recipientId}-method`}
                value={newBen.method}
                onChange={(e) =>
                  setNewBen({ ...newBen, method: e.target.value as PayoutMethod })
                }
                className="min-h-11 w-full rounded-md border border-foreground bg-surface px-3 py-2 text-sm text-foreground"
              >
                {PAYOUT_METHOD.map((method) => (
                  <option key={method} value={method}>
                    {method === "BANK_TRANSFER" ? "Bank transfer" : "E-wallet"}
                  </option>
                ))}
              </select>
              <Input
                aria-label={newBen.method === "EWALLET" ? "Wallet provider" : "Bank name"}
                placeholder={
                  newBen.method === "EWALLET" ? "Wallet provider (e.g. GCash)" : "Bank (e.g. BCA)"
                }
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
                  loading={addingBeneficiary}
                  disabled={
                    !newBen.fullName.trim() ||
                    !newBen.bankName.trim() ||
                    !newBen.accountNumber.trim()
                  }
                >
                  {addingBeneficiary ? "Saving…" : "Save recipient"}
                </Button>
                {beneficiaries.length > 0 && (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleCancelNewBeneficiary}
                    disabled={addingBeneficiary}
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
          <Slip>
            <SlipLine label="Rate" value={`1 ${sourceAsset} = ${quote.data.exchangeRate} ${destAsset}`} />
            <SlipLine label="Our fee (0,005%)" value={formatFee(quote.data.feeAmount, sourceAsset)} />
            {/* 100 stroops = 0.00001 XLM. NOT dollars — see spec §11. */}
            <SlipLine label="Network fee" value="0.00001 XLM" />
            <SlipLine
              label="They receive"
              value={formatCurrency(quote.data.destAmount, destAsset)}
              total
            />
          </Slip>

          {error && <Alert variant="danger">{error}</Alert>}

          <Button
            className="w-full"
            onClick={handleConfirm}
            loading={busy}
            disabled={!beneficiaryId || showNewBen}
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
