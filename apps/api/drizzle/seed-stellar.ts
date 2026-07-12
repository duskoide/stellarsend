// Seed Stellar testnet: accounts, trustlines, asset issuance, and ORDER BOOK liquidity
// so strictReceivePaths() can find a USDC → IDR path.
//
// Without order-book liquidity, submit fails with "No path found". This script is what
// makes the demo possible. Run BEFORE db:seed.
//   pnpm --filter api tsx drizzle/seed-stellar.ts
//
// Runs under Node (tsx), NOT the Worker — process.env is fine here.

import "dotenv/config";
import {
  Keypair, Horizon, TransactionBuilder, Operation, Asset, BASE_FEE, Networks,
} from "@stellar/stellar-sdk";

const server = new Horizon.Server(process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org");
const NET = Networks.TESTNET;

async function fund(kp: Keypair, label: string) {
  const r = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
  if (!r.ok && r.status !== 400) throw new Error(`friendbot ${label}: ${r.status}`);
  console.log(`  funded ${label}: ${kp.publicKey()}`);
}

async function submit(kp: Keypair, ops: any[], label: string) {
  const acct = await server.loadAccount(kp.publicKey());
  const b = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: NET });
  ops.forEach((o) => b.addOperation(o));
  const tx = b.setTimeout(60).build();
  tx.sign(kp);
  try {
    const res = await server.submitTransaction(tx);
    console.log(`  ok ${label} - ${res.hash.slice(0, 12)}...`);
  } catch (e: any) {
    console.error(`  FAIL ${label}:`, JSON.stringify(e?.response?.data?.extras?.result_codes ?? e.message));
    throw e;
  }
}

async function main() {
  console.log("Seeding Stellar testnet...\n");

  // Issuer != distributor (Stellar best practice).
  const usdcIssuer = Keypair.random();
  const idrIssuer = Keypair.random();
  // Distributor: the account the Worker signs with (sends USDC).
  const envSecret = process.env.DISTRIBUTOR_SECRET;
  const distributor = envSecret && envSecret.startsWith("S") && envSecret !== "S..."
    ? Keypair.fromSecret(envSecret)
    : Keypair.random();
  // Receiving anchor: on-chain destination for the IDR leg (receiver has no wallet).
  const anchor = Keypair.random();
  // Market maker: posts the USDC<->IDR offer that makes a path exist.
  const mm = Keypair.random();

  console.log("1. Funding accounts via friendbot...");
  for (const [kp, l] of [[usdcIssuer, "usdcIssuer"], [idrIssuer, "idrIssuer"],
                         [distributor, "distributor"], [anchor, "anchor"], [mm, "marketMaker"]] as const) {
    await fund(kp, l);
  }

  const USDC = new Asset("USDC", usdcIssuer.publicKey());
  const IDR = new Asset("IDR", idrIssuer.publicKey());

  console.log("\n2. Trustlines...");
  await submit(distributor, [Operation.changeTrust({ asset: USDC, limit: "10000000" })], "distributor -> USDC");
  await submit(anchor, [Operation.changeTrust({ asset: IDR, limit: "100000000000" })], "anchor -> IDR");
  await submit(mm, [
    Operation.changeTrust({ asset: USDC, limit: "10000000" }),
    Operation.changeTrust({ asset: IDR, limit: "100000000000" }),
  ], "marketMaker -> USDC + IDR");

  console.log("\n3. Issuing assets...");
  await submit(usdcIssuer, [
    Operation.payment({ destination: distributor.publicKey(), asset: USDC, amount: "1000000" }),
    Operation.payment({ destination: mm.publicKey(), asset: USDC, amount: "1000000" }),
  ], "issue USDC");
  await submit(idrIssuer, [
    Operation.payment({ destination: mm.publicKey(), asset: IDR, amount: "50000000000" }),
  ], "issue IDR to marketMaker");

  console.log("\n4. Seeding order book (THIS is what makes a path exist)...");
  // MM sells IDR, buys USDC. price = USDC per 1 IDR.
  // ~Rp16,000/USDC -> 1 IDR ~= 0.0000625 USDC. Multiple levels = depth.
  const levels = [
    { amount: "5000000000", price: "0.0000625" },
    { amount: "5000000000", price: "0.0000630" },
    { amount: "5000000000", price: "0.0000640" },
  ];
  await submit(mm, levels.map((l) =>
    Operation.manageSellOffer({ selling: IDR, buying: USDC, amount: l.amount, price: l.price, offerId: "0" }),
  ), "IDR/USDC sell offers");

  // Print keys BEFORE verification — a failed verify must never lose the keypairs.
  console.log("\n" + "=".repeat(62));
  console.log("Copy into .env (and `wrangler secret put` for deploy):\n");
  console.log(`USDC_ISSUER=${usdcIssuer.publicKey()}`);
  console.log(`IDR_ISSUER=${idrIssuer.publicKey()}`);
  console.log(`DISTRIBUTOR_SECRET=${distributor.secret()}`);
  console.log(`RECEIVING_ANCHOR_PUBKEY=${anchor.publicKey()}`);
  console.log("\n# keep safe (needed to re-seed offers later):");
  console.log(`# MARKET_MAKER_SECRET=${mm.secret()}`);
  console.log("=".repeat(62));

  console.log("\n5. Verifying a path exists...");
  // Horizon indexes offers a few seconds AFTER the tx lands in a ledger. Querying
  // immediately returns nothing even though the offers are on-chain. Retry with backoff.
  let best: any = undefined;
  for (let attempt = 1; attempt <= 8; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));

    // The direction /quote actually uses: "I spend N USDC, how much IDR arrives?"
    const send = await server.strictSendPaths(USDC, "99.5", [IDR]).call();
    // The direction /submit uses: "I want exactly N IDR, how much USDC does it cost?"
    const recv = await server.strictReceivePaths([USDC], IDR, "1600000").call();

    console.log(
      `  attempt ${attempt}/8 — strictSend: ${send.records.length} path(s), ` +
        `strictReceive: ${recv.records.length} path(s)`,
    );

    if (send.records[0] && recv.records[0]) {
      best = { send: send.records[0], recv: recv.records[0] };
      break;
    }
  }

  if (!best) {
    console.error("\n  FAIL: NO PATH FOUND after retries.");
    console.error("  The offers ARE on-chain (step 4 succeeded), so this is not a signing issue.");
    console.error("  Debug with: pnpm --filter api exec tsx drizzle/diagnose.ts");
    process.exit(1);
  }

  console.log(`  ok strictSend:    99.5 USDC -> ${best.send.destination_amount} IDR`);
  console.log(`  ok strictReceive: ${best.recv.source_amount} USDC -> 1,600,000 IDR`);

}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
