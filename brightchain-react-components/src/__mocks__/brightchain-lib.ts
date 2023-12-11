/**
 * Manual mock for @brightchain/brightchain-lib.
 *
 * Only the symbols actually used by brightchain-react-components are
 * re-implemented here.  This avoids pulling in native Node modules (e.g.
 * TextEncoder via ecies-lib) in the jsdom test environment.
 */

/**
 * Lightweight `formatJoule` that converts µJ bigint to a decimal string.
 * Real implementation is in brightchain-lib; this stub satisfies tests.
 * Never produces NaN, Infinity, or scientific notation.
 */
export function formatJoule(microJoules: bigint): string {
  // Format as decimal with up to 6 decimal places (1 J = 1,000,000 µJ)
  const abs = microJoules < 0n ? -microJoules : microJoules;
  const whole = abs / 1_000_000n;
  const frac = abs % 1_000_000n;
  const fracStr = frac.toString(10).padStart(6, '0').replace(/0+$/, '');
  const value = fracStr.length > 0 ? `${whole}.${fracStr}` : `${whole}`;
  const signed = microJoules < 0n ? `-${value}` : value;
  return `${signed} J`;
}
