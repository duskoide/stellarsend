// Cron Trigger: reconcile transfers stuck in an intermediate state.
// Runs every 2 minutes (see wrangler.toml [triggers]).

import type { Env } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { server } from "../stellar/horizon.js";
import { recordEvent } from "../services/events.js";
import { and, lt, or, eq } from "drizzle-orm";
import { logger } from "../utils/logger.js";

const STUCK_AFTER_MS = 10 * 60 * 1000; // 10 minutes

export async function reconcileStuckTransfers(env: Env) {
  const db = createDb(env);
  const cutoff = new Date(Date.now() - STUCK_AFTER_MS);

  const stuck = await db
    .select()
    .from(schema.transfers)
    .where(
      and(
        lt(schema.transfers.updatedAt, cutoff),
        or(
          eq(schema.transfers.status, "SUBMITTED"),
          eq(schema.transfers.status, "PAYOUT_PENDING"),
        ),
      ),
    )
    .all();

  for (const t of stuck) {
    if (t.status === "SUBMITTED") {
      if (!t.stellarTxHash) {
        logger.warn("reconcile: submitted transfer has no tx hash", { id: t.id });
        continue;
      }

      try {
        const tx = await server(env).transactions().transaction(t.stellarTxHash).call();
        if (!tx.successful) {
          await db
            .update(schema.transfers)
            .set({ status: "FAILED", updatedAt: new Date() })
            .where(eq(schema.transfers.id, t.id));
          await recordEvent(db, t.id, "FAILED", "Stellar tx failed during reconciliation", {
            stellarTxHash: t.stellarTxHash,
          });
          logger.warn("reconcile: marked failed transaction", {
            id: t.id,
            stellarTxHash: t.stellarTxHash,
          });
        } else {
          await db
            .update(schema.transfers)
            .set({ status: "SETTLED", updatedAt: new Date() })
            .where(eq(schema.transfers.id, t.id));
          await recordEvent(db, t.id, "SETTLED", "Stellar tx confirmed by reconciliation", {
            stellarTxHash: t.stellarTxHash,
            ledger: tx.ledger,
          });
          logger.info("reconcile: settled transaction", {
            id: t.id,
            stellarTxHash: t.stellarTxHash,
          });
        }
      } catch (err) {
        // A Horizon 404 can mean the transaction is not indexed yet. Leave it submitted
        // so the next cron run can retry instead of declaring a false failure.
        logger.warn("reconcile: Horizon lookup failed", {
          id: t.id,
          stellarTxHash: t.stellarTxHash,
          err: String(err),
        });
      }
      continue;
    }

    // The MVP anchor is idempotent and queue-backed. Re-enqueue stale payout requests;
    // a real anchor integration must replace this with an anchor status lookup first.
    try {
      await env.QUEUE_PAYOUT.send({
        transferId: t.id,
        method: t.payoutMethod ?? "BANK_TRANSFER",
      });
      await db
        .update(schema.transfers)
        .set({ updatedAt: new Date() })
        .where(eq(schema.transfers.id, t.id));
      logger.info("reconcile: retried payout", { id: t.id });
    } catch (err) {
      logger.warn("reconcile: payout retry failed", { id: t.id, err: String(err) });
    }
  }

  return { checked: stuck.length };
}
