// Anchor callback webhook: deposit/withdraw status updates from the (mock) anchor.

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { recordEvent } from "../services/events.js";
import { badRequest, notFound } from "../utils/errors.js";
import type { AnchorWebhookPayload } from "@stellarsend/shared";

const webhook = new Hono<AppContext>();

// POST /webhooks/anchor
webhook.post("/anchor", async (c) => {
  // TODO(INFRA/BE3): verify anchor signature/shared secret before trusting payload.
  const body = await c.req.json<AnchorWebhookPayload>();
  if (!body.transferId || !body.kind || !body.status) {
    throw badRequest("transferId, kind, status required");
  }
  const db = createDb(c.env);
  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, body.transferId))
    .get();
  if (!row) throw notFound("Transfer not found");

  if (body.kind === "withdraw" && body.status === "completed") {
    await db
      .update(schema.transfers)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(schema.transfers.id, body.transferId));
    await recordEvent(db, body.transferId, "COMPLETED", "Payout completed (anchor)");
  } else if (body.status === "failed") {
    await db
      .update(schema.transfers)
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(eq(schema.transfers.id, body.transferId));
    await recordEvent(db, body.transferId, "FAILED", body.message ?? "Anchor failure");
  }
  return c.json({ ok: true });
});

export default webhook;
