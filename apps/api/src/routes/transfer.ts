// Transfer routes: create from quote, fund (anchor deposit), submit (path payment),
// get detail + events, list. Auth-protected.

import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { badRequest, notFound } from "../utils/errors.js";
import { id } from "../utils/id.js";
import { recordEvent } from "../services/events.js";
import type {
  CreateTransferRequest,
  Transfer,
  TransferWithEvents,
} from "@stellarsend/shared";

const transfer = new Hono<AppContext>();
transfer.use("*", authMiddleware);

function toTransfer(row: typeof schema.transfers.$inferSelect): Transfer {
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    beneficiaryId: row.beneficiaryId,
    sourceAsset: row.sourceAsset,
    sourceAmount: row.sourceAmount,
    destAsset: row.destAsset,
    destAmount: row.destAmount,
    exchangeRate: row.exchangeRate,
    feeAmount: row.feeAmount,
    status: row.status,
    stellarTxHash: row.stellarTxHash,
    sendingAnchorRef: row.sendingAnchorRef,
    receivingAnchorRef: row.receivingAnchorRef,
    payoutMethod: row.payoutMethod,
    quoteId: row.quoteId,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

// POST /transfers — create from a locked quote + beneficiary.
transfer.post("/", async (c) => {
  const body = await c.req.json<CreateTransferRequest>();
  const db = createDb(c.env);
  const q = await db
    .select()
    .from(schema.quotes)
    .where(eq(schema.quotes.id, body.quoteId))
    .get();
  if (!q) throw notFound("Quote not found");
  if (q.expiresAt.getTime() < Date.now()) throw badRequest("Quote expired — re-quote");

  const row = {
    id: id("tf"),
    senderId: c.get("userId"),
    beneficiaryId: body.beneficiaryId,
    sourceAsset: q.sourceAsset,
    sourceAmount: q.sourceAmount,
    destAsset: q.destAsset,
    destAmount: q.destAmount,
    exchangeRate: q.exchangeRate,
    feeAmount: q.feeAmount,
    quoteId: q.id,
  };
  await db.insert(schema.transfers).values(row);
  await recordEvent(db, row.id, "PENDING", "Transfer created");
  const created = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, row.id))
    .get();
  return c.json(toTransfer(created!), 201);
});

// POST /transfers/:id/fund — trigger anchor deposit (SEP-24) / confirm stablecoin payment.
transfer.post("/:id/fund", async (c) => {
  const db = createDb(c.env);
  const tid = c.req.param("id");
  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, tid))
    .get();
  if (!row) throw notFound("Transfer not found");

  // TODO(INFRA/BE3): call mock sending anchor; store sendingAnchorRef.
  await db
    .update(schema.transfers)
    .set({ status: "FUNDED", updatedAt: new Date() })
    .where(eq(schema.transfers.id, tid));
  await recordEvent(db, tid, "FUNDED", "Funded via anchor (mock)");
  return c.json({ ok: true });
});

// POST /transfers/:id/submit — build & submit path payment to Stellar.
transfer.post("/:id/submit", async (c) => {
  const db = createDb(c.env);
  const tid = c.req.param("id");
  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, tid))
    .get();
  if (!row) throw notFound("Transfer not found");

  // TODO(BE1): resolve destination pubkey, call submitPathPayment(),
  //            persist stellarTxHash, enqueue settlement job.
  //   const hash = await submitPathPayment(c.env, {...});
  //   await c.env.QUEUE_SETTLEMENT.send({ transferId: tid, stellarTxHash: hash });
  await recordEvent(db, tid, "SUBMITTED", "Path payment submitted (TODO wire)");
  return c.json({ ok: true, note: "submit not yet wired — see TODO(BE1)" });
});

// GET /transfers/:id — detail + event timeline (for polling).
transfer.get("/:id", async (c) => {
  const db = createDb(c.env);
  const tid = c.req.param("id");
  const row = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.id, tid))
    .get();
  if (!row) throw notFound("Transfer not found");
  const events = await db
    .select()
    .from(schema.transferEvents)
    .where(eq(schema.transferEvents.transferId, tid))
    .orderBy(schema.transferEvents.createdAt)
    .all();

  const res: TransferWithEvents = {
    ...toTransfer(row),
    events: events.map((e) => ({
      id: e.id,
      transferId: e.transferId,
      status: e.status,
      message: e.message,
      metadata: e.metadata as Record<string, unknown> | null,
      createdAt: e.createdAt.getTime(),
    })),
  };
  return c.json(res);
});

// GET /transfers — list current user's transfers.
transfer.get("/", async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select()
    .from(schema.transfers)
    .where(eq(schema.transfers.senderId, c.get("userId")))
    .orderBy(desc(schema.transfers.createdAt))
    .all();
  return c.json(rows.map(toTransfer));
});

export default transfer;
