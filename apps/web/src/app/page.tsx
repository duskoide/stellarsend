import Link from "next/link";
import { Button } from "@/components/ui/button";

const STATS = [
  { label: "Network fee", value: "0.00001 XLM", note: "vs. 5–10% wire fees" },
  { label: "Settlement time", value: "~5 seconds", note: "vs. 1–2 days" },
  { label: "Proof", value: "On-chain", note: "verify any transfer yourself" },
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
          Built on Stellar
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          StellarSend
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          Send money home fast and cheap. Fiat in, real Stellar path payment,
          Rupiah out — settled in seconds for a fraction of a cent.
        </p>
      </div>

      <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface p-4">
            <p className="font-display text-xl font-semibold text-primary">{s.value}</p>
            <p className="mt-1 text-xs font-medium text-foreground">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/auth/register">
          <Button className="w-48">Create account</Button>
        </Link>
        <Link href="/auth/login">
          <Button variant="secondary" className="w-48">
            Log in
          </Button>
        </Link>
      </div>
    </main>
  );
}
