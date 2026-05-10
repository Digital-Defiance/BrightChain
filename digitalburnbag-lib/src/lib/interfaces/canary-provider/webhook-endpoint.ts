import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Signature verification method for webhook endpoints.
 * Determines how inbound webhook payloads are authenticated.
 *
 * - 'hmac_sha256': HMAC-SHA256 signature (GitHub, Stripe)
 * - 'hmac_sha1': HMAC-SHA1 signature (legacy services)
 * - 'ed25519': Ed25519 signature (modern services)
 * - 'custom_header': Custom header-based verification
 */
export type WebhookSignatureMethod =
  | 'hmac_sha256'
  | 'hmac_sha1'
  | 'ed25519'
  | 'custom_header';

/**
 * Delivery statistics for a webhook endpoint.
 * Tracks the total number of received payloads, successful processing,
 * and failed validation attempts.
 */
export interface IWebhookDeliveryStats {
  /** Total number of webhook payloads received */
  totalReceived: number;
  /** Number of payloads successfully processed */
  successfullyProcessed: number;
  /** Number of payloads that failed signature validation */
  failedValidation: number;
  /** Timestamp of the last received webhook payload */
  lastReceivedAt?: Date | string;
  /** Timestamp of the last successfully processed webhook payload */
  lastSuccessAt?: Date | string;
}

/**
 * Webhook endpoint interface that represents a unique HTTPS endpoint
 * generated per provider connection for receiving inbound heartbeat data
 * from push-based APIs.
 *
 * Each endpoint has its own cryptographically random secret, signature
 * verification method, optional IP allowlist, rate limiting, and delivery
 * statistics tracking.
 */
export interface IWebhookEndpointBase<TID extends PlatformID = string> {
  /** Unique identifier for this webhook endpoint */
  id: TID;
  /** Provider connection this endpoint serves */
  connectionId: TID;
  /** User who owns this endpoint */
  userId: TID;
  /** Provider ID for signature verification method lookup */
  providerId: string;
  /** The generated webhook URL path segment (connectionId/secret) */
  urlPath: string;
  /** Current active secret (hex-encoded, 32 bytes) */
  secret: string;
  /** Previous secret during rotation grace period */
  previousSecret?: string;
  /** When the previous secret expires */
  previousSecretExpiresAt?: Date | string;
  /** Signature verification method */
  signatureMethod: WebhookSignatureMethod;
  /** Custom signature header name (if not standard) */
  signatureHeader?: string;
  /** IP allowlist (CIDR ranges) */
  ipAllowlist?: string[];
  /** Whether this endpoint is currently active */
  isActive: boolean;
  /** Delivery statistics */
  stats: IWebhookDeliveryStats;
  /** Consecutive failed signature validations */
  consecutiveSignatureFailures: number;
  /** Whether endpoint is temporarily disabled due to failures */
  isDisabledByFailures: boolean;
  /** Rate limit: max requests per minute */
  rateLimitPerMinute: number;
  /** Timeout period: ms without webhook before CHECK_FAILED */
  timeoutMs: number;
  /** Last received timestamp */
  lastReceivedAt?: Date | string;
  /** When this endpoint was created */
  createdAt: Date | string;
  /** When this endpoint was last updated */
  updatedAt: Date | string;
}
