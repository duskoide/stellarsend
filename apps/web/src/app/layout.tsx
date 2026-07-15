import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";
import AppShell from "@/components/AppShell";

export const runtime = "edge";

// Warkat type system — see docs/specs/2026-07-15-warkat-frontend-design.md §3.
// Inter carries body/UI. Source Serif 4 brings the document register Inter
// deliberately lacks. Geist Mono strikes the figures — grotesk-structured, so
// it reads as Inter's sibling rather than a code font that wandered in.
//
// Geist Mono comes from Vercel's `geist` package, not next/font/google: it is
// absent from Next 14's bundled font list. It exposes --font-geist-mono, a name
// it does not let us change, so tailwind.config.ts points font-mono at that.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StellarSend",
  description: "Cross-border remittance on Stellar — fast, cheap, transparent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} ${GeistMono.variable}`}>
      <head>
        <script
          // Runs before first paint: without it the page renders with the OS
          // theme and then snaps to the stored choice — a visible flash on
          // every load. Deliberately not a component: React would be too late.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
