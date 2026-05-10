import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ProviderCategory } from './canary-provider-adapter';

/**
 * Status of a provider connection for a user.
 */
export enum ProviderConnectionStatus {
  /** Not connected - user hasn't set up this provider */
  NOT_CONNECTED = 'not_connected',
  /** Pending - OAuth flow started but not completed */
  PENDING = 'pending',
  /** Connected and credentials are valid */
  CONNECTED = 'connected',
  /** Connected but credentials have expired (needs refresh) */
  EXPIRED = 'expired',
  /** Connected but credentials are invalid (needs re-auth) */
  INVALID = 'invalid',
  /** Connection error - provider API unreachable */
  ERROR = 'error',
}

/**
 * Display information for a provider in the registration UI.
 */
export interface IProviderDisplayInfo {
  /** Provider ID (matches CanaryProvider enum or custom ID) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** Category for grouping */
  category: ProviderCategory;
  /** Icon identifier (for icon library lookup) or URL */
  icon: string;
  /** Brand color (hex) for UI theming */
  brandColor?: string;
  /** Whether this provider requires OAuth */
  requiresOAuth: boolean;
  /** Whether this provider supports API key auth as alternative */
  supportsApiKey: boolean;
  /** Whether this provider supports webhook-based heartbeats */
  supportsWebhook: boolean;
  /** Scopes/permissions this provider requests (for user info) */
  requestedScopes: string[];
  /** Human-readable description of what data we access */
  dataAccessDescription: string;
  /** Link to provider's privacy policy */
  privacyPolicyUrl?: string;
  /** Link to provider's app settings (for revoking access) */
  appSettingsUrl?: string;
  /** Whether this is a built-in provider or user-defined */
  isBuiltIn: boolean;
  /** Recommended check interval description (e.g., "Every 15 minutes") */
  recommendedCheckInterval: string;
  /** Minimum check interval in milliseconds */
  minCheckIntervalMs: number;
  /** Whether this provider is currently available (API not deprecated) */
  isAvailable: boolean;
  /** Message if provider is unavailable */
  unavailableReason?: string;
}

/**
 * User's connection to a specific provider.
 */
export interface IProviderConnectionBase<TID extends PlatformID> {
  /** Connection ID */
  id: TID;
  /** User ID */
  userId: TID;
  /** Provider ID */
  providerId: string;
  /** Current connection status */
  status: ProviderConnectionStatus;
  /** User's ID on the provider platform */
  providerUserId?: string;
  /** User's username/handle on the provider platform */
  providerUsername?: string;
  /** User's display name on the provider platform */
  providerDisplayName?: string;
  /** User's avatar URL on the provider platform */
  providerAvatarUrl?: string;
  /** When the connection was established */
  connectedAt?: Date | string;
  /** When credentials were last validated */
  lastValidatedAt?: Date | string;
  /** When the last heartbeat check was performed */
  lastCheckedAt?: Date | string;
  /** Result of the last heartbeat check */
  lastCheckResult?: 'presence' | 'absence' | 'duress' | 'error';
  /** Error message if status is ERROR or INVALID */
  errorMessage?: string;
  /** When tokens expire (for OAuth) */
  tokenExpiresAt?: Date | string;
  /** Whether this connection is enabled for canary checks */
  isEnabled: boolean;
  /** Custom check interval override (milliseconds) */
  checkIntervalMs?: number;
  /** Created timestamp */
  createdAt: Date | string;
  /** Updated timestamp */
  updatedAt: Date | string;
}

/**
 * OAuth state for tracking authorization flows.
 */
export interface IOAuthStateBase<TID extends PlatformID> {
  /** State token (CSRF protection) */
  state: string;
  /** User ID initiating the flow */
  userId: TID;
  /** Provider ID being connected */
  providerId: string;
  /** Where to redirect after completion */
  returnUrl: string;
  /** When this state expires */
  expiresAt: Date | string;
  /** Created timestamp */
  createdAt: Date | string;
}

/**
 * Request to initiate OAuth flow.
 */
export interface IInitiateOAuthRequest {
  /** Provider ID to connect */
  providerId: string;
  /** URL to return to after OAuth completes */
  returnUrl: string;
}

/**
 * Response from initiating OAuth flow.
 */
export interface IInitiateOAuthResponse {
  /** URL to redirect user to for authorization */
  authorizationUrl: string;
  /** State token for verification */
  state: string;
}

/**
 * Request to complete OAuth flow (callback handler).
 */
export interface ICompleteOAuthRequest {
  /** Provider ID */
  providerId: string;
  /** Authorization code from provider */
  code: string;
  /** State token for verification */
  state: string;
}

/**
 * Response from completing OAuth flow.
 */
export interface ICompleteOAuthResponse {
  /** Whether the connection was successful */
  success: boolean;
  /** The created/updated connection */
  connection?: IProviderConnectionBase<string>;
  /** Error message if failed */
  error?: string;
  /** URL to redirect to */
  returnUrl: string;
}

/**
 * Request to connect via API key.
 */
export interface IConnectApiKeyRequest {
  /** Provider ID */
  providerId: string;
  /** API key */
  apiKey: string;
  /** Optional: provider user ID if known */
  providerUserId?: string;
}

/**
 * Request to set up a webhook connection.
 */
export interface ISetupWebhookRequest {
  /** Provider ID */
  providerId: string;
  /** Optional: custom webhook secret (generated if not provided) */
  webhookSecret?: string;
}

/**
 * Response from setting up webhook.
 */
export interface ISetupWebhookResponse {
  /** The webhook URL to configure in the external service */
  webhookUrl: string;
  /** The webhook secret for signature validation */
  webhookSecret: string;
  /** Instructions for configuring the webhook */
  instructions: string;
}

/**
 * Request to test a provider connection.
 */
export interface ITestConnectionRequest {
  /** Provider ID or connection ID */
  providerId: string;
}

/**
 * Response from testing a connection.
 */
export interface ITestConnectionResponse {
  /** Whether the test was successful */
  success: boolean;
  /** Current status after test */
  status: ProviderConnectionStatus;
  /** Provider user info if available */
  providerUserInfo?: {
    userId: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  /** Error message if failed */
  error?: string;
  /** Response time in milliseconds */
  responseTimeMs: number;
}

/**
 * Summary of a user's provider connections for dashboard display.
 */
export interface IProviderConnectionsSummary {
  /** Total number of connected providers */
  connectedCount: number;
  /** Number of providers with valid credentials */
  healthyCount: number;
  /** Number of providers needing attention (expired, invalid, error) */
  needsAttentionCount: number;
  /** Most recent heartbeat across all providers */
  lastHeartbeatAt?: string;
  /** Overall status */
  overallStatus: 'healthy' | 'degraded' | 'critical' | 'none';
}

/**
 * Grouped providers for UI display.
 */
export interface IProvidersByCategory {
  category: ProviderCategory;
  categoryName: string;
  categoryDescription: string;
  providers: IProviderDisplayInfo[];
}

/**
 * Provider registration wizard step.
 */
export enum ProviderRegistrationStep {
  /** Select provider from list */
  SELECT_PROVIDER = 'select_provider',
  /** Review permissions/scopes */
  REVIEW_PERMISSIONS = 'review_permissions',
  /** Configure absence threshold */
  CONFIGURE_ABSENCE = 'configure_absence',
  /** Configure duress detection (optional) */
  CONFIGURE_DURESS = 'configure_duress',
  /** Authorize with provider (OAuth redirect) */
  AUTHORIZE = 'authorize',
  /** Enter API key (for API key auth) */
  ENTER_API_KEY = 'enter_api_key',
  /** Configure webhook (for webhook auth) */
  CONFIGURE_WEBHOOK = 'configure_webhook',
  /** Test connection */
  TEST_CONNECTION = 'test_connection',
  /** Success/completion */
  COMPLETE = 'complete',
}

/**
 * State for the provider registration wizard.
 */
export interface IProviderRegistrationWizardState {
  /** Current step */
  currentStep: ProviderRegistrationStep;
  /** Selected provider */
  selectedProvider?: IProviderDisplayInfo;
  /** Auth method chosen */
  authMethod?: 'oauth' | 'api_key' | 'webhook';
  /** Absence threshold configuration */
  absenceConfig?: {
    thresholdDays: number;
    gracePeriodHours: number;
    sendWarnings: boolean;
    warningDays: number[];
  };
  /** Duress configuration */
  duressConfig?: {
    enabled: boolean;
    keywords: string[];
    patterns: string[];
  };
  /** API key (for api_key auth) */
  apiKey?: string;
  /** Webhook config (for webhook auth) */
  webhookConfig?: {
    webhookUrl: string;
    webhookSecret: string;
  };
  /** Test result */
  testResult?: ITestConnectionResponse;
  /** Error message */
  error?: string;
  /** Loading state */
  isLoading: boolean;
}
