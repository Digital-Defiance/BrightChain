/**
 * Shared response data for the BrightDate /now endpoint.
 *
 * This interface lives in brightchain-lib so both the API (backend)
 * and frontend clients can consume the same shape without depending
 * on Express or Node-specific types.
 */
export interface IBrightDateNowResponseData {
  /** BrightDate value at full precision (decimal days since J2000.0) */
  brightDate: string;
  /** BrightDate value at standard precision (5 decimal places, ~0.86s) */
  brightDateStandard: string;
  /** BrightDate value at compact precision (3 decimal places, ~86s) */
  brightDateCompact: string;
  /** The precision used for the full value (0–12) */
  precision: number;
  /** ISO 8601 timestamp of the response */
  iso8601: string;
  /** UTC string representation */
  utc: string;
  /** Unix timestamp in seconds */
  unixTimestamp: number;
  /** Unix timestamp in milliseconds */
  unixMs: number;
  /** Julian Date */
  julianDate: number;
  /** Modified Julian Date */
  modifiedJulianDate: number;
  /** Day of year (1-366) */
  dayOfYear: number;
  /** ISO week number */
  isoWeek: number;
  /** Whether the current year is a leap year */
  isLeapYear: boolean;
  /** Current TAI-UTC offset in seconds */
  taiUtcOffset: number;
  /** BrightDate epoch description */
  epoch: string;
}
