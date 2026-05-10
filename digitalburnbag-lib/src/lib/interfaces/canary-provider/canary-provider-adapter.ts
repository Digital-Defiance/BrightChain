import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Represents a single heartbeat event from a provider.
 * This is the normalized format that all providers must produce.
 */
export interface IHeartbeatEvent<TID extends PlatformID = string> {
  /** Unique identifier for this event */
  eventId: TID;
  /** Provider that generated this event */
  providerId: TID;
  /** Timestamp when the activity occurred */
  timestamp: Date;
  /** Type of activity (provider-specific, e.g., 'commit', 'step', 'post', 'login') */
  activityType: string;
  /** Raw event data from the provider (for debugging/auditing) */
  rawData?: Record<string, unknown>;
  /** Optional numeric value (e.g., step count, commit count) */
  numericValue?: number;
  /** Optional location data if available */
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  /** Optional device/client identifier */
  deviceId?: string;
  /** Whether this event indicates active user engagement */
  isActiveEngagement: boolean;

  /**
   * Whether this event is a duress indicator.
   * Examples:
   * - Commit message containing "help" or "duress"
   * - Specific emoji pattern in a post
   * - Panic button press on a fitness device
   * - Login from a pre-designated "duress" account
   */
  isDuressIndicator: boolean;

  /**
   * Type of duress signal if isDuressIndicator is true.
   * Provider-specific (e.g., 'panic_button', 'keyword_detected', 'pattern_match')
   */
  duressType?: string;
}

/**
 * Configuration for absence detection (dead man's switch).
 */
export interface IAbsenceDetectionConfig {
  /**
   * Time threshold in milliseconds after which absence is declared.
   * If no activity is detected within this window, the user is considered "absent".
   */
  thresholdMs: number;

  /**
   * Grace period in milliseconds before triggering actions.
   * Allows for temporary outages or vacations.
   */
  gracePeriodMs?: number;

  /**
   * Number of consecutive absence checks required before triggering.
   * Prevents false positives from single check failures.
   */
  consecutiveAbsenceChecksRequired: number;

  /**
   * Whether to send warning notifications before triggering.
   */
  sendWarningNotifications: boolean;

  /**
   * Warning intervals in milliseconds before the threshold.
   * E.g., [86400000, 43200000] = warn at 24h and 12h before threshold.
   */
  warningIntervalsMs?: number[];

  /**
   * Channels to send warnings to.
   */
  warningChannels?: Array<'email' | 'sms' | 'push' | 'webhook'>;
}

/**
 * Configuration for duress detection.
 */
export interface IDuressDetectionConfig {
  /**
   * Whether duress detection is enabled for this provider.
   */
  enabled: boolean;

  /**
   * Keywords that indicate duress when found in text content.
   * Case-insensitive matching.
   */
  duressKeywords?: string[];

  /**
   * Regex patterns that indicate duress.
   */
  duressPatterns?: string[];

  /**
   * Specific activity types that indicate duress.
   * E.g., 'panic_button_press', 'sos_signal'
   */
  duressActivityTypes?: string[];

  /**
   * Whether to check for duress in commit messages (for dev providers).
   */
  checkCommitMessages?: boolean;

  /**
   * Whether to check for duress in post content (for social providers).
   */
  checkPostContent?: boolean;

  /**
   * Custom duress detection function name (for advanced users).
   * References a registered custom detector.
   */
  customDetectorId?: string;
}

/**
 * The type of heartbeat signal detected.
 */
export enum HeartbeatSignalType {
  /** Positive signal: activity was detected */
  PRESENCE = 'presence',
  /** Negative signal: no activity detected within threshold (absence) */
  ABSENCE = 'absence',
  /** Special duress signal detected (panic button, duress code, etc.) */
  DURESS = 'duress',
  /** Check failed - unable to determine status */
  CHECK_FAILED = 'check_failed',
  /** Provider returned data but it's inconclusive */
  INCONCLUSIVE = 'inconclusive',
}

/**
 * Result of checking a provider for heartbeat activity.
 */
export interface IHeartbeatCheckResult<TID extends PlatformID = string> {
  /** Whether the check was successful (API reachable, auth valid) */
  success: boolean;
  /** Error message if check failed */
  error?: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Timestamp of the check */
  checkedAt: Date;
  /** Most recent heartbeat event found (if any) */
  latestEvent?: IHeartbeatEvent<TID>;
  /** All events found within the query window */
  events: IHeartbeatEvent<TID>[];
  /** Total count of events in the query window */
  eventCount: number;

  /**
   * The signal type detected by this check.
   * - PRESENCE: Activity found within the expected window
   * - ABSENCE: No activity found (dead man's switch condition)
   * - DURESS: Duress indicator detected (panic button, specific pattern)
   * - CHECK_FAILED: Could not complete the check
   * - INCONCLUSIVE: Data received but cannot determine status
   */
  signalType: HeartbeatSignalType;

  /**
   * Whether the user appears to be "alive" based on this provider.
   * True if PRESENCE detected, false if ABSENCE detected.
   * Undefined if CHECK_FAILED or INCONCLUSIVE.
   */
  isAlive?: boolean;

  /** Confidence score (0-1) for the signal determination */
  confidence: number;

  /**
   * Time since last detected activity in milliseconds.
   * Null if no activity has ever been recorded.
   */
  timeSinceLastActivityMs: number | null;

  /**
   * The absence threshold that was used for this check (milliseconds).
   * If timeSinceLastActivityMs > absenceThresholdMs, signalType = ABSENCE.
   */
  absenceThresholdMs?: number;

  /**
   * Whether a duress indicator was detected.
   * Some providers support explicit duress signals (panic buttons,
   * specific patterns like "help" in a commit message, etc.)
   */
  duressDetected: boolean;

  /**
   * Details about the duress signal if detected.
   */
  duressDetails?: {
    /** Type of duress signal */
    type: string;
    /** The event that triggered duress detection */
    triggerEvent?: IHeartbeatEvent<TID>;
    /** Additional context */
    context?: string;
  };

  /** Provider-specific metadata */
  providerMetadata?: Record<string, unknown>;
}

/**
 * Configuration for OAuth2-based providers.
 */
export interface IOAuth2Config {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  /** URL to redirect after OAuth flow */
  redirectUri: string;
}

/**
 * Configuration for API key-based providers.
 */
export interface IApiKeyConfig {
  /** Header name for the API key (e.g., 'Authorization', 'X-API-Key') */
  headerName: string;
  /** Prefix for the header value (e.g., 'Bearer ', 'Token ') */
  headerPrefix?: string;
}

/**
 * Configuration for webhook-based providers (provider pushes to us).
 */
export interface IWebhookConfig {
  /** Secret for validating webhook signatures */
  webhookSecret?: string;
  /** Algorithm for signature validation (e.g., 'sha256', 'sha1') */
  signatureAlgorithm?: string;
  /** Header containing the signature */
  signatureHeader?: string;
}

/**
 * Authentication configuration for a provider.
 */
export interface IProviderAuthConfig {
  type: 'oauth2' | 'api_key' | 'webhook' | 'basic' | 'custom';
  oauth2?: IOAuth2Config;
  apiKey?: IApiKeyConfig;
  webhook?: IWebhookConfig;
  /** For basic auth */
  basic?: {
    usernameField: string;
    passwordField: string;
  };
  /** For custom auth, a template for the Authorization header */
  customHeaderTemplate?: string;
}

/**
 * Rate limiting configuration for API calls.
 */
export interface IRateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Minimum delay between requests in milliseconds */
  minDelayMs?: number;
}

/**
 * Defines how to extract heartbeat events from API responses.
 */
export interface IResponseMapping {
  /** JSONPath or dot-notation path to the events array */
  eventsPath: string;
  /** Path to timestamp field within each event */
  timestampPath: string;
  /** Timestamp format (ISO8601, unix, unix_ms, or custom strftime) */
  timestampFormat: 'iso8601' | 'unix' | 'unix_ms' | string;
  /** Path to activity type field */
  activityTypePath?: string;
  /** Default activity type if not in response */
  defaultActivityType?: string;
  /** Path to numeric value field (optional) */
  numericValuePath?: string;
  /** Path to event ID field */
  eventIdPath?: string;
  /** Paths for location data */
  locationPaths?: {
    latitude?: string;
    longitude?: string;
    accuracy?: string;
  };
  /** Path to pagination cursor/token for next page */
  paginationCursorPath?: string;
  /** Path to "has more" indicator */
  hasMorePath?: string;
}

/**
 * Complete configuration for a canary provider.
 * This allows defining new providers via configuration without code changes.
 */
export interface ICanaryProviderConfig<TID extends PlatformID = string> {
  /** Unique identifier for this provider configuration */
  id: TID;
  /** Human-readable name */
  name: string;
  /** Description of what this provider monitors */
  description: string;
  /** Provider category for grouping in UI */
  category: ProviderCategory;
  /** Icon identifier or URL */
  icon?: string;
  /** Base URL for API calls */
  baseUrl: string;
  /** Authentication configuration */
  auth: IProviderAuthConfig;
  /** Rate limiting configuration */
  rateLimit?: IRateLimitConfig;
  /** API endpoint configuration */
  endpoints: {
    /** Endpoint to fetch recent activity */
    activity: {
      /** Path relative to baseUrl (supports {userId}, {since}, {until} placeholders) */
      path: string;
      /** HTTP method */
      method: 'GET' | 'POST';
      /** Query parameters (supports placeholders) */
      queryParams?: Record<string, string>;
      /** Request body template for POST (supports placeholders) */
      bodyTemplate?: string;
      /** Response mapping configuration */
      responseMapping: IResponseMapping;
    };
    /** Optional endpoint to verify credentials/connection */
    healthCheck?: {
      path: string;
      method: 'GET' | 'POST';
      /** Expected status code for healthy response */
      expectedStatus: number;
    };
    /** Optional endpoint to get user profile */
    userProfile?: {
      path: string;
      method: 'GET';
      /** Path to user ID in response */
      userIdPath: string;
      /** Path to username in response */
      usernamePath?: string;
    };
  };
  /** Default lookback window in milliseconds */
  defaultLookbackMs: number;
  /** Minimum recommended check interval in milliseconds */
  minCheckIntervalMs: number;
  /** Whether this provider supports real-time webhooks */
  supportsWebhooks: boolean;
  /** Whether this provider is enabled by default */
  enabledByDefault: boolean;
  /** Custom headers to include in all requests */
  customHeaders?: Record<string, string>;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
}

/**
 * Categories for organizing providers in the UI.
 */
export enum ProviderCategory {
  /** Social media platforms (Twitter, Facebook, etc.) */
  SOCIAL_MEDIA = 'social_media',
  /** Health and fitness trackers (Fitbit, Strava, etc.) */
  HEALTH_FITNESS = 'health_fitness',
  /** Developer platforms (GitHub, GitLab, etc.) */
  DEVELOPER = 'developer',
  /** Communication platforms (Slack, Discord, etc.) */
  COMMUNICATION = 'communication',
  /** Financial services (banking APIs, etc.) */
  FINANCIAL = 'financial',
  /** IoT and smart home devices */
  IOT_SMART_HOME = 'iot_smart_home',
  /** Gaming platforms */
  GAMING = 'gaming',
  /** Email providers */
  EMAIL = 'email',
  /** Calendar and productivity */
  PRODUCTIVITY = 'productivity',
  /** Custom webhook-based providers */
  CUSTOM_WEBHOOK = 'custom_webhook',
  /** Platform-native (BrightChain/DigitalBurnbag activity) */
  PLATFORM_NATIVE = 'platform_native',
  /** Location and mapping services */
  LOCATION = 'location',
  /** Entertainment and streaming */
  ENTERTAINMENT = 'entertainment',
  /** Other/miscellaneous */
  OTHER = 'other',
}

/**
 * User-specific credentials for a provider.
 */
export interface IProviderCredentials<TID extends PlatformID = string> {
  /** User ID these credentials belong to */
  userId: TID;
  /** Provider configuration ID */
  providerId: TID;
  /** OAuth2 access token (encrypted at rest) */
  accessToken?: string;
  /** OAuth2 refresh token (encrypted at rest) */
  refreshToken?: string;
  /** Token expiration timestamp */
  tokenExpiresAt?: Date;
  /** API key (encrypted at rest) */
  apiKey?: string;
  /** Provider-specific user ID (their ID on that platform) */
  providerUserId?: string;
  /** Provider-specific username */
  providerUsername?: string;
  /** When credentials were last validated */
  lastValidatedAt?: Date;
  /** Whether credentials are currently valid */
  isValid: boolean;
  /** Error message if credentials are invalid */
  validationError?: string;
  /** When credentials were created */
  createdAt: Date;
  /** When credentials were last updated */
  updatedAt: Date;
}

/**
 * Options for a heartbeat check operation.
 */
export interface IHeartbeatCheckOptions {
  /**
   * Absence detection configuration.
   * If provided, the check will evaluate whether the user is "absent"
   * based on the threshold.
   */
  absenceConfig?: IAbsenceDetectionConfig;

  /**
   * Duress detection configuration.
   * If provided, the check will scan for duress indicators.
   */
  duressConfig?: IDuressDetectionConfig;

  /**
   * Whether to include full event details in the result.
   * If false, only summary data is returned (saves bandwidth).
   */
  includeEventDetails?: boolean;

  /**
   * Maximum number of events to return.
   */
  maxEvents?: number;

  /**
   * Whether to use cached results if available and fresh.
   */
  allowCached?: boolean;

  /**
   * Maximum age of cached results to accept (milliseconds).
   */
  maxCacheAgeMs?: number;
}

/**
 * The core adapter interface that all canary providers must implement.
 * This allows both built-in providers and custom user-defined providers.
 */
export interface ICanaryProviderAdapter<TID extends PlatformID = string> {
  /** Get the provider configuration */
  getConfig(): ICanaryProviderConfig<TID>;

  /**
   * Check for heartbeat activity within a time window.
   *
   * This is the primary method for detecting:
   * - PRESENCE: User activity detected (they're alive)
   * - ABSENCE: No activity within threshold (dead man's switch triggered)
   * - DURESS: Distress signal detected (panic button, keyword, pattern)
   *
   * @param credentials User's credentials for this provider
   * @param since Start of the time window
   * @param until End of the time window (defaults to now)
   * @param options Check options including absence/duress config
   */
  checkHeartbeat(
    credentials: IProviderCredentials<TID>,
    since: Date,
    until?: Date,
    options?: IHeartbeatCheckOptions,
  ): Promise<IHeartbeatCheckResult<TID>>;

  /**
   * Validate that credentials are still valid.
   * @param credentials User's credentials to validate
   */
  validateCredentials(
    credentials: IProviderCredentials<TID>,
  ): Promise<{ valid: boolean; error?: string }>;

  /**
   * Refresh OAuth2 tokens if applicable.
   * @param credentials Current credentials with refresh token
   */
  refreshTokens?(
    credentials: IProviderCredentials<TID>,
  ): Promise<Partial<IProviderCredentials<TID>>>;

  /**
   * Handle an incoming webhook event (for webhook-based providers).
   * Webhooks provide real-time presence signals without polling.
   *
   * @param payload Raw webhook payload
   * @param headers Request headers (for signature validation)
   * @param duressConfig Optional duress detection config to apply
   */
  handleWebhook?(
    payload: unknown,
    headers: Record<string, string>,
    duressConfig?: IDuressDetectionConfig,
  ): Promise<IHeartbeatEvent<TID> | null>;

  /**
   * Get the OAuth2 authorization URL for user consent.
   * @param state State parameter for CSRF protection
   */
  getAuthorizationUrl?(state: string): string;

  /**
   * Exchange an OAuth2 authorization code for tokens.
   * @param code Authorization code from OAuth callback
   */
  exchangeAuthorizationCode?(
    code: string,
  ): Promise<Partial<IProviderCredentials<TID>>>;

  /**
   * Check if this provider supports duress detection.
   * Not all providers can detect duress signals.
   */
  supportsDuressDetection(): boolean;

  /**
   * Get the types of duress signals this provider can detect.
   * E.g., ['keyword_in_commit', 'panic_button', 'sos_pattern']
   */
  getSupportedDuressTypes(): string[];

  /**
   * Get the minimum recommended check interval for this provider.
   * Respects rate limits and API best practices.
   */
  getRecommendedCheckIntervalMs(): number;

  /**
   * Get the last known activity timestamp for a user (if cached).
   * Returns null if no cached data available.
   */
  getLastKnownActivityTimestamp?(
    credentials: IProviderCredentials<TID>,
  ): Promise<Date | null>;
}
