import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  HeartbeatSignalType,
  IAbsenceDetectionConfig,
  ICanaryProviderAdapter,
  ICanaryProviderConfig,
  IDuressDetectionConfig,
  IHeartbeatCheckResult,
  IHeartbeatEvent,
  IProviderCredentials,
  ProviderCategory,
} from './canary-provider-adapter';

/**
 * Aggregated heartbeat status across multiple providers for a user.
 */
export interface IAggregatedHeartbeatStatus<TID extends PlatformID = string> {
  /** User ID */
  userId: TID;
  /** Timestamp of this aggregation */
  aggregatedAt: Date;

  /**
   * Overall signal type based on aggregation strategy.
   * - PRESENCE: At least one provider shows activity (user is alive)
   * - ABSENCE: All providers show no activity (dead man's switch)
   * - DURESS: Any provider detected a duress signal
   * - CHECK_FAILED: All providers failed to check
   * - INCONCLUSIVE: Mixed results, cannot determine
   */
  overallSignalType: HeartbeatSignalType;

  /** Overall alive determination (true if PRESENCE, false if ABSENCE) */
  isAlive?: boolean;

  /** Overall confidence (weighted average across providers) */
  overallConfidence: number;
  /** Results from each provider */
  providerResults: Map<TID, IHeartbeatCheckResult<TID>>;
  /** Most recent event across all providers */
  mostRecentEvent?: IHeartbeatEvent<TID>;
  /** Time since last activity (any provider) in milliseconds */
  timeSinceLastActivityMs?: number;
  /** Providers that failed to check */
  failedProviders: Array<{ providerId: TID; error: string }>;
  /** Providers that were skipped (e.g., rate limited) */
  skippedProviders: TID[];

  /**
   * Whether any provider detected a duress signal.
   * If true, duress protocols should be triggered immediately.
   */
  duressDetected: boolean;

  /**
   * Details about duress signals from all providers that detected them.
   */
  duressDetails: Array<{
    providerId: TID;
    type: string;
    event?: IHeartbeatEvent<TID>;
    context?: string;
  }>;

  /**
   * Providers that detected absence (no activity within threshold).
   */
  absenceProviders: TID[];

  /**
   * Providers that detected presence (activity found).
   */
  presenceProviders: TID[];
}

/**
 * Configuration for how to aggregate results across providers.
 */
export interface IAggregationConfig {
  /**
   * Strategy for determining overall alive status:
   * - 'any': Alive if ANY provider shows presence (most lenient)
   * - 'all': Alive only if ALL providers show presence (most strict)
   * - 'majority': Alive if majority of providers show presence
   * - 'weighted': Use weighted scoring based on provider/category weights
   */
  strategy: 'any' | 'all' | 'majority' | 'weighted';
  /** Minimum confidence threshold for a provider to count */
  minConfidenceThreshold: number;
  /** Weights per provider category (for weighted strategy) */
  categoryWeights?: Partial<Record<ProviderCategory, number>>;
  /** Specific provider weights (override category weights) */
  providerWeights?: Record<string, number>;
  /** Whether to consider a provider failure as "not alive" */
  failureCountsAsNotAlive: boolean;
  /** Maximum age of cached results to use (milliseconds) */
  maxCacheAgeMs: number;

  /**
   * Default absence detection config applied to all providers.
   * Individual provider configs can override.
   */
  defaultAbsenceConfig?: IAbsenceDetectionConfig;

  /**
   * Default duress detection config applied to all providers.
   * Individual provider configs can override.
   */
  defaultDuressConfig?: IDuressDetectionConfig;

  /**
   * How to handle duress signals:
   * - 'immediate': Trigger duress protocols as soon as any provider detects
   * - 'confirmed': Require multiple providers to detect before triggering
   * - 'manual': Log but don't auto-trigger (require manual confirmation)
   */
  duressHandling: 'immediate' | 'confirmed' | 'manual';

  /**
   * Number of providers that must detect duress for 'confirmed' mode.
   */
  duressConfirmationThreshold?: number;
}

/**
 * Scheduled check configuration for a user's provider.
 */
export interface IScheduledCheck<TID extends PlatformID = string> {
  /** User ID */
  userId: TID;
  /** Provider ID */
  providerId: TID;
  /** Next scheduled check time */
  nextCheckAt: Date;
  /** Check interval in milliseconds */
  intervalMs: number;
  /** Last check result */
  lastResult?: IHeartbeatCheckResult<TID>;
  /** Consecutive failure count */
  consecutiveFailures: number;
  /** Whether checks are paused (e.g., due to invalid credentials) */
  isPaused: boolean;
  /** Reason for pause */
  pauseReason?: string;
}

/**
 * Event emitted when a heartbeat status changes.
 */
export interface IHeartbeatStatusChangeEvent<TID extends PlatformID = string> {
  userId: TID;
  providerId: TID;
  previousStatus: 'alive' | 'absent' | 'unknown';
  newStatus: 'alive' | 'absent' | 'unknown';
  timestamp: Date;
  /** The check result that triggered this change */
  checkResult: IHeartbeatCheckResult<TID>;
  /** Time since last activity before this change */
  timeSinceLastActivityMs?: number;
}

/**
 * Listener for heartbeat status changes.
 */
export type HeartbeatStatusChangeListener<TID extends PlatformID = string> = (
  event: IHeartbeatStatusChangeEvent<TID>,
) => void | Promise<void>;

/**
 * The provider registry manages all canary providers and coordinates
 * heartbeat checking across them.
 */
export interface ICanaryProviderRegistry<TID extends PlatformID = string> {
  /**
   * Register a provider adapter.
   * @param adapter The provider adapter to register
   */
  registerProvider(adapter: ICanaryProviderAdapter<TID>): void;

  /**
   * Unregister a provider.
   * @param providerId The provider ID to unregister
   */
  unregisterProvider(providerId: TID): void;

  /**
   * Get a registered provider by ID.
   * @param providerId The provider ID
   */
  getProvider(providerId: TID): ICanaryProviderAdapter<TID> | undefined;

  /**
   * Get all registered providers.
   */
  getAllProviders(): ICanaryProviderAdapter<TID>[];

  /**
   * Get providers by category.
   * @param category The category to filter by
   */
  getProvidersByCategory(
    category: ProviderCategory,
  ): ICanaryProviderAdapter<TID>[];

  /**
   * Get all provider configurations (for UI display).
   */
  getProviderConfigs(): ICanaryProviderConfig<TID>[];

  /**
   * Check heartbeat for a specific user and provider.
   * @param userId User ID
   * @param providerId Provider ID
   * @param credentials User's credentials for this provider
   * @param since Start of time window
   * @param until End of time window
   */
  checkHeartbeat(
    userId: TID,
    providerId: TID,
    credentials: IProviderCredentials<TID>,
    since: Date,
    until?: Date,
  ): Promise<IHeartbeatCheckResult<TID>>;

  /**
   * Check heartbeat across all configured providers for a user.
   * @param userId User ID
   * @param credentialsMap Map of provider ID to credentials
   * @param since Start of time window
   * @param config Aggregation configuration
   */
  checkAllHeartbeats(
    userId: TID,
    credentialsMap: Map<TID, IProviderCredentials<TID>>,
    since: Date,
    config?: Partial<IAggregationConfig>,
  ): Promise<IAggregatedHeartbeatStatus<TID>>;

  /**
   * Schedule periodic heartbeat checks for a user.
   * @param userId User ID
   * @param providerId Provider ID
   * @param credentials User's credentials
   * @param intervalMs Check interval in milliseconds
   */
  scheduleChecks(
    userId: TID,
    providerId: TID,
    credentials: IProviderCredentials<TID>,
    intervalMs: number,
  ): void;

  /**
   * Cancel scheduled checks for a user/provider.
   * @param userId User ID
   * @param providerId Provider ID (if omitted, cancels all for user)
   */
  cancelScheduledChecks(userId: TID, providerId?: TID): void;

  /**
   * Get scheduled check status.
   * @param userId User ID
   * @param providerId Provider ID
   */
  getScheduledCheck(
    userId: TID,
    providerId: TID,
  ): IScheduledCheck<TID> | undefined;

  /**
   * Get all scheduled checks for a user.
   * @param userId User ID
   */
  getScheduledChecksForUser(userId: TID): IScheduledCheck<TID>[];

  /**
   * Subscribe to heartbeat status changes.
   * @param listener Callback for status changes
   * @returns Unsubscribe function
   */
  onStatusChange(listener: HeartbeatStatusChangeListener<TID>): () => void;

  /**
   * Handle an incoming webhook from a provider.
   * @param providerId Provider ID
   * @param payload Webhook payload
   * @param headers Request headers
   */
  handleWebhook(
    providerId: TID,
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<IHeartbeatEvent<TID> | null>;

  /**
   * Register a custom provider from configuration.
   * This allows users to define new providers without code changes.
   * @param config Provider configuration
   */
  registerCustomProvider(config: ICanaryProviderConfig<TID>): void;

  /**
   * Export provider configuration for backup/sharing.
   * @param providerId Provider ID
   */
  exportProviderConfig(providerId: TID): ICanaryProviderConfig<TID> | undefined;

  /**
   * Import provider configuration.
   * @param config Provider configuration to import
   */
  importProviderConfig(config: ICanaryProviderConfig<TID>): void;
}

/**
 * Default aggregation configuration.
 */
export const DEFAULT_AGGREGATION_CONFIG: Omit<
  IAggregationConfig,
  'duressHandling'
> & { duressHandling: 'immediate' } = {
  strategy: 'any',
  minConfidenceThreshold: 0.5,
  failureCountsAsNotAlive: false,
  maxCacheAgeMs: 5 * 60 * 1000, // 5 minutes
  duressHandling: 'immediate', // Duress signals should trigger immediately by default
  categoryWeights: {
    [ProviderCategory.HEALTH_FITNESS]: 1.5, // Higher weight for fitness trackers
    [ProviderCategory.SOCIAL_MEDIA]: 1.0,
    [ProviderCategory.DEVELOPER]: 1.0,
    [ProviderCategory.COMMUNICATION]: 1.2,
    [ProviderCategory.PLATFORM_NATIVE]: 2.0, // Highest weight for our own platform
  },
};
