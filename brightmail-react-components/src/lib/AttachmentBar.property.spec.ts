// Feature: brightmail-composer-enhancements, Property 5: Attachment removal preserves invariants

/**
 * Property-based test for attachment removal invariants.
 *
 * Validates: Requirements 3.6
 *
 * Property 5: For any non-empty attachment list and any valid index within
 * that list, removing the attachment at that index produces a list whose
 * length is one less than the original, and whose cumulative size equals
 * the original cumulative size minus the removed file's size.
 *
 * This is a pure logic test — no React rendering needed. We test the same
 * array filter operation used by AttachmentBar's handleRemove callback.
 */

import fc from 'fast-check';

/**
 * Simulates the attachment removal logic from AttachmentBar.handleRemove:
 *   attachments.filter((_, i) => i !== index)
 */
function removeAttachment(
  attachments: { filename: string; sizeBytes: number }[],
  index: number,
): { filename: string; sizeBytes: number }[] {
  return attachments.filter((_, i) => i !== index);
}

function cumulativeSize(
  attachments: { filename: string; sizeBytes: number }[],
): number {
  return attachments.reduce((sum, a) => sum + a.sizeBytes, 0);
}

describe('Feature: brightmail-composer-enhancements, Property 5: Attachment removal preserves invariants', () => {
  /**
   * **Validates: Requirements 3.6**
   */
  it('removing at any valid index produces length - 1 and cumulative size minus removed file size', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.record({ filename: fc.string(), sizeBytes: fc.nat() }), {
            minLength: 1,
          })
          .chain((attachments) =>
            fc.tuple(
              fc.constant(attachments),
              fc.integer({ min: 0, max: attachments.length - 1 }),
            ),
          ),
        ([attachments, indexToRemove]) => {
          const originalLength = attachments.length;
          const originalSize = cumulativeSize(attachments);
          const removedFileSize = attachments[indexToRemove].sizeBytes;

          const result = removeAttachment(attachments, indexToRemove);

          // Invariant 1: Result list length === original length - 1
          expect(result.length).toBe(originalLength - 1);

          // Invariant 2: Cumulative size === original sum - removed file's size
          expect(cumulativeSize(result)).toBe(originalSize - removedFileSize);
        },
      ),
      { numRuns: 100 },
    );
  });
});
