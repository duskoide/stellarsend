// Typed Cloudflare Worker bindings + Hono context variables.

export interface Env {
  // Secrets / vars
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
  HORIZON_URL: string;
  STELLAR_NETWORK: "TESTNET" | "PUBLIC";
  JWT_SECRET: string;
  DISTRIBUTOR_SECRET: string;
  IDR_ISSUER: string;
  VND_ISSUER: string;
  PHP_ISSUER: string;
  RECEIVING_ANCHOR_PUBKEY: string; // on-chain destination for path payment (SEP-31 shape)

  // Queue bindings
  QUEUE_SETTLEMENT: Queue<SettlementJob>;
  QUEUE_PAYOUT: Queue<PayoutJob>;
}

// Queue message payloads.
export interface SettlementJob {
  transferId: string;
  stellarTxHash: string;
}

export interface PayoutJob {
  transferId: string;
  method: string;
}

// Hono context variables (set by middleware).
export interface Variables {
  userId: string;
  userRole: "SENDER" | "RECEIVER";
}

export type AppContext = { Bindings: Env; Variables: Variables };
