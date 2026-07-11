"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { connectWallet, type WalletConnection } from "@/lib/stellar";
import { formatTxHash } from "@/lib/format";

// Self-custody wallet connect — nice-to-have (spec §8). Safe to ignore for MVP happy path.
export function WalletConnect() {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);

  const handleConnect = async () => {
    const conn = await connectWallet();
    setWallet(conn);
  };

  if (wallet) {
    return (
      <span className="text-sm text-muted-foreground">
        Connected: {formatTxHash(wallet.publicKey)}
      </span>
    );
  }

  return (
    <Button variant="secondary" onClick={handleConnect}>
      Connect wallet
    </Button>
  );
}
