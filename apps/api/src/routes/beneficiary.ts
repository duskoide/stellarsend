// Beneficiary CRUD (receiver bank/e-wallet destinations owned by a sender).

import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { authMiddleware } from "../middleware/auth.js";
import { badRequest, notFound } from "../utils/errors.js";
import { id } from "../utils/id.js";
import type { CreateBeneficiaryRequest } from "@stellarsend/shared";

const beneficiary = new Hono<AppContext>();
beneficiary.use("*", authMiddleware);

beneficiary.get("/", async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select()
    .from(schema.beneficiaries)
    .where(eq(schema.beneficiaries.ownerId, c.get("userId")))
    .all();
  return c.json(rows);
});

beneficiary.post("/", async (c) => {
  const body = await c.req.json<CreateBeneficiaryRequest>();
  if (!body.fullName || !body.accountNumber || !body.method) {
    throw badRequest("fullName, accountNumber, method required");
  }
  const db = createDb(c.env);
  const row = {
    id: id("ben"),
    ownerId: c.get("userId"),
    fullName: body.fullName,
    method: body.method,
    bankName: body.bankName,
    accountNumber: body.accountNumber,
  };
  await db.insert(schema.beneficiaries).values(row);
  return c.json(row, 201);
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
