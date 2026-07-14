// Quote route: real rate discovery via Horizon strict-SEND paths.
//
// Direction matters: the sender knows how much they want to SPEND (e.g. 100 VND) and
// asks how much the destination currency arrives. That is strictSendPaths(sourceAsset,
// sourceAmount, [destAsset]). (strictReceivePaths is the inverse — used at submit time,
// where destAmount is locked.)
//
// There is deliberately NO hardcoded fallback rate. If the DEX has no path, we fail loudly:
// a quote the user can't actually execute is worse than an error (it fails at submit instead,
// after they've committed). Seed the order book — see drizzle/seed-stellar.ts.

import { Hono } from "hono";
import Decimal from "decimal.js";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import {
  assetFromCode,
  normalizeAssetCode,
  type FiatAssetCode,
} from "../stellar/assets.js";
import { hasXlmBridgeHop } from "../stellar/pathPayment.js";
import { server } from "../stellar/horizon.js";
import { badRequest } from "../utils/errors.js";
import { id } from "../utils/id.js";
import { QUOTE_TTL_MS, STELLAR_DECIMALS } from "@stellarsend/shared/constants";
import type { Quote, QuoteRequest } from "@stellarsend/shared";

const quote = new Hono<AppContext>();

// Demo service fee, taken on the source side before hitting the DEX.
// 0.005% of the selected source currency keeps the demo fee below a cent-equivalent.
const FEE_RATE = new Decimal("0.00005");

quote.post("/", async (c) => {
  const body = await c.req.json<QuoteRequest>();
  if (!body.sourceAsset || !body.sourceAmount || !body.destAsset) {
    throw badRequest("sourceAsset, sourceAmount, destAsset are required");
  }

  const source = new Decimal(body.sourceAmount);
  if (!source.isFinite() || source.lte(0)) {
    throw badRequest("sourceAmount must be a positive number");
  }

  let sourceCode: FiatAssetCode;
  let destCode: FiatAssetCode;
  try {
    sourceCode = normalizeAssetCode(body.sourceAsset);
    destCode = normalizeAssetCode(body.destAsset);
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : String(err));
  }

  const sendAsset = assetFromCode(sourceCode, c.env);
  const destAsset = assetFromCode(destCode, c.env);

  // Fee comes off the top; only the remainder is actually routed through the DEX.
  const fee = source.mul(FEE_RATE);
  const netSource = source.minus(fee);

  // Ask Horizon: spending `netSource` of sendAsset, how much destAsset arrives?
  let records;
  try {
    const res = await server(c.env)
      .strictSendPaths(sendAsset, netSource.toFixed(STELLAR_DECIMALS), [destAsset])
      .call();
    // Only quote paths that actually use native XLM as the bridge. A direct
    // source/destination offer must not silently bypass the selected route.
    records = res.records.filter(hasXlmBridgeHop);
  } catch (err: any) {
    throw badRequest(
      "Could not reach Horizon for path discovery",
      err?.message ?? String(err),
    );
  }

  // Best = most destination received for the same spend.
  const best = records
    .slice()
    .sort((a, b) => new Decimal(b.destination_amount).comparedTo(new Decimal(a.destination_amount)))[0];

  if (!best) {
    // No liquidity → no executable quote. Never invent a rate here.
    throw badRequest(
      `No XLM bridge path ${sourceCode} → ${destCode} for ${body.sourceAmount}. ` +
        `Seed source/XLM and XLM/destination liquidity — see drizzle/seed-stellar.ts.`,
    );
  }

  const destAmount = new Decimal(best.destination_amount);
  // Effective end-to-end rate the user actually gets (after our fee) — this is the honest
  // number to show: destAmount per 1 unit of GROSS source, not of netSource.
  const rate = destAmount.div(source);

  const row = {
    id: id("clq"),
    sourceAsset: sourceCode,
    sourceAmount: source.toFixed(STELLAR_DECIMALS),
    destAsset: destCode,
    destAmount: destAmount.toFixed(STELLAR_DECIMALS),
    exchangeRate: rate.toFixed(STELLAR_DECIMALS),
    feeAmount: fee.toFixed(STELLAR_DECIMALS),
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
  };
  await createDb(c.env).insert(schema.quotes).values(row);

  const res: Quote = {
    quoteId: row.id,
    sourceAsset: row.sourceAsset,
    sourceAmount: row.sourceAmount,
    destAsset: row.destAsset,
    destAmount: row.destAmount,
    exchangeRate: row.exchangeRate,
    feeAmount: row.feeAmount,
    expiresAt: row.expiresAt.toISOString(),
  };
  return c.json(res);
});

export default quote;