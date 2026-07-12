// Mock anchor (SEP-24/31 shaped). Stands in for a real Indonesian anchor: receives IDR
// on-chain, pays out fiat to a bank/e-wallet off-chain, then calls back.
//
// The SHAPE is what matters — a real anchor swap means replacing this file, not the callers.
// A real anchor calls back asynchronously (seconds to minutes); we simulate that by writing
// the terminal state directly, with the same idempotency guarantees the webhook has.

import type { DB } from "../db/client.js";
import { schema } from "../db/client.js";
import { recordEvent } from "./events.js";
import { eq } from "drizzle-orm";
import { id } from "../utils/id.js";
import type { PayoutMethod } from "@stellarsend/shared/constants";

export interface WithdrawResult {
  anchorRef: string;
  completed: boolean;
}

/**
 * Simulate an anchor withdraw: IDR (on-chain, held by the anchor) → fiat payout.
 *
 * Idempotent: if the transfer is already COMPLETED, this is a no-op. Queue delivery is
 * at-least-once, so this WILL be called twice — paying out twice would be a real bug.
 */
export async function mockAnchorWithdraw(
  db: DB,
  transferId: string,
  method: PayoutMethod,
): Promise<WithdrawResult> {
  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, transferId))
    .get();
  if (!row) throw new Error(`Transfer ${transferId} not found`);

  // Already done — don't pay twice.
  if (row.status === "COMPLETED") {
    return { anchorRef: row.receivingAnchorRef ?? "", completed: true };
  }

  // Guard: only pay out money that actually landed on-chain. Without this, a bug upstream
  // could disburse fiat for a transfer that never settled.
  if (row.status !== "SETTLED" && row.status !== "PAYOUT_PENDING") {
    throw new Error(
      `Refusing payout for ${transferId}: status ${row.status}, expected SETTLED/PAYOUT_PENDING`,
    );
  }

  const anchorRef = row.receivingAnchorRef ?? id("anc");

  // 1. Anchor accepts the withdraw request.
  await db
    .update(schema.transfers)
    .set({ status: "PAYOUT_PENDING", receivingAnchorRef: anchorRef, updatedAt: new Date() })
    .where(eq(schema.transfers.id, transferId));
  await recordEvent(db, transferId, "PAYOUT_PENDING", `Anchor withdraw accepted (${method})`, {
    anchorRef,
    method,
  });

  // 2. Anchor confirms fiat disbursed. (Real anchor: async webhook. Mock: immediate.)
  await db
    .update(schema.transfers)
    .set({ status: "COMPLETED", updatedAt: new Date() })
    .where(eq(schema.transfers.id, transferId));
  await recordEvent(
    db,
    transferId,
    "COMPLETED",
    `Payout disbursed via ${method === "BANK_TRANSFER" ? "bank transfer" : "e-wallet"} (mock anchor)`,
    { anchorRef, method },
  );

  return { anchorRef, completed: true };
}
