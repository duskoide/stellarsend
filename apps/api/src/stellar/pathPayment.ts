// Path Payment (strict-receive): receiver is guaranteed an exact dest amount.
// See spec §7. Owned by BE1.

import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Horizon,
} from "@stellar/stellar-sdk";
import type { Env } from "../env.js";
import { server, networkPassphrase } from "./horizon.js";

export interface PathPaymentParams {
  sourceSecret: string;
  destPublicKey: string;
  sendAsset: Asset;
  sendMax: string; // upper bound to send
  destAsset: Asset;
  destAmount: string; // exact amount received
}

// Find the best (cheapest source) strict-receive path.
export async function findBestPath(
  env: Env,
  sendAsset: Asset,
  destAsset: Asset,
  destAmount: string,
): Promise<Horizon.ServerApi.PaymentPathRecord | undefined> {
  const srv = server(env);
  const { records } = await srv
    .strictReceivePaths([sendAsset], destAsset, destAmount)
    .call();
  // Cheapest source_amount first.
  return records.sort(
    (a, b) => Number(a.source_amount) - Number(b.source_amount),
  )[0];
}

// Build (unsigned) a strict-receive path payment transaction.
export async function buildPathPayment(env: Env, params: PathPaymentParams) {
  const srv = server(env);
  const sourceKp = Keypair.fromSecret(params.sourceSecret);
  const source = await srv.loadAccount(sourceKp.publicKey());

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(env),
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: params.sendAsset,
        sendMax: params.sendMax,
        destination: params.destPublicKey,
        destAsset: params.destAsset,
        destAmount: params.destAmount,
        // path left empty → Stellar auto-resolves; or pass findBestPath() result.
      }),
    )
    .setTimeout(60)
    .build();

  return tx;
}

// Build, sign, and submit. Returns the tx hash.
export async function submitPathPayment(
  env: Env,
  params: PathPaymentParams,
): Promise<string> {
  const tx = await buildPathPayment(env, params);
  tx.sign(Keypair.fromSecret(params.sourceSecret));
  const res = await server(env).submitTransaction(tx);
  return res.hash;
}
