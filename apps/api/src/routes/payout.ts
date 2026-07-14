// Receiver claim + payout routes (SEP-24 withdraw via mock anchor).

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { badRequest, notFound } from "../utils/errors.js";
import { recordEvent } from "../services/events.js";
import type { PayoutRequest } from "@stellarsend/shared";
import { PAYOUT_METHOD } from "@stellarsend/shared/constants";

const payout = new Hono<AppContext>();
payout.use("*", authMiddleware);

// GET /claims/:id — claim info for the receiver.
payout.get("/:id", async (c) => {
  // Claim links are receiver-facing; sender tokens must not expose or trigger payouts.
  if (c.get("userRole") !== "RECEIVER") throw notFound("Claim not found");
  const db = createDb(c.env);
  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, c.req.param("id")))
    .get();
  if (!row) throw notFound("Claim not found");
  if (row.receiverId && row.receiverId !== c.get("userId")) {
    throw notFound("Claim not found");
  }
  return c.json({
    id: row.id,
    destAsset: row.destAsset,
    destAmount: row.destAmount,
    status: row.status,
  });
});

// POST /claims/:id/payout — receiver selects method → anchor withdraw → COMPLETED.
payout.post("/:id/payout", async (c) => {
  if (c.get("userRole") !== "RECEIVER") throw notFound("Claim not found");
  const body = await c.req.json<PayoutRequest>();
  if (!body.method) throw badRequest("method required");
  if (!PAYOUT_METHOD.includes(body.method)) throw badRequest("Unsupported payout method");
  const db = createDb(c.env);
  const tid = c.req.param("id");
  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, tid))
    .get();
  if (!row) throw notFound("Claim not found");
  if (row.receiverId && row.receiverId !== c.get("userId")) {
    throw notFound("Claim not found");
  }

  // Idempotent: claiming twice is a no-op, not a double payout.
  if (row.status === "COMPLETED") {
    return c.json({ ok: true, status: "COMPLETED", alreadyPaid: true });
  }

  // Only disburse money that actually landed on-chain. Claiming a transfer that hasn't
  // settled would pay out fiat against funds that may never arrive.
  if (row.status !== "SETTLED" && row.status !== "PAYOUT_PENDING") {
    throw badRequest(
      `Not claimable yet — transfer is ${row.status}, waiting for on-chain settlement`,
    );
  }

  await db
    .update(schema.transfers)
    .set({ status: "PAYOUT_PENDING", payoutMethod: body.method, updatedAt: new Date() })
    .where(eq(schema.transfers.id, tid));
  await recordEvent(db, tid, "PAYOUT_PENDING", `Payout requested via ${body.method}`);

  // Anchor withdraw runs async on the queue → writes COMPLETED.
  await c.env.QUEUE_PAYOUT.send({ transferId: tid, method: body.method });

  return c.json({ ok: true, status: "PAYOUT_PENDING" });
});

export default payout;