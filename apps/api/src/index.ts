// StellarSend API — Hono app on Cloudflare Workers.
// `nodejs_compat` is required (wrangler.toml) for @stellar/stellar-sdk (ed25519, Buffer).

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import type { AppContext, Env, SettlementJob, PayoutJob } from "./env.js";
import { onError } from "./utils/errors.js";
import { API_BASE_PATH } from "@stellarsend/shared/constants";

import authRoutes from "./routes/auth.js";
import quoteRoutes from "./routes/quote.js";
import transferRoutes from "./routes/transfer.js";
import beneficiaryRoutes from "./routes/beneficiary.js";
import payoutRoutes from "./routes/payout.js";
import anchorRoutes from "./routes/anchor.js";
import webhookRoutes from "./routes/webhook.js";

import { handleSettlement } from "./queues/settlement.js";
import { handlePayout } from "./queues/payout.js";
import { reconcileStuckTransfers } from "./scheduled/cron.js";

const app = new Hono<AppContext>();

app.use("*", honoLogger());
app.use("*", cors());
app.onError(onError);

app.get("/health", (c) => c.json({ ok: true }));

app.route(`${API_BASE_PATH}/auth`, authRoutes);
app.route(`${API_BASE_PATH}/quote`, quoteRoutes);
app.route(`${API_BASE_PATH}/transfers`, transferRoutes);
app.route(`${API_BASE_PATH}/beneficiaries`, beneficiaryRoutes);
app.route(`${API_BASE_PATH}/claims`, payoutRoutes);
app.route(`${API_BASE_PATH}/anchor`, anchorRoutes);
app.route(`${API_BASE_PATH}/webhooks`, webhookRoutes);

export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<SettlementJob | PayoutJob>, env: Env) {
    if (batch.queue.includes("settlement")) {
      await handleSettlement(batch as MessageBatch<SettlementJob>, env);
    } else if (batch.queue.includes("payout")) {
      await handlePayout(batch as MessageBatch<PayoutJob>, env);
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env) {
    await reconcileStuckTransfers(env);
  },
};
