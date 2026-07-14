// Transfer routes: create from quote, fund (anchor deposit), submit (path payment),
// get detail + events, list. Auth-protected.

import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { badRequest, notFound } from "../utils/errors.js";
import { id } from "../utils/id.js";
import { recordEvent } from "../services/events.js";
import { submitPathPayment } from "../stellar/pathPayment.js";
import { assetFromCode } from "../stellar/assets.js";
import type { Env } from "../env.js";
import type {
  CreateTransferRequest,
  Transfer,
  TransferWithEvents,
} from "@stellarsend/shared";

const transfer = new Hono<AppContext>();
transfer.use("*", authMiddleware);

// Slippage buffer on sendMax. Strict-receive guarantees the RECEIVER's amount; the source
// side can drift with the order book, so allow a little headroom above the quote.
// String math only — money never touches a float (CLAUDE.md).
const SLIPPAGE_BPS = 200n; // 2%

function withSlippage(amount: string): string {
  const [whole, frac = ""] = amount.split(".");
  const units = BigInt(whole + frac.padEnd(7, "0").slice(0, 7)); // → 7dp integer
  const padded = (units * (10_000n + SLIPPAGE_BPS)) / 10_000n;
  const s = padded.toString().padStart(8, "0");
  return `${s.slice(0, -7)}.${s.slice(-7)}`;
}

function expertUrl(env: Env, hash: string): string {
  const net = env.STELLAR_NETWORK === "PUBLIC" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/tx/${hash}`;
}

function toTransfer(row: typeof schema.transfers.$inferSelect): Transfer {
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    beneficiaryId: row.beneficiaryId,
    sourceAsset: row.sourceAsset,
    sourceAmount: row.sourceAmount,
    destAsset: row.destAsset,
    destAmount: row.destAmount,
    exchangeRate: row.exchangeRate,
    feeAmount: row.feeAmount,
    status: row.status,
    stellarTxHash: row.stellarTxHash,
    sendingAnchorRef: row.sendingAnchorRef,
    receivingAnchorRef: row.receivingAnchorRef,
    payoutMethod: row.payoutMethod,
    quoteId: row.quoteId,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

// POST /transfers — create from a locked quote + beneficiary.
transfer.post("/", async (c) => {
  const body = await c.req.json<CreateTransferRequest>();
  if (!body.quoteId || !body.beneficiaryId) {
    throw badRequest("quoteId and beneficiaryId are required");
  }
  const db = createDb(c.env);
  const q = await db
    .select()
    .from(schema.quotes)
    .where(eq(schema.quotes.id, body.quoteId))
    .get();
  if (!q) throw notFound("Quote not found");
  if (q.expiresAt.getTime() < Date.now()) throw badRequest("Quote expired — re-quote");

  const beneficiary = await db
    .select()
    .from(schema.beneficiaries)
    .where(
      and(
        eq(schema.beneficiaries.id, body.beneficiaryId),
        eq(schema.beneficiaries.ownerId, c.get("userId")),
      ),
    )
    .get();
  if (!beneficiary) throw notFound("Beneficiary not found");

  const row = {
    id: id("tf"),
    senderId: c.get("userId"),
    beneficiaryId: body.beneficiaryId,
    sourceAsset: q.sourceAsset,
    sourceAmount: q.sourceAmount,
    destAsset: q.destAsset,
    destAmount: q.destAmount,
    exchangeRate: q.exchangeRate,
    feeAmount: q.feeAmount,
    quoteId: q.id,
  };
  await db.insert(schema.transfers).values(row);
  await recordEvent(db, row.id, "PENDING", "Transfer created");
  const created = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, row.id))
    .get();
  return c.json(toTransfer(created!), 201);
});

// POST /transfers/:id/fund — trigger anchor deposit (SEP-24) / confirm stablecoin payment.
transfer.post("/:id/fund", async (c) => {
  const db = createDb(c.env);
  const tid = c.req.param("id");
  const row = await db
    .select()
    .from(schema.transfers)
    .where(
      and(
        eq(schema.transfers.id, tid),
        eq(schema.transfers.senderId, c.get("userId")),
      ),
    )
    .get();
  if (!row) throw notFound("Transfer not found");
  if (row.status === "FUNDED") {
    return c.json({ ok: true, alreadyFunded: true });
  }
  if (row.status !== "PENDING") {
    throw badRequest(`Transfer must be PENDING to fund (currently ${row.status})`);
  }

  // TODO(INFRA/BE3): call mock sending anchor; store sendingAnchorRef.
  await db
    .update(schema.transfers)
    .set({ status: "FUNDED", updatedAt: new Date() })
    .where(eq(schema.transfers.id, tid));
  await recordEvent(db, tid, "FUNDED", "Funded via anchor (mock)");
  return c.json({ ok: true });
});

// POST /transfers/:id/submit — build & submit the path payment to Stellar.
//
// Destination note: the receiver holds NO Stellar account. The RECEIVING ANCHOR is the
// on-chain destination (it receives IDR, then pays out fiat off-chain) — the SEP-31 shape.
transfer.post("/:id/submit", async (c) => {
  const db = createDb(c.env);
  const tid = c.req.param("id");

  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, tid))
    .get();
  if (!row) throw notFound("Transfer not found");

  // Ownership — don't let user A submit user B's transfer.
  if (row.senderId !== c.get("userId")) throw notFound("Transfer not found");

  // Idempotency: already on-chain → return the existing hash, never double-send money.
  if (row.stellarTxHash) {
    return c.json({
      ok: true,
      txHash: row.stellarTxHash,
      stellarExpert: expertUrl(c.env, row.stellarTxHash),
      alreadySubmitted: true,
    });
  }

  // Must be funded first; and refuse to re-submit anything already in flight.
  if (row.status !== "FUNDED") {
    throw badRequest(`Transfer must be FUNDED to submit (currently ${row.status})`);
  }

  // Stale-quote guard (spec §11): never submit against a dead rate.
  if (row.quoteId) {
    const q = await db
      .select()
      .from(schema.quotes)
      .where(eq(schema.quotes.id, row.quoteId))
      .get();
    if (q && q.expiresAt.getTime() < Date.now()) {
      throw badRequest("Quote expired — re-quote before submitting");
    }
  }

  const anchor = c.env.RECEIVING_ANCHOR_PUBKEY;
  if (!anchor) throw badRequest("RECEIVING_ANCHOR_PUBKEY not configured");

  try {
    const result = await submitPathPayment(c.env, {
      sourceSecret: c.env.DISTRIBUTOR_SECRET,
      destPublicKey: anchor,
      sendAsset: assetFromCode(row.sourceAsset, c.env),
      // sendMax = quoted source + fee buffer. String math, no floats.
      sendMax: withSlippage(row.sourceAmount),
      destAsset: assetFromCode(row.destAsset, c.env),
      destAmount: row.destAmount, // strict-receive: receiver gets exactly this
    });

    await db
      .update(schema.transfers)
      .set({
        status: "SUBMITTED",
        stellarTxHash: result.hash,
        pathPaymentJson: {
          path: result.path,
          sourceAmountUsed: result.sourceAmountUsed,
          destination: anchor,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.transfers.id, tid));

    await recordEvent(db, tid, "SUBMITTED", "Path payment submitted to Stellar", {
      txHash: result.hash,
      sourceAmountUsed: result.sourceAmountUsed,
      path: result.path,
    });

    // Settlement worker confirms inclusion → flips to SETTLED.
    await c.env.QUEUE_SETTLEMENT.send({ transferId: tid, stellarTxHash: result.hash });

    return c.json({
      ok: true,
      txHash: result.hash,
      stellarExpert: expertUrl(c.env, result.hash),
      sourceAmountUsed: result.sourceAmountUsed,
      path: result.path,
    });
  } catch (err: any) {
    // Fail loudly and record it. NEVER fabricate a hash — a fake hash in a judge demo
    // is worse than a visible failure.
    const detail =
      err?.response?.data?.extras?.result_codes ?? err?.message ?? String(err);

    await db
      .update(schema.transfers)
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(eq(schema.transfers.id, tid));
    await recordEvent(db, tid, "FAILED", "Path payment submission failed", {
      error: detail,
    });

    throw badRequest("Path payment failed", detail);
  }
});

// GET /transfers/:id — detail + event timeline (for polling).
transfer.get("/:id", async (c) => {
  const db = createDb(c.env);
  const tid = c.req.param("id");
  const row = await db
    .select()
    .from(schema.transfers)
    .where(
      and(
        eq(schema.transfers.id, tid),
        eq(schema.transfers.senderId, c.get("userId")),
      ),
    )
    .get();
  if (!row) throw notFound("Transfer not found");
  const events = await db
    .select()
    .from(schema.transferEvents)
    .where(eq(schema.transferEvents.transferId, tid))
    .orderBy(schema.transferEvents.createdAt)
    .all();

  const res: TransferWithEvents = {
    ...toTransfer(row),
    events: events.map((e) => ({
      id: e.id,
      transferId: e.transferId,
      status: e.status,
      message: e.message,
      metadata: e.metadata as Record<string, unknown> | null,
      createdAt: e.createdAt.getTime(),
    })),
  };
  return c.json(res);
});

// GET /transfers — list current user's transfers.
transfer.get("/", async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.senderId, c.get("userId")))
    .orderBy(desc(schema.transfers.createdAt))
    .all();
  return c.json(rows.map(toTransfer));
});

export default transfer;