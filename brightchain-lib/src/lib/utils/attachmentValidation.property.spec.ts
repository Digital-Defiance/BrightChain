// Feature: brightmail-composer-enhancements, Property 4: Attachment size validation
import * as fc from 'fast-check';
import {
  validateAttachmentSize,
  validateTotalAttachmentSize,
} from './attachmentValidation';

/**
 * Property 4: Attachment size validation
 *
 * For any array of non-negative integer file sizes and a max limit:
 * - validateAttachmentSize(size, max) returns true iff size ≤ max
 * - validateTotalAttachmentSize(sizes, max) returns true iff every individual size ≤ max AND sum ≤ max
 *
 * **Validates: Requirements 3.4, 3.5, 7.3**
 */
describe('Property 4: Attachment size validation', () => {
  describe('validateAttachmentSize', () => {
    it('returns true if and only if size ≤ max', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50_000_000 }),
          fc.integer({ min: 0, max: 50_000_000 }),
          (size, max) => {
            const result = validateAttachmentSize(size, max);
            expect(result).toBe(size <= max);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('validateTotalAttachmentSize', () => {
    it('returns true if and only if every size ≤ max AND sum ≤ max', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 50_000_000 }), {
            minLength: 0,
            maxLength: 20,
          }),
          fc.integer({ min: 0, max: 50_000_000 }),
          (sizes, max) => {
            const result = validateTotalAttachmentSize(sizes, max);
            const allIndividualValid = sizes.every((s) => s <= max);
            const totalValid = sizes.reduce((a, b) => a + b, 0) <= max;
            expect(result).toBe(allIndividualValid && totalValid);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// Feature: brightmail-composer-enhancements, Property 3: File size formatting produces human-readable output
import { formatFileSize } from './attachmentValidation';

/**
 * Property 3: File size formatting produces human-readable output
 *
 * For any non-negative integer byte count, formatFileSize(bytes) returns a string
 * containing a numeric value followed by a unit from {B, KB, MB, GB}, and the
 * numeric value is less than 1024 for non-GB units.
 *
 * **Validates: Requirements 3.3**
 */
describe('Property 3: File size formatting produces human-readable output', () => {
  const validUnits = ['B', 'KB', 'MB', 'GB'];

  it('output contains a numeric value followed by a valid unit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 * 1024 * 1024 * 1024 }),
        (bytes) => {
          const result = formatFileSize(bytes);
          // Match a numeric value (integer or decimal) followed by a space and a unit
          const match = result.match(/^(\d+(?:\.\d+)?)\s+(B|KB|MB|GB)$/);
          expect(match).not.toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('numeric value is less than 1024 for non-GB units', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 * 1024 * 1024 * 1024 }),
        (bytes) => {
          const result = formatFileSize(bytes);
          const match = result.match(/^(\d+(?:\.\d+)?)\s+(B|KB|MB|GB)$/);
          expect(match).not.toBeNull();

          const numericValue = parseFloat(match![1]);
          const unit = match![2];

          if (unit !== 'GB') {
            expect(numericValue).toBeLessThan(1024);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('uses the correct unit for the given byte count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 * 1024 * 1024 * 1024 }),
        (bytes) => {
          const result = formatFileSize(bytes);
          const match = result.match(/^(\d+(?:\.\d+)?)\s+(B|KB|MB|GB)$/);
          expect(match).not.toBeNull();

          const unit = match![2];
          expect(validUnits).toContain(unit);
        },
      ),
      { numRuns: 100 },
    );
  });
});
