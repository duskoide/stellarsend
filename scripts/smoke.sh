#!/usr/bin/env bash
# StellarSend pre-demo smoke test — run this before every demo to verify
# the full happy path is alive. Exit 0 = green, exit 1 = do not demo.
#
# Usage:
#   API_URL=https://stellarapi.duskoide.org/api/v1 ./scripts/smoke.sh
#   API_URL=https://stellarsend-api.18224079.workers.dev/api/v1 ./scripts/smoke.sh

set -euo pipefail

API_URL="${API_URL:-https://stellarapi.duskoide.org/api/v1}"
ORIGIN="https://stellarsend.duskoide.org"
H=(-H "Content-Type: application/json" -H "Origin: $ORIGIN")
EMAIL="smoke-$(date +%s)@demo.local"
PASS="smokepass123"

echo "=== StellarSend Smoke Test ==="
echo "API: $API_URL"
echo ""

# 1. Register
echo "[1/6] Register..."
REG=$(curl -sf -X POST "$API_URL/auth/register" "${H[@]}" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"fullName\":\"Smoke Test\",\"country\":\"SG\"}")
TOKEN=$(echo "$REG" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then echo "FAIL: register"; exit 1; fi
echo "  OK — token acquired"
H+=("-H" "Authorization: Bearer $TOKEN")

# 2. Beneficiary
echo "[2/6] Beneficiary..."
BEN=$(curl -sf -X POST "$API_URL/beneficiaries" "${H[@]}" -d '{"fullName":"Ibu Smoke","method":"BANK_TRANSFER","bankName":"BCA","accountNumber":"9999"}')
BID=$(echo "$BEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$BID" ]; then echo "FAIL: beneficiary"; exit 1; fi
echo "  OK — BID=$BID"

# 3. Quote
echo "[3/6] Quote VND→IDR (100)..."
Q=$(curl -sf -X POST "$API_URL/quote" "${H[@]}" -d '{"sourceAsset":"VND","sourceAmount":"100","destAsset":"IDR"}')
QID=$(echo "$Q" | grep -o '"quoteId":"[^"]*"' | cut -d'"' -f4)
DEST=$(echo "$Q" | grep -o '"destAmount":"[^"]*"' | cut -d'"' -f4)
if [ -z "$QID" ]; then echo "FAIL: quote"; exit 1; fi
echo "  OK — QID=$QID, dest=$DEST IDR"

# 4. Transfer + fund
echo "[4/6] Create transfer + fund..."
T=$(curl -sf -X POST "$API_URL/transfers" "${H[@]}" -d "{\"quoteId\":\"$QID\",\"beneficiaryId\":\"$BID\"}")
TID=$(echo "$T" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$TID" ]; then echo "FAIL: transfer"; exit 1; fi
curl -sf -X POST "$API_URL/transfers/$TID/fund" "${H[@]}" >/dev/null
echo "  OK — TID=$TID"

# 5. Submit (real on-chain tx)
echo "[5/6] Submit path payment..."
SUB=$(curl -sf -X POST "$API_URL/transfers/$TID/submit" "${H[@]}")
TX=$(echo "$SUB" | grep -o '"txHash":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TX" ]; then echo "FAIL: submit"; exit 1; fi
echo "  OK — TX=$TX"
echo "  Stellar Expert: https://stellar.expert/explorer/testnet/tx/$TX"

# 6. Wait for SETTLED, then claim, then poll until COMPLETED
echo "[6/6] Wait settlement → claim → poll COMPLETED..."

for i in {1..12}; do
  STATUS=$(curl -sf "$API_URL/transfers/$TID" "${H[@]}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ "$STATUS" = "SETTLED" ] || [ "$STATUS" = "COMPLETED" ]; then
    echo "  SETTLED (waited ${i}×3s)"
    break
  fi
  echo "  ... status=$STATUS (settle wait ${i}/12)"
  sleep 3
done

if [ "${STATUS:-}" != "SETTLED" ] && [ "${STATUS:-}" != "COMPLETED" ]; then
  echo "FAIL: never reached SETTLED"
  exit 1
fi

curl -sf -X POST "$API_URL/claims/$TID/payout" "${H[@]}" -d '{"method":"BANK_TRANSFER"}' >/dev/null
echo "  Claim submitted"

for i in {1..12}; do
  STATUS=$(curl -sf "$API_URL/transfers/$TID" "${H[@]}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ "$STATUS" = "COMPLETED" ]; then
    echo "  OK — status COMPLETED"
    echo ""
    echo "=== SMOKE PASSED ==="
    echo "Tx hash: $TX"
    echo "Expert:  https://stellar.expert/explorer/testnet/tx/$TX"
    exit 0
  fi
  echo "  ... status=$STATUS (payout wait ${i}/12)"
  sleep 3
done

echo "FAIL: did not reach COMPLETED within 36s"
exit 1
