"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { clearToken } from "@/lib/api";

export default function AccountPage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-3.5 px-4 py-6 md:py-10">
      <div className="flex items-baseline justify-between border-b-2 border-foreground pb-2">
        <h1 className="font-display text-base font-bold">Account</h1>
      </div>

      {/* TODO(next): use Slip once Task 6 lands */}
      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">
          Appearance
        </span>
        <ThemeToggle className="-ml-2" />
      </div>

      {/* Logout is destructive and deliberately NOT a primary tab: it lives here,
          one level in, where a stray thumb cannot reach it. */}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          clearToken();
          router.push("/");
        }}
      >
        Log out
      </Button>
    </main>
  );
}
