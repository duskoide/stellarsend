# Demo Rehearsal Checklist — 5 Minutes

**Target URL:** `https://stellarsend.duskoide.org` (homeserver tunnel, most reliable)
**Backup URL:** `https://stellarsend-web.pages.dev` (Cloudflare Pages production)
**Deadline:** 23 July 2026 · APAC Stellar Hackathon Track 1

## The Pitch (30 + 60 + 30 seconds)

### 1. Problem (30s)
> "TKI kirim $100 ke Indonesia pakai Western Union — keluarga cuma terima ~$92. Fee 5–10%, nunggu 2 hari. Tiap bulan 1.5 juta TKI kehilangan porsi signifikan dari gaji mereka."

### 2. Live Demo (3 min) — exact click path

**Prep:**
- Open **private/incognito window** (Ctrl+Shift+N) — clean cache, no stale service worker
- Navigate to `https://stellarsend.duskoide.org/auth/register`

| Step | Action | What to say | Expected result |
|---|---|---|---|
| 2a | Fill register: email `demo-[timestamp]@test.id`, password `demo12345`, full name `Budi`, country `SG` | "Sender daftar — tanpa role, semua user bisa kirim & terima." | Redirect to history / landing |
| 2b | Click **Send money** (or go to `/send`) | | Send form opens |
| 2c | Amount `100`, Source `VND`, Dest `IDR` | "Pilih nominal & mata uang." | |
| 2d | Select/create beneficiary: `Ibu Siti — BCA 1234567890` | "Penerima di Indonesia, langsung ke rekening bank." | |
| 2e | Click **Get quote** | "Rate real-time dari Stellar DEX, bukan hardcoded." | Quote card appears: `206.70 IDR`, fee `0.005 VND`, expires in 60s |
| 2f | Click **Confirm & send** (quickly, before quote expires) | "Konfirmasi — path payment strict-receive, receiver dijamin dapat jumlah pasti." | Button cycles: Creating → Funding → Submitting → Redirect to status page |
| 2g | Status page shows **tx hash** + Stellar Expert link | "Ini tx hash-nya. Buka Stellar Expert — settle dalam 5 detik, fee ~$0.00001." | Click link → `stellar.expert/explorer/testnet/tx/...` shows `successful: true`, ledger confirmed |
| 2h | Click **Open recipient's view →** | "Switch ke sisi penerima." | Claim page opens |
| 2i | Wait until status = `SETTLED`, then click **Claim to bank account** | "Receiver klaim — anchor (simulated) proses payout." | Status becomes `PAYOUT_PENDING` then `COMPLETED` |
| 2j | Show **event timeline** (7 events: PENDING → FUNDED → SUBMITTED → SETTLED → PAYOUT_PENDING → PAYOUT_PENDING → COMPLETED) | "Setiap step tercatat — audit trail lengkap." | |

**Key numbers to mention:**
- Fee: `0.005%` (~0.005 VND untuk 100 VND)
- Speed: settle `~5 detik` (lihat elapsed time di status page)
- Vs Western Union: `5–10% fee + 2 hari`

### 3. Why Stellar (1 min)
> "Kenapa Stellar, bukan chain lain?"
> - Path payment: kirim aset A, terima aset B, konversi atomik dalam 1 tx
> - SEP-24/31: standar remittance yang sudah dirancang khusus untuk cross-border
> - Fee ~0.00001 XLM, finality 3–5 detik
> - Tx hash bisa diverifikasi langsung di Stellar Expert

### 4. Roadmap (30s)
> "Next: integrasi anchor lokal real (MoneyGram Ramps untuk cash-in USDC), expand koridor SG/MY/HK → ID."

## Known limits & how to avoid them

| Trap | Prevention |
|---|---|
| **Nominal > 10 juta VND** | Use `100`–`1,000,000` VND. Liquidity cap ~22.5 juta VND equivalent. |
| **Quote expired (60s)** | Click Confirm within 30 seconds of getting quote. If expired, click **Get quote** again. |
| **Browser cache / stale bundle** | Always use **private/incognito window**. If "NetworkError", hard reload (Ctrl+Shift+R). |
| **Token expired / login lost** | Re-register with fresh email if needed — demo is on testnet. |
| **Turso token expired** | If API returns `500 internal_error`, notify infra to refresh token. |

## Pre-demo smoke test (30 sec)

Run from terminal before every demo:
```bash
./scripts/smoke.sh
```

Expected: `exit 0` with a fresh tx hash printed. If any step fails, do NOT start the demo — debug first.

## Rehearsal log

| Run | Date | URL | Tx hash | Notes |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Gate:** 3 consecutive clean runs before hackathon day.
