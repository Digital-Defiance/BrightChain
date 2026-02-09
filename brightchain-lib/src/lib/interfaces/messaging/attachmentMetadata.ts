/**
 * Attachment metadata with CBL storage reference.
 *
 * Represents the metadata for a file attached to an email message,
 * including storage references to the BrightChain ExtendedCBL blocks
 * and integrity verification fields.
 *
 * @remarks
 * Attachments are stored as separate blocks using the ExtendedCBL structure.
 * The `cblMagnetUrl` provides a magnet URL for retrieving the attachment,
 * while `blockIds` lists the constituent block IDs that make up the attachment.
 *
 * Integrity is verified via SHA-3 checksum and optionally via MD5 per RFC 1864.
 *
 * @see Requirements 8.1, 8.3, 8.10
 */
export interface IAttachmentMetadata {
  /** Original filename of the attachment */
  filename: string;

  /** MIME type of the attachment (e.g., 'application/pdf', 'image/png') */
  mimeType: string;

  /** Size of the attachment in bytes */
  size: number;

  /**
   * Content-ID for inline attachments.
   * Used to reference the attachment from within HTML email content
   * (e.g., embedded images). Format: `<id>` per RFC 2045.
   */
  contentId?: string;

  // ─── Storage Reference ─────────────────────────────────────────────────

  /**
   * ExtendedCBL magnet URL for retrieving the attachment.
   * Provides a URI-based reference to the attachment's CBL storage.
   */
  cblMagnetUrl: string;

  /** Constituent block IDs that make up the attachment in the CBL */
  blockIds: string[];

  // ─── Integrity ─────────────────────────────────────────────────────────

  /** SHA-3 checksum for verifying attachment integrity */
  checksum: string;

  /**
   * Optional MD5 checksum for Content-MD5 header per RFC 1864.
   * Provides backward-compatible integrity verification.
   *
   * @see Requirement 8.10
   */
  contentMd5?: string;
}
