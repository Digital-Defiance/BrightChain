import {
  JOULE_ASSET_ID,
  JOULE_DECIMALS,
  JOULE_MICROUNITS_PER_UNIT,
  JOULE_SYMBOL,
} from './jouleConstants';

/**
 * Options controlling {@link formatAssetAmount} output.
 */
export interface IFormatAssetAmountOptions {
  /**
   * Number of fractional digits to render. Defaults to the asset's natural
   * precision (6 for joule).
   */
  precision?: number;
  /**
   * BCP-47 locale tag for digit grouping / decimal separator. When omitted,
   * a plain non-localized representation is produced (no thousands grouping,
   * `.` decimal separator).
   */
  locale?: string;
}

/**
 * Format an asset microunit amount as a human-readable string.
 *
 * - For `assetId === 'joule'` the default format is `'1.234567 J'`.
 * - For unknown assetIds the function falls back to `'<microunits> <assetId>'`
 *   raw and never throws.
 *
 * No business logic SHALL parse formatted strings back into amounts; parsing
 * occurs only on validated DTO inputs.
 *
 * @see asset-account-store-generalization spec, Requirements 8.1–8.4.
 */
export function formatAssetAmount(
  amount: bigint,
  assetId: string,
  opts?: IFormatAssetAmountOptions,
): string {
  if (assetId !== JOULE_ASSET_ID) {
    return `${amount.toString()} ${assetId}`;
  }

  const precision =
    opts?.precision !== undefined
      ? Math.max(0, opts.precision)
      : JOULE_DECIMALS;

  const negative = amount < 0n;
  const abs = negative ? -amount : amount;

  const integer = abs / JOULE_MICROUNITS_PER_UNIT;
  const fractional = abs % JOULE_MICROUNITS_PER_UNIT;

  // Pad fractional to JOULE_DECIMALS digits, then truncate / pad to precision.
  let fractionalStr = fractional.toString().padStart(JOULE_DECIMALS, '0');
  if (precision < JOULE_DECIMALS) {
    fractionalStr = fractionalStr.slice(0, precision);
  } else if (precision > JOULE_DECIMALS) {
    fractionalStr = fractionalStr.padEnd(precision, '0');
  }

  let integerStr: string;
  if (opts?.locale) {
    try {
      integerStr = new Intl.NumberFormat(opts.locale, {
        useGrouping: true,
        maximumFractionDigits: 0,
      }).format(integer);
    } catch {
      integerStr = integer.toString();
    }
  } else {
    integerStr = integer.toString();
  }

  const body = precision === 0 ? integerStr : `${integerStr}.${fractionalStr}`;
  return `${negative ? '-' : ''}${body} ${JOULE_SYMBOL}`;
}
