/**
 * Property-based tests for BreachCheckWidget — Property 12: Breach result display correctness
 *
 * **Validates: Requirements 8.3, 8.4**
 *
 * Property 12: For any breach check result, the display function should return
 * 'warning' severity when breached is true and 'success' severity when breached is false.
 */

import fc from 'fast-check';

// Mock brightpass-lib to provide BrightPassStrings without the heavy init chain
jest.mock('@brightchain/brightpass-lib', () => ({
  __esModule: true,
  BrightPassStrings: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

jest.mock('../hooks/useBrightPassTranslation', () => ({
  __esModule: true,
  useBrightPassTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../hooks/useBrightPassApi', () => ({
  __esModule: true,
  useBrightPassApi: () => ({
    checkBreach: jest.fn(),
  }),
}));

// Import AFTER mocks
import { formatBreachMessage } from './BreachCheckWidget';

describe('Property 12: Breach result display correctness', () => {
  it('returns warning severity when breached is true', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1_000_000 }), (count) => {
        const result = formatBreachMessage(true, count);
        expect(result.severity).toBe('warning');
        expect(result.messageKey).toBe('Breach_Found');
      }),
      { numRuns: 100 },
    );
  });

  it('returns success severity when breached is false', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1_000_000 }), (count) => {
        const result = formatBreachMessage(false, count);
        expect(result.severity).toBe('success');
        expect(result.messageKey).toBe('Breach_NotFound');
      }),
      { numRuns: 100 },
    );
  });

  it('is deterministic — same inputs always yield same result', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.nat({ max: 1_000_000 }),
        (breached, count) => {
          const a = formatBreachMessage(breached, count);
          const b = formatBreachMessage(breached, count);
          expect(a.severity).toBe(b.severity);
          expect(a.messageKey).toBe(b.messageKey);
        },
      ),
      { numRuns: 100 },
    );
  });
});
