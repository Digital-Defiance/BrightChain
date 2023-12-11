/**
 * CLI Step Logger – Property-Based Test
 *
 * Feature: patient-portal-registration
 *
 * Validates that the formatStepLog pure function always includes
 * the step name and HTTP status code in its output.
 */

import * as fc from 'fast-check';
import { formatStepLog } from '../../../../scripts/test-patient-portal-flow';

describe('Feature: patient-portal-registration, Property 10: CLI step logger includes step name and status code', () => {
  /**
   * **Validates: Requirements 8.3**
   *
   * For any generated step name (non-empty string) and HTTP status code
   * (100–599), the log output contains both the step name and the status
   * code as a substring.
   */

  it('log output contains both the step name and the HTTP status code', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 100, max: 599 }),
        fc.boolean(),
        (stepName, statusCode, success) => {
          const output = formatStepLog(stepName, statusCode, success);

          // The output must contain the step name
          expect(output).toContain(stepName);

          // The output must contain the status code as a string
          expect(output).toContain(String(statusCode));
        },
      ),
      { numRuns: 100 },
    );
  });
});
