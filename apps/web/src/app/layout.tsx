import type { Metadata } from "next";
import { Open_Sans, Poppins, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import NavBar from "@/components/NavBar";

export const runtime = "edge";

// Corporate design system type scale (.agents/skills/design-system/SKILL.md):
// primary=Open Sans, display=Poppins, mono=IBM Plex Mono.
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
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
    <html lang="en" className={`${openSans.variable} ${poppins.variable} ${plexMono.variable}`}>
      <body>
        <NavBar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
