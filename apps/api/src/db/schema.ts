// Drizzle schema (SQLite / Turso). See spec §5.
// SQLite has no ENUM/Decimal: enums are text() with TS unions; amounts are text() (7 decimals).

import {
  sqliteTable,
  text,
  integer,
  blob,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  USER_ROLE,
  TRANSFER_STATUS,
  PAYOUT_METHOD,
} from "@stellarsend/shared/constants";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    phone: text("phone").unique(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: USER_ROLE }).notNull(),
    country: text("country").notNull(),
    stellarPubKey: text("stellar_pub_key"),
    kycStatus: text("kyc_status").notNull().default("none"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({ emailIdx: uniqueIndex("email_idx").on(t.email) }),
);

export const beneficiaries = sqliteTable("beneficiaries", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  fullName: text("full_name").notNull(),
  method: text("method", { enum: PAYOUT_METHOD }).notNull(),
  bankName: text("bank_name"),
  accountNumber: text("account_number").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey(),
  sourceAsset: text("source_asset").notNull(),
  sourceAmount: text("source_amount").notNull(),
  destAsset: text("dest_asset").notNull(),
  destAmount: text("dest_amount").notNull(),
  exchangeRate: text("exchange_rate").notNull(),
  feeAmount: text("fee_amount").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const transfers = sqliteTable("transfers", {
  id: text("id").primaryKey(),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id),
  receiverId: text("receiver_id").references(() => users.id),
  beneficiaryId: text("beneficiary_id").references(() => beneficiaries.id),

  sourceAsset: text("source_asset").notNull(),
  sourceAmount: text("source_amount").notNull(),
  destAsset: text("dest_asset").notNull(),
  destAmount: text("dest_amount").notNull(),
  exchangeRate: text("exchange_rate").notNull(),
  feeAmount: text("fee_amount").notNull(),

  status: text("status", { enum: TRANSFER_STATUS })
    .notNull()
    .default("PENDING"),

  stellarTxHash: text("stellar_tx_hash").unique(),
  pathPaymentJson: blob("path_payment_json", { mode: "json" }),
  sendingAnchorRef: text("sending_anchor_ref"),
  receivingAnchorRef: text("receiving_anchor_ref"),
  payoutMethod: text("payout_method", { enum: PAYOUT_METHOD }),

  quoteId: text("quote_id").references(() => quotes.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const transferEvents = sqliteTable("transfer_events", {
  id: text("id").primaryKey(),
  transferId: text("transfer_id")
    .notNull()
    .references(() => transfers.id),
  status: text("status", { enum: TRANSFER_STATUS }).notNull(),
  message: text("message"),
  metadata: blob("metadata", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
