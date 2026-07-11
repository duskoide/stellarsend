// Payout queue consumer: trigger (mock) anchor withdraw for a transfer.
// Consumers must be idempotent (at-least-once delivery).

import type { Env, PayoutJob } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { recordEvent } from "../services/events.js";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import { id } from "../utils/id.js";

export async function handlePayout(batch: MessageBatch<PayoutJob>, env: Env) {
  const db = createDb(env);
  for (const msg of batch.messages) {
    const { transferId, method } = msg.body;
    try {
      const row = await db
        .select()
        .from(schema.transfers)
        .where(eq(schema.transfers.id, transferId))
        .get();
      if (!row) {
        msg.ack(); // nothing to do, don't retry forever
        continue;
      }
      if (row.status === "COMPLETED") {
        msg.ack(); // already completed — idempotent no-op
        continue;
      }

      // TODO(INFRA/BE3): call real/mock anchor SEP-24 withdraw endpoint here.
      const receivingAnchorRef = id("anc");
      await db
        .update(schema.transfers)
        .set({ receivingAnchorRef, updatedAt: new Date() })
        .where(eq(schema.transfers.id, transferId));
      await recordEvent(
        db,
        transferId,
        "PAYOUT_PENDING",
        `Anchor withdraw initiated (${method}, mock ref ${receivingAnchorRef})`,
      );

      // In the mock flow, the anchor "completes" immediately by calling back
      // POST /webhooks/anchor. A real anchor would call back asynchronously.
      msg.ack();
    } catch (err) {
      logger.warn("payout job failed", { transferId, err: String(err) });
      msg.retry();
    }
  }
}
