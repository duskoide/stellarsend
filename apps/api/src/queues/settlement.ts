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
      const row = await db
        .select()
        .from(schema.transfers)
        .where(eq(schema.transfers.id, transferId))
        .get();

      // Already moved past settlement — idempotent no-op (at-least-once delivery).
      if (!row || (row.status !== "SUBMITTED" && row.status !== "SETTLED")) {
        msg.ack();
        continue;
      }

      const tx = await server(env).transactions().transaction(stellarTxHash).call();

      if (!tx.successful) {
        // On-chain rejection: the money did NOT move. Mark FAILED, never pay out.
        await db
          .update(schema.transfers)
          .set({ status: "FAILED", updatedAt: new Date() })
          .where(eq(schema.transfers.id, transferId));
        await recordEvent(db, transferId, "FAILED", "Stellar tx failed on-chain", {
          stellarTxHash,
        });
        msg.ack();
        continue;
      }

      if (row.status === "SUBMITTED") {
        await db
          .update(schema.transfers)
          .set({ status: "SETTLED", updatedAt: new Date() })
          .where(eq(schema.transfers.id, transferId));
        await recordEvent(db, transferId, "SETTLED", "Stellar tx confirmed on-chain", {
          stellarTxHash,
          ledger: tx.ledger,
        });
      }

      // Auto-payout: settled funds are with the receiving anchor, so disburse.
      // If the receiver already chose a method, honour it; otherwise default to bank.
      await env.QUEUE_PAYOUT.send({
        transferId,
        method: row.payoutMethod ?? "BANK_TRANSFER",
      });

      msg.ack();
    } catch (err) {
      // Horizon 404 right after submit is normal (not yet indexed) — retry.
      logger.warn("settlement poll failed", { transferId, err: String(err) });
      msg.retry();
    }
  }
}