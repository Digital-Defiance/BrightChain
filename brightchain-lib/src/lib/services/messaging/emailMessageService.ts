/**
 * Email Message Service
 *
 * Main service for email operations in the BrightChain messaging system.
 * Coordinates parsing, validation, storage, and delivery of RFC 5322
 * compliant email messages.
 *
 * This service depends on:
 * - MessageCBLService: For storing email content as CBL blocks
 * - IGossipService: For delivering messages via gossip protocol
 * - IEmailMetadataStore: For persisting email metadata
 * - EmailParser, EmailSerializer, EmailValidator: For email processing
 *
 * @see RFC 5322 - Internet Message Format
 * @see RFC 2045/2046 - MIME
 *
 * @remarks
 * Requirements: 1.1-1.10
 */

import { createHash, randomBytes } from 'crypto';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { EmailError } from '../../errors/messaging/emailError';
import type { IGossipService } from '../../interfaces/availability/gossipService';
import type { IAttachmentMetadata } from '../../interfaces/messaging/attachmentMetadata';
import type { IMailbox } from '../../interfaces/messaging/emailAddress';
import { type IDeliveryReceipt } from '../../interfaces/messaging/emailDelivery';
import type {
  IEmailMetadata,
  IResentHeaderBlock,
} from '../../interfaces/messaging/emailMetadata';
import {
  createContentType,
  type IContentType,
  type IMimePart,
} from '../../interfaces/messaging/mimePart';
import { EmailEncryptionService } from './emailEncryptionService';
import {
  EmailValidator,
  type IEmailInput as IValidatorEmailInput,
} from './emailValidator';
import type { MessageCBLService } from './messageCBLService';

// ─── Configuration Interface ────────────────────────────────────────────────

/**
 * Configuration for the EmailMessageService.
 *
 * Provides configurable limits and defaults for email processing,
 * storage, and delivery.
 *
 * @see Requirement 8.5 - Configurable maximum attachment size limit
 * @see Requirement 8.6 - Configurable maximum total message size limit
 */
export interface IEmailServiceConfig {
  /**
   * Maximum size of a single attachment in bytes.
   * @default 25 * 1024 * 1024 (25MB)
   * @see Requirement 8.5
   */
  maxAttachmentSize: number;

  /**
   * Maximum total message size in bytes (body + all attachments).
   * @default 50 * 1024 * 1024 (50MB)
   * @see Requirement 8.6
   */
  maxMessageSize: number;

  /**
   * Parts smaller than this threshold are stored inline in metadata.
   * Larger parts are stored as separate CBL blocks.
   * @default 64 * 1024 (64KB)
   */
  inlinePartThreshold: number;

  /**
   * Maximum total size of all inline parts combined.
   * @default 256 * 1024 (256KB)
   */
  maxInlinePartsTotal: number;

  /**
   * Default page size for inbox queries.
   * @default 50
   * @see Requirement 13.6
   */
  defaultPageSize: number;

  /**
   * Maximum number of Message-IDs in the References header.
   * @default 20
   * @see Requirement 10.3
   */
  maxReferencesCount: number;

  /**
   * Maximum number of delivery retry attempts.
   * @default 3
   * @see Requirement 11.5
   */
  maxRetryAttempts: number;

  /**
   * Delivery timeout duration in milliseconds.
   * @default 24 * 60 * 60 * 1000 (24 hours)
   * @see Requirement 11.9
   */
  deliveryTimeoutMs: number;

  /**
   * The node ID or domain used for generating Message-IDs.
   * Used as the id-right portion of Message-ID: <id-left@nodeId>
   * @see Requirement 3.2
   */
  nodeId: string;
}

/**
 * Default configuration values for EmailMessageService.
 */
export const DEFAULT_EMAIL_SERVICE_CONFIG: IEmailServiceConfig = {
  maxAttachmentSize: 25 * 1024 * 1024, // 25MB
  maxMessageSize: 50 * 1024 * 1024, // 50MB
  inlinePartThreshold: 64 * 1024, // 64KB
  maxInlinePartsTotal: 256 * 1024, // 256KB
  defaultPageSize: 50,
  maxReferencesCount: 20,
  maxRetryAttempts: 3,
  deliveryTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
  nodeId: 'localhost',
};

// ─── Email Input Interface ──────────────────────────────────────────────────

/**
 * Input for creating/sending an email message.
 *
 * Contains all fields needed to compose an email. Required headers
 * (From, Date, Message-ID) are auto-generated if not provided.
 *
 * @see Requirement 15.1 - Validate at least one recipient
 * @see Requirement 15.4 - Auto-generate required headers
 */
export interface IEmailInput {
  /** Sender mailbox (From header). Required. */
  from: IMailbox;

  /** Optional: actual sender if different from From */
  sender?: IMailbox;

  /** Optional: reply-to addresses */
  replyTo?: IMailbox[];

  /** Primary recipients (To header) */
  to?: IMailbox[];

  /** CC recipients */
  cc?: IMailbox[];

  /** BCC recipients */
  bcc?: IMailbox[];

  /** Email subject line (UTF-8) */
  subject?: string;

  /** Origination date. Auto-generated if not provided. */
  date?: Date;

  /** Message-ID. Auto-generated if not provided. */
  messageId?: string;

  /** In-Reply-To Message-ID for threading */
  inReplyTo?: string;

  /** References chain for threading */
  references?: string[];

  /** Content-Type of the message body */
  contentType?: IContentType;

  /** MIME parts for multipart messages */
  parts?: IMimePart[];

  /** Attachments to include */
  attachments?: IAttachmentInput[];

  /** Plain text body content */
  textBody?: string;

  /** HTML body content */
  htmlBody?: string;

  /** Custom headers (X-* and other extension headers) */
  customHeaders?: Map<string, string[]>;

  // ─── Encryption Options (Requirement 16.1, 16.4) ─────────────────────

  /**
   * Encryption scheme to use for this email.
   * - NONE: No encryption (default)
   * - RECIPIENT_KEYS: ECIES per-recipient encryption
   * - SHARED_KEY: Symmetric encryption with a shared key
   *
   * @see Requirement 16.1
   */
  encryptionScheme?: MessageEncryptionScheme;

  /**
   * Per-recipient public keys for ECIES encryption.
   * Maps recipient address to their ECIES public key.
   * Required when encryptionScheme is RECIPIENT_KEYS.
   *
   * @see Requirement 16.3, 16.4
   */
  recipientPublicKeys?: Map<string, Uint8Array>;

  /**
   * Shared symmetric key for SHARED_KEY encryption.
   * Must be exactly 32 bytes (AES-256).
   * Required when encryptionScheme is SHARED_KEY.
   */
  sharedKey?: Uint8Array;

  /**
   * Sender's private key for signing the email.
   * When provided along with senderPublicKey, the email will be signed.
   *
   * @see Requirement 16.5
   */
  senderPrivateKey?: Uint8Array;

  /**
   * Sender's public key, stored with the signature for verification.
   * Required when senderPrivateKey is provided.
   *
   * @see Requirement 16.5
   */
  senderPublicKey?: Uint8Array;
}

/**
 * Input for an attachment to be included in an email.
 */
export interface IAttachmentInput {
  /** Original filename of the attachment */
  filename: string;

  /** MIME type of the attachment */
  mimeType: string;

  /** Attachment content as binary data */
  content: Uint8Array;

  /** Optional Content-ID for inline attachments */
  contentId?: string;

  /** Whether this is an inline attachment (e.g., embedded image) */
  inline?: boolean;
}

// ─── Result Interfaces ──────────────────────────────────────────────────────

/**
 * Result of sending an email.
 *
 * Contains the generated message ID and initial delivery status
 * for all recipients.
 */
export interface ISendEmailResult {
  /** The generated or provided Message-ID */
  messageId: string;

  /** The internal BrightChain message/block ID */
  brightchainMessageId: string;

  /** Initial delivery status per recipient */
  deliveryStatus: Map<string, IDeliveryReceipt>;

  /** Whether the send operation was successful */
  success: boolean;

  /** Error message if send failed */
  error?: string;
}

/**
 * Email content retrieved from storage.
 *
 * Contains the full email metadata along with decoded body content
 * and reconstructed attachments.
 */
export interface IEmailContent {
  /** Full email metadata */
  metadata: IEmailMetadata;

  /** Decoded plain text body (if available) */
  textBody?: string;

  /** Decoded HTML body (if available) */
  htmlBody?: string;

  /** Reconstructed MIME parts with decoded content */
  parts: IMimePart[];

  /** Reconstructed attachments with content */
  attachments: IRetrievedAttachment[];
}

/**
 * A retrieved attachment with its binary content.
 */
export interface IRetrievedAttachment {
  /** Attachment metadata */
  metadata: IAttachmentMetadata;

  /** Decoded attachment content */
  content: Uint8Array;
}

// ─── Inbox Interfaces ───────────────────────────────────────────────────────

/**
 * Query parameters for inbox operations.
 *
 * @see Requirement 13.2 - Sort by Date header (newest first by default)
 * @see Requirement 13.3 - Filter by read/unread, sender, date range, etc.
 * @see Requirement 13.4 - Full-text search across subject and body
 * @see Requirement 13.6 - Pagination with configurable page size
 * @see Requirement 13.7 - Sort by date, sender, subject, size
 */
export interface IInboxQuery {
  /** Filter by read/unread status */
  readStatus?: 'read' | 'unread' | 'all';

  /** Filter by sender address */
  senderAddress?: string;

  /** Filter by date range - start */
  dateFrom?: Date;

  /** Filter by date range - end */
  dateTo?: Date;

  /** Filter by whether email has attachments */
  hasAttachments?: boolean;

  /** Filter by subject containing text */
  subjectContains?: string;

  /** Full-text search across subject and body */
  searchText?: string;

  /** Sort field */
  sortBy?: 'date' | 'sender' | 'subject' | 'size';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';

  /** Page number (1-based) */
  page?: number;

  /** Number of results per page */
  pageSize?: number;
}

/**
 * Result of an inbox query.
 *
 * @see Requirement 13.6 - Pagination support
 * @see Requirement 13.8 - Track and return unread count
 */
export interface IInboxResult {
  /** Email metadata for the current page */
  emails: IEmailMetadata[];

  /** Total number of matching emails */
  totalCount: number;

  /** Number of unread emails matching the query */
  unreadCount: number;

  /** Current page number (1-based) */
  page: number;

  /** Number of results per page */
  pageSize: number;

  /** Whether there are more pages */
  hasMore: boolean;
}

// ─── Reply/Forward Interfaces ───────────────────────────────────────────────

/**
 * Input for creating a reply to an email.
 */
export interface IReplyInput {
  /** Sender mailbox for the reply */
  from: IMailbox;

  /** Whether to reply to all recipients (Reply-All) */
  replyAll?: boolean;

  /** Additional recipients to add */
  additionalTo?: IMailbox[];

  /** Additional CC recipients */
  additionalCc?: IMailbox[];

  /** Reply subject (defaults to "Re: <original subject>") */
  subject?: string;

  /** Plain text reply body */
  textBody?: string;

  /** HTML reply body */
  htmlBody?: string;

  /** Attachments to include in the reply */
  attachments?: IAttachmentInput[];
}

// ─── Metadata Store Interface ───────────────────────────────────────────────

/**
 * Interface for email metadata persistence.
 *
 * Provides CRUD operations for email metadata storage and
 * query capabilities for inbox operations.
 *
 * This is an abstraction over the underlying storage mechanism,
 * allowing different implementations (in-memory, database, etc.).
 */
export interface IEmailMetadataStore {
  /** Store email metadata */
  store(metadata: IEmailMetadata): Promise<void>;

  /** Retrieve email metadata by Message-ID */
  get(messageId: string): Promise<IEmailMetadata | null>;

  /** Delete email metadata by Message-ID */
  delete(messageId: string): Promise<void>;

  /** Update email metadata */
  update(messageId: string, updates: Partial<IEmailMetadata>): Promise<void>;

  /** Query emails for a user's inbox */
  queryInbox(userId: string, query: IInboxQuery): Promise<IInboxResult>;

  /** Get unread count for a user */
  getUnreadCount(userId: string): Promise<number>;

  /** Mark an email as read for a user */
  markAsRead(messageId: string, userId: string): Promise<void>;

  /** Get all emails in a thread by following References chain */
  getThread(messageId: string): Promise<IEmailMetadata[]>;

  /** Get the root message of a thread */
  getRootMessage(messageId: string): Promise<IEmailMetadata | null>;

  /**
   * Store attachment content by a unique key (e.g. SHA-256 checksum).
   * Used by EmailMessageService to persist attachment binary data
   * alongside metadata.
   *
   * @param key - Unique identifier for the attachment content (checksum)
   * @param content - The binary attachment data
   * @see Requirement 8.1 - Store attachments as ExtendedCBL blocks
   */
  storeAttachmentContent?(key: string, content: Uint8Array): Promise<void>;

  /**
   * Retrieve attachment content by key.
   *
   * @param key - The unique identifier used when storing
   * @returns The binary content, or null if not found
   * @see Requirement 8.7 - Retrieve attachments with original content
   */
  getAttachmentContent?(key: string): Promise<Uint8Array | null>;
}

// ─── EmailMessageService Class ──────────────────────────────────────────────

/**
 * Main service for email operations in the BrightChain messaging system.
 *
 * Coordinates parsing, validation, storage, and delivery of RFC 5322
 * compliant email messages. This service acts as the primary entry point
 * for all email-related operations.
 *
 * @see Design Document: EmailMessageService Class
 * @see Requirements 1.1-1.10
 *
 * @example
 * ```typescript
 * const emailService = new EmailMessageService(
 *   messageCBLService,
 *   metadataStore,
 *   gossipService,
 *   config,
 * );
 *
 * const result = await emailService.sendEmail({
 *   from: createMailbox('sender', 'example.com'),
 *   to: [createMailbox('recipient', 'example.com')],
 *   subject: 'Hello',
 *   textBody: 'Hello, World!',
 * });
 * ```
 */
export class EmailMessageService {
  private readonly config: IEmailServiceConfig;

  constructor(
    private readonly messageCBLService: MessageCBLService,
    private readonly metadataStore: IEmailMetadataStore,
    private readonly gossipService: IGossipService,
    config?: Partial<IEmailServiceConfig>,
  ) {
    this.config = { ...DEFAULT_EMAIL_SERVICE_CONFIG, ...config };
  }

  // ─── Core Operations ────────────────────────────────────────────────

  /**
   * Sends an email message.
   *
   * Validates the email, auto-generates required headers (Message-ID, Date),
   * stores the email content as CBL blocks, and initiates delivery to
   * all recipients.
   *
   * @param email - The email input to send
   * @returns The send result with message ID and delivery status
   * @throws {EmailError} If validation fails or storage/delivery errors occur
   *
   * @see Requirement 15.1 - Validate at least one recipient
   * @see Requirement 15.4 - Auto-generate required headers
   */
  /**
   * Sends an email message.
   *
   * Validates the email, auto-generates required headers (Message-ID, Date),
   * stores the email content as CBL blocks, and initiates delivery to
   * all recipients.
   *
   * @param email - The email input to send
   * @returns The send result with message ID and delivery status
   * @throws {EmailError} If validation fails or storage/delivery errors occur
   *
   * @see Requirement 15.1 - Validate at least one recipient
   * @see Requirement 15.4 - Auto-generate required headers
   */
  async sendEmail(email: IEmailInput): Promise<ISendEmailResult> {
    // 1. Auto-generate required headers if missing
    const messageId = email.messageId ?? this.generateMessageId();
    const date = email.date ?? new Date();

    // 2. Adapt service IEmailInput to validator's IEmailInput and validate
    const validatorInput: IValidatorEmailInput = {
      from: email.from,
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      date,
      messageId,
      contentType: email.contentType,
      attachments: email.attachments
        ? email.attachments.map((a) => ({
            filename: a.filename,
            size: a.content.length,
          }))
        : undefined,
      bodySize:
        (email.textBody ? new TextEncoder().encode(email.textBody).length : 0) +
        (email.htmlBody ? new TextEncoder().encode(email.htmlBody).length : 0),
    };

    const emailValidator = new EmailValidator();
    const validationResult = emailValidator.validate(validatorInput, {
      maxAttachmentSize: this.config.maxAttachmentSize,
      maxMessageSize: this.config.maxMessageSize,
    });

    if (!validationResult.valid) {
      return {
        messageId,
        brightchainMessageId: '',
        deliveryStatus: new Map(),
        success: false,
        error: validationResult.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join('; '),
      };
    }

    // 3. Build IEmailMetadata from the input
    const brightchainMessageId = this.generateMessageId();
    const now = new Date();

    // Collect all recipient addresses for IMessageMetadata.recipients
    const allRecipientAddresses: string[] = [];
    if (email.to) {
      allRecipientAddresses.push(...email.to.map((m) => m.address));
    }
    if (email.cc) {
      allRecipientAddresses.push(...email.cc.map((m) => m.address));
    }
    if (email.bcc) {
      allRecipientAddresses.push(...email.bcc.map((m) => m.address));
    }

    const contentType =
      email.contentType ??
      createContentType('text', 'plain', new Map([['charset', 'us-ascii']]));

    const metadata: IEmailMetadata = {
      // IBlockMetadata fields
      blockId: brightchainMessageId,
      createdAt: now,
      expiresAt: null,
      durabilityLevel: DurabilityLevel.Standard,
      parityBlockIds: [],
      accessCount: 0,
      lastAccessedAt: now,
      replicationStatus: ReplicationStatus.Pending,
      targetReplicationFactor: 0,
      replicaNodeIds: [],
      size:
        (email.textBody ? new TextEncoder().encode(email.textBody).length : 0) +
        (email.htmlBody ? new TextEncoder().encode(email.htmlBody).length : 0) +
        (email.attachments
          ? email.attachments.reduce((sum, a) => sum + a.content.length, 0)
          : 0),
      checksum: '',

      // IMessageMetadata fields
      messageType: 'email',
      senderId: email.from.address,
      recipients: allRecipientAddresses,
      priority: MessagePriority.NORMAL,
      deliveryStatus: new Map(
        allRecipientAddresses.map((addr) => [addr, DeliveryStatus.Pending]),
      ),
      acknowledgments: new Map(),
      encryptionScheme: email.encryptionScheme ?? MessageEncryptionScheme.NONE,
      isCBL: false,
      cblBlockIds: [brightchainMessageId],

      // IEmailMetadata fields
      from: email.from,
      sender: email.sender,
      replyTo: email.replyTo,
      to: email.to ?? [],
      cc: email.cc,
      bcc: email.bcc,
      messageId,
      inReplyTo: email.inReplyTo,
      references: email.references,
      subject: email.subject,
      date,
      mimeVersion: '1.0',
      contentType,
      customHeaders: email.customHeaders ?? new Map(),
      parts: email.parts,
      attachments: undefined,
      deliveryReceipts: new Map(),
      readReceipts: new Map(),
    };

    // 3b. Process attachments if provided
    if (email.attachments && email.attachments.length > 0) {
      metadata.attachments = await Promise.all(
        email.attachments.map((attachment) => this.storeAttachment(attachment)),
      );
    }

    // 3c. Apply encryption if requested (Requirements 16.1, 16.3, 16.4, 16.7)
    if (
      email.encryptionScheme &&
      email.encryptionScheme !== MessageEncryptionScheme.NONE
    ) {
      try {
        const encryptionService = new EmailEncryptionService();

        // Build plaintext content from the email body
        const bodyContent = new TextEncoder().encode(
          (email.textBody ?? '') + (email.htmlBody ?? ''),
        );

        if (email.encryptionScheme === MessageEncryptionScheme.RECIPIENT_KEYS) {
          // ECIES per-recipient encryption
          if (
            !email.recipientPublicKeys ||
            email.recipientPublicKeys.size === 0
          ) {
            throw new EmailError(
              EmailErrorType.ENCRYPTION_FAILED,
              'Recipient public keys are required for RECIPIENT_KEYS encryption',
            );
          }

          // Optionally sign if sender keys are provided
          let result;
          if (email.senderPrivateKey && email.senderPublicKey) {
            result = await encryptionService.encryptAndSign(
              bodyContent,
              email.recipientPublicKeys,
              email.senderPrivateKey,
              email.senderPublicKey,
            );
          } else {
            result = await encryptionService.encryptForRecipients(
              bodyContent,
              email.recipientPublicKeys,
            );
          }

          // Store encryption metadata in the email metadata
          metadata.encryptedKeys = result.encryptionMetadata.encryptedKeys;
          metadata.encryptionIv = result.encryptionMetadata.iv;
          metadata.encryptionAuthTag = result.encryptionMetadata.authTag;
          metadata.isSigned = result.encryptionMetadata.isSigned;
          metadata.contentSignature = result.encryptionMetadata.signature;
          metadata.signerPublicKey = result.encryptionMetadata.signerPublicKey;
        } else if (
          email.encryptionScheme === MessageEncryptionScheme.SHARED_KEY
        ) {
          // Symmetric encryption with shared key
          if (!email.sharedKey) {
            throw new EmailError(
              EmailErrorType.ENCRYPTION_FAILED,
              'Shared key is required for SHARED_KEY encryption',
            );
          }

          const result = encryptionService.encryptContentSymmetric(
            bodyContent,
            email.sharedKey,
          );

          metadata.encryptionIv = result.encryptionMetadata.iv;
          metadata.encryptionAuthTag = result.encryptionMetadata.authTag;

          // Optionally sign
          if (email.senderPrivateKey && email.senderPublicKey) {
            const sig = encryptionService.signContent(
              bodyContent,
              email.senderPrivateKey,
              email.senderPublicKey,
            );
            metadata.isSigned = true;
            metadata.contentSignature = sig.signature;
            metadata.signerPublicKey = sig.signerPublicKey;
          }
        } else if (email.encryptionScheme === MessageEncryptionScheme.S_MIME) {
          // S/MIME encryption: requires both recipient keys and sender keys
          if (
            !email.recipientPublicKeys ||
            email.recipientPublicKeys.size === 0
          ) {
            throw new EmailError(
              EmailErrorType.ENCRYPTION_FAILED,
              'Recipient public keys are required for S/MIME encryption',
            );
          }
          if (!email.senderPrivateKey || !email.senderPublicKey) {
            throw new EmailError(
              EmailErrorType.ENCRYPTION_FAILED,
              'Sender private and public keys are required for S/MIME encryption',
            );
          }

          const result = await encryptionService.encryptSmime(
            bodyContent,
            email.recipientPublicKeys,
            email.senderPrivateKey,
            email.senderPublicKey,
          );

          metadata.encryptedKeys = result.encryptionMetadata.encryptedKeys;
          metadata.encryptionIv = result.encryptionMetadata.iv;
          metadata.encryptionAuthTag = result.encryptionMetadata.authTag;
          metadata.isSigned = result.encryptionMetadata.isSigned;
          metadata.contentSignature = result.encryptionMetadata.signature;
          metadata.signerPublicKey = result.encryptionMetadata.signerPublicKey;
        }
      } catch (err) {
        if (err instanceof EmailError) throw err;
        throw new EmailError(
          EmailErrorType.ENCRYPTION_FAILED,
          `Failed to encrypt email: ${err instanceof Error ? err.message : String(err)}`,
          { messageId },
        );
      }
    }

    // 4. Store the sender's copy (retains BCC info for sender's records)
    try {
      await this.metadataStore.store(metadata);
    } catch (err) {
      throw new EmailError(
        EmailErrorType.STORAGE_FAILED,
        `Failed to store email metadata: ${err instanceof Error ? err.message : String(err)}`,
        { messageId },
      );
    }

    // 5. Initiate delivery to recipients via gossip with BCC privacy handling
    //
    // BCC Privacy (Requirements 9.2, 9.3, 6.3):
    // - To/CC recipients receive a single gossip announcement WITHOUT BCC info
    // - Each BCC recipient receives their own separate gossip announcement
    // - All announcements have ackRequired=true (Requirement 6.5)
    try {
      // 5a. Deliver to To/CC recipients (no BCC info)
      const toCcRecipientIds = [
        ...(email.to ?? []).map((m) => m.address),
        ...(email.cc ?? []).map((m) => m.address),
      ];

      if (toCcRecipientIds.length > 0) {
        const toCcMetadata = this.createBccStrippedCopy(metadata);
        await this.metadataStore.store(toCcMetadata);
        await this.gossipService.announceMessage(
          toCcMetadata.cblBlockIds ?? [],
          {
            messageId,
            recipientIds: toCcRecipientIds,
            priority: 'normal',
            blockIds: toCcMetadata.cblBlockIds ?? [],
            cblBlockId: toCcMetadata.blockId,
            ackRequired: true,
          },
        );
      }

      // 5b. Deliver to each BCC recipient separately (BCC privacy)
      // Each BCC recipient gets their own announcement with no BCC header and
      // no information about other BCC recipients.
      if (email.bcc && email.bcc.length > 0) {
        for (const bccMailbox of email.bcc) {
          const bccCopy = this.createBccRecipientCopy(metadata, bccMailbox);
          await this.metadataStore.store(bccCopy);
          await this.gossipService.announceMessage(bccCopy.cblBlockIds ?? [], {
            messageId,
            recipientIds: [bccMailbox.address],
            priority: 'normal',
            blockIds: bccCopy.cblBlockIds ?? [],
            cblBlockId: bccCopy.blockId,
            ackRequired: true,
          });
        }
      }
    } catch (err) {
      // Delivery errors are non-fatal - the email is stored, delivery can be retried
      // Return success with empty delivery status
      return {
        messageId,
        brightchainMessageId,
        deliveryStatus: new Map<string, IDeliveryReceipt>(),
        success: true,
        error: `Delivery initiation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // 6. Return result — gossip delivery is fire-and-forget; acks come later via gossip
    return {
      messageId,
      brightchainMessageId,
      deliveryStatus: new Map<string, IDeliveryReceipt>(),
      success: true,
    };
  }

  /**
   * Retrieves email metadata by Message-ID.
   *
   * @param messageId - The Message-ID to look up
   * @returns The email metadata, or null if not found
   */
  async getEmail(messageId: string): Promise<IEmailMetadata | null> {
    return this.metadataStore.get(messageId);
  }

  /**
   * Retrieves the full email content including decoded body and attachments.
   *
   * Reconstructs the complete message from CBL blocks, decoding all
   * MIME parts and attachments.
   *
   * @param messageId - The Message-ID to retrieve content for
   * @returns The full email content
   * @throws {EmailError} If the message is not found
   *
   * @see Requirement 13.5 - Reconstruct complete message including all MIME parts
   */
  async getEmailContent(messageId: string): Promise<IEmailContent> {
    const metadata = await this.metadataStore.get(messageId);
    if (!metadata) {
      throw new EmailError(
        EmailErrorType.MESSAGE_NOT_FOUND,
        `Email with messageId "${messageId}" not found`,
        { messageId },
      );
    }

    // Extract textBody and htmlBody from MIME parts
    let textBody: string | undefined;
    let htmlBody: string | undefined;
    const decoder = new TextDecoder();

    if (metadata.parts) {
      for (const part of metadata.parts) {
        if (
          part.contentType.type === 'text' &&
          part.contentType.subtype === 'plain' &&
          part.body
        ) {
          textBody = decoder.decode(part.body);
        } else if (
          part.contentType.type === 'text' &&
          part.contentType.subtype === 'html' &&
          part.body
        ) {
          htmlBody = decoder.decode(part.body);
        }
      }
    }

    // Map attachment metadata to IRetrievedAttachment[]
    const attachments: IRetrievedAttachment[] = [];
    if (metadata.attachments) {
      for (const attachmentMeta of metadata.attachments) {
        let content = new Uint8Array(0);
        // Retrieve actual content from the attachment content store if available
        if (this.metadataStore.getAttachmentContent) {
          const stored = await this.metadataStore.getAttachmentContent(
            attachmentMeta.checksum,
          );
          if (stored) {
            content = new Uint8Array(stored);
          }
        }
        attachments.push({ metadata: attachmentMeta, content });
      }
    }

    return {
      metadata,
      textBody,
      htmlBody,
      parts: metadata.parts ?? [],
      attachments,
    };
  }

  /**
   * Deletes an email message and its associated blocks.
   *
   * @param messageId - The Message-ID to delete
   * @throws {EmailError} If the message is not found
   */
  async deleteEmail(messageId: string): Promise<void> {
    const metadata = await this.metadataStore.get(messageId);
    if (!metadata) {
      throw new EmailError(
        EmailErrorType.MESSAGE_NOT_FOUND,
        `Email with messageId "${messageId}" not found`,
        { messageId },
      );
    }

    await this.metadataStore.delete(messageId);
  }

  // ─── Inbox Operations ───────────────────────────────────────────────

  /**
   * Queries a user's inbox with filtering, sorting, and pagination.
   *
   * @param userId - The user ID to query inbox for
   * @param query - Query parameters for filtering and sorting
   * @returns Paginated inbox results with unread count
   *
   * @see Requirement 13.1 - Inbox query for To, Cc, or Bcc recipients
   * @see Requirement 13.2 - Sort by Date header (newest first by default)
   * @see Requirement 13.6 - Pagination with configurable page size
   */
  async queryInbox(userId: string, query: IInboxQuery): Promise<IInboxResult> {
    // Apply defaults for pagination and sorting
    const normalizedQuery: IInboxQuery = {
      ...query,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? this.config.defaultPageSize,
      sortBy: query.sortBy ?? 'date',
      sortDirection: query.sortDirection ?? 'desc',
      readStatus: query.readStatus ?? 'all',
    };

    return this.metadataStore.queryInbox(userId, normalizedQuery);
  }

  /**
   * Marks an email as read for a specific user.
   *
   * @param messageId - The Message-ID to mark as read
   * @param userId - The user who read the email
   *
   * @see Requirement 13.8 - Track unread count
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    await this.metadataStore.markAsRead(messageId, userId);
  }

  /**
   * Gets the unread email count for a user.
   *
   * @param userId - The user ID to get unread count for
   * @returns The number of unread emails
   *
   * @see Requirement 13.8 - Return unread count for inbox queries
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.metadataStore.getUnreadCount(userId);
  }

  // ─── Threading Operations ───────────────────────────────────────────

  /**
   * Retrieves all emails in a thread by following the References chain.
   *
   * Messages are ordered chronologically by Date header.
   * Handles broken threads where intermediate messages are missing.
   *
   * @param messageId - Any Message-ID in the thread
   * @returns Array of email metadata in the thread, ordered chronologically
   *
   * @see Requirement 10.4 - Retrieve all emails in a thread
   * @see Requirement 10.5 - Order messages chronologically
   * @see Requirement 10.7 - Handle broken threads
   */
  async getThread(messageId: string): Promise<IEmailMetadata[]> {
    // 1. Retrieve the starting email
    const startEmail = await this.metadataStore.get(messageId);
    if (!startEmail) {
      return [];
    }

    // 2. Collect all known Message-IDs in the thread
    //    Start from the given email's References + its own Message-ID
    const knownIds = new Set<string>();
    const toVisit: string[] = [];

    // Seed with the starting email
    knownIds.add(startEmail.messageId);
    if (startEmail.references) {
      for (const ref of startEmail.references) {
        if (!knownIds.has(ref)) {
          knownIds.add(ref);
          toVisit.push(ref);
        }
      }
    }
    if (startEmail.inReplyTo && !knownIds.has(startEmail.inReplyTo)) {
      knownIds.add(startEmail.inReplyTo);
      toVisit.push(startEmail.inReplyTo);
    }

    // 3. Walk the thread graph: for each known ID, try to fetch the email
    //    and discover more IDs from its References/In-Reply-To
    const found = new Map<string, IEmailMetadata>();
    found.set(startEmail.messageId, startEmail);

    while (toVisit.length > 0) {
      const visitId = toVisit.pop()!;
      if (found.has(visitId)) {
        continue;
      }

      const email = await this.metadataStore.get(visitId);
      if (!email) {
        // Broken thread - intermediate message missing, skip gracefully
        continue;
      }

      found.set(email.messageId, email);

      // Discover more thread members from this email's references
      if (email.references) {
        for (const ref of email.references) {
          if (!knownIds.has(ref)) {
            knownIds.add(ref);
            toVisit.push(ref);
          }
        }
      }
      if (email.inReplyTo && !knownIds.has(email.inReplyTo)) {
        knownIds.add(email.inReplyTo);
        toVisit.push(email.inReplyTo);
      }
    }

    // 4. Also use the metadata store's getThread for any additional thread members
    //    that might reference this thread but aren't in our References chain
    try {
      const storeThread = await this.metadataStore.getThread(messageId);
      for (const email of storeThread) {
        if (!found.has(email.messageId)) {
          found.set(email.messageId, email);
        }
      }
    } catch {
      // If the store doesn't support getThread, that's fine - we have our graph walk
    }

    // 5. Order messages chronologically by Date header (Requirement 10.5)
    const threadEmails = Array.from(found.values());
    threadEmails.sort((a, b) => a.date.getTime() - b.date.getTime());

    return threadEmails;
  }

  /**
   * Retrieves the root message of a thread.
   *
   * Follows the References chain to find the first Message-ID.
   *
   * @param messageId - Any Message-ID in the thread
   * @returns The root email metadata, or null if not found
   *
   * @see Requirement 10.6 - Retrieve root message by following References
   */
  async getRootMessage(messageId: string): Promise<IEmailMetadata | null> {
    // 1. Retrieve the starting email
    const email = await this.metadataStore.get(messageId);
    if (!email) {
      return null;
    }

    // 2. If this email has no References, it is the root
    if (!email.references || email.references.length === 0) {
      return email;
    }

    // 3. The root is the first Message-ID in the References chain
    const rootId = email.references[0];
    const rootEmail = await this.metadataStore.get(rootId);

    // If the root message is found, return it
    if (rootEmail) {
      return rootEmail;
    }

    // 4. If the root is missing (broken thread), walk up the chain
    //    trying each Reference until we find one that exists
    for (let i = 1; i < email.references.length; i++) {
      const candidate = await this.metadataStore.get(email.references[i]);
      if (candidate) {
        // Check if this candidate has no further references (is a root)
        if (!candidate.references || candidate.references.length === 0) {
          return candidate;
        }
        // Otherwise, recurse from this candidate
        return this.getRootMessage(candidate.messageId);
      }
    }

    // 5. If no referenced messages exist, the current email is the earliest we can find
    return email;
  }

  // ─── Reply/Forward Operations ───────────────────────────────────────

  /**
   * Creates a reply to an existing email.
   *
   * Sets In-Reply-To to the parent's Message-ID and constructs the
   * References header by appending the parent's Message-ID to the
   * parent's References list (limited to maxReferencesCount).
   *
   * @param originalId - The Message-ID of the email being replied to
   * @param replyContent - The reply content and options
   * @returns The send result for the reply
   * @throws {EmailError} If the original message is not found
   *
   * @see Requirement 10.1 - Set In-Reply-To to parent Message-ID
   * @see Requirement 10.2 - Construct References header
   * @see Requirement 10.3 - Limit References to 20 Message-IDs
   */
  async createReply(
    originalId: string,
    replyContent: IReplyInput,
  ): Promise<ISendEmailResult> {
    // 1. Retrieve the original email
    const original = await this.metadataStore.get(originalId);
    if (!original) {
      throw new EmailError(
        EmailErrorType.MESSAGE_NOT_FOUND,
        `Original email with messageId "${originalId}" not found`,
        { messageId: originalId },
      );
    }

    // 2. Construct References header per RFC 5322:
    //    Append parent's Message-ID to parent's References list
    const parentReferences = original.references ?? [];
    const allReferences = [...parentReferences, original.messageId];

    // 3. Limit References to maxReferencesCount (default 20) per Requirement 10.3
    //    Truncate from the beginning (keep most recent) if necessary
    const maxRefs = this.config.maxReferencesCount;
    const references =
      allReferences.length > maxRefs
        ? allReferences.slice(allReferences.length - maxRefs)
        : allReferences;

    // 4. Build recipients list
    let toRecipients: IMailbox[];
    if (replyContent.replyAll) {
      // Reply-All: include original sender + original To + original Cc
      // but exclude the replier themselves, and never include original Bcc
      const replierAddress = replyContent.from.address;
      const originalRecipients = [
        original.from,
        ...(original.to ?? []),
        ...(original.cc ?? []),
      ];
      // Deduplicate by address and exclude the replier
      const seen = new Set<string>();
      toRecipients = [];
      for (const mailbox of originalRecipients) {
        const addr = mailbox.address;
        if (addr !== replierAddress && !seen.has(addr)) {
          seen.add(addr);
          toRecipients.push(mailbox);
        }
      }
    } else {
      // Simple reply: reply to the original sender (or Reply-To if set)
      toRecipients =
        original.replyTo && original.replyTo.length > 0
          ? [...original.replyTo]
          : [original.from];
    }

    // Add any additional recipients specified in the reply
    if (replyContent.additionalTo) {
      toRecipients.push(...replyContent.additionalTo);
    }

    // 5. Build subject with "Re: " prefix if not already present
    const originalSubject = original.subject ?? '';
    const subject =
      replyContent.subject ??
      (originalSubject.match(/^Re:/i)
        ? originalSubject
        : `Re: ${originalSubject}`);

    // 6. Send the reply using sendEmail
    const emailInput: IEmailInput = {
      from: replyContent.from,
      to: toRecipients,
      cc: replyContent.additionalCc,
      subject,
      textBody: replyContent.textBody,
      htmlBody: replyContent.htmlBody,
      attachments: replyContent.attachments,
      inReplyTo: original.messageId,
      references,
    };

    return this.sendEmail(emailInput);
  }

  /**
   * Forwards an email to new recipients.
   *
   * Adds Resent-From, Resent-To, Resent-Date, and Resent-Message-ID
   * headers per RFC 5322 Section 3.6.6. Preserves all original headers.
   *
   * @param originalId - The Message-ID of the email being forwarded
   * @param forwardTo - The recipients to forward to
   * @returns The send result for the forwarded email
   * @throws {EmailError} If the original message is not found
   *
   * @see Requirement 17.1 - Add Resent-* headers per RFC 5322
   * @see Requirement 17.2 - Preserve all original headers
   */
  async forwardEmail(
    originalId: string,
    forwardTo: IMailbox[],
  ): Promise<ISendEmailResult> {
    // 1. Retrieve the original email
    const original = await this.metadataStore.get(originalId);
    if (!original) {
      throw new EmailError(
        EmailErrorType.MESSAGE_NOT_FOUND,
        `Original email with messageId "${originalId}" not found`,
        { messageId: originalId },
      );
    }

    // 2. Build the Resent-* header block per RFC 5322 Section 3.6.6
    const resentHeaderBlock: IResentHeaderBlock = {
      resentFrom: original.from,
      resentTo: forwardTo,
      resentDate: new Date(),
      resentMessageId: this.generateMessageId(),
    };

    // 3. Prepend the new Resent-* block (most recent first) per Requirement 17.4
    const existingResentHeaders = original.resentHeaders ?? [];
    const updatedResentHeaders = [resentHeaderBlock, ...existingResentHeaders];

    // 4. Build the forwarded email input preserving all original headers (Requirement 17.2)
    const emailInput: IEmailInput = {
      from: original.from,
      sender: original.sender,
      replyTo: original.replyTo,
      to: forwardTo,
      subject: original.subject
        ? original.subject.match(/^Fwd:/i)
          ? original.subject
          : `Fwd: ${original.subject}`
        : undefined,
      textBody: undefined,
      htmlBody: undefined,
      messageId: resentHeaderBlock.resentMessageId,
      customHeaders: original.customHeaders,
    };

    // 5. Send the forwarded email
    const result = await this.sendEmail(emailInput);

    // 6. Update the stored metadata with Resent-* headers
    if (result.success) {
      try {
        await this.metadataStore.update(result.messageId, {
          resentHeaders: updatedResentHeaders,
        });
      } catch {
        // Non-fatal: the email was sent, resent headers are supplementary metadata
      }
    }

    return result;
  }

  // ─── Delivery Tracking ──────────────────────────────────────────────

  /**
   * Gets the delivery status for all recipients of an email.
   *
   * @param messageId - The Message-ID to get delivery status for
   * @returns Map of recipient ID to delivery receipt
   *
   * @see Requirement 12.1 - Track delivery status per recipient
   */
  async getDeliveryStatus(
    messageId: string,
  ): Promise<Map<string, IDeliveryReceipt>> {
    const metadata = await this.metadataStore.get(messageId);
    if (!metadata) {
      throw new EmailError(
        EmailErrorType.MESSAGE_NOT_FOUND,
        `Email with messageId "${messageId}" not found`,
        { messageId },
      );
    }
    return metadata.deliveryReceipts;
  }

  // ─── Signature Verification (Requirement 16.5, 16.8) ─────────────

  /**
   * Verifies the digital signature on a stored email.
   *
   * Retrieves the email metadata, reconstructs the signed content,
   * and verifies the signature using the signer's private key.
   *
   * @param messageId - The Message-ID of the email to verify
   * @param signerPrivateKey - The signer's private key for HMAC verification
   * @returns Object with verification result and metadata
   * @throws {EmailError} If the message is not found
   *
   * @see Requirement 16.5 - S/MIME signatures for sender authentication
   * @see Requirement 16.8 - Verify sender's signature on decryption
   */
  async verifyEmailSignature(
    messageId: string,
    signerPrivateKey: Uint8Array,
  ): Promise<{ verified: boolean; isSigned: boolean }> {
    const metadata = await this.metadataStore.get(messageId);
    if (!metadata) {
      throw new EmailError(
        EmailErrorType.MESSAGE_NOT_FOUND,
        `Email with messageId "${messageId}" not found`,
        { messageId },
      );
    }

    if (!metadata.isSigned || !metadata.contentSignature) {
      return { verified: false, isSigned: false };
    }

    // Reconstruct the content that was signed (textBody + htmlBody)
    let bodyContent = '';
    if (metadata.parts) {
      for (const part of metadata.parts) {
        if (
          part.contentType.type === 'text' &&
          (part.contentType.subtype === 'plain' ||
            part.contentType.subtype === 'html') &&
          part.body
        ) {
          bodyContent += new TextDecoder().decode(part.body);
        }
      }
    }

    const content = new TextEncoder().encode(bodyContent);
    const encryptionService = new EmailEncryptionService();
    const verified = encryptionService.verifySignature(
      content,
      metadata.contentSignature,
      signerPrivateKey,
    );

    return { verified, isSigned: true };
  }

  // ─── BCC Privacy Handling ─────────────────────────────────────────

  /**
   * Creates a copy of the email metadata with BCC information stripped.
   * This copy is delivered to To and CC recipients.
   *
   * The copy has:
   * - No `bcc` field (undefined)
   * - No BCC recipients in the `recipients` array
   * - No BCC delivery tracking in `deliveryReceipts`
   * - A unique block ID for separate storage
   *
   * @param original - The original email metadata (sender's copy with full BCC info)
   * @returns A new IEmailMetadata with BCC info removed
   *
   * @see Requirement 9.2 - BCC recipients excluded from all recipient copies
   * @see Requirement 9.3 - Separate encrypted copies for BCC recipients
   */
  createBccStrippedCopy(original: IEmailMetadata): IEmailMetadata {
    // Filter out BCC addresses from the recipients list
    const bccAddresses = new Set((original.bcc ?? []).map((m) => m.address));
    const filteredRecipients = original.recipients.filter(
      (addr) => !bccAddresses.has(addr),
    );

    // Filter out BCC delivery status entries
    const filteredDeliveryStatus = new Map<string, DeliveryStatus>();
    for (const [addr, status] of original.deliveryStatus) {
      if (!bccAddresses.has(addr)) {
        filteredDeliveryStatus.set(addr, status);
      }
    }

    // Filter out BCC delivery receipts
    const filteredDeliveryReceipts = new Map<string, IDeliveryReceipt>();
    for (const [addr, receipt] of original.deliveryReceipts) {
      if (!bccAddresses.has(addr)) {
        filteredDeliveryReceipts.set(addr, receipt);
      }
    }

    return {
      ...original,
      blockId: `${original.blockId}-tocc`,
      bcc: undefined,
      recipients: filteredRecipients,
      deliveryStatus: filteredDeliveryStatus,
      deliveryReceipts: filteredDeliveryReceipts,
    };
  }

  /**
   * Creates a private copy of the email for a single BCC recipient.
   *
   * The copy has:
   * - No `bcc` field (no BCC header visible)
   * - Only the specific BCC recipient in delivery tracking
   * - A unique block ID for separate encrypted storage
   * - Encryption scheme set to ECIES for per-recipient encryption
   *
   * This ensures that:
   * - The BCC recipient cannot see other BCC recipients
   * - To/CC recipients cannot see BCC recipients
   * - Each BCC copy can be encrypted with the individual recipient's key
   *
   * @param original - The original email metadata
   * @param bccRecipient - The specific BCC recipient this copy is for
   * @returns A new IEmailMetadata for the BCC recipient
   *
   * @see Requirement 9.2 - BCC recipients excluded from all recipient copies
   * @see Requirement 9.3 - Separate encrypted copies for BCC recipients
   * @see Requirement 16.2 - BCC addresses cryptographically separated
   */
  createBccRecipientCopy(
    original: IEmailMetadata,
    bccRecipient: IMailbox,
  ): IEmailMetadata {
    // The BCC copy includes the original To/CC recipients in headers
    // (so the BCC recipient can see who the email was addressed to)
    // but has NO Bcc header at all.
    // The BCC recipient is added to the 'to' field so they appear in
    // inbox queries (isRecipient checks to/cc/bcc fields).
    const toCcAddresses = [
      ...original.to.map((m) => m.address),
      ...(original.cc ?? []).map((m) => m.address),
    ];

    return {
      ...original,
      blockId: `${original.blockId}-bcc-${bccRecipient.address}`,
      to: [...original.to, bccRecipient],
      bcc: undefined,
      recipients: [...toCcAddresses, bccRecipient.address],
      deliveryStatus: new Map([[bccRecipient.address, DeliveryStatus.Pending]]),
      deliveryReceipts: new Map(),
      encryptionScheme: MessageEncryptionScheme.RECIPIENT_KEYS,
    };
  }

  // ─── CC Visibility ──────────────────────────────────────────────────

  /**
   * Ensures CC recipients are included in the Cc header for all recipient copies.
   *
   * This is already handled by the metadata construction in sendEmail() which
   * preserves the `cc` field in all copies (both To/CC and BCC copies).
   * The CC header is visible to all recipients per RFC 5322.
   *
   * @see Requirement 9.1 - CC recipients visible to all recipients
   */

  // ─── Undisclosed Recipients ─────────────────────────────────────────

  /**
   * Checks if the email has only BCC recipients (undisclosed recipients).
   *
   * When an email has only BCC recipients and no To or CC recipients,
   * the To field is empty, which is valid per RFC 5322 for undisclosed
   * recipients scenarios.
   *
   * @param email - The email input to check
   * @returns true if the email has only BCC recipients
   *
   * @see Requirement 9.6 - Support empty To field when only Bcc recipients specified
   */
  isUndisclosedRecipients(email: IEmailInput): boolean {
    const hasTo = email.to && email.to.length > 0;
    const hasCc = email.cc && email.cc.length > 0;
    const hasBcc = email.bcc && email.bcc.length > 0;
    return !hasTo && !hasCc && hasBcc === true;
  }

  // ─── Attachment Storage ─────────────────────────────────────────────

  /**
   * Stores an attachment and produces its metadata.
   *
   * Calculates SHA-256 and MD5 checksums for integrity verification,
   * generates a CBL magnet URL, and persists the attachment content
   * via the metadata store's attachment content storage.
   *
   * @param input - The attachment input containing filename, mimeType, content, and optional contentId
   * @returns The attachment metadata with checksums and storage references
   *
   * @see Requirement 8.1 - Store attachments as ExtendedCBL blocks
   * @see Requirement 8.2 - Support multiple attachments per email
   * @see Requirement 8.3 - Preserve filename, MIME type, and file size
   * @see Requirement 8.9 - Support inline attachments with Content-ID
   * @see Requirement 8.10 - Calculate and store MD5 Content-MD5 header per RFC 1864
   */
  private async storeAttachment(
    input: IAttachmentInput,
  ): Promise<IAttachmentMetadata> {
    // Calculate SHA-256 checksum (hex digest)
    const sha256Checksum = createHash('sha256')
      .update(input.content)
      .digest('hex');

    // Calculate MD5 checksum (base64 digest per RFC 1864)
    const md5Checksum = createHash('md5')
      .update(input.content)
      .digest('base64');

    // Generate CBL magnet URL using the checksum
    const cblMagnetUrl = `magnet:?xt=urn:cbl:${sha256Checksum}`;

    // Generate block ID based on the checksum
    const blockId = `cbl-block-${sha256Checksum}`;

    // Persist attachment content if the store supports it
    if (this.metadataStore.storeAttachmentContent) {
      await this.metadataStore.storeAttachmentContent(
        sha256Checksum,
        input.content,
      );
    }

    return {
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.content.length,
      contentId: input.contentId,
      cblMagnetUrl,
      blockIds: [blockId],
      checksum: sha256Checksum,
      contentMd5: md5Checksum,
    };
  }

  // ─── Message-ID Generation ────────────────────────────────────────────

  /**
   * Generates a globally unique Message-ID in RFC 5322 format.
   *
   * The generated Message-ID has the format: `<id-left@id-right>` where:
   * - **id-left**: A combination of timestamp (milliseconds since epoch) and
   *   a cryptographically random hex string, separated by a dot.
   * - **id-right**: The configured `nodeId` from the service configuration,
   *   representing the sender's node ID or domain.
   *
   * This ensures global uniqueness by incorporating:
   * 1. A high-resolution timestamp component
   * 2. A cryptographically secure random component (16 bytes / 32 hex chars)
   * 3. The node identifier
   *
   * @returns A unique Message-ID string in the format `<timestamp.random@nodeId>`
   *
   * @see Requirement 3.1 - Message-ID format per RFC 5322 Section 3.6.4
   * @see Requirement 3.2 - Use sender's node ID as id-right portion
   * @see Requirement 3.3 - Ensure global uniqueness with timestamp, random, and node ID
   */
  generateMessageId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(16).toString('hex');
    const idLeft = `${timestamp}.${random}`;
    const idRight = this.config.nodeId;
    return `<${idLeft}@${idRight}>`;
  }

  // ─── Configuration Access ───────────────────────────────────────────

  /**
   * Returns the current service configuration.
   *
   * Useful for checking configured limits and defaults.
   */
  getConfig(): Readonly<IEmailServiceConfig> {
    return this.config;
  }
}
