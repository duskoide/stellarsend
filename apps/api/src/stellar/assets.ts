// Asset definitions. Issuers come from env (server-side only).

import { Asset } from "@stellar/stellar-sdk";
import { FIAT_ASSET_CODES, type FiatAssetCode } from "@stellarsend/shared/constants";
import type { Env } from "../env.js";

export { FIAT_ASSET_CODES, type FiatAssetCode };

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

// Native XLM is the bridge asset. It has no issuer or trustline.
export function xlm(): Asset {
  return Asset.native();
}

const ISSUER_ENV_KEY: Record<FiatAssetCode, keyof Env> = {
  BND: "BND_ISSUER",
  KHR: "KHR_ISSUER",
  IDR: "IDR_ISSUER",
  LAK: "LAK_ISSUER",
  MYR: "MYR_ISSUER",
  MMK: "MMK_ISSUER",
  PHP: "PHP_ISSUER",
  SGD: "SGD_ISSUER",
  THB: "THB_ISSUER",
  VND: "VND_ISSUER",
  USD: "USD_ISSUER",
};

// Resolve a supported fiat asset code to an Asset instance.
// XLM is intentionally not accepted from the public quote/transfer API: it is
// the enforced intermediary asset for this phase of the backend.
export function assetFromCode(code: string, env: Env): Asset {
  const normalized = normalizeAssetCode(code);
  const issuer = env[ISSUER_ENV_KEY[normalized]] as string;
  if (!issuer || !issuer.startsWith("G")) {
    throw new Error(
      `Missing or invalid issuer for ${normalized}: ${ISSUER_ENV_KEY[normalized]}`,
    );
  }
  return new Asset(normalized, issuer);
}
