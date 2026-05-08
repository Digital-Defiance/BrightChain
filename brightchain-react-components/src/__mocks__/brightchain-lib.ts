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

/**
 * Stub `brightDateToDate` — converts a BrightDateValue to a JavaScript Date.
 * J2000.0 epoch is 2000-01-01T12:00:00.000Z (Unix ms: 946728000000).
 */
export function brightDateToDate(value: number): Date {
  const J2000_UNIX_MS = 946728000000; // 2000-01-01T12:00:00.000Z
  return new Date(J2000_UNIX_MS + value * 86400000);
}

/**
 * Stub `toBrightDateString` — returns a fake BrightDate string for testing.
 */
export function toBrightDateString(
  date: Date | string,
  _precision?: number,
): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    // Return a deterministic fake BrightDate value based on the timestamp
    const daysSinceJ2000 = (d.getTime() - 946684800000) / 86400000;
    return daysSinceJ2000.toFixed(_precision ?? 5);
  } catch {
    return '';
  }
}

/**
 * BrightDate Display Mode enum stub.
 */
export enum BrightDateDisplayMode {
  Dual = 'dual',
  BrightDateOnly = 'brightDateOnly',
  LocaleOnly = 'localeOnly',
  Hover = 'hover',
  HoverReverse = 'hoverReverse',
}

/**
 * Stub `formatDateByMode` — returns locale string for testing.
 */
export function formatDateByMode(
  _date: Date | string,
  localeStr: string,
  _mode?: BrightDateDisplayMode,
  _precision?: number,
): string {
  return localeStr;
}

/**
 * Stub `getDateTooltip` — returns empty string for testing.
 */
export function getDateTooltip(
  _date: Date | string,
  _mode: BrightDateDisplayMode,
  _localeStr?: string,
  _precision?: number,
): string {
  return '';
}

/**
 * Stub for BrightChainStrings — returns the key as-is for most keys,
 * but provides real template strings for keys that use interpolation
 * so tests can verify the full i18n pipeline.
 */
const templateStrings: Record<string, string> = {
  Date_BrightDateTemplate: 'BD {BD}',
};

export const BrightChainStrings = new Proxy(
  {},
  {
    get: (_target, prop) => {
      const key = String(prop);
      return templateStrings[key] ?? key;
    },
  },
);
