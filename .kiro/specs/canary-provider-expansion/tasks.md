# Implementation Plan: Canary Provider Expansion

## Overview

This plan implements the Canary Provider Expansion — scaling the DigitalBurnbag canary provider ecosystem from a foundational architecture into a comprehensive catalog of 50+ real-world API integrations, multi-canary redundancy bindings, webhook endpoint infrastructure, native canary monitoring, and enhanced visual UX. The implementation follows the three-package split: shared interfaces in `digitalburnbag-lib`, backend services in `digitalburnbag-api-lib`, and React UI in `digitalburnbag-react-components`. All binding creation uses visual UI (context menus, dropdowns, pickers) — never manual ID entry.

## Tasks

- [ ] 1. Define new shared interfaces and types in digitalburnbag-lib
  - [x] 1.1 Create RedundancyPolicy, MultiCanaryAggregateStatus types and IMultiCanaryBindingBase interface
    - Create `digitalburnbag-lib/src/lib/interfaces/canary-provider/multi-canary-binding.ts`
    - Define `RedundancyPolicy` union type: `'all_must_fail' | 'majority_must_fail' | 'any_fails' | 'weighted_consensus'`
    - Define `MultiCanaryAggregateStatus` union type: `'all_present' | 'partial_absence' | 'threshold_met' | 'triggered' | 'check_failed'`
    - Define `IMultiCanaryBindingBase<TID extends PlatformID = string>` with all fields from design: id, userId, name, vaultContainerIds, fileIds, folderIds, providerConnectionIds (2–20), redundancyPolicy, providerWeights, weightedThresholdPercent, protocolAction, canaryCondition, absenceThresholdMs, aggregateStatus, providerSignals, isActive, createdAt, updatedAt
    - _Requirements: 9.1, 9.2, 9.5, 9.8_

  - [x] 1.2 Create WebhookSignatureMethod type, IWebhookDeliveryStats, and IWebhookEndpointBase interface
    - Create `digitalburnbag-lib/src/lib/interfaces/canary-provider/webhook-endpoint.ts`
    - Define `WebhookSignatureMethod` union type: `'hmac_sha256' | 'hmac_sha1' | 'ed25519' | 'custom_header'`
    - Define `IWebhookDeliveryStats` with totalReceived, successfullyProcessed, failedValidation, lastReceivedAt, lastSuccessAt
    - Define `IWebhookEndpointBase<TID extends PlatformID = string>` with all fields from design: id, connectionId, userId, providerId, urlPath, secret, previousSecret, previousSecretExpiresAt, signatureMethod, signatureHeader, ipAllowlist, isActive, stats, consecutiveSignatureFailures, isDisabledByFailures, rateLimitPerMinute, timeoutMs, lastReceivedAt, createdAt, updatedAt
    - _Requirements: 10.1, 10.2, 10.6, 10.7, 17.1, 17.2_

  - [x] 1.3 Create NativeCanaryType, INativeCanaryConfigBase, and IPlatformEvent interfaces
    - Create `digitalburnbag-lib/src/lib/interfaces/canary-provider/native-canary-config.ts`
    - Define `NativeCanaryType` union type: `'login_activity' | 'duress_code' | 'file_access' | 'api_usage' | 'vault_interaction'`
    - Define `INativeCanaryConfigBase<TID extends PlatformID = string>` with all fields from design: id, userId, type, isEnabled, loginThreshold, loginPeriodMs, encryptedDuressCodes, fileAccessThreshold, fileAccessPeriodMs, apiUsageThreshold, apiUsagePeriodMs, vaultInteractionThreshold, vaultInteractionPeriodMs, connectionId, createdAt, updatedAt
    - Define `IPlatformEvent<TID>` with userId, type, timestamp, metadata
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7_

  - [x] 1.4 Extend ProviderCategory enum with LOCATION and ENTERTAINMENT values
    - Add `LOCATION = 'location'` and `ENTERTAINMENT = 'entertainment'` to the existing `ProviderCategory` enum
    - _Requirements: 6.5, 7.1_

  - [x] 1.5 Create IProviderCatalogFilters, IRedundancyEvaluationResult, IBindingImpactReport, and IWebhookProcessResult interfaces
    - Create `digitalburnbag-lib/src/lib/interfaces/canary-provider/expansion-types.ts`
    - Define `IProviderCatalogFilters` with category, authType, supportsWebhooks, searchQuery
    - Define `IRedundancyEvaluationResult` with bindingId, shouldTrigger, policy, providerStatuses, absenceCount, totalActive, weightedScore
    - Define `IBindingImpactReport` with affectedBindings, bindingsReducedBelowMinimum, bindingsStillValid
    - Define `IWebhookProcessResult` with success, signal, error, processingTimeMs
    - _Requirements: 9.3, 9.7, 10.3, 16.4, 16.5_

  - [x] 1.6 Create backend service interfaces for expansion subsystems
    - Create `digitalburnbag-lib/src/lib/interfaces/services/provider-catalog-service.ts` with getProviders, searchProviders, getProvidersByCategory, getProvider, getCategoryCounts, getRecommendedProviders
    - Create `digitalburnbag-lib/src/lib/interfaces/services/multi-canary-binding-service.ts` with createBinding, updateBinding, deleteBinding, getBindingsForUser, getBindingsForTarget, evaluateRedundancy, onProviderSignal, removeProviderFromBindings
    - Create `digitalburnbag-lib/src/lib/interfaces/services/webhook-endpoint-service.ts` with createEndpoint, getWebhookUrl, processWebhook, rotateSecret, getDeliveryStats, updateIpAllowlist, checkTimeouts, disableEndpoint, enableEndpoint, sendTestWebhook
    - Create `digitalburnbag-lib/src/lib/interfaces/services/native-canary-service.ts` with configure, updateConfig, getConfigs, onPlatformEvent, onDuressCodeLogin, evaluateStatus, setDuressCodes, isDuressCode
    - _Requirements: 9.1, 9.3, 10.1, 10.2, 10.6, 8.1, 8.2, 8.3_

  - [x] 1.7 Update barrel exports in digitalburnbag-lib
    - Update `digitalburnbag-lib/src/lib/interfaces/canary-provider/index.ts` to export all new interfaces and types
    - Update `digitalburnbag-lib/src/lib/interfaces/services/index.ts` to export all new service interfaces
    - Ensure all new types are accessible from the package root
    - _Requirements: 15.1_

- [x] 2. Checkpoint - Verify shared interfaces compile
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Expand BUILTIN_PROVIDER_CONFIGS with 50+ provider definitions
  - [x] 3.1 Add Health & Fitness provider configs (9 providers)
    - Add to `digitalburnbag-lib/src/lib/providers/builtin-provider-configs.ts`
    - Define configs for: Fitbit, Strava, Apple Health, Google Fit, Garmin, Oura Ring, Whoop, Peloton, MyFitnessPal
    - Each config follows `ICanaryProviderConfig<string>` with complete auth, endpoints, responseMapping, rateLimit, retry
    - Peloton uses session-based auth; all others use OAuth2
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [x] 3.2 Add Communication & Email provider configs (8 providers)
    - Define configs for: Gmail, Microsoft Outlook, Slack, Discord, Telegram, Signal, WhatsApp Business, Microsoft Teams
    - Telegram and Signal use API key auth; all others use OAuth2
    - Gmail uses metadata-only scope for minimal read access
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 3.3 Add Social Media & Content provider configs (7 providers)
    - Define configs for: Twitter/X, Reddit, YouTube, Instagram, LinkedIn, Mastodon, Twitch
    - All use OAuth2 authentication
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.4 Add Development & Productivity provider configs (8 providers)
    - Define configs for: GitHub, GitLab, Jira, Notion, Trello, Google Drive, Dropbox, Todoist
    - GitHub/GitLab support both OAuth2 and Personal Access Token; Trello uses API key + token
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 3.5 Add Smart Home & IoT provider configs (6 providers)
    - Define configs for: SmartThings, Home Assistant, Philips Hue, Ring, Nest/Google Home, Amazon Alexa
    - Home Assistant and Philips Hue use API key auth; others use OAuth2
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 3.6 Add Financial & Location provider configs (7 providers)
    - Define configs for: Plaid, Coinbase, PayPal, Venmo, Google Maps Timeline, Life360, Foursquare
    - Plaid uses API key (client_id + secret); Life360 uses session-based auth; others use OAuth2
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 3.7 Add Entertainment & Streaming provider configs (7 providers)
    - Define configs for: Spotify, Netflix, Steam, Xbox Live, PlayStation Network, Last.fm, Plex
    - Steam and Last.fm use API key; Plex uses auth token; Netflix uses session; others use OAuth2
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 3.8 Register all new configs in the BUILTIN_PROVIDER_CONFIGS array and update exports
    - Add all 52 new provider configs to the `BUILTIN_PROVIDER_CONFIGS` array
    - Ensure each config uses the correct `ProviderCategory` including new LOCATION and ENTERTAINMENT values
    - _Requirements: 1.1–7.7, 15.1_

- [ ] 4. Validate expanded provider catalog
  - [x] 4.1 Write property test: Provider config schema validation completeness (Property 16)
    - **Property 16: Provider config schema validation completeness**
    - For any config in BUILTIN_PROVIDER_CONFIGS, validation SHALL pass with all required fields present: id, name, description, category, baseUrl, auth, endpoints.activity (with responseMapping), endpoints.healthCheck
    - **Validates: Requirements 15.1, 15.3, 15.4, 15.5, 15.7**

  - [x] 4.2 Write property test: Provider config validation error specificity (Property 17)
    - **Property 17: Provider config validation error specificity**
    - For any config with one or more missing required fields, validation SHALL include a specific error for each missing field; error count SHALL equal missing field count
    - **Validates: Requirements 15.2, 15.6**

  - [x] 4.3 Write property test: Provider catalog search correctness (Property 14)
    - **Property 14: Provider catalog search correctness**
    - For any search query and any set of provider configs, all returned providers SHALL have the query as a case-insensitive substring of name or description; no matching provider SHALL be omitted
    - **Validates: Requirements 11.4**

  - [x] 4.4 Write property test: Provider catalog category filtering (Property 15)
    - **Property 15: Provider catalog category filtering**
    - For any category filter, all returned providers SHALL have matching category; no provider with matching category SHALL be omitted
    - **Validates: Requirements 11.3**

- [x] 5. Checkpoint - Verify provider configs compile and pass validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement ProviderCatalogService in digitalburnbag-api-lib
  - [x] 6.1 Implement ProviderCatalogService class
    - Create `digitalburnbag-api-lib/src/lib/services/provider-catalog-service.ts`
    - Implement `getProviders` with optional filters (category, authType, supportsWebhooks, searchQuery)
    - Implement `searchProviders` with case-insensitive substring matching on name and description
    - Implement `getProvidersByCategory` returning `Map<ProviderCategory, ICanaryProviderConfig[]>`
    - Implement `getProvider` by ID lookup
    - Implement `getCategoryCounts` returning provider count per category
    - Implement `getRecommendedProviders` returning highest-reliability providers
    - Load from BUILTIN_PROVIDER_CONFIGS on initialization
    - _Requirements: 11.2, 11.3, 11.4, 11.7, 11.8, 15.1_

  - [x] 6.2 Write unit tests for ProviderCatalogService
    - Test all 52+ providers are loaded from BUILTIN_PROVIDER_CONFIGS
    - Test category filtering returns only matching providers
    - Test search returns case-insensitive matches across name and description
    - Test getCategoryCounts returns correct counts for all categories
    - Test getRecommendedProviders returns non-empty list
    - _Requirements: 11.3, 11.4, 11.7, 11.8_

- [ ] 7. Implement NativeCanaryService in digitalburnbag-api-lib
  - [x] 7.1 Create BrightDBNativeCanaryConfigRepository class
    - Create `digitalburnbag-api-lib/src/lib/collections/native-canary-config-collection.ts`
    - Follow existing BrightDB collection pattern with `Collection` and `IdSerializer<TID>`
    - Store fields: userId, type, isEnabled, threshold/period fields per type, encryptedDuressCodes, connectionId, timestamps
    - Implement CRUD methods: getConfigById, getConfigsByUser, createConfig, updateConfig
    - _Requirements: 8.1, 8.4, 8.5, 8.6_

  - [x] 7.2 Implement NativeCanaryService class
    - Create `digitalburnbag-api-lib/src/lib/services/native-canary-service.ts`
    - Implement `configure`: create native canary config with type-specific thresholds
    - Implement `onPlatformEvent`: count events within configured period, emit PRESENCE if count ≥ threshold, ABSENCE if below
    - Implement `onDuressCodeLogin`: immediately emit DURESS signal without waiting for scheduled check
    - Implement `evaluateStatus`: check event counts against thresholds for each native canary type
    - Implement `setDuressCodes`: encrypt codes at rest via CredentialService
    - Implement `isDuressCode`: decrypt and compare during authentication
    - Use internal event bus (no HTTP) for all signal propagation
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 7.3 Write property test: Native canary threshold evaluation correctness (Property 1)
    - **Property 1: Native canary threshold evaluation correctness**
    - For any native canary type, threshold N, period P, and event sequence: signal is PRESENCE if event count ≥ N, ABSENCE if < N
    - **Validates: Requirements 8.1, 8.4, 8.5, 8.6**

  - [x] 7.4 Write property test: Duress code detection correctness (Property 2)
    - **Property 2: Duress code detection correctness**
    - For any set of configured duress codes and any authentication code, isDuressCode returns true iff the code exactly matches one of the configured codes
    - **Validates: Requirements 8.2, 8.7**

  - [x] 7.5 Write unit tests for NativeCanaryService
    - Test duress code immediate signal emission without waiting for schedule (Req 8.3)
    - Test no external HTTP calls made by native canaries (Req 8.8)
    - Test duress code must differ from normal credentials (error handling)
    - Test each native canary type configurable with correct thresholds
    - _Requirements: 8.3, 8.7, 8.8_

- [ ] 8. Implement MultiCanaryBindingService in digitalburnbag-api-lib
  - [x] 8.1 Create BrightDBMultiCanaryBindingRepository class
    - Create `digitalburnbag-api-lib/src/lib/collections/multi-canary-binding-collection.ts`
    - Follow existing BrightDB collection pattern with `Collection` and `IdSerializer<TID>`
    - Store fields: userId, name, vaultContainerIds, fileIds, folderIds, providerConnectionIds, redundancyPolicy, providerWeights, weightedThresholdPercent, protocolAction, canaryCondition, absenceThresholdMs, aggregateStatus, providerSignals, isActive, lastEvaluatedAt, timestamps
    - Implement CRUD methods: getBindingById, getBindingsForUser, getBindingsForTarget, createBinding, updateBinding, deleteBinding, getBindingsForConnection
    - _Requirements: 9.1, 9.6_

  - [x] 8.2 Implement MultiCanaryBindingService class
    - Create `digitalburnbag-api-lib/src/lib/services/multi-canary-binding-service.ts`
    - Implement `createBinding`: validate 2–20 providers, all must be connected status, detect circular cascades
    - Implement `evaluateRedundancy`: apply redundancy policy (all_must_fail, majority_must_fail, any_fails, weighted_consensus), exclude CHECK_FAILED providers from consensus, exclude paused providers
    - Implement `onProviderSignal`: find all bindings containing the connection, re-evaluate each, trigger protocol action if threshold met
    - Implement `removeProviderFromBindings`: remove provider from all bindings, return impact report with bindings reduced below minimum
    - For weighted_consensus: validate weights 0.1–10.0, threshold 0–100%
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8_

  - [x] 8.3 Write property test: Multi-canary binding provider count validation (Property 3)
    - **Property 3: Multi-canary binding provider count validation**
    - For any N provider IDs, creation succeeds iff 2 ≤ N ≤ 20; rejected otherwise
    - **Validates: Requirements 9.1, 9.8**

  - [x] 8.4 Write property test: Redundancy policy evaluation correctness (Property 4)
    - **Property 4: Redundancy policy evaluation correctness**
    - For any set of signals and any policy: all_must_fail triggers iff ALL active report ABSENCE; majority_must_fail iff >50% ABSENCE; any_fails iff ≥1 ABSENCE; weighted_consensus iff weighted score exceeds threshold
    - **Validates: Requirements 9.3, 9.4, 9.5**

  - [x] 8.5 Write property test: CHECK_FAILED exclusion from consensus (Property 5)
    - **Property 5: CHECK_FAILED exclusion from consensus**
    - For any binding evaluation where some providers report CHECK_FAILED, those providers are excluded from active count and not treated as ABSENCE
    - **Validates: Requirements 9.7**

  - [x] 8.6 Write property test: Paused providers excluded from aggregation (Property 6)
    - **Property 6: Paused providers excluded from aggregation**
    - For any set of connections where some are paused, paused providers are excluded from binding evaluation and aggregate health
    - **Validates: Requirements 16.2**

  - [x] 8.7 Write property test: Provider disconnect removes from all bindings (Property 22)
    - **Property 22: Provider disconnect removes from all bindings**
    - For any provider in K bindings, disconnecting removes it from all K; bindings reduced to <2 providers are flagged
    - **Validates: Requirements 16.4, 16.5, 16.6**

  - [x] 8.8 Write unit tests for MultiCanaryBindingService
    - Test binding creation rejects <2 or >20 providers
    - Test weighted_consensus rejects weights outside 0.1–10.0 range
    - Test weighted_consensus rejects threshold outside 0–100%
    - Test all providers CHECK_FAILED sets aggregate to CHECK_FAILED, not ABSENCE
    - Test circular cascade detection on creation
    - _Requirements: 9.1, 9.5, 9.7, 9.8_

- [x] 9. Checkpoint - Verify NativeCanaryService and MultiCanaryBindingService compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement WebhookEndpointService in digitalburnbag-api-lib
  - [x] 10.1 Create BrightDBWebhookEndpointRepository class
    - Create `digitalburnbag-api-lib/src/lib/collections/webhook-endpoint-collection.ts`
    - Follow existing BrightDB collection pattern with `Collection` and `IdSerializer<TID>`
    - Store fields: connectionId, userId, providerId, urlPath, secret, previousSecret, previousSecretExpiresAt, signatureMethod, signatureHeader, ipAllowlist, rateLimitPerMinute, consecutiveSignatureFailures, isDisabledByFailures, timeoutMs, lastReceivedAt, stats, isActive, timestamps
    - Implement CRUD methods: getEndpointById, getEndpointByConnectionId, getEndpointsForUser, createEndpoint, updateEndpoint, getEndpointByUrlPath
    - _Requirements: 10.1, 10.7_

  - [x] 10.2 Implement WebhookEndpointService class
    - Create `digitalburnbag-api-lib/src/lib/services/webhook-endpoint-service.ts`
    - Implement `createEndpoint`: generate 32-byte crypto.randomBytes hex-encoded secret, construct URL path as `{connectionId}/{secret}`
    - Implement `processWebhook`: validate IP allowlist → check rate limit → verify signature (hmac_sha256, hmac_sha1, ed25519, custom_header) → extract activity via responseMapping → emit heartbeat signal → update stats
    - Implement `rotateSecret`: generate new secret, move current to previousSecret with grace period expiry, accept both during grace period
    - Implement `checkTimeouts`: find endpoints where `lastReceivedAt + timeoutMs < now`, emit CHECK_FAILED
    - Implement `disableEndpoint`: set isDisabledByFailures=true after 10 consecutive signature failures
    - Implement `sendTestWebhook`: generate sample payload and process it
    - Respond within 5 seconds to all webhook deliveries
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 17.1, 17.2, 17.3, 17.5, 17.6, 17.7_

  - [x] 10.3 Write property test: Webhook URL uniqueness and format (Property 7)
    - **Property 7: Webhook URL uniqueness and format**
    - For any number of endpoint creations, every URL path is unique and every secret is exactly 64 hex characters (32 bytes)
    - **Validates: Requirements 10.1, 17.1**

  - [x] 10.4 Write property test: Webhook signature verification round-trip (Property 8)
    - **Property 8: Webhook signature verification round-trip**
    - For any payload, secret, and supported signature method: computing then verifying succeeds; verifying with mutated signature fails
    - **Validates: Requirements 10.2, 17.2**

  - [x] 10.5 Write property test: Webhook secret rotation grace period (Property 9)
    - **Property 9: Webhook secret rotation grace period**
    - During rotation, verification succeeds with either current or previous secret within grace period; after expiry, previous secret fails
    - **Validates: Requirements 10.6**

  - [x] 10.6 Write property test: Webhook delivery statistics accuracy (Property 10)
    - **Property 10: Webhook delivery statistics accuracy**
    - For any sequence of delivery attempts, totalReceived = successfullyProcessed + failedValidation; each counter equals its outcome count
    - **Validates: Requirements 10.7**

  - [x] 10.7 Write property test: Webhook consecutive failure disable threshold (Property 11)
    - **Property 11: Webhook consecutive failure disable threshold**
    - Endpoint disabled iff ≥10 consecutive failures; any success resets counter to 0
    - **Validates: Requirements 17.5**

  - [x] 10.8 Write property test: Webhook IP allowlist enforcement (Property 12)
    - **Property 12: Webhook IP allowlist enforcement**
    - Webhook accepted iff source IP falls within at least one allowed CIDR range; empty allowlist accepts all
    - **Validates: Requirements 17.6**

  - [x] 10.9 Write property test: Webhook rate limiting (Property 13)
    - **Property 13: Webhook rate limiting**
    - Requests accepted iff count within 60s window ≤ rateLimitPerMinute (default 100)
    - **Validates: Requirements 17.3**

  - [x] 10.10 Write unit tests for WebhookEndpointService
    - Test HTTP 401 on invalid signature (Req 10.5)
    - Test HTTP 429 on rate limit exceeded (Req 17.3)
    - Test HTTP 403 on IP not in allowlist (Req 17.6)
    - Test HTTP 503 on disabled endpoint (Req 17.5)
    - Test webhook timeout emits CHECK_FAILED (Req 10.8)
    - Test webhook delivery logging with all required fields (Req 17.4)
    - Test test webhook button sends sample and returns result (Req 17.7)
    - _Requirements: 10.4, 10.5, 10.8, 17.3, 17.4, 17.5, 17.6, 17.7_

- [ ] 11. Implement WebhookController and expansion API endpoints in digitalburnbag-api-lib
  - [x] 11.1 Implement WebhookController for inbound webhook processing
    - Create `digitalburnbag-api-lib/src/lib/controllers/webhook-controller.ts`
    - `POST /api/webhooks/canary/:connectionId/:secret` — validate and process inbound webhook payload
    - Return HTTP 200 within 5 seconds; process asynchronously if extraction exceeds timeout
    - Return HTTP 401 for invalid signature, HTTP 404 for unknown endpoint (without revealing existence), HTTP 429 for rate limit, HTTP 403 for IP block
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 11.2 Implement ProviderCatalog API endpoints
    - Add to existing provider controller or create new catalog controller
    - `GET /api/providers/catalog` — get full catalog with optional filters (category, authType, supportsWebhooks, searchQuery)
    - `GET /api/providers/catalog/search?q={query}` — search providers by name/description
    - `GET /api/providers/catalog/categories` — get providers grouped by category
    - `GET /api/providers/catalog/recommended` — get recommended providers
    - _Requirements: 11.2, 11.3, 11.4, 11.7_

  - [x] 11.3 Implement MultiCanaryBinding API endpoints
    - Create `digitalburnbag-api-lib/src/lib/controllers/multi-canary-binding-controller.ts`
    - `POST /api/multi-canary-bindings` — create binding (validate 2–20 providers, all connected)
    - `GET /api/multi-canary-bindings` — list user's bindings
    - `GET /api/multi-canary-bindings/:id` — get binding details
    - `PUT /api/multi-canary-bindings/:id` — update binding (add/remove providers, change policy)
    - `DELETE /api/multi-canary-bindings/:id` — delete binding
    - `GET /api/multi-canary-bindings/target/:targetId` — get bindings for a target
    - _Requirements: 9.1, 9.2, 9.6_

  - [x] 11.4 Implement WebhookEndpoint management API endpoints
    - Create `digitalburnbag-api-lib/src/lib/controllers/webhook-endpoint-controller.ts`
    - `POST /api/webhook-endpoints` — create webhook endpoint for a connection
    - `GET /api/webhook-endpoints` — list user's endpoints
    - `PUT /api/webhook-endpoints/:id/rotate-secret` — rotate secret with grace period
    - `PUT /api/webhook-endpoints/:id/ip-allowlist` — update IP allowlist
    - `POST /api/webhook-endpoints/:id/test` — send test webhook
    - `GET /api/webhook-endpoints/:id/stats` — get delivery stats
    - _Requirements: 10.1, 10.6, 10.7, 17.6, 17.7_

  - [x] 11.5 Implement NativeCanary API endpoints
    - Create `digitalburnbag-api-lib/src/lib/controllers/native-canary-controller.ts`
    - `POST /api/native-canaries` — configure native canary
    - `GET /api/native-canaries` — list user's native canary configs
    - `PUT /api/native-canaries/:id` — update native canary config
    - `PUT /api/native-canaries/duress-codes` — set duress codes (encrypted at rest)
    - _Requirements: 8.1, 8.7_

- [x] 12. Checkpoint - Verify all backend services, repositories, and API endpoints compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement ProviderMarketplace frontend component
  - [x] 13.1 Create ProviderMarketplace page component
    - Create `digitalburnbag-react-components/src/lib/components/ProviderMarketplace.tsx`
    - Category sidebar/tabs with provider counts per category
    - Search bar with real-time filtering across names and descriptions
    - Provider cards showing: icon, name, category badge, description, auth methods, "Connect" button
    - "Connected" badge (green) on already-connected providers
    - "Recommended" badge on high-reliability providers
    - Collapsible category sections with provider counts
    - "Connect" button launches ActivationFlow wizard
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 13.2 Write unit tests for ProviderMarketplace
    - Test marketplace accessible from left nav (Req 11.1)
    - Test provider cards display all required fields (Req 11.2)
    - Test category filtering works (Req 11.3)
    - Test search filters in real-time (Req 11.4)
    - Test "Connect" button launches activation flow (Req 11.5)
    - Test connected badge shows green indicator (Req 11.6)
    - Test recommended badge shows on high-reliability providers (Req 11.7)
    - Test collapsible category sections with counts (Req 11.8)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [ ] 14. Implement ProviderHealthGrid frontend component
  - [x] 14.1 Create ProviderHealthGrid component
    - Create `digitalburnbag-react-components/src/lib/components/ProviderHealthGrid.tsx`
    - Responsive grid layout of ProviderConnectionCard components
    - Each card shows: icon, name, status color (green/amber/red/purple), time since last heartbeat, mini sparkline
    - WebSocket-driven real-time updates — no polling
    - Sort controls: by name, last activity, status severity, category
    - View toggle: compact (icon + color dot) vs expanded (full card)
    - Status transition animation: brief pulse on CHECK_FAILED or ABSENCE transitions
    - Aggregate health bar at top: percentage breakdown by status
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 14.2 Write property test: Provider health grid aggregate percentage calculation (Property 18)
    - **Property 18: Provider health grid aggregate percentage calculation**
    - For any set of statuses, percentages sum to 100% (within floating-point tolerance); each category's percentage = (count / total) * 100
    - **Validates: Requirements 12.7**

  - [x] 14.3 Write property test: Provider health grid sorting correctness (Property 19)
    - **Property 19: Provider health grid sorting correctness**
    - For any connections and any sort criterion, result is correctly ordered and contains exactly the same elements
    - **Validates: Requirements 12.4**

  - [x] 14.4 Write unit tests for ProviderHealthGrid
    - Test responsive grid renders all connected providers (Req 12.1)
    - Test card displays all required fields with correct status colors (Req 12.2)
    - Test WebSocket updates without page refresh (Req 12.3)
    - Test compact/expanded view toggle (Req 12.5)
    - Test status transition pulse animation class (Req 12.6)
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6_

- [x] 15. Implement CanaryContextMenu frontend component
  - [x] 15.1 Create CanaryContextMenu component
    - Create `digitalburnbag-react-components/src/lib/components/CanaryContextMenu.tsx`
    - "Attach Canary" menu item with canary icon and count badge showing existing bindings
    - Provider submenu: connected providers grouped by category, each showing status indicator
    - BindingConfigPopover: condition dropdown (ABSENCE, DURESS), protocol action dropdown, threshold slider, "Add more providers" button, redundancy policy dropdown (when 2+ selected), "Attach" button
    - "Multi-Canary Setup" option opens full MultiCanaryBindingPanel
    - "Manage Canaries" option (when bindings exist) shows existing bindings with edit/remove
    - "Connect a Provider First" message with marketplace link (when no providers connected)
    - **Critical**: NO manual ID entry anywhere — all selection via dropdowns, checkboxes, visual pickers
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 15.2 Write property test: Context menu binding count badge accuracy (Property 21)
    - **Property 21: Context menu binding count badge accuracy**
    - For any target with N bindings (N ≥ 0), the count badge displays exactly N
    - **Validates: Requirements 13.5, 13.6**

  - [x] 15.3 Write unit tests for CanaryContextMenu
    - Test "Attach Canary" appears on right-click (Req 13.1)
    - Test provider submenu grouped by category with status indicators (Req 13.2)
    - Test binding config popover uses dropdowns/sliders, not text inputs (Req 13.3)
    - Test "Multi-Canary Setup" opens full panel (Req 13.4)
    - Test "Manage Canaries" shows existing bindings (Req 13.5)
    - Test "Connect a Provider First" message when no providers (Req 13.7)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.7_

- [x] 16. Implement CanaryLeftMenu and MultiCanaryBindingPanel frontend components
  - [x] 16.1 Create CanaryLeftMenu component
    - Create `digitalburnbag-react-components/src/lib/components/CanaryLeftMenu.tsx`
    - Sub-sections: "My Providers" (compact list with status indicators), "Provider Marketplace" (link), "Multi-Canary Bindings" (list with target names, provider count, aggregate status), "Webhook Endpoints" (list with provider name, last received, success rate)
    - Warning badge on "My Providers" when any provider has CHECK_FAILED or ABSENCE
    - Overall canary system health indicator (healthy/degraded/critical)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 16.2 Create MultiCanaryBindingPanel component
    - Create `digitalburnbag-react-components/src/lib/components/MultiCanaryBindingPanel.tsx`
    - Provider picker: checkboxes next to connected providers (visual, not ID-based)
    - Redundancy policy selector: dropdown with descriptions of each policy
    - Weight sliders (for weighted_consensus): per-provider visual sliders (0.1–10.0)
    - Threshold percentage slider (for weighted_consensus): default 75%
    - Target selector: file/folder browser tree with checkboxes (visual selection)
    - Status display: per-provider signal indicators and aggregate result
    - _Requirements: 9.1, 9.2, 9.5, 9.6_

  - [x] 16.3 Create WebhookEndpointPanel component
    - Create `digitalburnbag-react-components/src/lib/components/WebhookEndpointPanel.tsx`
    - Endpoint list with provider name, URL (copy button), last received, success rate
    - Secret display with show/hide toggle and copy button
    - "Rotate Secret" button with grace period configuration
    - "Test Webhook" button with result display
    - IP allowlist editor: add/remove CIDR ranges
    - Delivery stats: total, successful, failed, chart over time
    - _Requirements: 10.1, 10.6, 10.7, 14.5, 17.6, 17.7_

  - [x] 16.4 Write property test: Multi-canary binding display completeness (Property 20)
    - **Property 20: Multi-canary binding display completeness**
    - For any binding, rendered display includes: target names (not IDs), bound provider count, aggregate status, per-provider signal indicators
    - **Validates: Requirements 9.6, 14.4**

  - [x] 16.5 Write property test: Overall system health classification (Property 23)
    - **Property 23: Overall system health classification**
    - "critical" if all providers CHECK_FAILED/ABSENCE and total > 0; "degraded" if any but not all; "healthy" if all PRESENCE or empty
    - **Validates: Requirements 14.7**

  - [x] 16.6 Write property test: Attention-needed badge count accuracy (Property 24)
    - **Property 24: Attention-needed badge count accuracy**
    - Warning badge count equals number of providers with CHECK_FAILED, ABSENCE, "error", "expired", or "paused" status
    - **Validates: Requirements 14.6**

  - [x] 16.7 Write unit tests for CanaryLeftMenu, MultiCanaryBindingPanel, and WebhookEndpointPanel
    - Test all four left-menu sub-sections render (Req 14.1)
    - Test "My Providers" compact list with status indicators (Req 14.2)
    - Test marketplace link navigates correctly (Req 14.3)
    - Test multi-canary bindings list shows target names and aggregate status (Req 14.4)
    - Test webhook endpoints list shows provider name and success rate (Req 14.5)
    - Test warning badge on providers needing attention (Req 14.6)
    - Test overall health indicator (Req 14.7)
    - Test provider picker uses checkboxes not ID input (Req 9.1)
    - Test weight sliders range 0.1–10.0 (Req 9.5)
    - Test secret show/hide toggle and copy button (Req 10.1)
    - Test "Rotate Secret" button (Req 10.6)
    - Test "Test Webhook" button (Req 17.7)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 9.1, 9.5, 10.1, 10.6, 17.7_

- [x] 17. Checkpoint - Verify all frontend components compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Implement Provider Activation/Deactivation lifecycle and wire components together
  - [x] 18.1 Implement ActivationFlow wizard component
    - Create `digitalburnbag-react-components/src/lib/components/ActivationFlow.tsx`
    - Steps: authentication → test connection → absence threshold configuration → optional multi-canary binding setup
    - Single streamlined wizard flow launched from ProviderMarketplace "Connect" button
    - _Requirements: 16.1_

  - [x] 18.2 Implement provider pause and disconnect functionality
    - Add pause/resume support: stops heartbeat checks, excludes from aggregation, preserves credentials
    - Add disconnect support: deletes credentials, removes from all multi-canary bindings, archives status history
    - Show disconnect warning when provider is part of multi-canary binding
    - Show below-minimum warning when disconnect would reduce binding to <2 providers
    - Paused providers display grayed out with pause icon in ProviderHealthGrid
    - _Requirements: 16.2, 16.3, 16.4, 16.5, 16.6_

  - [x] 18.3 Wire navigation and integrate all frontend components
    - Add ProviderMarketplace to CanaryLeftMenu navigation
    - Wire CanaryContextMenu into file browser right-click handler
    - Wire ProviderHealthGrid into CanaryLeftMenu "My Providers" section
    - Wire MultiCanaryBindingPanel into CanaryLeftMenu and CanaryContextMenu
    - Wire WebhookEndpointPanel into CanaryLeftMenu
    - Wire ActivationFlow into ProviderMarketplace "Connect" buttons
    - Connect all components to BurnbagApiClient for API calls
    - _Requirements: 11.1, 13.1, 14.1, 14.3_

  - [x] 18.4 Write unit tests for ActivationFlow and provider lifecycle
    - Test activation flow steps render in correct order (Req 16.1)
    - Test paused provider visual state: grayed out with pause icon (Req 16.3)
    - Test disconnect warning when provider in binding (Req 16.5)
    - Test below-minimum warning when binding would have <2 providers (Req 16.6)
    - _Requirements: 16.1, 16.3, 16.5, 16.6_

- [x] 19. Write integration tests for end-to-end flows
  - [x] 19.1 Write integration tests for webhook end-to-end flow
    - POST to webhook URL → signature verification → signal emission → stats update
    - Secret rotation → both secrets accepted → grace period expires → old rejected
    - _Requirements: 10.1, 10.2, 10.3, 10.6, 10.7_

  - [x] 19.2 Write integration tests for multi-canary evaluation flow
    - Provider signal change → binding evaluation → protocol trigger (or not)
    - Provider disconnect → credential deletion → binding removal → status update
    - _Requirements: 9.3, 16.4, 16.5_

  - [x] 19.3 Write integration tests for native canary event flow
    - Platform event → native canary evaluation → signal emission
    - Login with duress code → immediate DURESS signal → protocol execution
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 19.4 Write integration tests for visual UX flows
    - Context menu → select provider → configure → create binding (full visual flow)
    - Marketplace → connect → configure → attach to vault (full flow)
    - _Requirements: 13.1, 13.3, 11.5, 16.1_

- [x] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–24)
- Unit tests validate specific examples and edge cases
- All property tests use fast-check with minimum 100 iterations per property
- The `TID extends PlatformID` generic pattern is used consistently across all interfaces
- All binding creation uses visual UI (context menus, dropdowns, pickers) — NO manual ID entry anywhere
- This spec builds on the completed canary-provider-system spec; existing services (ProviderRegistry, HealthMonitorService, AggregationEngine, CredentialService, FailurePolicyManager) are extended, not replaced
