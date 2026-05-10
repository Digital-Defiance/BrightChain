/**
 * Timezone Utilities
 *
 * Pure timezone conversion functions using JavaScript's built-in
 * Intl.DateTimeFormat with timeZone option. No Node.js dependencies
 * so this can be used in both frontend and backend.
 *
 * @see Requirements 11.1, 11.2, 11.4, 11.5
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * A datetime stored with its original IANA timezone for round-trip preservation.
 *
 * @see Requirements 11.1, 11.4
 */
export interface ITimezoneAwareDate {
  /** UTC ISO string representation */
  utc: string;
  /** Original IANA timezone identifier */
  tzid: string;
  /** Local time representation in the original timezone (ISO-like format) */
  local: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate that a string is a valid IANA timezone identifier.
 *
 * Uses Intl.DateTimeFormat to probe the timezone — if the runtime
 * doesn't recognise it, the constructor throws a RangeError.
 *
 * @param tzid - The timezone identifier to validate
 * @returns true if the tzid is a valid IANA timezone
 *
 * @see Requirements 11.1
 */
export function isValidTimezone(tzid: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tzid });
    return true;
  } catch {
    return false;
  }
}

// ─── Conversion helpers ──────────────────────────────────────────────────────

/**
 * Format a Date in a specific IANA timezone, returning individual parts.
 * Uses Intl.DateTimeFormat.formatToParts for reliable extraction.
 */
function getPartsInTimezone(
  date: Date,
  tzid: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tzid,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? '0';

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10) % 24, // handle "24" → 0
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
  };
}

/**
 * Build an ISO-like local time string from date parts (no Z suffix).
 */
function partsToLocalIso(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}` +
    `T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the UTC offset in minutes for a timezone at a given date.
 *
 * Positive values mean ahead of UTC (e.g. +60 for CET in winter).
 * Negative values mean behind UTC (e.g. -300 for US Eastern in winter).
 *
 * @param tzid - IANA timezone identifier
 * @param date - The date at which to compute the offset
 * @returns Offset in minutes from UTC
 *
 * @see Requirements 11.2
 */
export function getUtcOffset(tzid: string, date: Date): number {
  const localParts = getPartsInTimezone(date, tzid);
  const utcParts = getPartsInTimezone(date, 'UTC');

  // Build comparable timestamps from parts (minutes since epoch-ish reference)
  const localMinutes =
    localParts.year * 525960 +
    localParts.month * 43800 +
    localParts.day * 1440 +
    localParts.hour * 60 +
    localParts.minute;

  const utcMinutes =
    utcParts.year * 525960 +
    utcParts.month * 43800 +
    utcParts.day * 1440 +
    utcParts.hour * 60 +
    utcParts.minute;

  return localMinutes - utcMinutes;
}

/**
 * Convert a datetime from one IANA timezone to another.
 *
 * @param isoDate - An ISO 8601 datetime string (treated as local time in fromTzid)
 * @param fromTzid - Source IANA timezone
 * @param toTzid - Target IANA timezone
 * @returns ISO-like local time string in the target timezone
 *
 * @see Requirements 11.2, 11.5
 */
export function convertTimezone(
  isoDate: string,
  fromTzid: string,
  toTzid: string,
): string {
  // Parse the input as a local time in the source timezone.
  // We need to figure out the UTC instant that corresponds to
  // `isoDate` interpreted in `fromTzid`.
  const naive = new Date(isoDate);

  // Get the UTC offset for the source timezone at this approximate time
  const fromParts = getPartsInTimezone(naive, fromTzid);
  const naiveParts = {
    year: naive.getUTCFullYear(),
    month: naive.getUTCMonth() + 1,
    day: naive.getUTCDate(),
    hour: naive.getUTCHours(),
    minute: naive.getUTCMinutes(),
    second: naive.getUTCSeconds(),
  };

  // Compute the difference between what we want (fromParts) and what
  // the naive parse gave us (naiveParts interpreted as UTC)
  const diffMs =
    (fromParts.hour - naiveParts.hour) * 3600000 +
    (fromParts.minute - naiveParts.minute) * 60000 +
    (fromParts.second - naiveParts.second) * 1000 +
    (fromParts.day - naiveParts.day) * 86400000;

  // Adjust to get the true UTC instant
  const utcInstant = new Date(naive.getTime() - diffMs);

  // Now format in the target timezone
  const targetParts = getPartsInTimezone(utcInstant, toTzid);
  return partsToLocalIso(targetParts);
}

/**
 * Create a timezone-aware date from a local time and TZID.
 *
 * Stores the UTC equivalent, the original TZID, and the local representation
 * so that the original timezone can be recovered on retrieval.
 *
 * @param localTime - ISO 8601 datetime string (local time, no Z suffix expected)
 * @param tzid - IANA timezone identifier
 * @returns A timezone-aware date object preserving the original TZID
 *
 * @see Requirements 11.1, 11.4
 */
export function createTimezoneAwareDate(
  localTime: string,
  tzid: string,
): ITimezoneAwareDate {
  if (!isValidTimezone(tzid)) {
    throw new Error(`Invalid IANA timezone: ${tzid}`);
  }

  // Parse the local time string
  const naive = new Date(localTime);
  if (isNaN(naive.getTime())) {
    throw new Error(`Invalid date string: ${localTime}`);
  }

  // Determine the UTC instant that corresponds to this local time in the given tz.
  // We use the Intl formatter to find what local time the naive UTC parse maps to,
  // then adjust.
  const fromParts = getPartsInTimezone(naive, tzid);
  const naiveParts = {
    year: naive.getUTCFullYear(),
    month: naive.getUTCMonth() + 1,
    day: naive.getUTCDate(),
    hour: naive.getUTCHours(),
    minute: naive.getUTCMinutes(),
    second: naive.getUTCSeconds(),
  };

  const diffMs =
    (fromParts.hour - naiveParts.hour) * 3600000 +
    (fromParts.minute - naiveParts.minute) * 60000 +
    (fromParts.second - naiveParts.second) * 1000 +
    (fromParts.day - naiveParts.day) * 86400000;

  const utcInstant = new Date(naive.getTime() - diffMs);

  // Build the local representation from the actual timezone
  const localParts = getPartsInTimezone(utcInstant, tzid);
  const local = partsToLocalIso(localParts);

  return {
    utc: utcInstant.toISOString(),
    tzid,
    local,
  };
}

/**
 * Recover the original TZID from a stored timezone-aware date.
 *
 * This is the key function for round-trip preservation: the TZID is stored
 * alongside the UTC time so it can always be recovered exactly.
 *
 * @param tzAwareDate - A previously created timezone-aware date
 * @returns The original IANA timezone identifier
 *
 * @see Requirements 11.4
 */
export function getOriginalTzid(tzAwareDate: ITimezoneAwareDate): string {
  return tzAwareDate.tzid;
}

/**
 * Convert a timezone-aware date to a display string in a different timezone.
 *
 * Useful for multi-timezone event display (Requirement 11.5).
 *
 * @param tzAwareDate - The stored timezone-aware date
 * @param displayTzid - The timezone to display in
 * @returns ISO-like local time string in the display timezone
 *
 * @see Requirements 11.5
 */
export function displayInTimezone(
  tzAwareDate: ITimezoneAwareDate,
  displayTzid: string,
): string {
  if (!isValidTimezone(displayTzid)) {
    throw new Error(`Invalid IANA timezone: ${displayTzid}`);
  }

  const utcDate = new Date(tzAwareDate.utc);
  const parts = getPartsInTimezone(utcDate, displayTzid);
  return partsToLocalIso(parts);
}
