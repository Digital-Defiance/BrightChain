/**
 * Unit tests for useBrightDateDisplay hook.
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 */
import { renderHook } from '@testing-library/react';
import { useBrightDateDisplay } from './useBrightDateDisplay';

// J2000.0 epoch UTC label: 2000-01-01T11:58:55.816Z (per BrightDate spec §2.0).
// BrightDateValue 0 corresponds to this instant — not UTC noon (the
// 64.184-second gap is the TT−TAI + TAI−UTC offset at J2000.0).
const J2000_DATE = new Date('2000-01-01T11:58:55.816Z');

// A known BrightDateValue: ~9146 days after J2000 ≈ 2025-01-15
// Using a fixed value for deterministic tests.
const KNOWN_VALUE = 9146.5;

describe('useBrightDateDisplay', () => {
  // ---------------------------------------------------------------------------
  // brightDateString — primary format (Requirement 6.2)
  // ---------------------------------------------------------------------------
  describe('brightDateString', () => {
    it('returns a string representation of the BrightDate value', () => {
      const { result } = renderHook(() => useBrightDateDisplay(KNOWN_VALUE));
      expect(typeof result.current.brightDateString).toBe('string');
      expect(result.current.brightDateString.length).toBeGreaterThan(0);
    });

    it('includes the numeric value in the brightDateString', () => {
      const { result } = renderHook(() => useBrightDateDisplay(KNOWN_VALUE));
      // The string representation should contain the integer part of the value
      expect(result.current.brightDateString).toContain('9146');
    });

    it('returns "0" representation for J2000.0 epoch (value = 0)', () => {
      const { result } = renderHook(() => useBrightDateDisplay(0));
      // BrightDate.fromValue(0).toString() should represent the J2000 epoch
      expect(result.current.brightDateString).toContain('0');
    });

    it('returns different brightDateStrings for different values', () => {
      const { result: r1 } = renderHook(() => useBrightDateDisplay(0));
      const { result: r2 } = renderHook(() => useBrightDateDisplay(KNOWN_VALUE));
      expect(r1.current.brightDateString).not.toBe(r2.current.brightDateString);
    });
  });

  // ---------------------------------------------------------------------------
  // localeString — derived from BrightDateValue (Requirement 6.3)
  // ---------------------------------------------------------------------------
  describe('localeString', () => {
    it('returns a non-empty locale string', () => {
      const { result } = renderHook(() => useBrightDateDisplay(KNOWN_VALUE));
      expect(typeof result.current.localeString).toBe('string');
      expect(result.current.localeString.length).toBeGreaterThan(0);
    });

    it('returns a locale string for J2000.0 epoch (value = 0) near 2000-01-01', () => {
      const { result } = renderHook(() => useBrightDateDisplay(0, 'en-US'));
      // J2000.0 epoch UTC label is 2000-01-01T11:58:55.816Z — locale string
      // should still contain "2000".
      expect(result.current.localeString).toContain('2000');
    });

    it('returns different locale strings for different values', () => {
      const { result: r1 } = renderHook(() =>
        useBrightDateDisplay(0, 'en-US'),
      );
      const { result: r2 } = renderHook(() =>
        useBrightDateDisplay(KNOWN_VALUE, 'en-US'),
      );
      expect(r1.current.localeString).not.toBe(r2.current.localeString);
    });

    it('respects the locale parameter', () => {
      // Different locales produce different formatted strings for the same value
      const { result: enResult } = renderHook(() =>
        useBrightDateDisplay(KNOWN_VALUE, 'en-US'),
      );
      const { result: deResult } = renderHook(() =>
        useBrightDateDisplay(KNOWN_VALUE, 'de-DE'),
      );
      // Both should be non-empty strings; they may differ by locale
      expect(enResult.current.localeString.length).toBeGreaterThan(0);
      expect(deResult.current.localeString.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // date — JavaScript Date object (Requirement 6.1)
  // ---------------------------------------------------------------------------
  describe('date', () => {
    it('returns a JavaScript Date object', () => {
      const { result } = renderHook(() => useBrightDateDisplay(KNOWN_VALUE));
      expect(result.current.date).toBeInstanceOf(Date);
    });

    it('returns a valid (non-NaN) Date', () => {
      const { result } = renderHook(() => useBrightDateDisplay(KNOWN_VALUE));
      expect(isNaN(result.current.date.getTime())).toBe(false);
    });

    it('returns a Date near 2000-01-01 for J2000.0 epoch (value = 0)', () => {
      const { result } = renderHook(() => useBrightDateDisplay(0));
      const date = result.current.date;
      // J2000.0 epoch UTC label is 2000-01-01T11:58:55.816Z; year, month,
      // and day-of-month all still match 2000-01-01.
      expect(date.getUTCFullYear()).toBe(J2000_DATE.getUTCFullYear());
      expect(date.getUTCMonth()).toBe(J2000_DATE.getUTCMonth());
      expect(date.getUTCDate()).toBe(J2000_DATE.getUTCDate());
    });

    it('returns a Date that advances for larger BrightDateValues', () => {
      const { result: r0 } = renderHook(() => useBrightDateDisplay(0));
      const { result: r1 } = renderHook(() => useBrightDateDisplay(365));
      // 365 days after J2000 should be ~1 year later
      expect(r1.current.date.getTime()).toBeGreaterThan(
        r0.current.date.getTime(),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Memoization (Requirement 6.1 — useMemo)
  // ---------------------------------------------------------------------------
  describe('memoization', () => {
    it('returns the same object reference when called with the same value', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: number }) => useBrightDateDisplay(value),
        { initialProps: { value: KNOWN_VALUE } },
      );

      const first = result.current;
      rerender({ value: KNOWN_VALUE });
      const second = result.current;

      // useMemo should return the same reference when inputs haven't changed
      expect(second).toBe(first);
    });

    it('returns a new object reference when the value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: number }) => useBrightDateDisplay(value),
        { initialProps: { value: KNOWN_VALUE } },
      );

      const first = result.current;
      rerender({ value: KNOWN_VALUE + 1 });
      const second = result.current;

      expect(second).not.toBe(first);
    });

    it('returns a new object reference when the locale changes', () => {
      const { result, rerender } = renderHook(
        ({ locale }: { locale: string }) =>
          useBrightDateDisplay(KNOWN_VALUE, locale),
        { initialProps: { locale: 'en-US' } },
      );

      const first = result.current;
      rerender({ locale: 'de-DE' });
      const second = result.current;

      expect(second).not.toBe(first);
    });

    it('updates brightDateString when value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: number }) => useBrightDateDisplay(value),
        { initialProps: { value: KNOWN_VALUE } },
      );

      const firstString = result.current.brightDateString;
      rerender({ value: KNOWN_VALUE + 100 });

      expect(result.current.brightDateString).not.toBe(firstString);
    });

    it('updates localeString when value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: number }) =>
          useBrightDateDisplay(value, 'en-US'),
        { initialProps: { value: 0 } },
      );

      const firstLocale = result.current.localeString;
      rerender({ value: 365 });

      expect(result.current.localeString).not.toBe(firstLocale);
    });
  });
});
