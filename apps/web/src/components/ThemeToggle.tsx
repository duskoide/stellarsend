"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type Theme = "system" | "light" | "dark";

const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };
const ICON: Record<Theme, string> = { system: "◐", light: "☀", dark: "☾" };

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    // Remove the attribute so the media query takes over again.
    root.removeAttribute("data-theme");
    localStorage.removeItem("theme");
  } else {
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  // Always start at "system": the server cannot know localStorage, so any other
  // initial value would mismatch on hydration. The inline script in layout.tsx
  // has already stamped the real theme, so there is nothing to correct visually.
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setTheme(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  const cycle = () => {
    const next = NEXT[theme];
    apply(next);
    setTheme(next);
  };

  return (
    <button
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}. Activate to switch to ${LABEL[NEXT[theme]]}.`}
      className={clsx(
        "flex min-h-11 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <span aria-hidden className="text-sm">{ICON[theme]}</span>
      {LABEL[theme]}
    </button>
  );
}
