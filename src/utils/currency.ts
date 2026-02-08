/**
 * Map of ISO 4217 currency codes to display symbols.
 * Used when displaying amounts in the user's preferred currency from Firestore.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  KRW: '₩',
  BRL: 'R$',
  MXN: '$',
  ARS: '$',
  ZAR: 'R',
  NGN: '₦',
  GHS: '₵',
  EGP: 'E£',
  KES: 'KSh',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  CHF: 'CHF',
};

/**
 * Returns the symbol for a currency code (e.g. "GHS" -> "₵").
 * Falls back to the code itself if unknown (e.g. "XYZ" -> "XYZ").
 */
export function getCurrencySymbol(code: string | undefined | null): string {
  if (!code || typeof code !== 'string') return '$';
  const trimmed = code.trim().toUpperCase();
  return CURRENCY_SYMBOLS[trimmed] ?? trimmed;
}

/**
 * Formats an amount with the user's currency symbol (e.g. 26150, "GHS" -> "₵26,150").
 */
export function formatCurrency(amount: number, currencyCode: string | undefined | null, options?: { decimals?: number }): string {
  const symbol = getCurrencySymbol(currencyCode);
  const decimals = options?.decimals ?? 0;
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${symbol}${formatted}`;
}
