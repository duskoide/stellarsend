// Horizon connection helpers. Native fetch is Worker-compatible.

import { Horizon, Networks } from "@stellar/stellar-sdk";
import type { Env } from "../env.js";

export function server(env: Env): Horizon.Server {
  return new Horizon.Server(env.HORIZON_URL);
}

export function networkPassphrase(env: Env): string {
  return env.STELLAR_NETWORK === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;
}
