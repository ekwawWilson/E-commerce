/**
 * Currency presentation.
 *
 * The authoritative currency is the `currency_settings` row managed from admin
 * store settings, fetched at runtime via /api/settings/public. The NEXT_PUBLIC_*
 * env vars are only a first-paint fallback, because env values are baked in at
 * build time and cannot be changed without a redeploy.
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: 'prefix' | 'suffix';
  decimals: number;
  locale: string;
}

/** Presentation rules for currencies we know about. */
const KNOWN_CURRENCIES: Record<string, Omit<CurrencyConfig, 'code'>> = {
  GHS: { symbol: 'GH₵', position: 'prefix', decimals: 2, locale: 'en-GH' },
  NGN: { symbol: '₦', position: 'prefix', decimals: 2, locale: 'en-NG' },
  KES: { symbol: 'KSh', position: 'prefix', decimals: 2, locale: 'en-KE' },
  ZAR: { symbol: 'R', position: 'prefix', decimals: 2, locale: 'en-ZA' },
  XAF: { symbol: 'FCFA', position: 'suffix', decimals: 0, locale: 'fr-FR' },
  XOF: { symbol: 'CFA', position: 'suffix', decimals: 0, locale: 'fr-FR' },
  USD: { symbol: '$', position: 'prefix', decimals: 2, locale: 'en-US' },
  EUR: { symbol: '€', position: 'prefix', decimals: 2, locale: 'en-IE' },
  GBP: { symbol: '£', position: 'prefix', decimals: 2, locale: 'en-GB' },
};

const FALLBACK_CODE = process.env.NEXT_PUBLIC_CURRENCY || 'GHS';

export function resolveCurrency(
  code?: string | null,
  symbolOverride?: string | null,
  decimalsOverride?: number | null
): CurrencyConfig {
  const resolvedCode = (code || FALLBACK_CODE).toUpperCase();
  const known = KNOWN_CURRENCIES[resolvedCode];

  return {
    code: resolvedCode,
    // An admin-supplied symbol wins, so unlisted currencies still render sensibly.
    symbol: symbolOverride || known?.symbol || resolvedCode,
    position: known?.position ?? 'prefix',
    decimals:
      decimalsOverride === null || decimalsOverride === undefined
        ? known?.decimals ?? 2
        : decimalsOverride,
    locale: known?.locale ?? 'en-US',
  };
}

/** The default used before runtime settings arrive. */
export const DEFAULT_CURRENCY_CONFIG = resolveCurrency(
  FALLBACK_CODE,
  process.env.NEXT_PUBLIC_CURRENCY_SYMBOL
);

export function formatWithCurrency(amount: number, currency: CurrencyConfig): string {
  const value = Number.isFinite(amount) ? amount : 0;

  const formatted = value.toLocaleString(currency.locale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });

  // Narrow no-break space keeps a prefix symbol legible against the first digit
  // (GH₵ in particular) without allowing a line break between them.
  return currency.position === 'suffix'
    ? `${formatted} ${currency.symbol}`
    : `${currency.symbol}\u202F${formatted}`;
}
