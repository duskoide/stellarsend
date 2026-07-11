// Settlement queue consumer: poll Stellar for tx finality, mark SETTLED.
// Consumers must be idempotent (at-least-once delivery).

import type { Env, SettlementJob } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { server } from "../stellar/horizon.js";
import { recordEvent } from "../services/events.js";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger.js";

export async function handleSettlement(
  batch: MessageBatch<SettlementJob>,
  env: Env,
) {
  const db = createDb(env);
  for (const msg of batch.messages) {
    const { transferId, stellarTxHash } = msg.body;
    try {
      const tx = await server(env).transactions().transaction(stellarTxHash).call();
      if (tx.successful) {
        await db
          .update(schema.transfers)
          .set({ status: "SETTLED", updatedAt: new Date() })
          .where(eq(schema.transfers.id, transferId));
        await recordEvent(db, transferId, "SETTLED", "Stellar tx confirmed");
        // TODO(INFRA/BE3): enqueue payout after settlement if auto-payout.
      }
      msg.ack();
    } catch (err) {
      logger.warn("settlement poll failed", { transferId, err: String(err) });
      msg.retry();
    }
  }
}
