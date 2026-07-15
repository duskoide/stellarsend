// Currency / amount formatting helpers. Amounts arrive as strings (7 decimals).

export function formatAmount(amount: string, decimals = 2): string {
  const n = Number(amount);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Currencies that display with 0 decimals (high-denomination units).
const ZERO_DECIMAL_CURRENCIES = new Set(["IDR", "VND", "KHR", "LAK", "MMK"]);

function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
}

export function formatCurrency(
  amount: string,
  currency: string,
  locale = "en-US",
): string {
  const n = Number(amount);
  const decimals = currencyDecimals(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch {
    // Fallback for non-ISO codes (e.g. demo token assets).
    return `${formatAmount(amount, decimals)} ${currency}`;
  }
}

export function formatFee(amount: string, currency: string): string {
  const n = Number(amount);
  if (n > 0 && n < 0.01) return `< 0.01 ${currency}`;
  return formatCurrency(amount, currency);
}

export function formatTxHash(hash: string, chars = 6): string {
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}

export function stellarExpertTxUrl(hash: string, network: "testnet" | "public" = "testnet") {
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}
