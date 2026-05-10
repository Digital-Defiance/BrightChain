// utils/index.ts – shared utilities for brightledger-assets-react-components

/**
 * Format a raw integer balance as a decimal string using the asset's `decimals`
 * field.  For example, balance=`1500000n`, decimals=`6` ⇒ `"1.5"`.
 */
export function formatBalance(raw: bigint, decimals: number): string {
  if (decimals === 0) return raw.toString();
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr.length > 0 ? `${whole}.${fracStr}` : whole.toString();
}

/**
 * Truncate a hex string to a readable prefix + suffix, e.g.
 * `"a1b2c3...f9e8d7"`.  Useful for displaying entry hashes.
 */
export function abbreviateHex(
  hex: string,
  prefixLen = 8,
  suffixLen = 8,
): string {
  if (hex.length <= prefixLen + suffixLen + 3) return hex;
  return `${hex.slice(0, prefixLen)}…${hex.slice(-suffixLen)}`;
}
