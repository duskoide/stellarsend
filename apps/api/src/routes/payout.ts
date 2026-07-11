// Receiver claim + payout routes (SEP-24 withdraw via mock anchor).

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { badRequest, notFound } from "../utils/errors.js";
import { recordEvent } from "../services/events.js";
import type { PayoutRequest } from "@stellarsend/shared";

const payout = new Hono<AppContext>();
payout.use("*", authMiddleware);

// GET /claims/:id — claim info for the receiver.
payout.get("/:id", async (c) => {
  const db = createDb(c.env);
  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, c.req.param("id")))
    .get();
  if (!row) throw notFound("Claim not found");
  return c.json({
    id: row.id,
    destAsset: row.destAsset,
    destAmount: row.destAmount,
    status: row.status,
  });
});

// POST /claims/:id/payout — select method, trigger anchor withdraw (mock).
payout.post("/:id/payout", async (c) => {
  const body = await c.req.json<PayoutRequest>();
  if (!body.method) throw badRequest("method required");
  const db = createDb(c.env);
  const tid = c.req.param("id");
  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, tid))
    .get();
  if (!row) throw notFound("Claim not found");

  await db
    .update(schema.transfers)
    .set({ status: "PAYOUT_PENDING", payoutMethod: body.method, updatedAt: new Date() })
    .where(eq(schema.transfers.id, tid));
  await recordEvent(db, tid, "PAYOUT_PENDING", `Payout requested via ${body.method}`);

  // TODO(INFRA/BE3): enqueue payout job → mock anchor withdraw → webhook completes.
  await c.env.QUEUE_PAYOUT.send({ transferId: tid, method: body.method });

  return c.json({ ok: true });
});

export default payout;
