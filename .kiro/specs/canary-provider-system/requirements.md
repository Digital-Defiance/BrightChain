# Requirements Document

## Introduction

The Canary Provider System is the life-critical subsystem of DigitalBurnbag that connects to external APIs (GitHub, Fitbit, Google, Slack, etc.) to monitor user activity as heartbeat signals. These signals drive dead man's switch (absence), duress detection, and presence confirmation protocols. The system must distinguish between "the user is inactive" (absence of user data) and "the API is unreachable" (feed failure), because conflating the two could lead to unintended data release or destruction. The provider system must be elevated to a first-class citizen in the application — equal in prominence to canaries and vaults — with intuitive UI for connecting providers, binding them to vaults/files, and monitoring their health in real time.

## Glossary

- **Provider_System**: The subsystem responsible for managing external API connections, executing heartbeat checks, and reporting provider health status
- **Provider_Dashboard**: The top-level navigation page that displays all connected providers, their health status, and aggregate system health
- **Provider_Connection_Flow**: The end-to-end process of selecting, authenticating, configuring, testing, and activating a provider
- **Feed_Failure**: A condition where the Provider_System cannot reach an external API due to network errors, authentication expiry, rate limiting, or service outages
- **User_Absence**: A condition where the external API is reachable and returns valid data, but no user activity is detected within the configured threshold
- **Failure_Threshold**: A configurable number of consecutive Feed_Failure events required before the Provider_System escalates the failure to a policy action
- **Failure_Policy**: A user-configured rule that defines what action the Provider_System takes when a Failure_Threshold is exceeded (e.g., pause checks, notify user, trigger protocol)
- **Health_Monitor**: The background service that periodically checks provider connectivity, token validity, and API responsiveness
- **Binding_Assistant**: The UI component that enables intuitive association of providers with vaults, files, and folders via context menus, dropdowns, and drag-and-drop
- **Provider_Registry**: The service that manages registration, lookup, and lifecycle of all provider adapters (built-in and custom)
- **Heartbeat_Check**: A single poll of an external API to retrieve recent user activity and determine signal type (PRESENCE, ABSENCE, DURESS, CHECK_FAILED)
- **Status_History**: A time-series audit trail of all Heartbeat_Check results for a given provider connection
- **ConfigDrivenProviderAdapter**: The existing adapter class that executes API calls based on ICanaryProviderConfig JSON definitions without custom code
- **BurnbagApiClient**: The frontend HTTP client that communicates with the DigitalBurnbag API server

## Requirements

### Requirement 1: Provider Connection Flow

**User Story:** As a DigitalBurnbag user, I want a complete end-to-end flow for connecting external API providers, so that I can set up heartbeat monitoring without manual ID entry or guesswork.

#### Acceptance Criteria

1. WHEN the user initiates provider connection, THE Provider_Connection_Flow SHALL present all available providers from BUILTIN_PROVIDER_CONFIGS grouped by ProviderCategory with name, description, icon, and supported authentication methods
2. WHEN the user selects a provider that supports OAuth2, THE Provider_Connection_Flow SHALL redirect the user to the provider's authorization URL with correct scopes and CSRF state parameter, and handle the callback to exchange the authorization code for tokens
3. WHEN the user selects a provider that supports API key authentication, THE Provider_Connection_Flow SHALL present a secure input field for the API key and a link to the provider's app settings page where the key can be obtained
4. WHEN the user selects a provider that supports webhook authentication, THE Provider_Connection_Flow SHALL generate a unique webhook URL and secret, display them with copy-to-clipboard functionality, and provide setup instructions
5. WHEN authentication credentials are obtained, THE Provider_Connection_Flow SHALL execute a test connection against the provider's healthCheck endpoint and display the result including provider username, response time, and success or failure status
6. IF the test connection fails, THEN THE Provider_Connection_Flow SHALL display the error message and offer a retry option without losing the entered credentials
7. WHEN the test connection succeeds, THE Provider_Connection_Flow SHALL persist the provider connection with encrypted credentials and set the connection status to "connected"
8. THE Provider_Connection_Flow SHALL allow configuration of absence detection thresholds (threshold in days, grace period in hours, warning notifications toggle, and warning intervals) during the connection setup
9. THE Provider_Connection_Flow SHALL allow configuration of duress detection (enable/disable toggle, keywords list, regex patterns list) during the connection setup

### Requirement 2: Provider Dashboard as First-Class Navigation

**User Story:** As a DigitalBurnbag user, I want the provider system to have its own top-level navigation entry equal to canaries and vaults, so that I can monitor provider health at a glance.

#### Acceptance Criteria

1. THE Provider_Dashboard SHALL appear as a top-level navigation item in the application sidebar, at the same hierarchy level as Canaries and Vaults
2. THE Provider_Dashboard SHALL display an aggregate health summary showing total connected providers, healthy count, providers needing attention, and overall status (healthy, degraded, critical)
3. WHEN the overall status is "degraded" or "critical", THE Provider_Dashboard navigation item SHALL display a visual indicator (badge or color change) alerting the user
4. THE Provider_Dashboard SHALL list each connected provider as a card showing: provider name, icon, connection status, last check time, last check result (PRESENCE, ABSENCE, DURESS, CHECK_FAILED), and time since last detected activity
5. WHEN the user clicks a provider card on the Provider_Dashboard, THE Provider_Dashboard SHALL navigate to a detail view showing the provider's Status_History, current configuration, and connection settings
6. THE Provider_Dashboard SHALL provide a prominent "Add Provider" button that opens the Provider_Connection_Flow

### Requirement 3: Feed Failure vs User Absence Distinction

**User Story:** As a DigitalBurnbag user, I want the system to clearly distinguish between API feed failures and genuine user absence, so that a network outage does not accidentally trigger my dead man's switch protocols.

#### Acceptance Criteria

1. WHEN a Heartbeat_Check returns an HTTP error, network timeout, or authentication failure, THE Provider_System SHALL classify the result as CHECK_FAILED (Feed_Failure) and not as ABSENCE
2. WHEN a Heartbeat_Check successfully reaches the API and receives a valid response with no user activity within the configured lookback window, THE Provider_System SHALL classify the result as ABSENCE (User_Absence)
3. WHEN a Heartbeat_Check successfully reaches the API and receives a valid response with user activity within the lookback window, THE Provider_System SHALL classify the result as PRESENCE
4. THE Provider_Dashboard SHALL display Feed_Failure and User_Absence with distinct visual indicators (different colors, icons, and labels) so the user can immediately distinguish between the two conditions
5. WHILE a provider is in a Feed_Failure state, THE Provider_System SHALL not increment the consecutive absence counter for that provider's bindings
6. WHILE a provider is in a Feed_Failure state, THE Provider_System SHALL continue retrying Heartbeat_Checks at the configured interval using the provider's retry configuration (maxAttempts, backoffMs, backoffMultiplier)

### Requirement 4: Configurable Failure Thresholds and Policies

**User Story:** As a DigitalBurnbag user, I want to configure how many consecutive API failures are tolerated before the system takes action, so that transient outages do not cause false alarms while persistent failures are escalated.

#### Acceptance Criteria

1. THE Provider_System SHALL allow the user to configure a Failure_Threshold per provider connection, specifying the number of consecutive CHECK_FAILED results required before escalation (default: 5)
2. THE Provider_System SHALL allow the user to configure a Failure_Policy per provider connection, choosing from: "pause_and_notify" (pause checks and send notification), "notify_only" (continue checks and send notification), "trigger_protocol" (treat persistent failure as absence and trigger bound protocols), or "ignore" (log only)
3. WHEN the consecutive CHECK_FAILED count for a provider connection reaches the configured Failure_Threshold, THE Provider_System SHALL execute the configured Failure_Policy
4. WHEN a Heartbeat_Check succeeds after a series of failures, THE Provider_System SHALL reset the consecutive failure counter to zero and update the connection status to "connected"
5. IF the Failure_Policy is "pause_and_notify", THEN THE Provider_System SHALL set the connection's isPaused flag to true, record the pause reason, and send a notification to the user via configured warning channels
6. IF the Failure_Policy is "trigger_protocol", THEN THE Provider_System SHALL treat the failure as equivalent to ABSENCE and evaluate bound canary bindings accordingly

### Requirement 5: Intuitive Provider-to-Vault/File Binding UI

**User Story:** As a DigitalBurnbag user, I want to bind providers to vaults and files using context menus, dropdowns, and drag-and-drop instead of typing IDs manually, so that configuring canary protocols is fast and error-free.

#### Acceptance Criteria

1. WHEN the user right-clicks a vault, file, or folder in the file browser, THE Binding_Assistant SHALL display a context menu option "Bind to Provider" that opens a provider selection dropdown populated with the user's connected providers
2. WHEN the user selects a provider from the binding context menu, THE Binding_Assistant SHALL present a configuration panel for the binding including: canary condition (PRESENCE, ABSENCE, DURESS), protocol action (from ProtocolAction enum), absence threshold, and optional cascade settings
3. THE Binding_Assistant SHALL support drag-and-drop of a provider card from the Provider_Dashboard onto a vault or file in the file browser to initiate binding creation
4. WHEN creating a binding, THE Binding_Assistant SHALL display the target vault/file/folder names instead of raw IDs, and allow the user to add or remove targets using a searchable multi-select component
5. THE Binding_Assistant SHALL validate that the selected provider connection is in "connected" status before allowing binding creation
6. IF the user attempts to create a binding with a provider in "error" or "expired" status, THEN THE Binding_Assistant SHALL display a warning and offer to navigate to the provider's connection settings to resolve the issue

### Requirement 6: Real-Time Provider Health Monitoring

**User Story:** As a DigitalBurnbag user, I want real-time monitoring of my connected providers' health, so that I am immediately aware when a feed goes down and can take corrective action before it impacts my protocols.

#### Acceptance Criteria

1. THE Health_Monitor SHALL execute scheduled Heartbeat_Checks for each active provider connection at the interval specified by the connection's checkIntervalMs (or the provider's minCheckIntervalMs if not overridden)
2. WHEN a Heartbeat_Check completes, THE Health_Monitor SHALL persist the result to the Status_History including: timestamp, signal type, event count, confidence score, time since last activity, and any error details
3. WHEN a provider's status changes (e.g., from PRESENCE to ABSENCE, or from connected to CHECK_FAILED), THE Health_Monitor SHALL emit a status change event that updates the Provider_Dashboard in real time without requiring a page refresh
4. THE Health_Monitor SHALL respect each provider's rate limit configuration (maxRequests, windowMs, minDelayMs) and not exceed the allowed request rate
5. WHEN a provider connection's OAuth2 tokens are within 10 minutes of expiration, THE Health_Monitor SHALL attempt to refresh the tokens using the refresh token before the next scheduled check
6. IF token refresh fails, THEN THE Health_Monitor SHALL mark the connection status as "expired" and notify the user to re-authenticate

### Requirement 7: Provider Status History and Audit Trail

**User Story:** As a DigitalBurnbag user, I want to view the history of all heartbeat checks for each provider, so that I can audit the system's behavior and verify that my dead man's switch is functioning correctly.

#### Acceptance Criteria

1. THE Provider_System SHALL store each Heartbeat_Check result as a Status_History entry with: connection ID, timestamp, signal type (PRESENCE, ABSENCE, DURESS, CHECK_FAILED, INCONCLUSIVE), event count, confidence score, time since last activity, HTTP status code, and error message if applicable
2. WHEN the user views a provider's detail page, THE Provider_Dashboard SHALL display the Status_History as a chronological list with filtering by signal type and date range
3. THE Provider_Dashboard SHALL display a visual timeline or chart showing the provider's signal type over time, making patterns of absence, presence, and failures visually apparent
4. THE Provider_System SHALL retain Status_History entries for a minimum of 90 days
5. WHEN a duress signal is detected in the Status_History, THE Provider_Dashboard SHALL highlight the entry with a distinct urgent visual treatment

### Requirement 8: Provider Registry and Modular Provider Architecture

**User Story:** As a DigitalBurnbag user, I want a modular provider system where new API providers can be added via configuration without code changes, so that the system can grow to support new services.

#### Acceptance Criteria

1. THE Provider_Registry SHALL load all providers from BUILTIN_PROVIDER_CONFIGS on initialization and register a ConfigDrivenProviderAdapter for each
2. THE Provider_Registry SHALL support registration of custom user-defined providers via ICanaryProviderConfig JSON configuration
3. WHEN a custom provider configuration is registered, THE Provider_Registry SHALL validate that the configuration includes required fields (id, name, baseUrl, auth, endpoints.activity with responseMapping) before accepting it
4. THE Provider_Registry SHALL support export of any provider configuration to JSON for backup and sharing
5. THE Provider_Registry SHALL support import of provider configurations from JSON, validating the schema before registration
6. THE Provider_System SHALL provide a UI form for creating custom provider configurations, with fields for all ICanaryProviderConfig properties including endpoint paths, response mappings, and authentication settings

### Requirement 9: Aggregate Heartbeat Evaluation

**User Story:** As a DigitalBurnbag user, I want the system to aggregate heartbeat results across multiple providers using configurable strategies, so that a single provider's failure does not trigger my protocols when other providers show I am active.

#### Acceptance Criteria

1. THE Provider_System SHALL support aggregation strategies: "any" (alive if any provider shows PRESENCE), "all" (alive only if all providers show PRESENCE), "majority" (alive if majority show PRESENCE), and "weighted" (alive based on category/provider weight scores)
2. THE Provider_System SHALL apply the default aggregation strategy "any" when no user-specific configuration is set
3. WHEN using the "weighted" strategy, THE Provider_System SHALL apply category weights from IAggregationConfig (PLATFORM_NATIVE: 2.0, HEALTH_FITNESS: 1.5, COMMUNICATION: 1.2, others: 1.0) and allow per-provider weight overrides
4. THE Provider_System SHALL evaluate duress signals with "immediate" handling by default: any single provider detecting DURESS SHALL trigger duress protocols regardless of aggregation strategy
5. WHEN all providers return CHECK_FAILED, THE Provider_System SHALL classify the aggregate result as CHECK_FAILED and not as ABSENCE
6. THE Provider_Dashboard SHALL display the aggregate heartbeat status prominently, showing which providers contributed to the determination and the overall confidence score

### Requirement 10: Provider Connection Credential Security

**User Story:** As a DigitalBurnbag user, I want my provider credentials (OAuth tokens, API keys) to be encrypted at rest and handled securely, so that a database compromise does not expose my external account access.

#### Acceptance Criteria

1. THE Provider_System SHALL encrypt all OAuth2 access tokens, refresh tokens, and API keys at rest before persisting them to BrightDB
2. THE Provider_System SHALL decrypt credentials only in memory immediately before making API calls, and clear them from memory after the call completes
3. THE Provider_System SHALL not log, expose in API responses, or include in error messages any credential values (access tokens, refresh tokens, API keys)
4. WHEN a user disconnects a provider, THE Provider_System SHALL permanently delete all stored credentials for that connection
5. THE Provider_System SHALL validate OAuth2 state parameters during the callback to prevent CSRF attacks during the authorization flow

