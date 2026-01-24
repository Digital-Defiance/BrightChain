/**
 * Date Utilities Module
 *
 * Provides robust date handling utilities with timezone support for BrightChain.
 * All dates are stored internally in UTC to ensure consistency across timezones.
 *
 * @module dateUtils
 */

/**
 * Parse a date from various formats (ISO 8601, Unix timestamp).
 *
 * Supports:
 * - ISO 8601 strings (e.g., "2024-01-23T10:30:00Z", "2024-01-23T10:30:00.000Z")
 * - Unix timestamps in milliseconds (number)
 * - Unix timestamps in seconds (number < 10000000000)
 *
 * @param value - Date string or Unix timestamp
 * @returns Date object in UTC
 * @throws Error if date is invalid or malformed
 *
 * @example
 * ```typescript
 * // Parse ISO 8601 string
 * const date1 = parseDate("2024-01-23T10:30:00Z");
 *
 * // Parse Unix timestamp (milliseconds)
 * const date2 = parseDate(1706008200000);
 *
 * // Parse Unix timestamp (seconds)
 * const date3 = parseDate(1706008200);
 * ```
 */
export function parseDate(value: string | number): Date {
  if (typeof value === 'number') {
    // Handle Unix timestamps
    // Strategy: Use the value as-is first, then check if it produces a reasonable date
    // If the date is before 1980 or after 2200 when interpreted as milliseconds,
    // and the value is small enough to be seconds, try interpreting as seconds

    let timestamp = value;
    let date = new Date(timestamp);

    // Check if we should try interpreting as seconds instead
    // This handles the case where small numbers (< 10 billion) might be seconds
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      // If the date is unreasonably early (before 1980) when interpreted as ms,
      // and the value could be seconds (< 10 billion), try seconds
      if (year < 1980 && value < 10000000000 && value > 0) {
        timestamp = value * 1000;
        date = new Date(timestamp);
      }
      // Also handle negative timestamps (before 1970)
      else if (value < 0 && value > -10000000000) {
        // Small negative numbers are likely seconds
        timestamp = value * 1000;
        date = new Date(timestamp);
      }
    }

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid Unix timestamp: ${value}`);
    }

    return date;
  }

  if (typeof value === 'string') {
    // Try parsing as ISO 8601 string
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      throw new Error(
        `Invalid date string: "${value}". Expected ISO 8601 format (e.g., "2024-01-23T10:30:00Z") or Unix timestamp.`,
      );
    }

    return date;
  }

  throw new Error(
    `Invalid date value type: ${typeof value}. Expected string or number.`,
  );
}

/**
 * Serialize a date to ISO 8601 format with UTC timezone.
 *
 * Always returns dates in UTC timezone with 'Z' suffix.
 * Format: "YYYY-MM-DDTHH:mm:ss.sssZ"
 *
 * @param date - Date to serialize
 * @returns ISO 8601 string in UTC
 * @throws Error if date is invalid
 *
 * @example
 * ```typescript
 * const date = new Date("2024-01-23T10:30:00Z");
 * const serialized = serializeDate(date);
 * // Returns: "2024-01-23T10:30:00.000Z"
 * ```
 */
export function serializeDate(date: Date): string {
  if (!(date instanceof Date)) {
    throw new Error(
      `Invalid date object: expected Date instance, got ${typeof date}`,
    );
  }

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date: date object contains NaN timestamp');
  }

  return date.toISOString();
}

/**
 * Validate that a date is valid and optionally check if it's not in the future.
 *
 * @param date - Date to validate
 * @param allowFuture - Whether to allow future dates (default: false)
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * const date = new Date("2024-01-23T10:30:00Z");
 * const isValid = isValidDate(date); // true if date is in the past
 * const isValidFuture = isValidDate(date, true); // true regardless of future/past
 * ```
 */
export function isValidDate(date: Date, allowFuture = false): boolean {
  // Check if it's a Date instance
  if (!(date instanceof Date)) {
    return false;
  }

  // Check if the date is valid (not NaN)
  if (isNaN(date.getTime())) {
    return false;
  }

  // Check if date is in the future (if not allowed)
  if (!allowFuture) {
    const now = new Date();
    if (date.getTime() > now.getTime()) {
      return false;
    }
  }

  return true;
}
