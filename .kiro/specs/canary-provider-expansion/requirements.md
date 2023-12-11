# Requirements Document

## Introduction

The Canary Provider Expansion massively scales the DigitalBurnbag canary provider ecosystem from a foundational architecture into a comprehensive "wall of APIs" — a rich catalog of pre-built provider integrations covering every major service that generates heartbeat data indicating user alive-ness. This spec builds on the existing canary-provider-system (provider registry, health monitor, failure policies, aggregation engine, credential service, dashboard UI, binding assistant) and focuses on: (1) expanding the built-in provider catalog to dozens of real-world APIs across fitness, communication, social, financial, smart home, development, and platform-native categories; (2) multi-canary redundancy allowing multiple providers bound to a single vault/file with configurable aggregation logic; (3) enhanced visual UX for browsing, connecting, and managing the provider ecosystem; (4) webhook endpoint infrastructure for receiving inbound heartbeat data from push-based APIs; (5) BrightChain-native canaries including login activity monitoring and duress code detection.

## Glossary

- **Provider_Catalog**: The browsable collection of all available canary provider integrations, both built-in and custom, organized by category with search and filtering
- **Provider_Integration**: A complete ICanaryProviderConfig definition for a specific external API, including authentication setup, endpoint definitions, response mappings, and rate limit configuration
- **Multi_Canary_Binding**: A binding configuration that attaches two or more provider connections to a single vault, file, or folder with a specified aggregation strategy to prevent premature protocol triggering
- **Webhook_Endpoint_Service**: The backend service that generates, registers, validates, and routes inbound webhook payloads from push-based APIs to the appropriate provider connection
- **Webhook_Receiver**: A unique HTTPS endpoint generated per provider connection that accepts inbound heartbeat data from external services
- **BrightChain_Native_Canary**: A canary provider that monitors activity within the BrightChain platform itself (logins, file access, API usage) rather than external services
- **Duress_Code_Canary**: A BrightChain-native canary that detects when a user authenticates using a pre-configured duress code instead of their normal credentials, triggering immediate duress protocols
- **Provider_Marketplace**: The visual UI section within the canary left-menu where users browse, search, and enable provider integrations from the catalog
- **Heartbeat_Stream**: A continuous flow of activity data from an external API, either polled on a schedule or received via webhook push
- **Provider_Category**: A classification grouping for providers (HEALTH_FITNESS, COMMUNICATION, SOCIAL_MEDIA, FINANCIAL, SMART_HOME, DEVELOPMENT, PLATFORM_NATIVE, LOCATION, ENTERTAINMENT, PRODUCTIVITY, IOT_WEARABLE)
- **Redundancy_Policy**: The user-configured rule that determines how multiple canary providers are evaluated together — requiring all, any, majority, or weighted consensus before triggering protocols
- **Canary_Context_Menu**: The right-click menu integration that allows users to attach canary providers to vaults, files, and folders directly from the file browser
- **Provider_Health_Grid**: A visual grid display showing all connected providers with real-time status indicators, organized for at-a-glance monitoring
- **Inbound_Webhook_Payload**: The HTTP request body sent by an external service to a Webhook_Receiver, containing activity or event data
- **Provider_Connection_Card**: A visual card component displaying a single provider's connection status, last activity, health indicator, and quick-action buttons
- **Activation_Flow**: The streamlined process of enabling a provider from the catalog, authenticating, and connecting it to the user's account

## Requirements

### Requirement 1: Expanded Built-In Provider Catalog — Health & Fitness

**User Story:** As a DigitalBurnbag user, I want pre-built integrations for health and fitness APIs that generate continuous heartbeat data from my daily activities, so that my physical activity serves as proof of life without manual configuration.

#### Acceptance Criteria

1. THE Provider_Catalog SHALL include a Provider_Integration for Fitbit covering: daily step count, heart rate data, sleep logs, and active minutes via the Fitbit Web API with OAuth2 authentication
2. THE Provider_Catalog SHALL include a Provider_Integration for Strava covering: recent activities, athlete stats, and activity uploads via the Strava API v3 with OAuth2 authentication
3. THE Provider_Catalog SHALL include a Provider_Integration for Apple Health (via HealthKit web export) covering: step count, workout sessions, and heart rate summaries
4. THE Provider_Catalog SHALL include a Provider_Integration for Google Fit covering: daily activity summary, step count, heart points, and workout sessions via the Google Fitness REST API with OAuth2 authentication
5. THE Provider_Catalog SHALL include a Provider_Integration for Garmin Connect covering: daily summaries, activities, and heart rate data via the Garmin Health API with OAuth2 authentication
6. THE Provider_Catalog SHALL include a Provider_Integration for Oura Ring covering: daily readiness score, sleep data, and activity metrics via the Oura API v2 with OAuth2 authentication (Personal Access Token)
7. THE Provider_Catalog SHALL include a Provider_Integration for Whoop covering: recovery score, strain data, and sleep performance via the Whoop API with OAuth2 authentication
8. THE Provider_Catalog SHALL include a Provider_Integration for Peloton covering: recent workouts, workout streaks, and class history via the Peloton API with session-based authentication
9. THE Provider_Catalog SHALL include a Provider_Integration for MyFitnessPal covering: food diary entries and daily calorie logging via the MyFitnessPal API with OAuth2 authentication

### Requirement 2: Expanded Built-In Provider Catalog — Communication & Email

**User Story:** As a DigitalBurnbag user, I want pre-built integrations for communication platforms that I use daily, so that my email and messaging activity serves as heartbeat signals.

#### Acceptance Criteria

1. THE Provider_Catalog SHALL include a Provider_Integration for Gmail covering: recent email activity (sent/received counts within lookback window) via the Gmail API with OAuth2 authentication and minimal read scope (metadata only)
2. THE Provider_Catalog SHALL include a Provider_Integration for Microsoft Outlook covering: recent email activity and calendar events via the Microsoft Graph API with OAuth2 authentication
3. THE Provider_Catalog SHALL include a Provider_Integration for Slack covering: recent message activity, presence status, and last active timestamp via the Slack Web API with OAuth2 (bot/user token)
4. THE Provider_Catalog SHALL include a Provider_Integration for Discord covering: presence status and recent message activity via the Discord API with OAuth2 authentication
5. THE Provider_Catalog SHALL include a Provider_Integration for Telegram covering: last seen status and recent message activity via the Telegram Bot API with API key authentication
6. THE Provider_Catalog SHALL include a Provider_Integration for Signal (via Signal CLI REST API) covering: message send/receive activity with API key authentication
7. THE Provider_Catalog SHALL include a Provider_Integration for WhatsApp Business covering: message activity via the WhatsApp Business Cloud API with OAuth2 authentication
8. THE Provider_Catalog SHALL include a Provider_Integration for Microsoft Teams covering: presence status, recent chat activity, and meeting participation via the Microsoft Graph API with OAuth2 authentication

### Requirement 3: Expanded Built-In Provider Catalog — Social Media & Content

**User Story:** As a DigitalBurnbag user, I want pre-built integrations for social media platforms, so that my posting and engagement activity serves as heartbeat signals.

#### Acceptance Criteria

1. THE Provider_Catalog SHALL include a Provider_Integration for Twitter/X covering: recent tweet activity, likes, and login sessions via the Twitter API v2 with OAuth2 authentication
2. THE Provider_Catalog SHALL include a Provider_Integration for Reddit covering: recent comments, posts, and upvote activity via the Reddit API with OAuth2 authentication
3. THE Provider_Catalog SHALL include a Provider_Integration for YouTube covering: recent video uploads, comments, and watch history activity via the YouTube Data API v3 with OAuth2 authentication
4. THE Provider_Catalog SHALL include a Provider_Integration for Instagram covering: recent media posts and story activity via the Instagram Graph API with OAuth2 authentication
5. THE Provider_Catalog SHALL include a Provider_Integration for LinkedIn covering: recent post activity and profile views via the LinkedIn API with OAuth2 authentication
6. THE Provider_Catalog SHALL include a Provider_Integration for Mastodon covering: recent toots, boosts, and favorites via the Mastodon API with OAuth2 authentication
7. THE Provider_Catalog SHALL include a Provider_Integration for Twitch covering: stream activity, chat messages, and online status via the Twitch API with OAuth2 authentication

### Requirement 4: Expanded Built-In Provider Catalog — Development & Productivity

**User Story:** As a DigitalBurnbag user, I want pre-built integrations for development and productivity tools that I use for work, so that my professional activity serves as heartbeat signals.

#### Acceptance Criteria

1. THE Provider_Catalog SHALL include a Provider_Integration for GitHub covering: recent commits, pull requests, issues, and contribution activity via the GitHub REST/GraphQL API with OAuth2 or Personal Access Token authentication
2. THE Provider_Catalog SHALL include a Provider_Integration for GitLab covering: recent commits, merge requests, and pipeline activity via the GitLab API with OAuth2 or Personal Access Token authentication
3. THE Provider_Catalog SHALL include a Provider_Integration for Jira covering: recent issue updates, comments, and status transitions via the Jira Cloud REST API with OAuth2 authentication
4. THE Provider_Catalog SHALL include a Provider_Integration for Notion covering: recent page edits and database updates via the Notion API with OAuth2 (integration token) authentication
5. THE Provider_Catalog SHALL include a Provider_Integration for Trello covering: recent card activity, board updates, and comments via the Trello REST API with API key + token authentication
6. THE Provider_Catalog SHALL include a Provider_Integration for Google Workspace (Drive) covering: recent file edits, comments, and sharing activity via the Google Drive API with OAuth2 authentication
7. THE Provider_Catalog SHALL include a Provider_Integration for Dropbox covering: recent file modifications and sharing activity via the Dropbox API with OAuth2 authentication
8. THE Provider_Catalog SHALL include a Provider_Integration for Todoist covering: task completions and project activity via the Todoist REST API with OAuth2 authentication

### Requirement 5: Expanded Built-In Provider Catalog — Smart Home & IoT

**User Story:** As a DigitalBurnbag user, I want pre-built integrations for smart home and IoT devices that passively detect my presence at home, so that ambient activity data serves as heartbeat signals.

#### Acceptance Criteria

1. THE Provider_Catalog SHALL include a Provider_Integration for SmartThings covering: device activity events, presence sensor triggers, and motion detector activity via the SmartThings API with OAuth2 authentication
2. THE Provider_Catalog SHALL include a Provider_Integration for Home Assistant covering: entity state changes, motion events, and presence detection via the Home Assistant REST API with Long-Lived Access Token authentication
3. THE Provider_Catalog SHALL include a Provider_Integration for Philips Hue covering: light state changes and motion sensor triggers via the Hue API with API key (bridge) authentication
4. THE Provider_Catalog SHALL include a Provider_Integration for Ring covering: doorbell events, motion alerts, and device activity via the Ring API with OAuth2 authentication
5. THE Provider_Catalog SHALL include a Provider_Integration for Nest/Google Home covering: thermostat adjustments, camera activity, and presence detection via the Google Smart Device Management API with OAuth2 authentication
6. THE Provider_Catalog SHALL include a Provider_Integration for Amazon Alexa covering: voice interaction history and smart home device commands via the Alexa Smart Home Skill API with OAuth2 authentication

### Requirement 6: Expanded Built-In Provider Catalog — Financial & Location

**User Story:** As a DigitalBurnbag user, I want pre-built integrations for financial services and location-based APIs, so that my transaction activity and location check-ins serve as heartbeat signals.

#### Acceptance Criteria

1. THE Provider_Catalog SHALL include a Provider_Integration for Plaid covering: recent transaction activity across linked bank accounts via the Plaid API with API key authentication (client_id + secret)
2. THE Provider_Catalog SHALL include a Provider_Integration for Coinbase covering: recent trades, transfers, and account activity via the Coinbase API with OAuth2 authentication
3. THE Provider_Catalog SHALL include a Provider_Integration for PayPal covering: recent transaction activity via the PayPal REST API with OAuth2 (client credentials) authentication
4. THE Provider_Catalog SHALL include a Provider_Integration for Venmo covering: recent payment activity via the Venmo API with OAuth2 authentication
5. THE Provider_Catalog SHALL include a Provider_Integration for Google Maps Timeline covering: recent location history and place visits via the Google Maps Platform API with OAuth2 authentication
6. THE Provider_Catalog SHALL include a Provider_Integration for Life360 covering: location check-ins and circle activity via the Life360 API with session-based authentication
7. THE Provider_Catalog SHALL include a Provider_Integration for Foursquare/Swarm covering: recent check-ins and place visits via the Foursquare Places API with OAuth2 authentication

### Requirement 7: Expanded Built-In Provider Catalog — Entertainment & Streaming

**User Story:** As a DigitalBurnbag user, I want pre-built integrations for entertainment and streaming services, so that my media consumption activity serves as heartbeat signals.

#### Acceptance Criteria

1. THE Provider_Catalog SHALL include a Provider_Integration for Spotify covering: recently played tracks, current playback status, and listening history via the Spotify Web API with OAuth2 authentication
2. THE Provider_Catalog SHALL include a Provider_Integration for Netflix covering: viewing activity and continue-watching updates via the Netflix API with session-based authentication
3. THE Provider_Catalog SHALL include a Provider_Integration for Steam covering: recent game activity, achievements, and online status via the Steam Web API with API key authentication
4. THE Provider_Catalog SHALL include a Provider_Integration for Xbox Live covering: recent game activity, achievements, and online presence via the Xbox Live API with OAuth2 authentication
5. THE Provider_Catalog SHALL include a Provider_Integration for PlayStation Network covering: recent game activity and online status via the PlayStation Network API with OAuth2 authentication
6. THE Provider_Catalog SHALL include a Provider_Integration for Last.fm covering: recent scrobbles and listening activity via the Last.fm API with API key authentication
7. THE Provider_Catalog SHALL include a Provider_Integration for Plex covering: recently watched media and server activity via the Plex API with authentication token

### Requirement 8: BrightChain-Native Canary Providers

**User Story:** As a DigitalBurnbag user, I want canary providers that monitor my activity within the BrightChain platform itself, so that my login patterns and platform usage serve as heartbeat signals without depending on external services.

#### Acceptance Criteria

1. THE Provider_Catalog SHALL include a BrightChain_Native_Canary for Login Activity covering: successful login events, login frequency, login location patterns, and session duration via internal platform event monitoring
2. THE Provider_Catalog SHALL include a BrightChain_Native_Canary for Duress Code Login covering: detection of authentication using a pre-configured duress code that immediately triggers duress protocols on all bound vaults and files
3. WHEN a user authenticates with a duress code, THE Duress_Code_Canary SHALL immediately emit a DURESS signal to the aggregation engine without waiting for the next scheduled heartbeat check
4. THE Provider_Catalog SHALL include a BrightChain_Native_Canary for File Access Activity covering: recent file views, downloads, uploads, and sharing actions within the platform
5. THE Provider_Catalog SHALL include a BrightChain_Native_Canary for API Usage Activity covering: recent API calls made by the user's authenticated sessions
6. THE Provider_Catalog SHALL include a BrightChain_Native_Canary for Vault Interaction covering: recent vault reads, vault creations, and destruction proof verifications performed by the user
7. WHEN configuring a Duress_Code_Canary, THE Provider_System SHALL allow the user to set one or more duress codes that are distinct from the user's normal authentication credentials
8. THE BrightChain_Native_Canary providers SHALL not require external network access and SHALL operate entirely within the platform's internal event system

### Requirement 9: Multi-Canary Redundancy Bindings

**User Story:** As a DigitalBurnbag user, I want to attach multiple canary providers to a single vault or file with configurable consensus logic, so that if one canary system fails or has a false positive, my data is not prematurely destroyed or released.

#### Acceptance Criteria

1. THE Provider_System SHALL support creating a Multi_Canary_Binding that associates two or more provider connections with a single vault, file, or folder
2. WHEN creating a Multi_Canary_Binding, THE Binding_Assistant SHALL allow the user to select a Redundancy_Policy from: "all_must_fail" (trigger only when ALL providers report absence), "majority_must_fail" (trigger when more than half report absence), "any_fails" (trigger when any single provider reports absence), or "weighted_consensus" (trigger based on weighted provider scores)
3. THE Provider_System SHALL evaluate Multi_Canary_Bindings using the selected Redundancy_Policy before executing any protocol action, ensuring that a single provider failure does not trigger premature vault destruction or data release
4. WHEN a Multi_Canary_Binding uses "all_must_fail" policy, THE Provider_System SHALL require every bound provider to report ABSENCE for the configured threshold duration before triggering the protocol action
5. WHEN a Multi_Canary_Binding uses "weighted_consensus" policy, THE Provider_System SHALL allow the user to assign individual weight values (0.1 to 10.0) to each provider in the binding and configure a trigger threshold percentage (default: 75%)
6. THE Provider_System SHALL display the Multi_Canary_Binding status on the vault/file detail view showing each provider's individual status and the aggregate evaluation result
7. WHEN any provider in a Multi_Canary_Binding reports CHECK_FAILED, THE Provider_System SHALL exclude that provider from the consensus calculation rather than treating the failure as absence
8. THE Provider_System SHALL allow a minimum of 2 and a maximum of 20 providers per Multi_Canary_Binding

### Requirement 10: Webhook Endpoint Infrastructure

**User Story:** As a DigitalBurnbag user, I want the system to provide webhook endpoints that external services can push data to, so that I can use push-based APIs (like GitHub webhooks, Stripe events, or IoT device callbacks) as canary providers without polling.

#### Acceptance Criteria

1. THE Webhook_Endpoint_Service SHALL generate a unique HTTPS webhook URL per provider connection in the format: `https://{domain}/api/webhooks/canary/{connectionId}/{secret}`
2. THE Webhook_Endpoint_Service SHALL validate inbound webhook payloads using provider-specific signature verification (HMAC-SHA256 for GitHub, Stripe signature headers, etc.) before processing
3. WHEN a valid webhook payload is received, THE Webhook_Endpoint_Service SHALL extract activity data using the provider's configured response mapping and emit a heartbeat signal (PRESENCE, ABSENCE, or DURESS) to the Health_Monitor
4. THE Webhook_Endpoint_Service SHALL respond to webhook deliveries within 5 seconds with an HTTP 200 status to prevent external services from retrying or disabling the webhook
5. IF a webhook payload fails signature verification, THEN THE Webhook_Endpoint_Service SHALL respond with HTTP 401 and log the failed attempt without processing the payload
6. THE Webhook_Endpoint_Service SHALL support webhook secret rotation, allowing users to generate a new secret while maintaining a grace period where both old and new secrets are accepted
7. THE Webhook_Endpoint_Service SHALL track webhook delivery statistics per connection including: total received, successfully processed, failed validation, and last received timestamp
8. WHEN no webhook payload has been received for a provider connection within the configured timeout period, THE Webhook_Endpoint_Service SHALL emit a CHECK_FAILED signal to indicate potential webhook delivery issues

### Requirement 11: Provider Marketplace Visual UX

**User Story:** As a DigitalBurnbag user, I want a visually rich marketplace experience for browsing and enabling canary providers, so that discovering and connecting new heartbeat sources is intuitive and engaging.

#### Acceptance Criteria

1. THE Provider_Marketplace SHALL be accessible from the Canary section of the left navigation menu as a dedicated sub-section labeled "Provider Marketplace"
2. THE Provider_Marketplace SHALL display all available providers from the Provider_Catalog as visual cards with: provider icon/logo, name, category badge, brief description, supported authentication methods, and a "Connect" button
3. THE Provider_Marketplace SHALL support filtering providers by Provider_Category using a category sidebar or tab bar
4. THE Provider_Marketplace SHALL support text search across provider names and descriptions with real-time filtering as the user types
5. WHEN the user clicks "Connect" on a provider card, THE Provider_Marketplace SHALL launch the Activation_Flow for that provider, guiding the user through authentication and initial configuration
6. THE Provider_Marketplace SHALL visually distinguish between providers the user has already connected (showing "Connected" badge with green indicator) and providers available for connection
7. THE Provider_Marketplace SHALL display a "Recommended" badge on providers that are most commonly used or have the highest reliability scores
8. THE Provider_Marketplace SHALL group providers by category with collapsible sections, showing a count of available providers per category

### Requirement 12: Enhanced Provider Health Grid

**User Story:** As a DigitalBurnbag user, I want a visual health grid showing all my connected providers at a glance with real-time status indicators, so that I can immediately identify which providers are healthy and which need attention.

#### Acceptance Criteria

1. THE Provider_Health_Grid SHALL display all connected providers in a responsive grid layout with each provider represented as a Provider_Connection_Card
2. EACH Provider_Connection_Card SHALL display: provider icon, provider name, current signal status (color-coded: green for PRESENCE, amber for CHECK_FAILED, red for ABSENCE, purple for DURESS), time since last successful heartbeat, and a mini sparkline showing recent signal history
3. THE Provider_Health_Grid SHALL update in real-time via WebSocket events when any provider's status changes, without requiring page refresh
4. THE Provider_Health_Grid SHALL support sorting by: provider name, last activity time, status severity, and category
5. THE Provider_Health_Grid SHALL support a compact view (small tiles with icon and status color only) and an expanded view (full cards with details) toggled by the user
6. WHEN a provider's status transitions to CHECK_FAILED or ABSENCE, THE Provider_Health_Grid SHALL animate the status change with a brief visual pulse to draw the user's attention
7. THE Provider_Health_Grid SHALL display an aggregate health bar at the top showing the percentage of providers in each status state (PRESENCE, ABSENCE, CHECK_FAILED, DURESS)

### Requirement 13: Right-Click Context Menu Canary Attachment

**User Story:** As a DigitalBurnbag user, I want to attach canary providers to vaults, files, and folders via a right-click context menu, so that binding providers is as simple as any other file operation.

#### Acceptance Criteria

1. WHEN the user right-clicks a vault, file, or folder in the file browser, THE Canary_Context_Menu SHALL display an "Attach Canary" option in the context menu with a canary icon
2. WHEN the user selects "Attach Canary", THE Canary_Context_Menu SHALL display a submenu listing all connected providers grouped by category, with each provider showing its current status indicator
3. WHEN the user selects a provider from the submenu, THE Canary_Context_Menu SHALL open a compact binding configuration popover with: condition type (ABSENCE, DURESS), protocol action, and an option to add additional providers for multi-canary redundancy
4. THE Canary_Context_Menu SHALL include a "Multi-Canary Setup" option that opens the full Multi_Canary_Binding configuration panel for the selected target
5. WHEN a vault, file, or folder already has canary bindings attached, THE Canary_Context_Menu SHALL display a "Manage Canaries" option showing existing bindings with options to edit or remove them
6. THE Canary_Context_Menu SHALL display a count badge on the "Attach Canary" option indicating how many canary bindings are already attached to the selected item
7. IF no providers are connected, THEN THE Canary_Context_Menu SHALL display a "Connect a Provider First" message with a link to the Provider_Marketplace

### Requirement 14: Canary Left-Menu Provider Setup Section

**User Story:** As a DigitalBurnbag user, I want the canary section of the left navigation menu to be where I set up and enable canary API logins and manage my provider connections, so that all canary provider management is centralized in one intuitive location.

#### Acceptance Criteria

1. THE Canary section of the left navigation menu SHALL include sub-sections for: "My Providers" (connected providers), "Provider Marketplace" (browse and connect new providers), "Multi-Canary Bindings" (manage redundancy configurations), and "Webhook Endpoints" (manage inbound webhook URLs)
2. THE "My Providers" sub-section SHALL display a compact list of all connected providers with status indicators, allowing quick access to each provider's detail view
3. THE "Provider Marketplace" sub-section SHALL link to the full Provider_Marketplace browsing experience
4. THE "Multi-Canary Bindings" sub-section SHALL list all configured Multi_Canary_Bindings with their target vault/file names, bound provider count, and current aggregate status
5. THE "Webhook Endpoints" sub-section SHALL list all active webhook URLs with their provider name, last received timestamp, and delivery success rate
6. WHEN any connected provider has a status of CHECK_FAILED or ABSENCE, THE "My Providers" sub-section SHALL display a warning badge with the count of providers needing attention
7. THE Canary left-menu section SHALL display an overall canary system health indicator (healthy/degraded/critical) based on the aggregate evaluation of all connected providers

### Requirement 15: Provider Integration Configuration Schema

**User Story:** As a DigitalBurnbag user or developer, I want each provider integration to follow a consistent configuration schema, so that adding new providers is predictable and the system can validate configurations automatically.

#### Acceptance Criteria

1. EACH Provider_Integration in the Provider_Catalog SHALL be defined as a complete ICanaryProviderConfig JSON object containing: id, name, description, category, icon, baseUrl, auth configuration, endpoints (activity, healthCheck, optional webhook), responseMapping, rateLimit, and retryConfig
2. THE Provider_System SHALL validate each Provider_Integration config on registration against the ICanaryProviderConfig schema, rejecting configs that are missing required fields or have invalid field values
3. EACH Provider_Integration SHALL specify its supported authentication methods (oauth2, api_key, webhook, session) with complete configuration including: OAuth2 authorization URL, token URL, required scopes, and PKCE support flag where applicable
4. EACH Provider_Integration SHALL specify response mapping rules that extract: activity timestamp, event count, activity type, and optional duress indicators from the provider's API response format
5. EACH Provider_Integration SHALL specify rate limit configuration including: maximum requests per window, window duration in milliseconds, and minimum delay between requests
6. THE Provider_System SHALL provide a validation endpoint that accepts a Provider_Integration config and returns detailed validation results including any missing fields, invalid values, or configuration warnings
7. EACH Provider_Integration SHALL include a healthCheck endpoint configuration that the system uses to verify API reachability independently of activity data retrieval

### Requirement 16: Provider Activation and Deactivation Lifecycle

**User Story:** As a DigitalBurnbag user, I want a clear lifecycle for activating and deactivating provider connections, so that I can temporarily disable providers without losing configuration and permanently remove providers when no longer needed.

#### Acceptance Criteria

1. WHEN the user activates a provider from the Provider_Marketplace, THE Activation_Flow SHALL guide the user through: authentication, test connection, absence threshold configuration, and optional multi-canary binding setup in a single streamlined wizard
2. THE Provider_System SHALL support temporarily pausing a provider connection, which stops heartbeat checks and excludes the provider from aggregation calculations without deleting credentials or configuration
3. WHEN a provider is paused, THE Provider_Health_Grid SHALL display the provider with a distinct "paused" visual state (grayed out with pause icon)
4. THE Provider_System SHALL support permanent disconnection of a provider, which deletes all stored credentials, removes the provider from all Multi_Canary_Bindings, and archives the Status_History
5. WHEN the user disconnects a provider that is part of a Multi_Canary_Binding, THE Provider_System SHALL warn the user that the binding's redundancy will be reduced and require confirmation before proceeding
6. IF disconnecting a provider would reduce a Multi_Canary_Binding to fewer than 2 providers, THEN THE Provider_System SHALL warn the user that the multi-canary redundancy will be lost and the binding will revert to a single-provider binding

### Requirement 17: Webhook Endpoint Security and Management

**User Story:** As a DigitalBurnbag user, I want webhook endpoints to be secure and manageable, so that only legitimate external services can push heartbeat data to my canary system.

#### Acceptance Criteria

1. THE Webhook_Endpoint_Service SHALL generate cryptographically random secrets (minimum 32 bytes, hex-encoded) for each webhook endpoint
2. THE Webhook_Endpoint_Service SHALL support provider-specific signature verification methods: HMAC-SHA256 (GitHub, Stripe), HMAC-SHA1 (legacy services), Ed25519 (modern services), and custom header-based verification
3. THE Webhook_Endpoint_Service SHALL rate-limit inbound webhook requests per endpoint to a maximum of 100 requests per minute, responding with HTTP 429 for excess requests
4. THE Webhook_Endpoint_Service SHALL log all webhook delivery attempts (successful and failed) with: timestamp, source IP, signature validation result, and processing outcome
5. WHEN a webhook endpoint receives more than 10 consecutive failed signature validations, THE Webhook_Endpoint_Service SHALL temporarily disable the endpoint and notify the user of potential misconfiguration or attack
6. THE Webhook_Endpoint_Service SHALL support IP allowlisting per endpoint, allowing users to restrict webhook deliveries to known source IP ranges (e.g., GitHub's published webhook IP ranges)
7. THE Webhook_Endpoint_Service SHALL provide a "Test Webhook" button in the UI that sends a sample payload to the endpoint and displays the processing result

</content>
