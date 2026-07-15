// Shared constants — asset codes, status enums, and app-wide values.
// SQLite has no ENUM type: these are TS unions, stored as text() in Drizzle.

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

// Fiat asset codes supported by the XLM-bridge backend.
// Issuers come from Worker secrets (server-side).
export const ASSET_CODE = {
  BND: "BND",
  KHR: "KHR",
  IDR: "IDR",
  LAK: "LAK",
  MYR: "MYR",
  MMK: "MMK",
  PHP: "PHP",
  SGD: "SGD",
  THB: "THB",
  VND: "VND",
  USD: "USD",
  XLM: "XLM",
} as const;

export const FIAT_ASSET_CODES = [
  ASSET_CODE.BND,
  ASSET_CODE.KHR,
  ASSET_CODE.IDR,
  ASSET_CODE.LAK,
  ASSET_CODE.MYR,
  ASSET_CODE.MMK,
  ASSET_CODE.PHP,
  ASSET_CODE.SGD,
  ASSET_CODE.THB,
  ASSET_CODE.VND,
  ASSET_CODE.USD,
] as const;
export type FiatAssetCode = (typeof FIAT_ASSET_CODES)[number];

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
