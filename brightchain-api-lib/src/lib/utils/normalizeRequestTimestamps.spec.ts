/**
 * Unit tests for normalizeRequestTimestamps utility and IEnrichedTimestampResponse DTO pattern.
 *
 * Requirements: 7.1, 7.2, 7.4
 */

import {
  brightDateNow,
  brightDateToISO,
  dateToBrightDate,
  isoToBrightDate,
} from '@brightchain/brightchain-lib';
import type { BrightDateTimestamp } from '@brightchain/brightchain-lib';
import type {
  IBaseResponse,
  IEnrichedTimestampResponse,
} from '../interfaces/baseResponse';
import { normalizeRequestTimestamps } from './normalizeRequestTimestamps';

// ---------------------------------------------------------------------------
// IEnrichedTimestampResponse — DTO derivation tests (Requirement 7.1, 7.2)
// ---------------------------------------------------------------------------

describe('IEnrichedTimestampResponse', () => {
  it('can be constructed with BrightDate values and ISO strings derived via brightDateToISO', () => {
    // Use a known BrightDate value: J2000.0 epoch = 0
    const createdAt: BrightDateTimestamp = 0;
    const updatedAt: BrightDateTimestamp = 1.5;

    const response: IEnrichedTimestampResponse = {
      createdAt,
      updatedAt,
      createdAtISO: brightDateToISO(createdAt),
      updatedAtISO: brightDateToISO(updatedAt),
    };

    expect(response.createdAt).toBe(0);
    expect(response.updatedAt).toBe(1.5);
    expect(typeof response.createdAtISO).toBe('string');
    expect(typeof response.updatedAtISO).toBe('string');
    // ISO strings should be parseable as valid dates
    expect(new Date(response.createdAtISO).getTime()).not.toBeNaN();
    expect(new Date(response.updatedAtISO).getTime()).not.toBeNaN();
  });

  it('derives correct ISO string for J2000.0 epoch (BrightDate 0)', () => {
    const createdAt: BrightDateTimestamp = 0;
    const response: IEnrichedTimestampResponse = {
      createdAt,
      updatedAt: createdAt,
      createdAtISO: brightDateToISO(createdAt),
      updatedAtISO: brightDateToISO(createdAt),
    };

    // J2000.0 = January 1, 2000, 12:00:00 UTC
    const parsed = new Date(response.createdAtISO);
    expect(parsed.getUTCFullYear()).toBe(2000);
    expect(parsed.getUTCMonth()).toBe(0); // January
    expect(parsed.getUTCDate()).toBe(1);
    expect(parsed.getUTCHours()).toBe(12);
  });

  it('derives correct ISO string for a current-era BrightDate value (~9300)', () => {
    const now = brightDateNow();
    const response: IEnrichedTimestampResponse = {
      createdAt: now,
      updatedAt: now,
      createdAtISO: brightDateToISO(now),
      updatedAtISO: brightDateToISO(now),
    };

    const parsed = new Date(response.createdAtISO);
    // Should be a date in the 2020s
    expect(parsed.getUTCFullYear()).toBeGreaterThanOrEqual(2020);
    expect(parsed.getUTCFullYear()).toBeLessThan(2100);
  });

  it('IBaseResponse defaults to BrightDateTimestamp', () => {
    const now = brightDateNow();
    const response: IBaseResponse = {
      createdAt: now,
      updatedAt: now,
    };

    expect(typeof response.createdAt).toBe('number');
    expect(typeof response.updatedAt).toBe('number');
  });

  it('IBaseResponse can be parameterized with string for ISO DTO clients', () => {
    const now = brightDateNow();
    const response: IBaseResponse<string> = {
      createdAt: brightDateToISO(now),
      updatedAt: brightDateToISO(now),
    };

    expect(typeof response.createdAt).toBe('string');
    expect(new Date(response.createdAt).getTime()).not.toBeNaN();
  });

  it('createdAtISO and updatedAtISO are consistent with their BrightDate counterparts', () => {
    const createdAt: BrightDateTimestamp = 9296.9375;
    const updatedAt: BrightDateTimestamp = 9297.12345;

    const response: IEnrichedTimestampResponse = {
      createdAt,
      updatedAt,
      createdAtISO: brightDateToISO(createdAt),
      updatedAtISO: brightDateToISO(updatedAt),
    };

    // Round-trip: ISO → BrightDate should be close to original
    const createdAtRoundTrip = isoToBrightDate(response.createdAtISO);
    const updatedAtRoundTrip = isoToBrightDate(response.updatedAtISO);

    expect(Math.abs(createdAtRoundTrip - createdAt)).toBeLessThan(0.000001);
    expect(Math.abs(updatedAtRoundTrip - updatedAt)).toBeLessThan(0.000001);
  });
});

// ---------------------------------------------------------------------------
// normalizeRequestTimestamps — request normalization tests (Requirement 7.4)
// ---------------------------------------------------------------------------

describe('normalizeRequestTimestamps', () => {
  describe('converts ISO string timestamps to BrightDateTimestamp numbers', () => {
    it('converts a single ISO string field', () => {
      const isoString = '2025-01-15T12:00:00.000Z';
      const body = { createdAt: isoString, name: 'test' };

      const result = normalizeRequestTimestamps(body, ['createdAt']);

      expect(typeof result.createdAt).toBe('number');
      expect(isFinite(result.createdAt as unknown as number)).toBe(true);
    });

    it('converts multiple ISO string fields', () => {
      const body = {
        createdAt: '2025-01-15T12:00:00.000Z',
        updatedAt: '2025-06-01T00:00:00.000Z',
        name: 'test',
      };

      const result = normalizeRequestTimestamps(body, ['createdAt', 'updatedAt']);

      expect(typeof result.createdAt).toBe('number');
      expect(typeof result.updatedAt).toBe('number');
      // name should be unchanged
      expect(result.name).toBe('test');
    });

    it('produces the correct BrightDate value from an ISO string', () => {
      const isoString = '2000-01-01T12:00:00.000Z'; // J2000.0 epoch
      const body = { timestamp: isoString };

      const result = normalizeRequestTimestamps(body, ['timestamp']);

      // J2000.0 = BrightDate 0
      expect(Math.abs((result.timestamp as unknown as number) - 0)).toBeLessThan(0.000001);
    });
  });

  describe('converts Date objects to BrightDateTimestamp numbers', () => {
    it('converts a single Date field', () => {
      const date = new Date('2025-03-20T00:00:00.000Z');
      const body = { createdAt: date, name: 'test' };

      const result = normalizeRequestTimestamps(body, ['createdAt']);

      expect(typeof result.createdAt).toBe('number');
      expect(isFinite(result.createdAt as unknown as number)).toBe(true);
    });

    it('converts multiple Date fields', () => {
      const body = {
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        label: 'record',
      };

      const result = normalizeRequestTimestamps(body, ['createdAt', 'expiresAt']);

      expect(typeof result.createdAt).toBe('number');
      expect(typeof result.expiresAt).toBe('number');
      expect(result.label).toBe('record');
      // expiresAt should be greater than createdAt (later date = higher BrightDate)
      expect((result.expiresAt as unknown as number)).toBeGreaterThan(
        result.createdAt as unknown as number,
      );
    });

    it('produces the same BrightDate value as dateToBrightDate', () => {
      const date = new Date('2025-06-15T06:00:00.000Z');
      const expected = dateToBrightDate(date);
      const body = { createdAt: date };

      const result = normalizeRequestTimestamps(body, ['createdAt']);

      expect(Math.abs((result.createdAt as unknown as number) - expected)).toBeLessThan(0.000001);
    });
  });

  describe('passes through existing BrightDateTimestamp numbers unchanged', () => {
    it('passes through a BrightDateTimestamp number without modification', () => {
      const brightDate: BrightDateTimestamp = 9296.9375;
      const body = { createdAt: brightDate };

      const result = normalizeRequestTimestamps(body, ['createdAt']);

      expect(result.createdAt).toBe(brightDate);
    });

    it('passes through zero (J2000.0 epoch) unchanged', () => {
      const body = { timestamp: 0 as BrightDateTimestamp };

      const result = normalizeRequestTimestamps(body, ['timestamp']);

      expect(result.timestamp).toBe(0);
    });

    it('passes through negative BrightDate values (pre-J2000) unchanged', () => {
      const preEpoch: BrightDateTimestamp = -10957.5; // Unix epoch
      const body = { createdAt: preEpoch };

      const result = normalizeRequestTimestamps(body, ['createdAt']);

      expect(result.createdAt).toBe(preEpoch);
    });

    it('passes through current-era BrightDate values unchanged', () => {
      const now = brightDateNow();
      const body = { createdAt: now };

      const result = normalizeRequestTimestamps(body, ['createdAt']);

      expect(result.createdAt).toBe(now);
    });
  });

  describe('skips null/undefined fields', () => {
    it('skips null fields', () => {
      const body = { createdAt: null as unknown as string, name: 'test' };

      const result = normalizeRequestTimestamps(body, ['createdAt']);

      expect(result.createdAt).toBeNull();
    });

    it('skips undefined fields', () => {
      const body = { createdAt: undefined as unknown as string, name: 'test' };

      const result = normalizeRequestTimestamps(body, ['createdAt']);

      expect(result.createdAt).toBeUndefined();
    });

    it('skips fields not present in the body', () => {
      const body = { name: 'test' } as Record<string, unknown>;

      const result = normalizeRequestTimestamps(body, ['createdAt' as keyof typeof body]);

      expect(result['createdAt']).toBeUndefined();
      expect(result.name).toBe('test');
    });

    it('only normalizes specified fields, leaving others untouched', () => {
      const body = {
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-06-01T00:00:00.000Z',
        name: 'test',
        count: 42,
      };

      // Only normalize createdAt, not updatedAt
      const result = normalizeRequestTimestamps(body, ['createdAt']);

      expect(typeof result.createdAt).toBe('number');
      expect(typeof result.updatedAt).toBe('string'); // unchanged
      expect(result.name).toBe('test');
      expect(result.count).toBe(42);
    });
  });

  describe('returns a shallow copy, not mutating the original', () => {
    it('does not mutate the original body', () => {
      const body = { createdAt: '2025-01-01T00:00:00.000Z', name: 'test' };
      const originalCreatedAt = body.createdAt;

      normalizeRequestTimestamps(body, ['createdAt']);

      expect(body.createdAt).toBe(originalCreatedAt);
    });
  });
});
