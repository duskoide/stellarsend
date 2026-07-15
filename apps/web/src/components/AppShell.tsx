"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { getToken, clearToken } from "@/lib/api";

// Pages with no navigation. Claim is here on purpose: the recipient is not
// the account holder in spirit, so the claim screen is a standalone receipt.
const BARE_PATHS = ["/", "/auth/login", "/auth/register"];
const isBare = (p: string) => BARE_PATHS.includes(p) || p.startsWith("/claim/");

const DESTINATIONS = [
  { href: "/send", label: "Send", icon: "✎" },
  { href: "/history", label: "History", icon: "☰" },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
  }, [pathname]);

  if (isBare(pathname) || !token) return <>{children}</>;

  const active = (href: string) =>
    href === "/send"
      ? pathname.startsWith("/send") || pathname.startsWith("/quote")
      : pathname.startsWith(href);

  const logout = () => {
    clearToken();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop: the rail. Same destinations as the bar, different axis. */}
      <nav className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 md:flex">
        <Link href="/send" className="border-b border-border px-2 pb-3.5 pt-1 font-display text-base font-bold">
          StellarSend
        </Link>
        <div className="mt-2 flex flex-col gap-1">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              aria-current={active(d.href) ? "page" : undefined}
              className={clsx(
                "flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm",
                // Active is ink + weight + a rule. Never red: red is stamps
                // and alerts only (spec §4).
                active(d.href)
                  ? "bg-background font-semibold text-foreground shadow-[inset_2px_0_0_hsl(var(--foreground))]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span aria-hidden>{d.icon}</span>
              {d.label}
            </Link>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-2.5">
          <button
            onClick={logout}
            className="min-h-11 rounded-md px-2 text-left text-xs text-muted-foreground underline hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </nav>

      {/* Reserve space for the mobile bottom bar: min-h-[3.25rem] (52px) + the
          safe-area inset (~34px notched iPhone). Do NOT change this to a round
          number — it must track the bar's composition exactly. */}
      <main className="flex-1 pb-[calc(3.25rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>

      {/* Mobile: the bar. env(safe-area-inset-bottom) keeps it clear of the
          home indicator — this is a web app, so the browser's own chrome sits
          below it and this MUST be checked on a real phone, not a narrow
          desktop window. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {DESTINATIONS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            aria-current={active(d.href) ? "page" : undefined}
            className={clsx(
              "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[10px]",
              active(d.href)
                ? "font-semibold text-foreground shadow-[inset_0_2px_0_hsl(var(--foreground))]"
                : "text-muted-foreground",
            )}
          >
            <span aria-hidden className="text-[15px] leading-tight">{d.icon}</span>
            {d.label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[10px] text-muted-foreground"
        >
          <span aria-hidden className="text-[15px] leading-tight">◍</span>
          Account
        </button>
      </nav>
    </div>
  );
}
