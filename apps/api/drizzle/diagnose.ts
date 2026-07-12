// Diagnose why strictSendPaths / strictReceivePaths finds no path.
// Run: pnpm --filter api exec tsx drizzle/diagnose.ts
import "dotenv/config";
import { Horizon, Asset } from "@stellar/stellar-sdk";

const server = new Horizon.Server(process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org");

const USDC_ISSUER = process.env.USDC_ISSUER!;
const IDR_ISSUER = process.env.IDR_ISSUER!;
const DIST = process.env.DISTRIBUTOR_PUBKEY; // optional

if (!USDC_ISSUER?.startsWith("G") || !IDR_ISSUER?.startsWith("G")) {
  console.error("Set USDC_ISSUER and IDR_ISSUER in .env first (from seed output).");
  process.exit(1);
}

const USDC = new Asset("USDC", USDC_ISSUER);
const IDR = new Asset("IDR", IDR_ISSUER);

async function main() {
  console.log("USDC issuer:", USDC_ISSUER);
  console.log("IDR  issuer:", IDR_ISSUER);

  console.log("\n=== 1. ORDER BOOK: selling IDR, buying USDC ===");
  const ob = await server.orderbook(IDR, USDC).call();
  console.log("  bids:", ob.bids.length, "asks:", ob.asks.length);
  ob.asks.slice(0, 3).forEach((a) => console.log(`    ask  amount=${a.amount} price=${a.price}`));
  ob.bids.slice(0, 3).forEach((b) => console.log(`    bid  amount=${b.amount} price=${b.price}`));

  console.log("\n=== 2. ORDER BOOK: selling USDC, buying IDR (inverse view) ===");
  const ob2 = await server.orderbook(USDC, IDR).call();
  console.log("  bids:", ob2.bids.length, "asks:", ob2.asks.length);
  ob2.asks.slice(0, 3).forEach((a) => console.log(`    ask  amount=${a.amount} price=${a.price}`));
  ob2.bids.slice(0, 3).forEach((b) => console.log(`    bid  amount=${b.amount} price=${b.price}`));

  console.log("\n=== 3. strictSendPaths: spend USDC -> get IDR (what /quote uses) ===");
  for (const amt of ["1", "10", "99.5000000", "100"]) {
    try {
      const r = await server.strictSendPaths(USDC, amt, [IDR]).call();
      console.log(`  send ${amt} USDC -> ${r.records.length} path(s)` +
        (r.records[0] ? ` | best dest=${r.records[0].destination_amount} IDR` : ""));
    } catch (e: any) {
      console.log(`  send ${amt} USDC -> ERROR ${e?.message}`);
    }
  }

  console.log("\n=== 4. strictReceivePaths: want IDR -> pay USDC (what /submit uses) ===");
  for (const amt of ["1000", "100000", "1600000"]) {
    try {
      const r = await server.strictReceivePaths([USDC], IDR, amt).call();
      console.log(`  receive ${amt} IDR -> ${r.records.length} path(s)` +
        (r.records[0] ? ` | best src=${r.records[0].source_amount} USDC` : ""));
    } catch (e: any) {
      console.log(`  receive ${amt} IDR -> ERROR ${e?.message}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
