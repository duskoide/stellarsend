// Path Payment (strict-receive): receiver is guaranteed an exact dest amount.
// XLM is enforced as the intermediary bridge asset for the current MVP.
// See spec §7. Owned by BE1.

import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Horizon,
} from "@stellar/stellar-sdk";
import Decimal from "decimal.js";
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

/** Return true only when Horizon found native XLM as an intermediate hop. */
export function hasXlmBridgeHop(
  rec: Horizon.ServerApi.PaymentPathRecord,
): boolean {
  return (rec.path ?? []).some((hop: any) => hop.asset_type === "native");
}

// Find the best (cheapest source) strict-receive XLM-bridge path.
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

  // A direct source/destination offer is not acceptable in this phase. The
  // route must visibly include native XLM as the intermediary asset.
  const bridged = records.filter(hasXlmBridgeHop);

  // Cheapest source_amount first; amounts stay decimal strings throughout.
  return bridged
    .slice()
    .sort((a, b) =>
      new Decimal(a.source_amount).comparedTo(new Decimal(b.source_amount)),
    )[0];
}

// Build (unsigned) a strict-receive path payment transaction.
// `path` = intermediate hops from findBestPath().
export async function buildPathPayment(
  env: Env,
  params: PathPaymentParams,
  path: Asset[] = [],
) {
  const srv = server(env);
  const sourceKp = Keypair.fromSecret(params.sourceSecret);
  const source = await srv.loadAccount(sourceKp.publicKey());

  return new TransactionBuilder(source, {
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
        path,
      }),
    )
    .setTimeout(60)
    .build();
}

// Map a Horizon path record's hops into Asset instances.
function hopsToAssets(rec: Horizon.ServerApi.PaymentPathRecord): Asset[] {
  return (rec.path ?? []).map((p: any) =>
    p.asset_type === "native"
      ? Asset.native()
      : new Asset(p.asset_code, p.asset_issuer),
  );
}

export interface SubmitResult {
  hash: string;
  /** Actual source amount consumed — may differ from the quote. Persist this. */
  sourceAmountUsed: string;
  path: string[];
}

// Resolve best XLM-bridge path → build → sign → submit.
// Returns hash + what was actually spent.
export async function submitPathPayment(
  env: Env,
  params: PathPaymentParams,
): Promise<SubmitResult> {
  const best = await findBestPath(env, params.sendAsset, params.destAsset, params.destAmount);

  // No XLM bridge path = no executable liquidity for this pair/amount.
  if (!best) {
    throw new Error(
      `No XLM bridge path found: ${params.sendAsset.getCode()} → ${params.destAsset.getCode()} ` +
        `for ${params.destAmount}. Seed source/XLM and XLM/destination liquidity.`,
    );
  }

  const sourceCost = new Decimal(best.source_amount);
  const sendMax = new Decimal(params.sendMax);

  // Guard: refuse if the market moved past our sendMax rather than overspending.
  if (sourceCost.gt(sendMax)) {
    throw new Error(
      `Path cost ${best.source_amount} exceeds sendMax ${params.sendMax} — re-quote.`,
    );
  }

  const hops = hopsToAssets(best);
  if (!hops.some((asset) => asset.isNative())) {
    throw new Error("Resolved path does not contain the required XLM bridge hop.");
  }

  const tx = await buildPathPayment(env, params, hops);
  tx.sign(Keypair.fromSecret(params.sourceSecret));

  const res = await server(env).submitTransaction(tx);
  return {
    hash: res.hash,
    sourceAmountUsed: best.source_amount,
    path: hops.map((a) => (a.isNative() ? "XLM" : a.getCode())),
  };
}
