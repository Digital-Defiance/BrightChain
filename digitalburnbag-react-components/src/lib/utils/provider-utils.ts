/**
 * Pure utility functions for the Canary Provider System.
 * These are extracted from React components for testability.
 */

import {
  HeartbeatSignalType,
  ICanaryProviderConfig,
  ProviderCategory,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  IApiProviderConnectionDTO,
  IApiProviderConnectionsSummaryDTO,
} from '../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Property 3: Dashboard health summary computation
// ---------------------------------------------------------------------------

export interface IHealthSummaryInput {
  status: string;
  lastCheckResult?: 'presence' | 'absence' | 'duress' | 'error';
}

/**
 * Compute aggregate health summary from a set of provider connections.
 * - total = number of connections
 * - healthy = connections with status "connected" and lastCheckResult "presence"
 * - needsAttention = connections with status "error", "expired", or "paused"
 * - overallStatus: critical if healthy=0 and total>0, degraded if needsAttention>0, healthy otherwise
 */
export function computeHealthSummary(
  connections: IHealthSummaryInput[],
): IApiProviderConnectionsSummaryDTO {
  const total = connections.length;
  const healthy = connections.filter(
    (c) => c.status === 'connected' && c.lastCheckResult === 'presence',
  ).length;
  const needsAttention = connections.filter(
    (c) =>
      c.status === 'error' || c.status === 'expired' || c.status === 'paused',
  ).length;

  let overallStatus: IApiProviderConnectionsSummaryDTO['overallStatus'];
  if (total === 0) {
    overallStatus = 'none';
  } else if (healthy === 0) {
    overallStatus = 'critical';
  } else if (needsAttention > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  return {
    connectedCount: total,
    healthyCount: healthy,
    needsAttentionCount: needsAttention,
    overallStatus,
  };
}

// ---------------------------------------------------------------------------
// Property 4: Provider card data mapping
// ---------------------------------------------------------------------------

export interface IProviderCardData {
  providerName: string;
  status: string;
  lastCheckTime: string | undefined;
  lastCheckSignalType: string | undefined;
  timeSinceLastActivity: string | undefined;
}

/**
 * Map a provider connection DTO to the required card display fields.
 */
export function mapConnectionToCardData(
  connection: IApiProviderConnectionDTO,
): IProviderCardData {
  return {
    providerName:
      connection.providerDisplayName ||
      connection.providerUsername ||
      connection.providerId,
    status: connection.status,
    lastCheckTime: connection.lastCheckedAt,
    lastCheckSignalType: connection.lastCheckResult,
    timeSinceLastActivity: connection.lastCheckedAt,
  };
}

// ---------------------------------------------------------------------------
// Property 10: Binding creation validation
// ---------------------------------------------------------------------------

/**
 * Validate that a provider connection status allows binding creation.
 * Only "connected" status is allowed.
 */
export function canCreateBinding(status: string): boolean {
  return status === 'connected';
}

// ---------------------------------------------------------------------------
// Property 1: Provider grouping by category
// ---------------------------------------------------------------------------

export interface IGroupedProviders<TID extends PlatformID = string> {
  category: ProviderCategory;
  providers: ICanaryProviderConfig<TID>[];
}

/**
 * Group provider configs by their category.
 * Every provider appears exactly once in the matching category group.
 */
export function groupProvidersByCategory<TID extends PlatformID = string>(
  configs: ICanaryProviderConfig<TID>[],
): IGroupedProviders<TID>[] {
  const map = new Map<ProviderCategory, ICanaryProviderConfig<TID>[]>();
  for (const config of configs) {
    const list = map.get(config.category) ?? [];
    list.push(config);
    map.set(config.category, list);
  }
  return Array.from(map.entries()).map(([category, providers]) => ({
    category,
    providers,
  }));
}

// ---------------------------------------------------------------------------
// Property 2: Webhook URL and secret generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique webhook URL and non-empty secret.
 */
export function generateWebhookSetup(baseUrl: string): {
  webhookUrl: string;
  webhookSecret: string;
} {
  const id = crypto.randomUUID();
  const secretBytes = new Uint8Array(32);
  crypto.getRandomValues(secretBytes);
  const webhookSecret = Array.from(secretBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return {
    webhookUrl: `${baseUrl}/webhooks/${id}`,
    webhookSecret,
  };
}

// ---------------------------------------------------------------------------
// Signal type display helpers
// ---------------------------------------------------------------------------

export function getSignalTypeColor(
  signalType?: string,
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (signalType) {
    case 'presence':
    case HeartbeatSignalType.PRESENCE:
      return 'success';
    case 'absence':
    case HeartbeatSignalType.ABSENCE:
      return 'warning';
    case 'duress':
    case HeartbeatSignalType.DURESS:
      return 'error';
    case 'error':
    case 'check_failed':
    case HeartbeatSignalType.CHECK_FAILED:
      return 'info';
    default:
      return 'default';
  }
}

export function getSignalTypeLabel(signalType?: string): string {
  switch (signalType) {
    case 'presence':
      return 'Presence';
    case 'absence':
      return 'Absence';
    case 'duress':
      return 'Duress';
    case 'error':
    case 'check_failed':
      return 'Check Failed';
    default:
      return 'Unknown';
  }
}
