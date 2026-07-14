import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import NavBar from "@/components/NavBar";

export const runtime = "edge";

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
    <html lang="en">
      <body>
        <NavBar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
