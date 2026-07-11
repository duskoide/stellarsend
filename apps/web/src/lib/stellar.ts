// Wallet Kit helper (self-custody, nice-to-have — spec §8). Stubbed for now.
// Wire up @creit.tech/stellar-wallets-kit or Freighter API when tackled.

export interface WalletConnection {
  publicKey: string;
  network: "TESTNET" | "PUBLIC";
}

export async function connectWallet(): Promise<WalletConnection | null> {
  // TODO: integrate Stellar Wallets Kit / Freighter (nice-to-have, spec §8).
  console.warn("connectWallet: not yet implemented — self-custody is a stretch goal");
  return null;
}
