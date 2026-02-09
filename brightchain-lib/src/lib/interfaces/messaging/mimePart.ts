/**
 * RFC 2045/2046 MIME Part Interfaces and Utilities
 *
 * Provides interfaces for representing MIME content types, transfer encodings,
 * message parts, and content dispositions per RFC 2045 (MIME Part One),
 * RFC 2046 (MIME Part Two), and RFC 2183 (Content-Disposition).
 *
 * @see RFC 2045 - MIME Part One: Format of Internet Message Bodies
 * @see RFC 2046 - MIME Part Two: Media Types
 * @see RFC 2183 - Content-Disposition Header Field
 *
 * @remarks
 * Requirements: 5.1, 6.1, 6.2, 6.3, 7.1, 7.2
 */

/**
 * RFC 2045 Content-Type header representation.
 *
 * The Content-Type header field describes the data contained in the body
 * of a MIME entity by giving media type and subtype identifiers, and by
 * providing auxiliary information that may be required for certain media types.
 *
 * Format: type "/" subtype *(";" parameter)
 *
 * Examples:
 * - `text/plain; charset=utf-8`
 * - `multipart/mixed; boundary="----=_Part_123"`
 * - `application/pdf; name="document.pdf"`
 *
 * @see RFC 2045 Section 5 - Content-Type Header Field
 * @see Requirement 5.1 - Content-Type with type/subtype and optional parameters
 */
export interface IContentType {
  /**
   * Primary type (e.g., "text", "image", "audio", "video", "application",
   * "multipart", "message").
   *
   * @see RFC 2046 for defined media types
   */
  type: string;

  /**
   * Subtype (e.g., "plain", "html", "jpeg", "pdf", "mixed", "alternative").
   *
   * @see RFC 2046 for defined subtypes
   */
  subtype: string;

  /**
   * Parameters as key-value pairs (e.g., charset, boundary, name).
   *
   * Common parameters:
   * - `charset`: Character set for text types (e.g., "utf-8", "us-ascii")
   * - `boundary`: Delimiter for multipart types
   * - `name`: Suggested filename for the content
   *
   * @see RFC 2045 Section 5.1 - Syntax of the Content-Type Header Field
   */
  parameters: Map<string, string>;

  /**
   * Full media type string: type/subtype (computed/readonly).
   *
   * @example "text/plain", "multipart/mixed", "application/pdf"
   */
  readonly mediaType: string;
}

/**
 * Content-Transfer-Encoding values per RFC 2045 Section 6.
 *
 * Specifies the encoding transformation applied to the body of a MIME entity
 * to allow it to pass through mail transport mechanisms which may have
 * limitations on the character set or line length.
 *
 * @see RFC 2045 Section 6 - Content-Transfer-Encoding Header Field
 * @see Requirement 7.1 - Store Content-Transfer-Encoding for each MIME part
 */
export enum ContentTransferEncoding {
  /** 7-bit US-ASCII data, lines limited to 998 octets */
  SevenBit = '7bit',

  /** 8-bit data, lines limited to 998 octets */
  EightBit = '8bit',

  /** Binary data, no line length limitation */
  Binary = 'binary',

  /** Quoted-printable encoding for mostly ASCII text with some special characters */
  QuotedPrintable = 'quoted-printable',

  /** Base64 encoding for arbitrary binary data */
  Base64 = 'base64',
}

/**
 * RFC 2183 Content-Disposition header representation.
 *
 * The Content-Disposition header field provides presentation information
 * for a MIME entity, indicating whether it should be displayed inline
 * or treated as an attachment.
 *
 * Format: disposition-type *(";" disposition-parm)
 *
 * Examples:
 * - `inline`
 * - `attachment; filename="document.pdf"`
 * - `attachment; filename="report.pdf"; creation-date="..."; size=1024`
 *
 * @see RFC 2183 - Communicating Presentation Information in Internet Messages
 * @see Requirement 7.2 - Store Content-Disposition for each MIME part
 */
export interface IContentDisposition {
  /**
   * Disposition type: "inline" for display within the message body,
   * "attachment" for separate handling.
   */
  type: 'inline' | 'attachment';

  /**
   * Suggested filename for the content.
   * Present when disposition type is "attachment" (and sometimes "inline").
   *
   * @see Requirement 7.3 - Include filename parameter for attachments
   */
  filename?: string;

  /** Creation date of the file, if known */
  creationDate?: Date;

  /** Last modification date of the file, if known */
  modificationDate?: Date;

  /** Date the file was last read, if known */
  readDate?: Date;

  /** Approximate size of the content in bytes */
  size?: number;
}

/**
 * MIME entity/part representation per RFC 2045/2046.
 *
 * Represents a single part of a MIME message, which may itself contain
 * nested parts (for multipart types). Each part has its own headers
 * (Content-Type, Content-Transfer-Encoding, etc.) and body content.
 *
 * For multipart types, the `parts` array contains the nested MIME parts.
 * For discrete types, the body content is stored either inline (`body`)
 * or as block references (`bodyBlockIds`) for large content.
 *
 * @see RFC 2045 - MIME Part One: Format of Internet Message Bodies
 * @see RFC 2046 - MIME Part Two: Media Types
 * @see Requirement 6.1 - Support multipart/mixed
 * @see Requirement 6.2 - Support multipart/alternative
 * @see Requirement 6.3 - Support multipart/related
 */
export interface IMimePart {
  /** Content-Type of this MIME part */
  contentType: IContentType;

  /**
   * Content-Transfer-Encoding for this part.
   * Defaults to "7bit" if not specified per RFC 2045.
   *
   * @see Requirement 7.1
   */
  contentTransferEncoding?: ContentTransferEncoding;

  /**
   * Content-Disposition for this part (inline or attachment).
   *
   * @see Requirement 7.2
   */
  contentDisposition?: IContentDisposition;

  /**
   * Content-ID for inline references.
   * Format: "<" id ">" per RFC 2045 Section 7.
   * Used for referencing inline content (e.g., images in HTML emails).
   *
   * @see RFC 2045 Section 7 - Content-ID Header Field
   */
  contentId?: string;

  /**
   * Optional human-readable description of this part.
   *
   * @see RFC 2045 Section 8 - Content-Description Header Field
   */
  contentDescription?: string;

  /**
   * Inline content for small parts.
   * Used when the part content is small enough to store directly
   * in the metadata rather than as separate blocks.
   */
  body?: Uint8Array;

  /**
   * CBL block IDs for large parts.
   * Used when the part content is too large for inline storage
   * and is stored as separate blocks in the block store.
   */
  bodyBlockIds?: string[];

  /**
   * Nested parts for multipart types.
   * Contains the child MIME parts when this part's Content-Type
   * is a multipart type (mixed, alternative, related, digest).
   *
   * @see RFC 2046 Section 5 - Composite Media Type Values
   */
  parts?: IMimePart[];

  /** Content size in bytes */
  size: number;
}

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Creates an IContentType object with a computed `mediaType` property.
 *
 * @param type - The primary MIME type (e.g., "text", "image", "multipart")
 * @param subtype - The MIME subtype (e.g., "plain", "html", "mixed")
 * @param parameters - Optional parameters map (e.g., charset, boundary)
 * @returns A fully constructed IContentType with computed mediaType getter
 *
 * @example
 * ```typescript
 * const textPlain = createContentType('text', 'plain', new Map([['charset', 'utf-8']]));
 * console.log(textPlain.mediaType); // "text/plain"
 * console.log(textPlain.parameters.get('charset')); // "utf-8"
 *
 * const multipart = createContentType('multipart', 'mixed', new Map([['boundary', '----=_Part_123']]));
 * console.log(multipart.mediaType); // "multipart/mixed"
 * ```
 */
export function createContentType(
  type: string,
  subtype: string,
  parameters?: Map<string, string>,
): IContentType {
  return {
    type,
    subtype,
    parameters: parameters ?? new Map(),
    get mediaType(): string {
      return `${this.type}/${this.subtype}`;
    },
  };
}
