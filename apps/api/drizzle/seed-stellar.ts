// Seed Stellar testnet with IDR, VND, and PHP demo assets plus XLM bridge liquidity.
//
// Each cross-currency route is intentionally:
//   source asset -> XLM -> destination asset
//
// Without the XLM/local-currency offers, strictSendPaths/strictReceivePaths cannot
// find an executable path and the API correctly refuses to quote or submit.
//
// Run BEFORE db:seed:
//   pnpm --filter api tsx drizzle/seed-stellar.ts
//
// Runs under Node (tsx), NOT the Worker — process.env is fine here.

import "dotenv/config";
import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";
import Decimal from "decimal.js";

const server = new Horizon.Server(
  process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org",
);
const NET = Networks.TESTNET;

type LocalCode = "IDR" | "VND" | "PHP";

type Market = {
  code: LocalCode;
  issuer: Keypair;
  asset: Asset;
  localPerXlm: string;
  distributorAmount: string;
  marketMakerAmount: string;
};

type PathRecord = Horizon.ServerApi.PaymentPathRecord;

async function fund(kp: Keypair, label: string) {
  const r = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
  if (!r.ok && r.status !== 400) {
    throw new Error(`friendbot ${label}: ${r.status}`);
  }
  console.log(`  funded ${label}: ${kp.publicKey()}`);
}

async function submit(kp: Keypair, ops: any[], label: string) {
  const acct = await server.loadAccount(kp.publicKey());
  const b = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: NET,
  });
  ops.forEach((o) => b.addOperation(o));
  const tx = b.setTimeout(60).build();
  tx.sign(kp);
  try {
    const res = await server.submitTransaction(tx);
    console.log(`  ok ${label} - ${res.hash.slice(0, 12)}...`);
  } catch (e: any) {
    console.error(
      `  FAIL ${label}:`,
      JSON.stringify(e?.response?.data?.extras?.result_codes ?? e.message),
    );
    throw e;
  }
}

function hasXlmBridgeHop(record: PathRecord): boolean {
  return (record.path ?? []).some((hop: any) => hop.asset_type === "native");
}

function pathLabel(record: PathRecord | undefined): string {
  if (!record) return "none";
  return (record.path ?? [])
    .map((hop: any) =>
      hop.asset_type === "native" ? "XLM" : `${hop.asset_code}:${hop.asset_issuer}`,
    )
    .join(" → ") || "direct";
}

async function main() {
  console.log("Seeding Stellar testnet with XLM bridge markets...\n");

  // Issuer accounts stay separate from the distributor and market maker.
  const issuers: Record<LocalCode, Keypair> = {
    IDR: Keypair.random(),
    VND: Keypair.random(),
    PHP: Keypair.random(),
  };

  // Reuse the configured distributor when available so the Worker can submit
  // with the printed/current DISTRIBUTOR_SECRET after this script completes.
  const envSecret = process.env.DISTRIBUTOR_SECRET;
  const distributor =
    envSecret && envSecret.startsWith("S") && envSecret !== "S..."
      ? Keypair.fromSecret(envSecret)
      : Keypair.random();

  // The receiving anchor is the on-chain destination for every supported
  // destination asset; the receiver has no Stellar account in the MVP.
  const anchor = Keypair.random();
  const mm = Keypair.random();

  const markets: Market[] = [
    {
      code: "IDR",
      issuer: issuers.IDR,
      asset: new Asset("IDR", issuers.IDR.publicKey()),
      localPerXlm: "16000",
      distributorAmount: "1000000000",
      marketMakerAmount: "100000000000",
    },
    {
      code: "VND",
      issuer: issuers.VND,
      asset: new Asset("VND", issuers.VND.publicKey()),
      localPerXlm: "7500",
      distributorAmount: "1000000000",
      marketMakerAmount: "100000000000",
    },
    {
      code: "PHP",
      issuer: issuers.PHP,
      asset: new Asset("PHP", issuers.PHP.publicKey()),
      localPerXlm: "28",
      distributorAmount: "1000000000",
      marketMakerAmount: "1000000000",
    },
  ];
  const XLM = Asset.native();

  console.log("1. Funding accounts via friendbot...");
  const funding: Array<[Keypair, string]> = [
    [issuers.IDR, "idrIssuer"],
    [issuers.VND, "vndIssuer"],
    [issuers.PHP, "phpIssuer"],
    [distributor, "distributor"],
    [anchor, "receivingAnchor"],
    [mm, "marketMaker"],
  ];
  for (const [kp, label] of funding) {
    await fund(kp, label);
  }

  console.log("\n2. Trustlines for all local assets...");
  await submit(
    distributor,
    markets.map((market) =>
      Operation.changeTrust({
        asset: market.asset,
        limit: market.distributorAmount,
      }),
    ),
    "distributor -> IDR + VND + PHP",
  );
  await submit(
    anchor,
    markets.map((market) =>
      Operation.changeTrust({
        asset: market.asset,
        limit: "100000000000",
      }),
    ),
    "receiving anchor -> IDR + VND + PHP",
  );
  await submit(
    mm,
    markets.map((market) =>
      Operation.changeTrust({
        asset: market.asset,
        // Leave room above the issued balance for buying liabilities created
        // by the XLM sell offers.
        limit: "500000000000",
      }),
    ),
    "market maker -> IDR + VND + PHP",
  );

  console.log("\n3. Issuing demo local assets...");
  for (const market of markets) {
    await submit(
      market.issuer,
      [
        Operation.payment({
          destination: distributor.publicKey(),
          asset: market.asset,
          amount: market.distributorAmount,
        }),
        Operation.payment({
          destination: mm.publicKey(),
          asset: market.asset,
          amount: market.marketMakerAmount,
        }),
      ],
      `issue ${market.code}`,
    );
  }

  console.log("\n4. Seeding XLM/local order books...");
  // Both sides of every XLM/local market are required for a route:
  // source local -> XLM consumes local sell offers, while XLM -> destination
  // consumes XLM sell offers.
  const levelMultipliers = ["1", "1.01", "1.02"];
  const bridgeOffers = markets.flatMap((market) =>
    levelMultipliers.flatMap((multiplier) => {
      const localPerXlm = new Decimal(market.localPerXlm);
      const level = new Decimal(multiplier);
      const localOfferAmount = new Decimal(market.marketMakerAmount)
        .div(levelMultipliers.length)
        .toFixed(7);
      return [
        {
          selling: XLM,
          buying: market.asset,
          amount: "1000",
          price: localPerXlm.mul(level).toFixed(7),
        },
        {
          selling: market.asset,
          buying: XLM,
          amount: localOfferAmount,
          // Keep the reciprocal bid below the ask to avoid op_cross_self.
          price: new Decimal("1")
            .div(localPerXlm.mul(level).mul(new Decimal("0.95")))
            .toFixed(7),
        },
      ];
    }),
  );
  await submit(
    mm,
    bridgeOffers.map(({ selling, buying, amount, price }) =>
      Operation.manageSellOffer({
        selling,
        buying,
        amount,
        price,
        offerId: "0",
      }),
    ),
    "XLM/local reciprocal bridge offers",
  );

  // Print keys BEFORE verification — a failed verify must never lose keypairs.
  console.log("\n" + "=".repeat(62));
  console.log("Copy into apps/api/.dev.vars (and use wrangler secrets in prod):\n");
  console.log(`IDR_ISSUER=${issuers.IDR.publicKey()}`);
  console.log(`VND_ISSUER=${issuers.VND.publicKey()}`);
  console.log(`PHP_ISSUER=${issuers.PHP.publicKey()}`);
  console.log(`DISTRIBUTOR_SECRET=${distributor.secret()}`);
  console.log(`RECEIVING_ANCHOR_PUBKEY=${anchor.publicKey()}`);
  console.log("\n# keep safe (needed to re-seed offers later):");
  console.log(`# MARKET_MAKER_SECRET=${mm.secret()}`);
  console.log("=".repeat(62));

  console.log("\n5. Verifying every cross-currency XLM route...");
  const pairs = markets.flatMap((source) =>
    markets
      .filter((destination) => destination.code !== source.code)
      .map((destination) => ({ source, destination })),
  );

  let allVerified = false;
  for (let attempt = 1; attempt <= 8; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const missing: string[] = [];

    for (const { source, destination } of pairs) {
      try {
        const send = await server
          .strictSendPaths(source.asset, "100", [destination.asset])
          .call();
        const receive = await server
          .strictReceivePaths([source.asset], destination.asset, "100")
          .call();
        const sendPath = send.records.find(hasXlmBridgeHop);
        const receivePath = receive.records.find(hasXlmBridgeHop);

        console.log(
          `  ${source.code} -> ${destination.code}: ` +
            `strictSend=${send.records.length} (${pathLabel(sendPath)}), ` +
            `strictReceive=${receive.records.length} (${pathLabel(receivePath)})`,
        );

        if (!sendPath || !receivePath) {
          missing.push(`${source.code} -> ${destination.code}`);
        }
      } catch (e: any) {
        missing.push(`${source.code} -> ${destination.code}: ${e?.message ?? e}`);
      }
    }

    if (missing.length === 0) {
      allVerified = true;
      console.log(`  all ${pairs.length} cross-currency routes verified`);
      break;
    }

    console.log(
      `  attempt ${attempt}/8 still waiting for: ${missing.join(", ")}`,
    );
  }

  if (!allVerified) {
    console.error("\nFAIL: one or more XLM bridge routes were not found.");
    console.error("The offers were submitted, but Horizon may still be indexing them.");
    console.error("Debug with: pnpm --filter api exec tsx drizzle/diagnose.ts");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
