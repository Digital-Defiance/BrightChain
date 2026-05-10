import { PlatformID } from '@digitaldefiance/ecies-lib';
import type {
  IWebhookEndpointBase,
  IWebhookDeliveryStats,
} from '../canary-provider/webhook-endpoint';
import type { IWebhookProcessResult } from '../canary-provider/expansion-types';

/**
 * Service interface for managing webhook endpoint lifecycle,
 * signature verification, and delivery tracking.
 *
 * Generates unique HTTPS endpoints for push-based providers,
 * with signature verification, rate limiting, and secret rotation.
 */
export interface IWebhookEndpointService<TID extends PlatformID = string> {
  /** Create a webhook endpoint for a provider connection */
  createEndpoint(
    connectionId: TID,
    providerId: string,
    userId: TID,
  ): Promise<IWebhookEndpointBase<TID>>;

  /** Get the full webhook URL for an endpoint */
  getWebhookUrl(endpointId: TID): string;

  /** Validate and process an inbound webhook payload */
  processWebhook(
    connectionId: TID,
    secret: string,
    headers: Record<string, string>,
    body: Buffer,
    sourceIp: string,
  ): Promise<IWebhookProcessResult>;

  /** Rotate the webhook secret (with grace period) */
  rotateSecret(
    endpointId: TID,
    gracePeriodMs?: number,
  ): Promise<{ newSecret: string }>;

  /** Get delivery stats for an endpoint */
  getDeliveryStats(endpointId: TID): Promise<IWebhookDeliveryStats>;

  /** Update IP allowlist */
  updateIpAllowlist(endpointId: TID, cidrs: string[]): Promise<void>;

  /** Check for timed-out endpoints and emit CHECK_FAILED */
  checkTimeouts(): Promise<void>;

  /** Disable endpoint (e.g., after consecutive signature failures) */
  disableEndpoint(endpointId: TID, reason: string): Promise<void>;

  /** Re-enable a disabled endpoint */
  enableEndpoint(endpointId: TID): Promise<void>;

  /** Send test webhook payload */
  sendTestWebhook(endpointId: TID): Promise<IWebhookProcessResult>;
}
