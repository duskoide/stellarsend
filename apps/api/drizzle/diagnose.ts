// Diagnose XLM bridge liquidity and strictSend/strictReceive path discovery.
// Run: pnpm --filter api exec tsx drizzle/diagnose.ts
import "dotenv/config";
import { Horizon, Asset } from "@stellar/stellar-sdk";

type LocalCode = "BND" | "KHR" | "IDR" | "LAK" | "MYR" | "MMK" | "PHP" | "SGD" | "THB" | "VND" | "USD";

const server = new Horizon.Server(
  process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org",
);

const issuerByCode: Record<LocalCode, string | undefined> = {
  BND: process.env.BND_ISSUER,
  KHR: process.env.KHR_ISSUER,
  IDR: process.env.IDR_ISSUER,
  LAK: process.env.LAK_ISSUER,
  MYR: process.env.MYR_ISSUER,
  MMK: process.env.MMK_ISSUER,
  PHP: process.env.PHP_ISSUER,
  SGD: process.env.SGD_ISSUER,
  THB: process.env.THB_ISSUER,
  VND: process.env.VND_ISSUER,
  USD: process.env.USD_ISSUER,
};

const missingIssuers = Object.entries(issuerByCode)
  .filter(([, issuer]) => !issuer?.startsWith("G"))
  .map(([code]) => `${code}_ISSUER`);

if (missingIssuers.length > 0) {
  console.error(`Set ${missingIssuers.join(", ")} in .env first (from seed output).`);
  process.exit(1);
}

const assets: Record<LocalCode, Asset> = {
  BND: new Asset("BND", issuerByCode.BND!),
  KHR: new Asset("KHR", issuerByCode.KHR!),
  IDR: new Asset("IDR", issuerByCode.IDR!),
  LAK: new Asset("LAK", issuerByCode.LAK!),
  MYR: new Asset("MYR", issuerByCode.MYR!),
  MMK: new Asset("MMK", issuerByCode.MMK!),
  PHP: new Asset("PHP", issuerByCode.PHP!),
  SGD: new Asset("SGD", issuerByCode.SGD!),
  THB: new Asset("THB", issuerByCode.THB!),
  VND: new Asset("VND", issuerByCode.VND!),
  USD: new Asset("USD", issuerByCode.USD!),
};
const XLM = Asset.native();

type PathRecord = Horizon.ServerApi.PaymentPathRecord;

function hasXlmBridgeHop(record: PathRecord): boolean {
  return (record.path ?? []).some((hop: any) => hop.asset_type === "native");
}

function pathLabel(record: PathRecord | undefined): string {
  if (!record) return "none";
  return (
    record.path ?? []
  )
    .map((hop: any) =>
      hop.asset_type === "native" ? "XLM" : `${hop.asset_code}:${hop.asset_issuer}`,
    )
    .join(" → ") || "direct";
}

async function main() {
  console.log("XLM bridge diagnostics\n");
  for (const code of Object.keys(assets) as LocalCode[]) {
    const book = await server.orderbook(XLM, assets[code]).call();
    console.log(
      `XLM/${code}: bids=${book.bids.length}, asks=${book.asks.length}`,
    );
  }

  for (const sourceCode of Object.keys(assets) as LocalCode[]) {
    for (const destinationCode of Object.keys(assets) as LocalCode[]) {
      if (sourceCode === destinationCode) continue;

      const source = assets[sourceCode];
      const destination = assets[destinationCode];
      try {
        const send = await server
          .strictSendPaths(source, "100", [destination])
          .call();
        const receive = await server
          .strictReceivePaths([source], destination, "100")
          .call();
        const sendPath = send.records.find(hasXlmBridgeHop);
        const receivePath = receive.records.find(hasXlmBridgeHop);

        console.log(
          `${sourceCode} -> ${destinationCode}: ` +
            `strictSend=${send.records.length} (${pathLabel(sendPath)}), ` +
            `strictReceive=${receive.records.length} (${pathLabel(receivePath)})`,
        );
      } catch (e: any) {
        console.log(
          `${sourceCode} -> ${destinationCode}: ERROR ${e?.message ?? e}`,
        );
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
