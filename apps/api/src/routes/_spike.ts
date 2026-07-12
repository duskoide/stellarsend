// TEMPORARY SPIKE ROUTE — task 0.1. DELETE once verified.
// Proves a Cloudflare Worker can friendbot-fund, SIGN, and SUBMIT a real testnet tx.
//
// Wire in apps/api/src/index.ts:
//    import { spike } from "./routes/_spike.js";
//    app.route("/_spike", spike);
//
// Then: curl -X POST http://127.0.0.1:8787/_spike/sign-submit
//
// Requires nodejs_compat in wrangler.toml (for Buffer).

import { Hono } from "hono";
import { Keypair, TransactionBuilder, Operation, Asset, BASE_FEE, Horizon, Networks } from "@stellar/stellar-sdk";
import type { AppContext } from "../env.js";

export const spike = new Hono<AppContext>();

spike.post("/sign-submit", async (c) => {
  const steps: string[] = [];
  try {
    // 1. Keypair inside the isolate — the call we were worried about.
    const kp = Keypair.random();
    steps.push(`keypair ok: ${kp.publicKey()}`);

    // fromSecret() is the specific do-or-die call (ed25519 from raw seed).
    const rt = Keypair.fromSecret(kp.secret());
    steps.push(`fromSecret ok: ${rt.publicKey() === kp.publicKey()}`);

    // 2. Fund via friendbot (plain fetch — always fine on Workers).
    const fb = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
    if (!fb.ok) throw new Error(`friendbot failed: ${fb.status}`);
    steps.push("friendbot funded");

    // 3. Build a trivial payment (self-payment: no trustline needed).
    const server = new Horizon.Server(c.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org");
    const acct = await server.loadAccount(kp.publicKey());
    steps.push(`account loaded, seq ${acct.sequenceNumber()}`);

    const tx = new TransactionBuilder(acct, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({
        destination: kp.publicKey(),
        asset: Asset.native(),
        amount: "1.0000000",
      }))
      .setTimeout(60)
      .build();

    // 4. THE GATE: sign in the V8 isolate.
    tx.sign(kp);
    steps.push(`signed, ${tx.signatures.length} sig(s)`);

    // 5. Submit for real.
    const res = await server.submitTransaction(tx);
    steps.push("submitted");

    return c.json({
      ok: true,
      txHash: res.hash,
      stellarExpert: `https://stellar.expert/explorer/testnet/tx/${res.hash}`,
      steps,
    });
  } catch (err: any) {
    // Fail loudly and honestly — never fake a hash.
    return c.json({
      ok: false,
      failedAfter: steps,
      error: err?.message ?? String(err),
      // Horizon returns the useful detail nested here:
      horizon: err?.response?.data?.extras?.result_codes ?? err?.response?.data ?? null,
    }, 500);
  }
});
