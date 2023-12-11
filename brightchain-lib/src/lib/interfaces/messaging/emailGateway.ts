/**
 * Email Gateway shared interfaces for bridging BrightChain internal messaging
 * with external SMTP email via Postfix.
 *
 * These interfaces use generic `<TID>` type parameters per workspace conventions:
 * - Frontend consumers use `string` (the default)
 * - Backend consumers use `GuidV4Buffer` or other platform-specific ID types
 *
 * @see Requirements 11.1, 11.4, 5.1, 7.2, 6.4
 * @module emailGateway
 */

import type { PlatformID } from '@digitaldefiance/ecies-lib';

import { OutboundDeliveryStatus } from '../../enumerations/messaging/outboundDeliveryStatus';
import { SpamClassification } from '../../enumerations/messaging/spamClassification';

/**
 * An outbound email message queued for external SMTP delivery via the Email Gateway.
 *
 * Represents a message in the outbound queue with all metadata needed for
 * delivery tracking, retry logic, and size enforcement.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility.
 *   Defaults to `string` for backward compatibility.
 *
 * @see Requirements 11.1, 11.4, 9.1
 */
export interface IOutboundEmailMessage<TID extends PlatformID = string> {
  /** Unique identifier for this outbound message */
  messageId: TID;

  /** Sender email address (RFC 5322 From) */
  from: string;

  /** Recipient email addresses */
  to: string[];

  /** Email subject line */
  subject: string;

  /** Optional raw RFC 5322 message content for direct delivery */
  rawRfc5322?: string;

  /** Number of delivery attempts made so far */
  retryCount: number;

  /** Timestamp of the next scheduled delivery attempt */
  nextAttemptAt: Date;

  /** Current delivery status */
  status: OutboundDeliveryStatus;

  /** Timestamp when the message was enqueued */
  enqueuedAt: Date;

  /** Maximum allowed message size in bytes */
  maxMessageSizeBytes: number;
}

/**
 * Status report for an outbound email delivery to a specific recipient.
 *
 * Tracks per-recipient delivery outcome including retry history and failure details.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility.
 *   Defaults to `string` for backward compatibility.
 *
 * @see Requirements 11.1, 5.1
 */
export interface IOutboundEmailStatus<TID extends PlatformID = string> {
  /** Identifier of the original outbound message */
  messageId: TID;

  /** Email address of the recipient */
  recipientAddress: string;

  /** Current delivery status for this recipient */
  status: OutboundDeliveryStatus;

  /** Number of delivery attempts made */
  retryCount: number;

  /** Timestamp of the most recent delivery attempt */
  lastAttemptAt?: Date;

  /** Human-readable reason for delivery failure, if applicable */
  failureReason?: string;
}

/**
 * Bounce notification generated when an outbound email cannot be delivered.
 *
 * Created by the BounceProcessor when a DSN (RFC 3464) is received for
 * a previously sent outbound message.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility.
 *   Defaults to `string` for backward compatibility.
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4
 */
export interface IBounceNotification<TID extends PlatformID = string> {
  /** Message-ID of the original outbound email that bounced */
  originalMessageId: TID;

  /** Email address of the recipient that bounced */
  recipientAddress: string;

  /** Type of bounce: permanent (5xx) or transient (4xx) */
  bounceType: 'permanent' | 'transient';

  /** Human-readable reason for the bounce */
  failureReason: string;

  /** Raw DSN message content (RFC 3464) */
  dsnMessage?: string;

  /** Timestamp when the bounce was received */
  timestamp: Date;
}

/**
 * Authentication result for a single email authentication mechanism
 * (SPF, DKIM, or DMARC).
 *
 * @see Requirements 6.4, 6.5
 */
export interface IEmailAuthenticationResult {
  /** SPF verification result */
  spf: {
    /** SPF check outcome */
    status:
      | 'pass'
      | 'fail'
      | 'softfail'
      | 'neutral'
      | 'none'
      | 'temperror'
      | 'permerror';
    /** Additional details about the SPF check */
    details?: string;
  };

  /** DKIM verification result */
  dkim: {
    /** DKIM check outcome */
    status: 'pass' | 'fail' | 'none' | 'temperror' | 'permerror';
    /** Additional details about the DKIM check */
    details?: string;
  };

  /** DMARC verification result */
  dmarc: {
    /** DMARC check outcome */
    status: 'pass' | 'fail' | 'none' | 'temperror' | 'permerror';
    /** Additional details about the DMARC check */
    details?: string;
  };
}

/**
 * Result of processing an inbound email received from an external sender.
 *
 * Contains metadata about the received message including spam classification
 * and authentication verification results.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility.
 *   Defaults to `string` for backward compatibility.
 *
 * @see Requirements 11.1, 7.2, 6.4
 */
export interface IInboundEmailResult<TID extends PlatformID = string> {
  /** Unique identifier assigned to the inbound message */
  messageId: TID;

  /** Email address of the external sender */
  sender: string;

  /** Email address of the local recipient */
  recipient: string;

  /** Spam classification determined by the anti-spam filter */
  spamClassification: SpamClassification;

  /** Numeric spam score from the anti-spam engine */
  spamScore: number;

  /** SPF/DKIM/DMARC authentication verification results */
  authenticationResults: IEmailAuthenticationResult;

  /** Timestamp when the message was received by the gateway */
  receivedAt: Date;
}

/**
 * Configurable score thresholds for spam classification.
 *
 * Messages are classified based on their spam score:
 * - score < probableSpamScore → Ham (legitimate)
 * - probableSpamScore ≤ score < definiteSpamScore → ProbableSpam (tagged, delivered to spam folder)
 * - score ≥ definiteSpamScore → DefiniteSpam (rejected at SMTP time)
 *
 * @see Requirements 7.2, 7.3, 7.4
 */
export interface ISpamThresholds {
  /** Score at or above which a message is classified as probable spam */
  probableSpamScore: number;

  /** Score at or above which a message is classified as definite spam and rejected */
  definiteSpamScore: number;
}

/**
 * Interface for the Recipient Lookup Service that validates whether an email
 * address corresponds to a registered BrightChain user.
 *
 * Postfix queries this service via the `socketmap` or `tcp_table` protocol
 * at SMTP time to reject mail for unknown users before accepting it,
 * preventing backscatter.
 *
 * The concrete TCP server implementation lives in `brightchain-api-lib`;
 * this interface is defined in `brightchain-lib` so both frontend and
 * backend consumers can reference the lookup contract.
 *
 * @see Requirements 13.7, 13.2, 13.3, 13.4, 13.5
 */
export interface IRecipientLookupService {
  /**
   * Look up whether the given email address corresponds to a registered
   * BrightChain user at the Canonical Domain.
   *
   * @param emailAddress - The full email address to validate (e.g. `alice@brightchain.org`)
   * @returns
   *   - `'OK'` when the address corresponds to a registered user (Req 13.3)
   *   - `'NOTFOUND'` when the address does not match any registered user (Req 13.4)
   *   - `'TEMP'` when the user registry is unreachable, signalling Postfix
   *     to respond with 451 so the sending server retries later (Req 13.5)
   */
  lookup(emailAddress: string): Promise<'OK' | 'NOTFOUND' | 'TEMP'>;
}
