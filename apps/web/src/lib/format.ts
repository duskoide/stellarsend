// Currency / amount formatting helpers. Amounts arrive as strings (7 decimals).

export function formatAmount(amount: string, decimals = 2): string {
  const n = Number(amount);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(
  amount: string,
  currency: string,
  locale = "en-US",
): string {
  const n = Number(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "IDR" ? 0 : 2,
    }).format(n);
  } catch {
    // Fallback for non-ISO codes (e.g. demo "IDR-token" style assets).
    return `${formatAmount(amount, currency === "IDR" ? 0 : 2)} ${currency}`;
  }
}

export function formatTxHash(hash: string, chars = 6): string {
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}

export function stellarExpertTxUrl(hash: string, network: "testnet" | "public" = "testnet") {
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}
