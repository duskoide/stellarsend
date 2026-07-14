// Asset definitions. Issuers come from env (server-side only).

import { Asset } from "@stellar/stellar-sdk";
import type { Env } from "../env.js";

export const FIAT_ASSET_CODES = ["IDR", "VND", "PHP"] as const;
export type FiatAssetCode = (typeof FIAT_ASSET_CODES)[number];

export function normalizeAssetCode(code: unknown): FiatAssetCode {
  if (typeof code !== "string") {
    throw new Error("Asset code must be a string");
  }

  const normalized = code.trim().toUpperCase();
  if (!(FIAT_ASSET_CODES as readonly string[]).includes(normalized)) {
    throw new Error(
      `Unsupported asset code: ${code}. Supported assets: ${FIAT_ASSET_CODES.join(", ")}`,
    );
  }

  return normalized as FiatAssetCode;
}

export function idr(env: Env): Asset {
  return new Asset("IDR", env.IDR_ISSUER);
}

export function vnd(env: Env): Asset {
  return new Asset("VND", env.VND_ISSUER);
}

export function php(env: Env): Asset {
  return new Asset("PHP", env.PHP_ISSUER);
}

// Native XLM is the bridge asset. It has no issuer or trustline.
export function xlm(): Asset {
  return Asset.native();
}

// Resolve a supported fiat asset code to an Asset instance.
// XLM is intentionally not accepted from the public quote/transfer API: it is
// the enforced intermediary asset for this phase of the backend.
export function assetFromCode(code: string, env: Env): Asset {
  switch (normalizeAssetCode(code)) {
    case "IDR":
      return idr(env);
    case "VND":
      return vnd(env);
    case "PHP":
      return php(env);
  }
}
