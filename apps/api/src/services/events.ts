// Append-only transfer event log helper (audit trail — great for demo).

import type { DB } from "../db/client.js";
import { schema } from "../db/client.js";
import { id } from "../utils/id.js";
import type { TransferStatus } from "@stellarsend/shared/constants";

export async function recordEvent(
  db: DB,
  transferId: string,
  status: TransferStatus,
  message?: string,
  metadata?: Record<string, unknown>,
) {
  await db.insert(schema.transferEvents).values({
    id: id("evt"),
    transferId,
    status,
    message,
    metadata,
  });
}
