import { IMailbox } from './emailAddress';
import { IMessageMetadata } from './messageMetadata';
import {
  ContentTransferEncoding,
  type IContentType,
  type IMimePart,
} from './mimePart';

// Re-export IMailbox so existing consumers of emailMetadata.ts still work
export type { IMailbox } from './emailAddress';

// Re-export MIME types from their canonical location (mimePart.ts)
// so existing consumers of emailMetadata.ts still work
export { ContentTransferEncoding, createContentType } from './mimePart';
export type { IContentDisposition, IContentType, IMimePart } from './mimePart';

// Re-export IAttachmentMetadata from its canonical location (attachmentMetadata.ts)
// so existing consumers of emailMetadata.ts still work
export type { IAttachmentMetadata } from './attachmentMetadata';

import type { IAttachmentMetadata } from './attachmentMetadata';

// Re-export delivery types from their canonical location (emailDelivery.ts)
// so existing consumers of emailMetadata.ts still work
export { EmailDeliveryStatus } from './emailDelivery';
export type { IDeliveryReceipt } from './emailDelivery';

// Re-export unified DeliveryStatus
export { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';

import type { IDeliveryReceipt } from './emailDelivery';

/**
 * Resent header block for forwarded emails per RFC 5322 Section 3.6.6.
 *
 * @remarks
 * When an email is forwarded, a new block of Resent-* headers is prepended.
 * Multiple forwards result in multiple blocks, most recent first.
 */
export interface IResentHeaderBlock {
  /** Resent-From: the forwarder's mailbox */
  resentFrom: IMailbox;
  /** Resent-To: forwarding recipients */
  resentTo: IMailbox[];
  /** Resent-Cc: optional carbon copy recipients for the forward */
  resentCc?: IMailbox[];
  /** Resent-Bcc: optional blind carbon copy recipients for the forward */
  resentBcc?: IMailbox[];
  /** Resent-Date: date of the forward */
  resentDate: Date;
  /** Resent-Message-ID: unique identifier for this forward action */
  resentMessageId: string;
  /** Resent-Sender: optional actual sender if different from Resent-From */
  resentSender?: IMailbox;
}

/**
 * Email-specific metadata extending the base message metadata.
 * Provides RFC 5322 compliant email header fields and MIME support.
 *
 * @remarks
 * This interface extends {@link IMessageMetadata} with all fields necessary
 * to represent a complete RFC 5322 Internet Message Format email, including:
 * - Originator fields (From, Sender, Reply-To) per Section 3.6.2
 * - Destination fields (To, Cc, Bcc) per Section 3.6.3
 * - Identification fields (Message-ID, In-Reply-To, References) per Section 3.6.4
 * - Informational fields (Subject, Comments, Keywords) per Section 3.6.5
 * - Date field per Section 3.6.1
 * - MIME headers per RFC 2045
 * - Resent headers for forwarding per Section 3.6.6
 * - Delivery tracking extensions for BrightChain cross-node delivery
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
export interface IEmailMetadata extends IMessageMetadata {
  // ─── RFC 5322 Originator Fields (Section 3.6.2) ───────────────────────

  /**
   * Required: sender mailbox.
   * Per RFC 5322, the "From:" field specifies the author(s) of the message.
   *
   * @see Requirement 1.1
   */
  from: IMailbox;

  /**
   * Optional: actual sender if different from From.
   * Per RFC 5322, the "Sender:" field is used when the actual sender
   * differs from the author specified in "From:".
   *
   * @see Requirement 1.1
   */
  sender?: IMailbox;

  /**
   * Optional: reply addresses.
   * Per RFC 5322, the "Reply-To:" field indicates the address(es)
   * to which the author suggests replies be sent.
   *
   * @see Requirement 1.1
   */
  replyTo?: IMailbox[];

  // ─── RFC 5322 Destination Fields (Section 3.6.3) ──────────────────────

  /**
   * Primary recipients.
   * Per RFC 5322, the "To:" field contains the address(es) of the
   * primary recipient(s) of the message.
   *
   * @see Requirement 1.2
   */
  to: IMailbox[];

  /**
   * Carbon copy recipients.
   * Per RFC 5322, the "Cc:" field contains the addresses of others
   * who are to receive the message, though the content is not directed at them.
   *
   * @see Requirement 1.2
   */
  cc?: IMailbox[];

  /**
   * Blind carbon copy recipients.
   * Per RFC 5322, the "Bcc:" field contains addresses of recipients
   * who should receive the message but whose addresses should not be
   * revealed to other recipients. Stored separately for privacy.
   *
   * @see Requirement 1.2
   */
  bcc?: IMailbox[];

  // ─── RFC 5322 Identification Fields (Section 3.6.4) ───────────────────

  /**
   * Unique message identifier in the format `<id-left@id-right>`.
   * Per RFC 5322, the "Message-ID:" field provides a unique identifier
   * for the message. Auto-generated if not provided.
   *
   * @see Requirement 1.3
   */
  messageId: string;

  /**
   * Parent message ID for threading.
   * Per RFC 5322, the "In-Reply-To:" field identifies the message(s)
   * to which this message is a reply.
   *
   * @see Requirement 1.3
   */
  inReplyTo?: string;

  /**
   * Thread reference chain.
   * Per RFC 5322, the "References:" field identifies other correspondence
   * that this message references, used for threading.
   *
   * @see Requirement 1.3
   */
  references?: string[];

  // ─── RFC 5322 Informational Fields (Section 3.6.5) ────────────────────

  /**
   * Email subject line (UTF-8 encoded).
   * Per RFC 5322, the "Subject:" field is a short string identifying
   * the topic of the message.
   *
   * @see Requirement 1.4
   */
  subject?: string;

  /**
   * Optional comments.
   * Per RFC 5322, the "Comments:" field provides additional comments
   * on the text of the body. May appear multiple times.
   *
   * @see Requirement 1.4
   */
  comments?: string[];

  /**
   * Optional keywords.
   * Per RFC 5322, the "Keywords:" field contains a comma-separated
   * list of important words and phrases. May appear multiple times.
   *
   * @see Requirement 1.4
   */
  keywords?: string[];

  // ─── RFC 5322 Date Field (Section 3.6.1) ──────────────────────────────

  /**
   * Origination date.
   * Per RFC 5322, the "Date:" field specifies the date and time at which
   * the creator of the message indicated that the message was complete
   * and ready to enter the mail delivery system. Auto-generated if not provided.
   *
   * @see Requirement 1.5
   */
  date: Date;

  // ─── MIME Headers (RFC 2045) ──────────────────────────────────────────

  /**
   * MIME version, always "1.0".
   * Per RFC 2045, the "MIME-Version:" header field indicates that the
   * message is MIME compliant.
   *
   * @see Requirement 1.8
   */
  mimeVersion: string;

  /**
   * Content-Type header with type/subtype and optional parameters.
   * Per RFC 2045, the "Content-Type:" header field describes the data
   * contained in the body.
   *
   * @see Requirement 5.1
   */
  contentType: IContentType;

  /**
   * Content-Transfer-Encoding for the top-level message.
   * Per RFC 2045, specifies the encoding used for the message body.
   */
  contentTransferEncoding?: ContentTransferEncoding;

  // ─── Email-Specific Extensions ────────────────────────────────────────

  /**
   * Custom and extension headers (X-* and other non-standard headers).
   * Per RFC 5322, user-defined header fields may be added to messages.
   * Keys are header field names, values are arrays to support multiple
   * occurrences of the same header.
   *
   * @see Requirement 1.6
   */
  customHeaders: Map<string, string[]>;

  /**
   * MIME parts for multipart messages.
   * Contains the individual parts of a multipart message, each with
   * its own Content-Type, encoding, and body.
   *
   * @see Requirement 6.1
   */
  parts?: IMimePart[];

  /**
   * Attachment references with CBL storage metadata.
   * Each attachment is stored as separate blocks with filename,
   * MIME type, and integrity information.
   *
   * @see Requirement 8.1
   */
  attachments?: IAttachmentMetadata[];

  // ─── Delivery Tracking Extensions ─────────────────────────────────────

  /**
   * Delivery receipts per recipient.
   * Maps recipient identifier to their delivery receipt,
   * tracking the full delivery lifecycle.
   *
   * @see Requirement 12.1
   */
  deliveryReceipts: Map<string, IDeliveryReceipt>;

  /**
   * Read receipts per recipient.
   * Maps recipient identifier to the timestamp when they read the message.
   *
   * @see Requirement 12.3
   */
  readReceipts: Map<string, Date>;

  // ─── Resent Headers for Forwarding (RFC 5322 Section 3.6.6) ───────────

  /**
   * Resent header blocks for forwarded emails.
   * Each forward operation prepends a new block of Resent-* headers.
   * Most recent forward is first in the array.
   *
   * @see Requirement 17.1
   */
  resentHeaders?: IResentHeaderBlock[];

  // ─── Encryption Metadata (Requirement 16.7) ──────────────────────────

  /**
   * Per-recipient encrypted symmetric keys.
   * Maps recipient address to their ECIES-encrypted copy of the symmetric key
   * used to encrypt the email content. Only present when encryptionScheme
   * is RECIPIENT_KEYS.
   *
   * @see Requirement 16.4 - Separate encrypted copies for each recipient
   * @see Requirement 16.7 - Store encryption metadata in Email_Metadata
   */
  encryptedKeys?: Map<string, Uint8Array>;

  /**
   * Initialization vector used for AES-256-GCM content encryption.
   * Present when the email content is encrypted (RECIPIENT_KEYS or SHARED_KEY).
   */
  encryptionIv?: Uint8Array;

  /**
   * Authentication tag from AES-256-GCM content encryption.
   * Present when the email content is encrypted.
   */
  encryptionAuthTag?: Uint8Array;

  /**
   * Whether the email content has been digitally signed.
   *
   * @see Requirement 16.5 - S/MIME signatures for sender authentication
   */
  isSigned?: boolean;

  /**
   * Digital signature bytes for the email content.
   * Present when isSigned is true.
   *
   * @see Requirement 16.5
   */
  contentSignature?: Uint8Array;

  /**
   * Public key of the signer, stored for signature verification.
   *
   * @see Requirement 16.8 - Verify sender's signature on decryption
   */
  signerPublicKey?: Uint8Array;
}
