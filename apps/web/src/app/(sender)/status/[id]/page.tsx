"use client";

import { Stamp } from "@/components/Stamp";
import { CustodyChain } from "@/components/CustodyChain";
import { Slip } from "@/components/Slip";
import { useTxStatus } from "@/hooks/useTxStatus";
import { formatCurrency, stellarExpertTxUrl } from "@/lib/format";

export default function StatusPage({ params }: { params: { id: string } }) {
  const { data: transfer, isLoading, error } = useTxStatus(params.id);

  if (isLoading) {
    return <main className="p-8 text-center text-muted-foreground">Loading…</main>;
  }
  if (error || !transfer) {
    return <main className="p-8 text-center text-danger">Transfer not found.</main>;
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
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-3.5 px-4 py-6 md:max-w-[800px] md:flex-row md:items-start md:gap-6 md:py-10">
      <main className="flex w-full flex-col gap-3.5 md:max-w-[460px]">
        <div className="flex items-baseline justify-between border-b-2 border-foreground pb-2">
          <h1 className="font-display text-base font-bold">Transfer record</h1>
          <span className="font-mono text-[9px] tracking-[0.06em] text-muted-foreground">
            #{transfer.id.slice(-4).toUpperCase()}
          </span>
        </div>

        <div className="flex items-start justify-between gap-2.5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
              {done ? "Delivered" : "Sending"}
            </p>
            <p className="font-mono text-[25px] font-semibold tracking-[-0.03em] tabular-nums">
              {formatCurrency(transfer.destAmount, transfer.destAsset)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              from {formatCurrency(transfer.sourceAmount, transfer.sourceAsset)}
            </p>
          </div>
          {/* Elapsed only exists once we have both events. No events, no claim. */}
          {done && elapsed && <Stamp text="SETTLED" sub={`ON-CHAIN · ${elapsed}`} />}
        </div>

        {/* THE PROOF. Above the fold. A judge verifies this live. */}
        {transfer.stellarTxHash && (
          <div className="flex flex-col gap-1.5 rounded-md border border-foreground bg-surface p-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
              Stellar transaction hash
            </p>
            <p className="break-all rounded-md border border-dashed border-border bg-background px-1.5 py-1.5 font-mono text-[10px] leading-relaxed">
              {transfer.stellarTxHash}
            </p>
            <a
              href={stellarExpertTxUrl(transfer.stellarTxHash)}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold underline"
            >
              Verify on Stellar Expert →
            </a>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Slip>
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Route</p>
            <p className="pt-0.5 font-mono text-[13px] font-medium">
              {transfer.sourceAsset} → XLM → {transfer.destAsset}
            </p>
          </Slip>
          <Slip>
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Rate</p>
            <p className="pt-0.5 font-mono text-[13px] font-medium tabular-nums">{transfer.exchangeRate}</p>
          </Slip>
        </div>

        {!done && (
          <a
            href={`/claim/${transfer.id}`}
            className="min-h-11 rounded-md border border-foreground px-4 py-3 text-center text-sm font-semibold"
          >
            Open recipient&apos;s view →
          </a>
        )}
      </main>

      {/* Desktop earns a second column: the whole chain at once, not scrolled. */}
      <aside className="flex w-full flex-col gap-2 rounded-md border border-border bg-surface p-4 shadow-[var(--slip-shadow)] md:w-[300px] md:shrink-0">
        <div className="flex items-baseline justify-between border-b-2 border-foreground pb-2">
          <h2 className="font-display text-sm font-bold">Chain of custody</h2>
          <span className="font-mono text-[9px] text-muted-foreground">{events.length} EVENTS</span>
        </div>
        <CustodyChain status={transfer.status} events={events} />
      </aside>
    </div>
  );
}
