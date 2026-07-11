// Asset definitions. Issuers come from env (server-side only).

import { Asset } from "@stellar/stellar-sdk";
import type { Env } from "../env.js";

export function usdc(env: Env): Asset {
  return new Asset("USDC", env.USDC_ISSUER);
}

export function idr(env: Env): Asset {
  return new Asset("IDR", env.IDR_ISSUER);
}

// Native XLM.
export function xlm(): Asset {
  return Asset.native();
}

// Resolve an asset code string to an Asset instance.
export function assetFromCode(code: string, env: Env): Asset {
  switch (code.toUpperCase()) {
    case "USDC":
      return usdc(env);
    case "IDR":
      return idr(env);
    case "XLM":
      return xlm();
    default:
      throw new Error(`Unknown asset code: ${code}`);
  }
}
