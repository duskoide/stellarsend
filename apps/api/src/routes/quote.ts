// Quote route: compute rate + fee via Horizon strict-receive paths.

import { Hono } from "hono";
import Decimal from "decimal.js";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { assetFromCode } from "../stellar/assets.js";
import { findBestPath } from "../stellar/pathPayment.js";
import { badRequest } from "../utils/errors.js";
import { id } from "../utils/id.js";
import { QUOTE_TTL_MS, STELLAR_DECIMALS } from "@stellarsend/shared/constants";
import type { Quote, QuoteRequest } from "@stellarsend/shared";

const quote = new Hono<AppContext>();

// Flat demo fee (0.5%). Real pricing/spread handled by BE1 later.
const FEE_RATE = new Decimal("0.005");

quote.post("/", async (c) => {
  const body = await c.req.json<QuoteRequest>();
  if (!body.sourceAsset || !body.sourceAmount || !body.destAsset) {
    throw badRequest("sourceAsset, sourceAmount, destAsset are required");
  }

  const sendAsset = assetFromCode(body.sourceAsset, c.env);
  const destAsset = assetFromCode(body.destAsset, c.env);

  // Use source amount as sendMax to discover a destination amount via best path.
  // NOTE: this is a strict-SEND style estimate for the quote; submit uses
  // strict-receive with the locked destAmount. BE1 to refine.
  const path = await findBestPath(
    c.env,
    sendAsset,
    destAsset,
    // placeholder destAmount for discovery; refined by BE1 with strictSendPaths
    body.sourceAmount,
  ).catch(() => undefined);

  const source = new Decimal(body.sourceAmount);
  const fee = source.mul(FEE_RATE);
  const netSource = source.minus(fee);

  // Fallback demo rate if no path found on testnet (thin liquidity).
  const rate = path
    ? new Decimal(path.destination_amount).div(path.source_amount)
    : new Decimal("15870");

  const destAmount = netSource.mul(rate);

  const row = {
    id: id("clq"),
    sourceAsset: body.sourceAsset,
    sourceAmount: source.toFixed(STELLAR_DECIMALS),
    destAsset: body.destAsset,
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
