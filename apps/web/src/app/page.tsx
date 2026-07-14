import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">StellarSend</h1>
      <p className="max-w-xl text-muted-foreground">
        Send money home fast and cheap. Powered by Stellar — settle in
        seconds, fees under a cent, transparent rates.
      </p>
      <div className="flex gap-3">
        <Link href="/send">
          <Button>Send money</Button>
        </Link>
        <Link href="/auth/register">
          <Button>Create account</Button>
        </Link>
        <Link href="/auth/login">
          <Button variant="secondary">Log in</Button>
        </Link>
      </div>
    </main>
  );
}
