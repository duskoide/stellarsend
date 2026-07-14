"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getToken, clearToken } from "@/lib/api";
import { useEffect, useState } from "react";
import clsx from "clsx";

// Pages where the nav bar should not appear.
const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register"];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getToken());
  }, [pathname]);

  if (PUBLIC_PATHS.includes(pathname) || !token) return null;

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  const linkClass = (active: boolean) =>
    clsx(
      "rounded-sm px-1 py-2 text-sm transition-colors hover:text-foreground",
      active ? "font-semibold text-primary" : "font-medium text-muted-foreground",
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/send" className="font-display text-sm font-semibold tracking-tight">
          StellarSend
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link
            href="/send"
            aria-current={pathname.startsWith("/send") || pathname.startsWith("/quote") ? "page" : undefined}
            className={linkClass(pathname.startsWith("/send") || pathname.startsWith("/quote"))}
          >
            Send
          </Link>
          <Link
            href="/history"
            aria-current={pathname.startsWith("/history") ? "page" : undefined}
            className={linkClass(pathname.startsWith("/history"))}
          >
            History
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-sm py-2 text-xs text-muted-foreground underline hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </nav>
    </header>
  );
}
