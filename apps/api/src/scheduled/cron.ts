// Cron Trigger: reconcile transfers stuck in an intermediate state.
// Runs every 2 minutes (see wrangler.toml [triggers]).

import type { Env } from "../env.js";
import { createDb, schema } from "../db/client.js";
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
    logger.warn("reconcile: transfer stuck", { id: t.id, status: t.status });
    // TODO(INFRA/BE3): re-check Horizon / anchor status, or flag for manual review.
  }

  return { checked: stuck.length };
}
