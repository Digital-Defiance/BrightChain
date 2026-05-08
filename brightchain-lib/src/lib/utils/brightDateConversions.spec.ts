/**
 * Unit tests for BrightDate conversion utilities.
 *
 * Tests known epoch values, boundary values, and error cases for all
 * conversion functions in brightDateConversions.ts.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 10.4
 */

import {
  brightDateNow,
  brightDateToDate,
  brightDateToISO,
  dateToBrightDate,
  isoToBrightDate,
  normalizeToBrightDate,
} from './brightDateConversions';

// ─── Epoch constants ──────────────────────────────────────────────────────────

/**
 * J2000.0 epoch: January 1, 2000, 12:00:00 UTC
 * BrightDateValue = 0 by definition.
 */
const J2000_DATE = new Date('2000-01-01T12:00:00.000Z');
const J2000_BRIGHT_DATE_VALUE = 0;

/**
 * Unix epoch: January 1, 1970, 00:00:00 UTC
 * BrightDateValue = -10957.5 exactly.
 * Calculation: (1970-01-01T00:00:00Z − 2000-01-01T12:00:00Z) = -10957.5 days
 */
const UNIX_EPOCH_DATE = new Date('1970-01-01T00:00:00.000Z');
const UNIX_EPOCH_BRIGHT_DATE_VALUE = -10957.5;

// ─── brightDateToDate ─────────────────────────────────────────────────────────

describe('brightDateToDate', () => {
  describe('known epoch values', () => {
    it('converts J2000.0 (value=0) to January 1, 2000, 12:00:00 UTC', () => {
      const result = brightDateToDate(J2000_BRIGHT_DATE_VALUE);
      expect(result.getTime()).toBe(J2000_DATE.getTime());
    });

    it('converts Unix epoch BrightDateValue (-10957.5) to January 1, 1970, 00:00:00 UTC', () => {
      const result = brightDateToDate(UNIX_EPOCH_BRIGHT_DATE_VALUE);
      // Allow ≤1ms rounding tolerance
      expect(Math.abs(result.getTime() - UNIX_EPOCH_DATE.getTime())).toBeLessThanOrEqual(1);
    });
  });

  describe('boundary values', () => {
    it('handles a very large positive BrightDateValue (+365250, ~year 3000)', () => {
      const result = brightDateToDate(365250);
      expect(result).toBeInstanceOf(Date);
      expect(isFinite(result.getTime())).toBe(true);
      // Should be roughly year 3000
      expect(result.getUTCFullYear()).toBeGreaterThan(2900);
    });

    it('handles a very large negative BrightDateValue (-365250, ~year 1000)', () => {
      const result = brightDateToDate(-365250);
      expect(result).toBeInstanceOf(Date);
      expect(isFinite(result.getTime())).toBe(true);
      // Should be roughly year 1000
      expect(result.getUTCFullYear()).toBeLessThan(1100);
    });

    it('handles zero (J2000.0 epoch)', () => {
      const result = brightDateToDate(0);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(J2000_DATE.getTime());
    });

    it('handles a fractional BrightDateValue (0.5 = 12 hours after J2000)', () => {
      const result = brightDateToDate(0.5);
      expect(result).toBeInstanceOf(Date);
      // 0.5 days = 12 hours after J2000 = 2000-01-02T00:00:00Z
      const expected = new Date('2000-01-02T00:00:00.000Z');
      expect(Math.abs(result.getTime() - expected.getTime())).toBeLessThanOrEqual(1);
    });
  });
});

// ─── dateToBrightDate ─────────────────────────────────────────────────────────

describe('dateToBrightDate', () => {
  describe('known epoch values', () => {
    it('converts J2000.0 date to BrightDateValue 0', () => {
      const result = dateToBrightDate(J2000_DATE);
      expect(result).toBe(J2000_BRIGHT_DATE_VALUE);
    });

    it('converts Unix epoch date to BrightDateValue -10957.5', () => {
      const result = dateToBrightDate(UNIX_EPOCH_DATE);
      expect(result).toBeCloseTo(UNIX_EPOCH_BRIGHT_DATE_VALUE, 10);
    });
  });

  describe('boundary values', () => {
    it('handles a date far in the future (~year 3000)', () => {
      const futureDate = new Date('3000-01-01T00:00:00.000Z');
      const result = dateToBrightDate(futureDate);
      expect(typeof result).toBe('number');
      expect(isFinite(result)).toBe(true);
      expect(result).toBeGreaterThan(0);
    });

    it('handles a date far in the past (~year 1000)', () => {
      const pastDate = new Date('1000-01-01T00:00:00.000Z');
      const result = dateToBrightDate(pastDate);
      expect(typeof result).toBe('number');
      expect(isFinite(result)).toBe(true);
      expect(result).toBeLessThan(0);
    });
  });

  describe('round-trip with brightDateToDate', () => {
    it('round-trips J2000.0 within 1 microday', () => {
      const roundTripped = dateToBrightDate(brightDateToDate(J2000_BRIGHT_DATE_VALUE));
      expect(Math.abs(roundTripped - J2000_BRIGHT_DATE_VALUE)).toBeLessThanOrEqual(0.000001);
    });

    it('round-trips Unix epoch within 1 microday', () => {
      const roundTripped = dateToBrightDate(brightDateToDate(UNIX_EPOCH_BRIGHT_DATE_VALUE));
      expect(Math.abs(roundTripped - UNIX_EPOCH_BRIGHT_DATE_VALUE)).toBeLessThanOrEqual(0.000001);
    });
  });
});

// ─── brightDateToISO ──────────────────────────────────────────────────────────

describe('brightDateToISO', () => {
  describe('known epoch values', () => {
    it('converts J2000.0 (value=0) to ISO string for January 1, 2000, 12:00:00 UTC', () => {
      const result = brightDateToISO(J2000_BRIGHT_DATE_VALUE);
      expect(typeof result).toBe('string');
      // Parse back and verify it matches J2000
      const parsed = new Date(result);
      expect(Math.abs(parsed.getTime() - J2000_DATE.getTime())).toBeLessThanOrEqual(1);
    });

    it('converts Unix epoch BrightDateValue to ISO string for 1970-01-01T00:00:00Z', () => {
      const result = brightDateToISO(UNIX_EPOCH_BRIGHT_DATE_VALUE);
      expect(typeof result).toBe('string');
      const parsed = new Date(result);
      expect(Math.abs(parsed.getTime() - UNIX_EPOCH_DATE.getTime())).toBeLessThanOrEqual(1);
    });
  });

  describe('output format', () => {
    it('returns a non-empty string', () => {
      const result = brightDateToISO(0);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns a parseable date string', () => {
      const result = brightDateToISO(1000);
      const parsed = new Date(result);
      expect(isFinite(parsed.getTime())).toBe(true);
    });
  });
});

// ─── isoToBrightDate ──────────────────────────────────────────────────────────

describe('isoToBrightDate', () => {
  describe('known epoch values', () => {
    it('converts J2000.0 ISO string to BrightDateValue 0', () => {
      const result = isoToBrightDate('2000-01-01T12:00:00.000Z');
      expect(result).toBe(J2000_BRIGHT_DATE_VALUE);
    });

    it('converts Unix epoch ISO string to BrightDateValue -10957.5', () => {
      const result = isoToBrightDate('1970-01-01T00:00:00.000Z');
      expect(result).toBeCloseTo(UNIX_EPOCH_BRIGHT_DATE_VALUE, 10);
    });
  });

  describe('round-trip with brightDateToISO', () => {
    it('round-trips J2000.0 within 1 microday', () => {
      const iso = brightDateToISO(J2000_BRIGHT_DATE_VALUE);
      const roundTripped = isoToBrightDate(iso);
      expect(Math.abs(roundTripped - J2000_BRIGHT_DATE_VALUE)).toBeLessThanOrEqual(0.000001);
    });

    it('round-trips Unix epoch within 1 microday', () => {
      const iso = brightDateToISO(UNIX_EPOCH_BRIGHT_DATE_VALUE);
      const roundTripped = isoToBrightDate(iso);
      expect(Math.abs(roundTripped - UNIX_EPOCH_BRIGHT_DATE_VALUE)).toBeLessThanOrEqual(0.000001);
    });
  });

  describe('error cases', () => {
    it('throws TypeError for "not-a-date"', () => {
      expect(() => isoToBrightDate('not-a-date')).toThrow(TypeError);
    });

    it('throws TypeError containing "Invalid date string" for invalid input', () => {
      expect(() => isoToBrightDate('not-a-date')).toThrow(/Invalid date string/);
    });

    it('throws TypeError for an empty string', () => {
      expect(() => isoToBrightDate('')).toThrow(TypeError);
    });

    it('throws TypeError for a random non-date string', () => {
      expect(() => isoToBrightDate('hello world')).toThrow(TypeError);
    });
  });
});

// ─── normalizeToBrightDate ────────────────────────────────────────────────────

describe('normalizeToBrightDate', () => {
  describe('known epoch values — number input', () => {
    it('returns J2000.0 BrightDateValue (0) unchanged', () => {
      expect(normalizeToBrightDate(J2000_BRIGHT_DATE_VALUE)).toBe(J2000_BRIGHT_DATE_VALUE);
    });

    it('returns Unix epoch BrightDateValue (-10957.5) unchanged', () => {
      expect(normalizeToBrightDate(UNIX_EPOCH_BRIGHT_DATE_VALUE)).toBe(UNIX_EPOCH_BRIGHT_DATE_VALUE);
    });
  });

  describe('known epoch values — Date input', () => {
    it('converts J2000.0 Date to BrightDateValue 0', () => {
      const result = normalizeToBrightDate(J2000_DATE);
      expect(result).toBe(J2000_BRIGHT_DATE_VALUE);
    });

    it('converts Unix epoch Date to BrightDateValue -10957.5', () => {
      const result = normalizeToBrightDate(UNIX_EPOCH_DATE);
      expect(result).toBeCloseTo(UNIX_EPOCH_BRIGHT_DATE_VALUE, 10);
    });
  });

  describe('known epoch values — string input', () => {
    it('converts J2000.0 ISO string to BrightDateValue 0', () => {
      const result = normalizeToBrightDate('2000-01-01T12:00:00.000Z');
      expect(result).toBe(J2000_BRIGHT_DATE_VALUE);
    });

    it('converts Unix epoch ISO string to BrightDateValue -10957.5', () => {
      const result = normalizeToBrightDate('1970-01-01T00:00:00.000Z');
      expect(result).toBeCloseTo(UNIX_EPOCH_BRIGHT_DATE_VALUE, 10);
    });
  });

  describe('boundary values', () => {
    it('handles a large positive BrightDateValue (365250)', () => {
      expect(normalizeToBrightDate(365250)).toBe(365250);
    });

    it('handles a large negative BrightDateValue (-365250)', () => {
      expect(normalizeToBrightDate(-365250)).toBe(-365250);
    });

    it('handles a very small fractional value', () => {
      const tiny = 1e-10;
      expect(normalizeToBrightDate(tiny)).toBe(tiny);
    });
  });

  describe('error cases — NaN and Infinity', () => {
    it('throws TypeError for NaN', () => {
      expect(() => normalizeToBrightDate(NaN)).toThrow(TypeError);
    });

    it('throws TypeError for NaN with message "BrightDateValue must be a finite number"', () => {
      expect(() => normalizeToBrightDate(NaN)).toThrow(
        'BrightDateValue must be a finite number',
      );
    });

    it('throws TypeError for Infinity', () => {
      expect(() => normalizeToBrightDate(Infinity)).toThrow(TypeError);
    });

    it('throws TypeError for Infinity with message "BrightDateValue must be a finite number"', () => {
      expect(() => normalizeToBrightDate(Infinity)).toThrow(
        'BrightDateValue must be a finite number',
      );
    });

    it('throws TypeError for -Infinity', () => {
      expect(() => normalizeToBrightDate(-Infinity)).toThrow(TypeError);
    });

    it('throws TypeError for -Infinity with message "BrightDateValue must be a finite number"', () => {
      expect(() => normalizeToBrightDate(-Infinity)).toThrow(
        'BrightDateValue must be a finite number',
      );
    });
  });

  describe('error cases — invalid strings', () => {
    it('throws TypeError for "not-a-date"', () => {
      expect(() => normalizeToBrightDate('not-a-date')).toThrow(TypeError);
    });

    it('throws TypeError containing "Invalid date string" for "not-a-date"', () => {
      expect(() => normalizeToBrightDate('not-a-date')).toThrow(
        /Invalid date string/,
      );
    });

    it('throws TypeError for an empty string', () => {
      expect(() => normalizeToBrightDate('')).toThrow(TypeError);
    });

    it('throws TypeError for a numeric-looking but invalid string', () => {
      expect(() => normalizeToBrightDate('not-a-date-string')).toThrow(TypeError);
    });
  });
});

// ─── brightDateNow ────────────────────────────────────────────────────────────

describe('brightDateNow', () => {
  it('returns a finite number', () => {
    const result = brightDateNow();
    expect(typeof result).toBe('number');
    expect(isFinite(result)).toBe(true);
  });

  it('returns a value close to the current time (within 1 day)', () => {
    const before = dateToBrightDate(new Date());
    const result = brightDateNow();
    const after = dateToBrightDate(new Date());
    expect(result).toBeGreaterThanOrEqual(before - 1);
    expect(result).toBeLessThanOrEqual(after + 1);
  });

  it('returns a positive value (we are past J2000.0)', () => {
    const result = brightDateNow();
    // J2000.0 was January 1, 2000 — we are well past that
    expect(result).toBeGreaterThan(0);
  });
});
