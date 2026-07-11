// Keypair / trustline helpers. Requires nodejs_compat (ed25519 + Buffer).
// SPIKE THIS ON DAY 1 — this is the load-bearing Worker runtime risk (spec §7, §11).

import {
  Keypair,
  Operation,
  Asset,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import type { Env } from "../env.js";
import { server, networkPassphrase } from "./horizon.js";

export function distributorKeypair(env: Env): Keypair {
  return Keypair.fromSecret(env.DISTRIBUTOR_SECRET);
}

// Fund a testnet account via friendbot.
export async function fundWithFriendbot(publicKey: string): Promise<void> {
  const res = await fetch(
    `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`,
  );
  if (!res.ok) {
    throw new Error(`Friendbot failed: ${res.status} ${await res.text()}`);
  }
}

// Establish a trustline from `account` (secret) to `asset`.
export async function createTrustline(
  env: Env,
  accountSecret: string,
  asset: Asset,
): Promise<string> {
  const kp = Keypair.fromSecret(accountSecret);
  const srv = server(env);
  const account = await srv.loadAccount(kp.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(env),
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(60)
    .build();

  tx.sign(kp);
  const res = await srv.submitTransaction(tx);
  return res.hash;
}
