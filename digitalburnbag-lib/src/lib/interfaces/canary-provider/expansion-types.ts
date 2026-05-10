import {
  HeartbeatSignalType,
  IProviderAuthConfig,
  ProviderCategory,
} from './canary-provider-adapter';
import { RedundancyPolicy } from './multi-canary-binding';

/**
 * Filters for querying the provider catalog.
 * Used by the ProviderCatalogService to narrow down available providers
 * based on category, authentication type, webhook support, or search text.
 */
export interface IProviderCatalogFilters {
  /** Filter by provider category */
  category?: ProviderCategory;
  /** Filter by authentication type */
  authType?: IProviderAuthConfig['type'];
  /** Filter to only providers that support webhooks */
  supportsWebhooks?: boolean;
  /** Free-text search query against provider name/description */
  searchQuery?: string;
}

/**
 * Result of evaluating a multi-canary binding's redundancy policy.
 * Produced by the MultiCanaryBindingService when determining whether
 * the aggregate provider signals meet the threshold for triggering
 * a protocol action.
 */
export interface IRedundancyEvaluationResult {
  /** The binding that was evaluated */
  bindingId: string;
  /** Whether the redundancy threshold has been met and protocol action should trigger */
  shouldTrigger: boolean;
  /** The redundancy policy that was applied */
  policy: RedundancyPolicy;
  /** Current signal status for each provider connection (connectionId → signal) */
  providerStatuses: Record<string, HeartbeatSignalType>;
  /** Number of providers currently reporting ABSENCE */
  absenceCount: number;
  /** Total number of active providers in the binding */
  totalActive: number;
  /** Weighted score (only present for weighted_consensus policy, 0–100) */
  weightedScore?: number;
}

/**
 * Report of the impact when a provider is removed from all bindings.
 * Returned by MultiCanaryBindingService.removeProviderFromBindings()
 * to inform the caller which bindings were affected and whether any
 * have fallen below the minimum provider count (2).
 */
export interface IBindingImpactReport {
  /** IDs of all bindings that contained the removed provider */
  affectedBindings: string[];
  /** IDs of bindings now below the minimum provider count (2) */
  bindingsReducedBelowMinimum: string[];
  /** IDs of bindings that still meet the minimum provider count */
  bindingsStillValid: string[];
}

/**
 * Result of processing an inbound webhook payload.
 * Returned by the WebhookEndpointService after validating and
 * extracting a heartbeat signal from a webhook delivery.
 */
export interface IWebhookProcessResult {
  /** Whether the webhook was successfully validated and processed */
  success: boolean;
  /** The heartbeat signal extracted from the webhook payload (if successful) */
  signal?: HeartbeatSignalType;
  /** Error message if processing failed */
  error?: string;
  /** Time taken to process the webhook in milliseconds */
  processingTimeMs: number;
}
