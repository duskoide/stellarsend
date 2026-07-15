// Shared domain types — the frozen contract between web (FE) and api (BE).
// Amounts are strings (7-decimal precision) to avoid float error.

import type { KycStatus, PayoutMethod, TransferStatus } from "./constants.js";

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  fullName: string;
  country: string; // ISO code e.g. "SG", "ID"
  stellarPubKey?: string | null;
  kycStatus: KycStatus;
  createdAt: number; // epoch ms
}

export interface Beneficiary {
  id: string;
  ownerId: string;
  fullName: string;
  method: PayoutMethod;
  bankName?: string | null;
  accountNumber: string;
  createdAt: number;
}

export interface Quote {
  quoteId: string;
  sourceAsset: string;
  sourceAmount: string;
  destAsset: string;
  destAmount: string;
  exchangeRate: string;
  feeAmount: string;
  expiresAt: string; // ISO timestamp
}

export interface Transfer {
  id: string;
  senderId: string;
  receiverId?: string | null;
  beneficiaryId?: string | null;
  sourceAsset: string;
  sourceAmount: string;
  destAsset: string;
  destAmount: string;
  exchangeRate: string;
  feeAmount: string;
  status: TransferStatus;
  stellarTxHash?: string | null;
  sendingAnchorRef?: string | null;
  receivingAnchorRef?: string | null;
  payoutMethod?: PayoutMethod | null;
  quoteId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TransferEvent {
  id: string;
  transferId: string;
  status: TransferStatus;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: number;
}

// Transfer detail returned to the client (transfer + its event timeline).
export interface TransferWithEvents extends Transfer {
  events: TransferEvent[];
}

// ── Request payloads ─────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  country: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface QuoteRequest {
  sourceAsset: string;
  sourceAmount: string;
  destAsset: string;
}

export interface CreateTransferRequest {
  quoteId: string;
  beneficiaryId: string;
}

export interface CreateBeneficiaryRequest {
  fullName: string;
  method: PayoutMethod;
  bankName?: string;
  accountNumber: string;
}

export interface PayoutRequest {
  method: PayoutMethod;
}

// Anchor webhook callback (mock anchor for MVP).
export interface AnchorWebhookPayload {
  anchorRef: string;
  transferId: string;
  kind: "deposit" | "withdraw";
  status: "pending" | "completed" | "failed";
  message?: string;
}

// Standard API error envelope.
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
