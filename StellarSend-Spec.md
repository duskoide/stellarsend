# StellarSend — Cross-Border Remittance on Stellar

**Software Specification & Technical Blueprint**
**APAC Stellar Hackathon 2026 — Track 1: Local Finance & Real World Access ($20,000)**

> Deadline: 23 July 2026 · MVP scope tuned for ~2-week build

---

## 1. Ringkasan Produk

**StellarSend** adalah aplikasi remittance yang memungkinkan TKI dan mahasiswa Indonesia di luar negeri mengirim uang ke keluarga di Indonesia dengan cepat dan biaya rendah, memanfaatkan Stellar sebagai payment rail dan anchor lokal untuk cash-in/cash-out ke Rupiah.

**Problem:** Remittance konvensional (Western Union, bank) mahal (5–10% fee), lambat (1–3 hari), dan ribet. TKI kehilangan porsi signifikan dari kiriman mereka.

**Solusi:** Sender bayar dalam mata uang lokal / stablecoin → dikonversi & dikirim via Stellar (settle dalam hitungan detik, fee ~$0.00001) → receiver di Indonesia klaim sebagai IDR ke rekening bank / e-wallet lewat anchor lokal.

**Kenapa cocok untuk Track 1:** Menghubungkan real-world asset (fiat IDR & foreign fiat) ke infrastruktur blockchain lewat integrasi anchor lokal — inti dari "Real World Access".

### Kenapa Stellar (bukan chain lain)
- **SEP standards** (SEP-24, SEP-31, SEP-6) sudah dirancang khusus untuk remittance & anchor interoperability — ini pembeda utama vs chain lain.
- **Path Payments**: kirim aset A, receiver terima aset B, konversi otomatis via built-in DEX dalam satu transaksi atomik.
- **Fee** ~0.00001 XLM per transaksi, finality 3–5 detik.
- Ekosistem anchor yang matang di kawasan (mis. mitra on/off-ramp regional).

---

## 2. Arsitektur Sistem

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Sender    │         │  StellarSend     │         │  Receiver   │
│  (Web App)  │◄───────►│   Backend API    │◄───────►│  (Web App)  │
└─────────────┘         └────────┬─────────┘         └─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
      ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
      │  Stellar     │   │  Sending     │   │  Receiving   │
      │  Horizon /   │   │  Anchor      │   │  Anchor (ID) │
      │  Soroban RPC │   │  (SEP-24/6)  │   │  (SEP-24/31) │
      └──────────────┘   └──────────────┘   └──────────────┘
              │
              ▼
      ┌──────────────┐
      │ Stellar      │
      │ Network      │
      │ (Testnet)    │
      └──────────────┘
```

**Alur transaksi (happy path):**
1. Sender input jumlah + pilih penerima → sistem hitung quote (rate + fee).
2. Sender fund via sending anchor (SEP-24 deposit) atau langsung bayar stablecoin.
3. Backend eksekusi **Path Payment** di Stellar. Current demo baseline: `USDC-demo → IDR-token`. Candidate multi-hop route: `[SourceAsset] → XLM → IDR-token` (lihat §7.1).
4. Receiving anchor (SEP-31/SEP-24) terima IDR-token → payout ke rekening bank / e-wallet penerima.
5. Kedua pihak dapat notifikasi + status real-time.

> **Catatan MVP:** untuk hackathon, pakai **Stellar Testnet** + **mock anchor** yang kamu kontrol (atau anchor demo publik). Ini menghindari blocker KYC/regulasi produksi sambil tetap mendemonstrasikan alur SEP end-to-end.

---

## 3. Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR; deploy ke **Cloudflare Pages** via `@cloudflare/next-on-pages` |
| **UI** | Tailwind CSS + shadcn/ui | Komponen siap pakai, UI bersih tanpa buang waktu |
| **State/Data fetching** | TanStack Query | Caching quote, polling status transaksi |
| **Backend** | **Hono** + TypeScript (Cloudflare Workers) | Worker-native `fetch` handler; menggantikan Fastify/NestJS yang butuh Node HTTP server (`listen()`) |
| **Stellar SDK** | `@stellar/stellar-sdk` (JS) + `nodejs_compat` | Official SDK; enable `nodejs_compat` di wrangler agar `Keypair` (ed25519) & `Buffer` jalan di V8 isolate |
| **Wallet integration** | Stellar Wallets Kit / Freighter | Standar konektor wallet Stellar |
| **Database** | **Turso (libSQL/SQLite) + Drizzle ORM** | Cloudflare-native, koneksi HTTP; menggantikan PostgreSQL + Prisma |
| **Queue/Jobs** | **Cloudflare Queues + Cron Triggers** | Async job (settlement/payout) tanpa proses Node lama; menggantikan Redis + BullMQ |
| **Auth** | JWT + email OTP (atau Clerk) | Auth ringan; passkey optional |
| **Anchor / SEP** | SEP-24 (interactive deposit/withdraw), SEP-31 (cross-border), SEP-10 (auth) | Standar remittance Stellar |
| **Infra** | **Cloudflare Pages (FE) + Cloudflare Workers (API)** | Satu ekosistem; menggantikan Vercel + Railway/Render |
| **Monitoring** | Sentry + logging Worker | Debug saat demo |

**Bahasa utama:** TypeScript full-stack — mengurangi context-switch, biar 2 minggu maksimal.

---

## 4. Struktur Repo / File

Monorepo dengan **Turborepo** (opsional; kalau mau simpel, dua folder biasa juga cukup).

```
stellarsend/
├── README.md
├── package.json                  # root, workspaces
├── turbo.json
├── wrangler.toml                 # Worker config: nodejs_compat, bindings, queues, cron
│
├── apps/
│   ├── web/                      # Next.js frontend (sender + receiver)
│   │   ├── app/
│   │   │   ├── (sender)/
│   │   │   │   ├── send/page.tsx          # form input jumlah + penerima
│   │   │   │   ├── quote/page.tsx         # tampilkan rate + fee
│   │   │   │   └── status/[id]/page.tsx   # tracking transaksi
│   │   │   ├── (receiver)/
│   │   │   │   ├── claim/[id]/page.tsx    # klaim ke bank/e-wallet
│   │   │   │   └── history/page.tsx
│   │   │   ├── auth/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx                   # landing
│   │   ├── components/
│   │   │   ├── ui/                        # shadcn components
│   │   │   ├── AmountInput.tsx
│   │   │   ├── QuoteCard.tsx
│   │   │   ├── TxStatusStepper.tsx
│   │   │   └── WalletConnect.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                     # client ke backend
│   │   │   ├── stellar.ts                 # helper wallet kit
│   │   │   └── format.ts                  # format currency
│   │   ├── hooks/
│   │   │   ├── useQuote.ts
│   │   │   └── useTxStatus.ts
│   │   ├── public/
│   │   ├── tailwind.config.ts
│   │   └── next.config.js
│   │
│   └── api/                      # Hono API Worker (Cloudflare Workers)
│       ├── src/
│       │   ├── index.ts          # Hono app + `export default { fetch, scheduled }`
│       │   ├── env.ts            # typed bindings (DB, QUEUE, env)
│       │   ├── routes/           # Hono route handlers (ganti modul Fastify)
│       │   │   ├── auth.ts       # SEP-10 + JWT
│       │   │   ├── quote.ts      # rate + fee (strict-receive lookup)
│       │   │   ├── transfer.ts   # build & submit path payment
│       │   │   ├── anchor.ts     # SEP-24/31 client calls
│       │   │   ├── payout.ts     # receiver -> bank/ewallet
│       │   │   ├── beneficiary.ts
│       │   │   └── webhook.ts    # callback anchor
│       │   ├── stellar/
│       │   │   ├── horizon.ts    # koneksi Horizon (fetch)
│       │   │   ├── pathPayment.ts# build path payment op
│       │   │   ├── assets.ts     # definisi asset (USDC, IDR-token)
│       │   │   └── account.ts    # keypair, trustline (butuh nodejs_compat)
│       │   ├── queues/           # Cloudflare Queues consumers
│       │   │   ├── settlement.ts # poll status settlement
│       │   │   └── payout.ts     # trigger payout ke anchor
│       │   ├── scheduled/
│       │   │   └── cron.ts       # Cron Trigger: reconcile transfer stuck
│       │   ├── db/
│       │   │   ├── client.ts     # drizzle + @libsql/client (Turso)
│       │   │   └── schema.ts     # skema Drizzle (SQLite)
│       │   └── utils/
│       │       ├── logger.ts
│       │       └── errors.ts
│       ├── drizzle/
│       │   ├── migrations/
│       │   └── seed.ts           # akun testnet + trustline + friendbot
│       ├── wrangler.toml         # nodejs_compat, bindings, queues, cron
│       └── package.json
│
├── packages/
│   ├── shared/                   # tipe & util dipakai FE + BE
│   │   ├── types.ts              # Transfer, Quote, User, dst
│   │   └── constants.ts          # asset codes, status enums
│   └── config/                   # eslint, tsconfig bersama
│
└── docs/
    ├── architecture.md
    ├── api.md                    # daftar endpoint
    └── demo-script.md            # skenario demo untuk juri
```

Kalau mau lebih ringan untuk 2 minggu: buang `packages/`, jadikan dua folder `web/` dan `api/` biasa, share tipe lewat file duplikat kecil.

---

## 5. Skema Database (Turso / Drizzle)

```typescript
// drizzle/schema.ts
import { sqliteTable, text, integer, blob, uniqueIndex } from "drizzle-orm/sqlite-core";

// SQLite has no ENUM type -> model as TS unions, store as text()
export const USER_ROLE = ["SENDER", "RECEIVER"] as const;
export const TRANSFER_STATUS = [
  "PENDING", "FUNDED", "SUBMITTED", "SETTLED",
  "PAYOUT_PENDING", "COMPLETED", "FAILED", "REFUNDED",
] as const;
export const PAYOUT_METHOD = ["BANK_TRANSFER", "EWALLET"] as const;
export type UserRole = (typeof USER_ROLE)[number];
export type TransferStatus = (typeof TRANSFER_STATUS)[number];
export type PayoutMethod = (typeof PAYOUT_METHOD)[number];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  phone: text("phone").unique(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: USER_ROLE }).notNull(),
  country: text("country").notNull(),                       // ISO code, mis. "SG", "ID"
  stellarPubKey: text("stellar_pub_key"),
  kycStatus: text("kyc_status").notNull().default("none"),  // none | pending | verified
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (t) => ({ emailIdx: uniqueIndex("email_idx").on(t.email) }));

// Data penerima yang disimpan sender (rekening tujuan)
export const beneficiaries = sqliteTable("beneficiaries", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  fullName: text("full_name").notNull(),
  method: text("method", { enum: PAYOUT_METHOD }).notNull(),
  bankName: text("bank_name"),
  accountNumber: text("account_number").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const transfers = sqliteTable("transfers", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull().references(() => users.id),
  receiverId: text("receiver_id").references(() => users.id),
  beneficiaryId: text("beneficiary_id").references(() => beneficiaries.id),

  // Nominal — disimpan sebagai text (7 desimal) agar presisi Stellar tidak hilang
  sourceAsset: text("source_asset").notNull(),
  sourceAmount: text("source_amount").notNull(),
  destAsset: text("dest_asset").notNull(),
  destAmount: text("dest_amount").notNull(),
  exchangeRate: text("exchange_rate").notNull(),
  feeAmount: text("fee_amount").notNull(),

  status: text("status", { enum: TRANSFER_STATUS }).notNull().default("PENDING"),

  // Referensi Stellar & anchor
  stellarTxHash: text("stellar_tx_hash").unique(),
  pathPaymentJson: blob("path_payment_json", { mode: "json" }),
  sendingAnchorRef: text("sending_anchor_ref"),
  receivingAnchorRef: text("receiving_anchor_ref"),
  payoutMethod: text("payout_method", { enum: PAYOUT_METHOD }),

  quoteId: text("quote_id").references(() => quotes.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

// Audit trail tiap perubahan status (bagus untuk demo & debugging)
export const transferEvents = sqliteTable("transfer_events", {
  id: text("id").primaryKey(),
  transferId: text("transfer_id").notNull().references(() => transfers.id),
  status: text("status", { enum: TRANSFER_STATUS }).notNull(),
  message: text("message"),
  metadata: blob("metadata", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

// Quote di-lock sementara sebelum sender konfirmasi
export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey(),
  sourceAsset: text("source_asset").notNull(),
  sourceAmount: text("source_amount").notNull(),
  destAsset: text("dest_asset").notNull(),
  destAmount: text("dest_amount").notNull(),
  exchangeRate: text("exchange_rate").notNull(),
  feeAmount: text("fee_amount").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});
```

**Catatan desain:**
- Amount disimpan sebagai `text` (7 desimal) karena SQLite tak punya tipe `Decimal`; app pakai `decimal.js`/string arithmetic untuk hindari float error — sesuai presisi 7 desimal Stellar.
- `TRANSFER_STATUS` / `USER_ROLE` / `PAYOUT_METHOD` sebagai TS union + `text({ enum })`; SQLite tak punya ENUM.
- `transferEvents` sebagai append-only audit log — sangat membantu saat demo untuk menunjukkan lifecycle transaksi ke juri.
- `quotes.expiresAt` (timestamp_ms) supaya rate tidak stale (misal lock 60 detik).
- Migrasi via `drizzle-kit`; dev lokal pakai file `libsql` (`TURSO_URL=file:./local.db`), produksi pakai URL + token dari Turso.

---

## 6. Spesifikasi API (REST)

Base URL: `/api/v1`

### Auth
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/auth/register` | Daftar sender/receiver |
| POST | `/auth/login` | Login → JWT |
| POST | `/auth/stellar/challenge` | SEP-10 challenge (kalau self-custody) |
| POST | `/auth/stellar/token` | SEP-10 verify → token |

### Quote
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/quote` | Body: `{ sourceAsset, sourceAmount, destAsset }` → return rate, feeAmount, destAmount, expiresAt. Di belakang layar pakai `strictReceivePaths` / `strictSendPaths` Horizon. |

### Transfer
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/transfers` | Buat transfer dari quote + beneficiary. Status → `PENDING`. |
| POST | `/transfers/:id/fund` | Trigger deposit via sending anchor (SEP-24) atau konfirmasi pembayaran stablecoin. |
| POST | `/transfers/:id/submit` | Build & submit Path Payment ke Stellar. |
| GET | `/transfers/:id` | Detail + status + events (untuk polling). |
| GET | `/transfers` | List transaksi user. |

### Payout (Receiver)
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/claims/:id` | Info klaim untuk penerima. |
| POST | `/claims/:id/payout` | Pilih metode (bank/e-wallet) → trigger anchor withdraw (SEP-24). |

### Beneficiary
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET/POST/DELETE | `/beneficiaries` | Kelola daftar penerima. |

### Webhook
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/webhooks/anchor` | Callback status deposit/withdraw dari anchor. |

**Contoh response `/quote`:**
```json
{
  "quoteId": "clq_abc123",
  "sourceAsset": "USDC",
  "sourceAmount": "100.0000000",
  "destAsset": "IDR",
  "destAmount": "1587000.0000000",
  "exchangeRate": "15870.0000000",
  "feeAmount": "0.5000000",
  "expiresAt": "2026-07-15T10:31:00Z"
}
```

---

## 7. Inti Teknis: Path Payment

Contoh membangun path payment (strict-receive) — receiver dijamin menerima jumlah IDR pasti:

```typescript
// api/src/stellar/pathPayment.ts
import {
  Horizon, TransactionBuilder, Operation, Asset,
  Networks, BASE_FEE
} from "@stellar/stellar-sdk";

export async function buildPathPayment(params: {
  sourceSecret: string;
  destPublicKey: string;
  sendAsset: Asset;       // mis. USDC
  sendMax: string;        // batas atas yang mau dikirim
  destAsset: Asset;       // mis. IDR-token
  destAmount: string;     // jumlah pasti diterima
}) {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const source = await server.loadAccount(/* pubkey dari secret */);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.pathPaymentStrictReceive({
      sendAsset: params.sendAsset,
      sendMax: params.sendMax,
      destination: params.destPublicKey,
      destAsset: params.destAsset,
      destAmount: params.destAmount,
      // path bisa dikosongkan agar auto, atau isi hasil strictReceivePaths()
    }))
    .setTimeout(60)
    .build();

  // tx.sign(Keypair.fromSecret(params.sourceSecret));
  // return server.submitTransaction(tx);
  return tx;
}
```

**Untuk cari rate & path terbaik**, panggil Horizon:
```typescript
const paths = await server
  .strictReceivePaths([sendAsset], destAsset, destAmount)
  .call();
// ambil path dengan source_amount terkecil
```
**Catatan Cloudflare Workers:** aktifkan `nodejs_compat` di `wrangler.toml` agar
`@stellar/stellar-sdk` (khususnya `Keypair` ed25519 & `Buffer`) berjalan di V8 isolate.
Pemanggilan Horizon via `fetch` native sudah kompatibel. **Spike** pembuatan & sign
transaksi di dalam Worker sejak hari pertama — ini satu-satunya risiko runtime yang
load-bearing untuk submit path payment.

### 7.1 Keputusan Bridge Asset: XLM vs USDC (DITUNDA)

**Status:** keputusan bridge asset ditunda sampai route XLM menghasilkan transaksi Testnet yang sukses dan dapat diverifikasi di Stellar Expert. Jangan menghapus current USDC happy path sebelum gate ini terpenuhi.

#### Opsi route

**Current baseline — USDC demo asset:**

```text
USDC-demo → IDR-token → receiving anchor → IDR fiat (mock payout)
```

`seed-stellar.ts` saat ini membuat issuer USDC secara acak. Karena asset Stellar diidentifikasi oleh kombinasi `asset code + issuer`, asset ini adalah **demo token**, bukan USDC yang benar-benar didukung USD. Production harus memakai issuer/anchor yang diverifikasi.

**Candidate Stellar-native route — XLM sebagai bridge:**

```text
VND/PHP token → [XLM] → IDR-token → receiving anchor → IDR fiat (mock payout)
```

Ini menggunakan satu `Path Payment Strict Receive` dengan XLM sebagai intermediary asset. Route tersebut membutuhkan liquidity untuk kedua pasangan:

```text
VND/XLM atau PHP/XLM
XLM/IDR
```

Jika user membeli XLM secara just-in-time, flow off-chain-nya menjadi:

```text
fiat → buy/acquire XLM → XLM → IDR-token
```

Dalam flow ini XLM adalah **source asset**, bukan intermediary hop.

#### Alasan memilih XLM untuk demo

- XLM adalah native Stellar asset; tidak membutuhkan issuer atau trustline.
- Path Payment dapat menampilkan kemampuan Stellar SDEX/liquidity routing secara langsung.
- Menghindari ketergantungan pada random testnet issuer yang hanya diberi code `USDC`.
- Menunjukkan route multi-hop yang relevan untuk transfer lintas mata uang.

#### Trade-off dan batasan

- XLM tidak stable; harga dapat berubah antara quote dan submission.
- XLM tidak membuat transaksi lebih cepat atau biaya jaringan lebih rendah. Kedua route tetap membayar network fee dalam XLM dan memiliki finality Stellar yang sama.
- Stablecoin lebih mudah untuk quote fiat yang predictable, selama issuer, redemption, dan liquidity-nya dapat dipercaya.
- XLM route membutuhkan liquidity yang cukup dan dapat menghasilkan spread/slippage yang lebih besar daripada USDC.
- Semua issued asset (`VND`, `PHP`, `IDR`) wajib menggunakan issuer yang tepat; asset code saja tidak cukup.

#### Gate sebelum XLM menjadi default demo

1. Pilih satu source asset terlebih dahulu (`VND` atau `PHP`); jangan seed semua corridor sekaligus.
2. Seed dan verifikasi liquidity untuk `source/XLM` dan `XLM/IDR` di Testnet.
3. Request quote dengan `strictReceivePaths`/`strictSendPaths` dan pastikan path yang dipilih benar-benar berisi native XLM.
4. Jika XLM wajib menjadi bridge, kirim explicit path `[Asset.native()]` atau reject route yang tidak memuat `XLM`; jangan biarkan direct offer diam-diam melewati XLM.
5. Gunakan quote TTL, `sendMax`, dan strict-receive protection. Re-quote jika market bergerak melewati slippage limit.
6. Pastikan distributor/user memiliki XLM tambahan untuk network fee dan account reserve.
7. Submit transaksi dan simpan hash yang membuka di Stellar Expert. Hanya setelah gate ini lulus XLM boleh menggantikan current USDC happy path.

**Keputusan arsitektur jangka panjang:** bridge asset sebaiknya configurable. Gunakan XLM bila native liquidity dan settlement cepat lebih menguntungkan; gunakan USDC/stable asset bila predictable fiat pricing lebih penting. Untuk hackathon, XLM adalah candidate yang kuat, tetapi tidak boleh dipresentasikan sebagai stable asset.

**Referensi Stellar:**

- [Path payments](https://developers.stellar.org/docs/build/guides/transactions/path-payments)
- [Strict-receive path discovery](https://developers.stellar.org/docs/data/apis/horizon/api-reference/list-strict-receive-payment-paths)
- [Lumens (XLM)](https://developers.stellar.org/docs/learn/fundamentals/lumens)
- [Stellar assets and issuers](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets)
- [SDEX and liquidity pools](https://developers.stellar.org/docs/learn/fundamentals/liquidity-on-stellar-sdex-liquidity-pools)

---

## 8. Scope MVP (2 Minggu) — Prioritas

**WAJIB (demo-able end-to-end):**
1. Auth sederhana (email + JWT).
2. Halaman Send: input jumlah + pilih/buat beneficiary.
3. Quote real dari Horizon path payment.
4. Eksekusi path payment di **Testnet** (current baseline `USDC-demo → IDR-token`; XLM bridge option tracked in §7.1) — tampilkan tx hash + link ke Stellar Expert.
5. Halaman status dengan stepper (TransferEvent).
6. Halaman klaim receiver + simulasi payout (mock anchor callback).

**NICE TO HAVE (kalau ada waktu):**
- Integrasi anchor demo publik (SEP-24 interactive flow asli).
- Wallet self-custody (Freighter).
- Notifikasi email/WA saat dana sampai.
- Multi-currency source (SGD, MYR, USD).

**SKIP untuk hackathon (sebut di pitch sebagai roadmap):**
- KYC/AML produksi.
- Lisensi remittance & compliance.
- Payout bank real (pakai mock).

---

## 9. Demo Script untuk Juri (5 menit)

1. **Problem (30 dtk):** "TKI kirim $100, keluarga cuma terima ~$92 setelah fee, nunggu 2 hari."
2. **Live demo (3 mnt):**
   - Sender input $100 → lihat quote: fee < $0.01, receiver terima Rp X, rate transparan.
   - Klik kirim → tampil tx hash → buka **Stellar Expert** tunjukkan settle dalam detik.
   - Switch ke view receiver → klaim → pilih bank → status COMPLETED.
3. **Kenapa Stellar (1 mnt):** SEP standards, path payment, fee & speed vs Western Union.
4. **Roadmap & traction (30 dtk):** integrasi anchor lokal real, target koridor SG/MY/HK → ID.

**Pesan kunci ke juri:** tunjukkan angka konkret (fee, waktu settle) dan **link on-chain yang bisa diverifikasi**. Itu yang membedakan proyek "beneran jalan" dari sekadar mockup.

---

## 10. Setup Cepat

```bash
# 1. Clone & install
git clone <repo> && cd stellarsend
pnpm install

# 2. Turso (dev lokal pakai file libSQL — tak perlu Docker)
#    produksi: buat DB di turso.io, lalu isi TURSO_URL + TURSO_AUTH_TOKEN di .env
cp .env.example .env

# 3. DB (Drizzle, bukan Prisma)
pnpm --filter api drizzle-kit push     # buat tabel di Turso / local file
pnpm --filter api db:seed              # akun Stellar testnet + trustline + friendbot

# 4. Jalankan (FE Next.js, API Worker via wrangler)
pnpm --filter web dev                  # next dev (nanti Cloudflare Pages)
pnpm --filter api dev                  # wrangler dev (nodejs_compat aktif)
# deploy:
#   pnpm --filter web pages:build && pnpm --filter web pages:deploy   # Cloudflare Pages
#   pnpm --filter api deploy                                        # wrangler deploy
```

**`.env.example` inti:**
```
# Turso / libSQL (lokal: file:./local.db ; produksi: dari turso.io)
TURSO_URL=file:./local.db
TURSO_AUTH_TOKEN=
HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK=TESTNET
JWT_SECRET=changeme
DISTRIBUTOR_SECRET=S...          # keypair distributor (funded via friendbot)
USDC_ISSUER=G...
IDR_ISSUER=G...
# Binding Cloudflare (wrangler.toml): DB = Turso, QUEUE_SETTLEMENT, QUEUE_PAYOUT, Cron schedule
```

---

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Anchor real butuh KYC/onboarding lama | Pakai mock anchor yang kamu kontrol untuk MVP; tunjukkan alur SEP tetap benar |
| Liquidity IDR-token tipis di testnet DEX | Seed order book sendiri lewat distributor account saat setup |
| Waktu 2 minggu mepet | Kunci scope di bagian "WAJIB"; jangan sentuh nice-to-have sebelum happy path jalan |
| Rate stale | Quote expiry 60 dtk + re-quote sebelum submit |
| XLM bridge volatility/liquidity | Treat XLM as a candidate until a real Testnet tx proves the route; use strict-receive, `sendMax`, explicit XLM-path verification, and a short quote TTL |
| Stellar SDK di Workers (ed25519) | Enable `nodejs_compat`; spike sign tx sejak awal. Kalau `Keypair` gagal, fallback `@noble/ed25519` + WebCrypto |
| BullMQ→Queues beda semantik | Consumer idempoten (at-least-once); reconcile transfer stuck via Cron Trigger |
| SQLite/Turso tak ada enum/decimal | Amount simpan `text` (7 desimal); enum sebagai TS union di `shared/constants` |

---

*Dokumen ini blueprint teknis untuk StellarSend. Sesuaikan asset code, issuer, dan anchor dengan mitra yang tersedia di program hackathon (cek daftar anchor partner APAC Stellar). Fokus: happy path yang bisa didemokan on-chain sebelum menambah fitur.*
