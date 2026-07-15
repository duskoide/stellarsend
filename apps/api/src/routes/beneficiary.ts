// Beneficiary CRUD (receiver bank/e-wallet destinations owned by a sender).

import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { badRequest, notFound } from "../utils/errors.js";
import { id } from "../utils/id.js";
import type { Beneficiary, CreateBeneficiaryRequest } from "@stellarsend/shared";
import { PAYOUT_METHOD } from "@stellarsend/shared/constants";

const beneficiary = new Hono<AppContext>();
beneficiary.use("*", authMiddleware);

function toBeneficiary(row: typeof schema.beneficiaries.$inferSelect): Beneficiary {
  return {
    id: row.id,
    ownerId: row.ownerId,
    fullName: row.fullName,
    method: row.method,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    createdAt: row.createdAt.getTime(),
  };
}

beneficiary.get("/", async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select()
    .from(schema.beneficiaries)
    .where(eq(schema.beneficiaries.ownerId, c.get("userId")))
    .all();
  return c.json(rows.map(toBeneficiary));
});

beneficiary.post("/", async (c) => {
  const body = await c.req.json<CreateBeneficiaryRequest>();
  const fullName = body.fullName?.trim();
  const bankName = body.bankName?.trim();
  const accountNumber = body.accountNumber?.trim();
  if (!fullName || !bankName || !accountNumber || !body.method) {
    throw badRequest("fullName, method, bankName, and accountNumber are required");
  }
  if (!PAYOUT_METHOD.includes(body.method)) {
    throw badRequest("Unsupported payout method");
  }

  const db = createDb(c.env);
  const row = {
    id: id("ben"),
    ownerId: c.get("userId"),
    fullName,
    method: body.method,
    bankName,
    accountNumber,
  };
  await db.insert(schema.beneficiaries).values(row);
  const created = await db
    .select()
    .from(schema.beneficiaries)
    .where(eq(schema.beneficiaries.id, row.id))
    .get();
  return c.json(toBeneficiary(created!), 201);
});

beneficiary.delete("/:id", async (c) => {
  const db = createDb(c.env);
  const bid = c.req.param("id");
  const row = await db
    .select()
    .from(schema.beneficiaries)
    .where(
      and(
        eq(schema.beneficiaries.id, bid),
        eq(schema.beneficiaries.ownerId, c.get("userId")),
      ),
    )
    .get();
  if (!row) throw notFound("Beneficiary not found");
  await db.delete(schema.beneficiaries).where(eq(schema.beneficiaries.id, bid));
  return c.json({ ok: true });
});

export default beneficiary;
