/**
 * @fileoverview Encryption Error Types for BrightChat E2E Encryption
 *
 * Error hierarchy for encryption operations including key wrapping,
 * message decryption, attachment validation, and key epoch management.
 *
 * @see Requirements 12.1, 12.2, 12.3, 12.4, 11.4
 */

/**
 * Thrown when a member's ECIES public key is not found during key wrapping.
 *
 * @see Requirements 12.1, 12.2
 */
export class MissingPublicKeyError extends Error {
  constructor(public readonly memberId: string) {
    super(
      `ECIES public key not found for member ${memberId}`,
    );
    this.name = 'MissingPublicKeyError';
  }
}

/**
 * Thrown when ECIES decryption of a wrapped key fails.
 *
 * @see Requirement 12.3
 */
export class KeyUnwrapError extends Error {
  constructor(
    public readonly contextId: string,
    public readonly memberId: string,
    public readonly epoch: number,
  ) {
    super(
      `Failed to unwrap key for member ${memberId} in context ${contextId} at epoch ${epoch}`,
    );
    this.name = 'KeyUnwrapError';
  }
}

/**
 * Thrown when AES decryption of message content fails.
 *
 * @see Requirements 12.3, 12.4
 */
export class MessageDecryptionError extends Error {
  constructor(
    public readonly contextId: string,
    public readonly messageId: string,
    public readonly keyEpoch: number,
  ) {
    super(
      `Failed to decrypt message ${messageId} in context ${contextId} at key epoch ${keyEpoch}`,
    );
    this.name = 'MessageDecryptionError';
  }
}

/**
 * Thrown when an attachment exceeds the configured maximum file size.
 *
 * @see Requirement 11.4
 */
export class AttachmentTooLargeError extends Error {
  constructor(
    public readonly fileName: string,
    public readonly size: number,
    public readonly maxSize: number,
  ) {
    super(
      `Attachment "${fileName}" is ${size} bytes, which exceeds the maximum allowed size of ${maxSize} bytes`,
    );
    this.name = 'AttachmentTooLargeError';
  }
}

/**
 * Thrown when a message exceeds the configured maximum number of attachments.
 *
 * @see Requirement 11.4
 */
export class TooManyAttachmentsError extends Error {
  constructor(
    public readonly count: number,
    public readonly maxCount: number,
  ) {
    super(
      `Message has ${count} attachments, which exceeds the maximum of ${maxCount}`,
    );
    this.name = 'TooManyAttachmentsError';
  }
}

/**
 * Thrown when a message references a key epoch that does not exist in the context.
 *
 * @see Requirement 12.3
 */
export class KeyEpochNotFoundError extends Error {
  constructor(
    public readonly contextId: string,
    public readonly keyEpoch: number,
  ) {
    super(
      `Key epoch ${keyEpoch} not found for context ${contextId}`,
    );
    this.name = 'KeyEpochNotFoundError';
  }
}
