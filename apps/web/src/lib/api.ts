// Typed API client for the StellarSend backend (Hono Worker).

import type {
  ApiError,
  AuthResponse,
  Beneficiary,
  CreateBeneficiaryRequest,
  CreateTransferRequest,
  LoginRequest,
  PayoutRequest,
  Quote,
  QuoteRequest,
  RegisterRequest,
  Transfer,
  TransferWithEvents,
} from "@stellarsend/shared";

// Pages builds can be deployed without build-time environment variables. Keep local
// development on the Worker dev server, but point production builds at the deployed API.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://stellarsend-api.18224079.workers.dev/api/v1"
    : "http://localhost:8787/api/v1");

// What POST /transfers/:id/submit actually returns (see api/src/routes/transfer.ts).
export interface SubmitResponse {
  ok: true;
  txHash: string;
  stellarExpert: string;
  sourceAmountUsed?: string;
  path?: string[];
  alreadySubmitted?: boolean;
}

const TOKEN_KEY = "stellarsend_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    register: (body: RegisterRequest) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    login: (body: LoginRequest) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  quote: {
    create: (body: QuoteRequest) =>
      request<Quote>("/quote", { method: "POST", body: JSON.stringify(body) }),
  },
  transfers: {
    create: (body: CreateTransferRequest) =>
      request<Transfer>("/transfers", { method: "POST", body: JSON.stringify(body) }),
    fund: (id: string) => request<{ ok: true }>(`/transfers/${id}/fund`, { method: "POST" }),
    submit: (id: string) =>
      request<SubmitResponse>(`/transfers/${id}/submit`, { method: "POST" }),
    get: (id: string) => request<TransferWithEvents>(`/transfers/${id}`),
    list: () => request<Transfer[]>("/transfers"),
  },
  beneficiaries: {
    list: () => request<Beneficiary[]>("/beneficiaries"),
    create: (body: CreateBeneficiaryRequest) =>
      request<Beneficiary>("/beneficiaries", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      request<{ ok: true }>(`/beneficiaries/${id}`, { method: "DELETE" }),
  },
  claims: {
    get: (id: string) =>
      request<{ id: string; destAsset: string; destAmount: string; status: string }>(
        `/claims/${id}`,
      ),
    payout: (id: string, body: PayoutRequest) =>
      request<{ ok: true }>(`/claims/${id}/payout`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};