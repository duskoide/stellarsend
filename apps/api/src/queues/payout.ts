// Payout queue consumer: trigger anchor withdraw → transfer reaches COMPLETED.
// Consumers must be idempotent (at-least-once delivery).

import type { Env, PayoutJob } from "../env.js";
import { createDb } from "../db/client.js";
import { mockAnchorWithdraw } from "../services/anchor.js";
import { logger } from "../utils/logger.js";
import type { PayoutMethod } from "@stellarsend/shared/constants";

export async function handlePayout(batch: MessageBatch<PayoutJob>, env: Env) {
  const db = createDb(env);
  for (const msg of batch.messages) {
    const { transferId, method } = msg.body;
    try {
      // Idempotency + the "only pay out SETTLED money" guard both live in the service.
      const res = await mockAnchorWithdraw(
        db,
        transferId,
        (method as PayoutMethod) ?? "BANK_TRANSFER",
      );
      logger.info("payout done", { transferId, anchorRef: res.anchorRef });
      msg.ack();
    } catch (err) {
      logger.warn("payout job failed", { transferId, err: String(err) });
      msg.retry();
    }
  }
}