// Shared constants — asset codes, status enums, and app-wide values.
// SQLite has no ENUM type: these are TS unions, stored as text() in Drizzle.

export const USER_ROLE = ["SENDER", "RECEIVER"] as const;
export type UserRole = (typeof USER_ROLE)[number];

export const TRANSFER_STATUS = [
  "PENDING",
  "FUNDED",
  "SUBMITTED",
  "SETTLED",
  "PAYOUT_PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
] as const;
export type TransferStatus = (typeof TRANSFER_STATUS)[number];

export const PAYOUT_METHOD = ["BANK_TRANSFER", "EWALLET"] as const;
export type PayoutMethod = (typeof PAYOUT_METHOD)[number];

export const KYC_STATUS = ["none", "pending", "verified"] as const;
export type KycStatus = (typeof KYC_STATUS)[number];

// Asset codes used across the app. Issuers come from env (server-side).
export const ASSET_CODE = {
  USDC: "USDC",
  IDR: "IDR",
  XLM: "XLM",
} as const;

// Stellar amounts use 7 decimal places.
export const STELLAR_DECIMALS = 7;

// Quote validity window (ms) — re-quote before submit if expired.
export const QUOTE_TTL_MS = 60_000;

// Ordered steps for the transfer status stepper (UI).
export const TRANSFER_STEPS: TransferStatus[] = [
  "PENDING",
  "FUNDED",
  "SUBMITTED",
  "SETTLED",
  "PAYOUT_PENDING",
  "COMPLETED",
];

export const API_BASE_PATH = "/api/v1";
