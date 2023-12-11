/**
 * Attachment Validation Utilities
 *
 * Pure functions for validating email attachment sizes and formatting file sizes
 * into human-readable strings. Shared between frontend (instant feedback) and
 * backend (authoritative validation).
 *
 * @module attachmentValidation
 */

/**
 * Maximum allowed attachment size in bytes (25 MB).
 * Matches the IEmailGatewayConfig.maxMessageSizeBytes default.
 */
export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Validate that a single attachment's size does not exceed the maximum.
 *
 * @param sizeBytes - The size of the attachment in bytes
 * @param maxBytes - The maximum allowed size in bytes
 * @returns true if sizeBytes ≤ maxBytes
 *
 * @example
 * ```typescript
 * validateAttachmentSize(1024, MAX_ATTACHMENT_SIZE_BYTES); // true
 * validateAttachmentSize(30 * 1024 * 1024, MAX_ATTACHMENT_SIZE_BYTES); // false
 * ```
 */
export function validateAttachmentSize(
  sizeBytes: number,
  maxBytes: number,
): boolean {
  return sizeBytes <= maxBytes;
}

/**
 * Validate that all attachments individually and cumulatively fit within the limit.
 *
 * Returns true if and only if every individual size ≤ maxBytes AND the sum of
 * all sizes ≤ maxBytes.
 *
 * @param sizes - Array of attachment sizes in bytes
 * @param maxBytes - The maximum allowed size in bytes (applies per-file and total)
 * @returns true if all individual sizes and the total are within the limit
 *
 * @example
 * ```typescript
 * validateTotalAttachmentSize([1024, 2048], MAX_ATTACHMENT_SIZE_BYTES); // true
 * validateTotalAttachmentSize([20 * 1024 * 1024, 10 * 1024 * 1024], MAX_ATTACHMENT_SIZE_BYTES); // false (total > 25MB)
 * ```
 */
export function validateTotalAttachmentSize(
  sizes: number[],
  maxBytes: number,
): boolean {
  let total = 0;
  for (const size of sizes) {
    if (size > maxBytes) {
      return false;
    }
    total += size;
  }
  return total <= maxBytes;
}

/**
 * Format a byte count into a human-readable string with appropriate units.
 *
 * Uses units B, KB, MB, GB. The numeric value is always < 1024 for B, KB, and MB
 * units. GB has no upper bound. Values are rounded to two decimal places for
 * KB, MB, and GB.
 *
 * @param bytes - Non-negative byte count to format
 * @returns Human-readable string (e.g., "1.50 KB", "25.00 MB")
 *
 * @example
 * ```typescript
 * formatFileSize(0);          // "0 B"
 * formatFileSize(512);        // "512 B"
 * formatFileSize(1536);       // "1.50 KB"
 * formatFileSize(26214400);   // "25.00 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}
