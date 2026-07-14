// Seed script: testnet distributor account + trustlines + friendbot funding
// + a couple of demo users. Run with `pnpm --filter api db:seed`.
//
// NOTE: reads secrets from process.env (Node, via tsx) — not the Worker runtime.
// Copy values from .env before running.

import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { Keypair } from "@stellar/stellar-sdk";
import * as schema from "../src/db/schema.js";

async function main() {
  const url = process.env.TURSO_URL ?? "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });

  console.log(`Seeding DB at ${url}...`);

  // Generate (or reuse) a distributor keypair for local testnet dev.
  // In real use, set DISTRIBUTOR_SECRET in .env and reuse the same account.
  let distributor: Keypair;
  if (process.env.DISTRIBUTOR_SECRET && process.env.DISTRIBUTOR_SECRET !== "S...") {
    distributor = Keypair.fromSecret(process.env.DISTRIBUTOR_SECRET);
    console.log(`Using existing distributor: ${distributor.publicKey()}`);
  } else {
    distributor = Keypair.random();
    console.log(`Generated new distributor keypair:`);
    console.log(`  PUBLIC:  ${distributor.publicKey()}`);
    console.log(`  SECRET:  ${distributor.secret()}`);
    console.log(`  -> copy SECRET into .env as DISTRIBUTOR_SECRET`);
  }

  try {
    const res = await fetch(
      `https://friendbot.stellar.org/?addr=${encodeURIComponent(distributor.publicKey())}`,
    );
    console.log(`Friendbot funding: ${res.ok ? "ok" : `failed (${res.status})`}`);
  } catch (err) {
    console.warn("Friendbot request failed (offline?):", err);
  }

  // TODO(BE2/BE1): create trustlines to IDR/VND/PHP issuers and seed
  // XLM bridge order books on testnet DEX (spec §7.1).

  console.log(
    "Seed complete. Remember to set IDR_ISSUER / VND_ISSUER / PHP_ISSUER in .env.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
