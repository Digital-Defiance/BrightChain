# Implementation Plan: Canary Provider System

## Overview

This plan implements the Canary Provider System — a first-class subsystem for managing external API provider connections, heartbeat monitoring, failure policy evaluation, credential security, and aggregate status computation within DigitalBurnbag. The implementation follows the three-package split: shared interfaces in `digitalburnbag-lib`, backend services in `digitalburnbag-api-lib`, and React UI in `digitalburnbag-react-components`.

## Tasks

- [x] 1. Define shared interfaces and types in digitalburnbag-lib
  - [x] 1.1 Create IFailurePolicyConfig interface and FailurePolicyAction type
    - Create `digitalburnbag-lib/src/lib/interfaces/canary-provider/failure-policy.ts`
    - Define `FailurePolicyAction` union type: `'pause_and_notify' | 'notify_only' | 'trigger_protocol' | 'ignore'`
    - Define `IFailurePolicyConfig` with `failureThreshold: number` (default 5) and `failurePolicy: FailurePolicyAction`
    - Export from the canary-provider barrel
    - _Requirements: 4.1, 4.2_

  - [x] 1.2 Create IStatusHistoryEntry interface
    - Create `digitalburnbag-lib/src/lib/interfaces/canary-provider/status-history-entry.ts`
    - Define `IStatusHistoryEntry<TID extends PlatformID = string>` with fields: id, connectionId, userId, timestamp, signalType, eventCount, confidence, timeSinceLastActivityMs, httpStatusCode, errorMessage, rawResult, createdAt
    - Export from the canary-provider barrel
    - _Requirements: 7.1_

  - [x] 1.3 Create IProviderConnectionBase interface
    - Create `digitalburnbag-lib/src/lib/interfaces/canary-provider/provider-connection-base.ts`
    - Define `IProviderConnectionBase<TID extends PlatformID = string>` with fields: id, userId, providerId, status (union of 'connected' | 'expired' | 'error' | 'paused' | 'pending'), providerUserId, providerUsername, connectedAt, lastCheckedAt, lastCheckSignalType, lastActivityAt, isEnabled, checkIntervalMs, consecutiveFailures, failurePolicyConfig, absenceConfig, duressConfig, isPaused, pauseReason, createdAt, updatedAt
    - Export from the canary-provider barrel
    - _Requirements: 2.4, 4.1, 4.2, 4.4_

  - [x] 1.4 Create backend service interfaces (IHealthMonitorService, IFailurePolicyManager, ICredentialService, IAggregationEngine, IProviderConfigValidator)
    - Create `digitalburnbag-lib/src/lib/interfaces/services/health-monitor-service.ts` with startMonitoring, stopMonitoring, executeCheck, refreshTokensIfNeeded, getStatusHistory methods
    - Create `digitalburnbag-lib/src/lib/interfaces/services/failure-policy-manager.ts` with evaluateFailure, executePolicy methods
    - Create `digitalburnbag-lib/src/lib/interfaces/services/credential-service.ts` with storeCredentials, getDecryptedCredentials, deleteCredentials, validateCredentialFreshness methods
    - Create `digitalburnbag-lib/src/lib/interfaces/services/aggregation-engine.ts` with aggregate method
    - Create `digitalburnbag-lib/src/lib/interfaces/services/provider-config-validator.ts` with validate method
    - Export all from the services barrel
    - _Requirements: 3.1, 3.2, 3.3, 4.3, 6.1, 6.5, 9.1, 10.1, 10.2_

  - [x] 1.5 Update barrel exports in digitalburnbag-lib
    - Update `digitalburnbag-lib/src/lib/interfaces/canary-provider/index.ts` to export new interfaces
    - Update `digitalburnbag-lib/src/lib/interfaces/services/index.ts` to export new service interfaces
    - Ensure all new types are accessible from the package root
    - _Requirements: 1.1, 8.1_

- [x] 2. Checkpoint - Verify shared interfaces compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement FailurePolicyManager in digitalburnbag-api-lib
  - [x] 3.1 Implement FailurePolicyManager class
    - Create `digitalburnbag-api-lib/src/lib/services/failure-policy-manager.ts`
    - Implement `evaluateFailure`: compare consecutiveFailures against connection's failurePolicyConfig.failureThreshold, return `{ shouldEscalate, action }` — escalate when count >= threshold
    - Implement `executePolicy`: for `pause_and_notify` set isPaused=true and record pauseReason; for `notify_only` send notification; for `trigger_protocol` treat as ABSENCE and evaluate bindings; for `ignore` log only
    - _Requirements: 4.2, 4.3, 4.5, 4.6_

  - [x] 3.2 Write property test: Failure policy validation (Property 7)
    - **Property 7: Failure policy validation accepts only valid values**
    - For any string, the validator accepts it iff it is one of the four valid FailurePolicyAction values
    - **Validates: Requirements 4.2**

  - [x] 3.3 Write property test: Failure threshold triggers at exact count (Property 8)
    - **Property 8: Failure threshold triggers policy at exact count**
    - For any threshold N (1–100), evaluateFailure does not escalate when failures < N, and escalates when failures = N
    - **Validates: Requirements 4.3**

  - [x] 3.4 Write property test: Successful check resets failure counter (Property 9)
    - **Property 9: Successful check resets failure counter**
    - For any connection with K≥1 consecutive failures, a PRESENCE or ABSENCE result resets counter to 0 and status to "connected"
    - **Validates: Requirements 4.4**

  - [x] 3.5 Write unit tests for FailurePolicyManager
    - Test default threshold is 5 (Req 4.1)
    - Test pause_and_notify sets isPaused=true and pauseReason (Req 4.5)
    - Test trigger_protocol evaluates bindings as ABSENCE (Req 4.6)
    - _Requirements: 4.1, 4.5, 4.6_

- [x] 4. Implement ProviderConfigValidator in digitalburnbag-api-lib
  - [x] 4.1 Implement ProviderConfigValidator class
    - Create `digitalburnbag-api-lib/src/lib/services/provider-config-validator.ts`
    - Validate required fields: id, name, baseUrl, auth, endpoints.activity, endpoints.activity.responseMapping
    - Return `{ valid: boolean; errors: string[] }`
    - _Requirements: 8.3_

  - [x] 4.2 Write property test: Config validation rejects incomplete configs (Property 17)
    - **Property 17: Provider config validation rejects incomplete configs**
    - For any config missing required fields, validation fails; for any config with all required fields, validation succeeds
    - **Validates: Requirements 8.3**

- [x] 5. Implement CredentialService in digitalburnbag-api-lib
  - [x] 5.1 Implement CredentialService class
    - Create `digitalburnbag-api-lib/src/lib/services/credential-service.ts`
    - Implement `storeCredentials`: encrypt accessToken, refreshToken, apiKey with AES-256-GCM before persisting to the provider_credentials BrightDB collection (encrypted values stored as base64 strings)
    - Implement `getDecryptedCredentials`: retrieve and decrypt in-memory only
    - Implement `deleteCredentials`: permanently remove all credential data for a connection
    - Implement `validateCredentialFreshness`: check tokenExpiresAt against current time
    - Inject encryption service (decoupled from specific crypto implementation)
    - _Requirements: 10.1, 10.2, 10.4_

  - [x] 5.2 Write property test: Credential encryption round-trip (Property 22)
    - **Property 22: Credential encryption round-trip**
    - For any valid credential string, encrypting then decrypting produces the original string
    - **Validates: Requirements 10.1**

  - [x] 5.3 Write property test: Credentials never appear in outputs (Property 23)
    - **Property 23: Credentials never appear in outputs**
    - For any credential value and any error scenario, the error message and log output do not contain the credential as a substring
    - **Validates: Requirements 10.3**

  - [x] 5.4 Write unit tests for CredentialService
    - Test credential deletion removes all data on disconnect (Req 10.4)
    - Test decrypt-before-call, clear-after-call lifecycle (Req 10.2)
    - _Requirements: 10.2, 10.4_

- [x] 6. Checkpoint - Verify backend services compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement AggregationEngine in digitalburnbag-api-lib
  - [x] 7.1 Implement AggregationEngine class
    - Create `digitalburnbag-api-lib/src/lib/services/aggregation-engine.ts`
    - Implement `aggregate` method supporting strategies: `any`, `all`, `majority`, `weighted`
    - For `weighted`: apply category weights (PLATFORM_NATIVE: 2.0, HEALTH_FITNESS: 1.5, COMMUNICATION: 1.2, others: 1.0) with per-provider overrides
    - Duress safety: if any provider reports DURESS, set `duressDetected = true` regardless of strategy
    - All-failures safety: if all providers return CHECK_FAILED, aggregate is CHECK_FAILED not ABSENCE
    - Edge cases: all paused → INCONCLUSIVE; single provider → pass through; no providers → INCONCLUSIVE with 0 confidence
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 7.2 Write property test: Aggregation strategy correctness (Property 19)
    - **Property 19: Aggregation strategy correctness**
    - For any set of results and any strategy: "any" → PRESENCE if ≥1 PRESENCE; "all" → PRESENCE only if all PRESENCE; "majority" → PRESENCE if >50% PRESENCE; "weighted" → PRESENCE if weighted score exceeds threshold
    - **Validates: Requirements 9.1, 9.3**

  - [x] 7.3 Write property test: Duress detection safety invariant (Property 20)
    - **Property 20: Duress detection safety invariant**
    - For any strategy and any results where ≥1 provider reports DURESS, aggregate has duressDetected=true
    - **Validates: Requirements 9.4**

  - [x] 7.4 Write property test: All-failures aggregate safety invariant (Property 21)
    - **Property 21: All-failures aggregate safety invariant**
    - For any number of providers (≥1) where all return CHECK_FAILED, aggregate signal is CHECK_FAILED not ABSENCE
    - **Validates: Requirements 9.5**

  - [x] 7.5 Write unit tests for AggregationEngine
    - Test default strategy is "any" (Req 9.2)
    - Test aggregate display includes contributing providers (Req 9.6)
    - _Requirements: 9.2, 9.6_

- [x] 8. Implement HealthMonitorService in digitalburnbag-api-lib
  - [x] 8.1 Implement HealthMonitorService class
    - Create `digitalburnbag-api-lib/src/lib/services/health-monitor-service.ts`
    - Implement `startMonitoring` / `stopMonitoring`: manage scheduled check intervals per connection
    - Implement `executeCheck`: decrypt credentials → get adapter from registry → call checkHeartbeat → persist StatusHistoryEntry → clear credentials → evaluate failure policy or update aggregation
    - Implement `refreshTokensIfNeeded`: refresh if tokenExpiresAt - now ≤ 10 minutes (600,000 ms) and > 0
    - Implement `getStatusHistory`: query status_history BrightDB collection with optional signal type and date range filters
    - Heartbeat signal classification: HTTP error/timeout/auth failure → CHECK_FAILED; valid response + no activity → ABSENCE; valid response + activity → PRESENCE
    - On CHECK_FAILED: increment consecutiveFailures, do NOT increment absence counter
    - On PRESENCE/ABSENCE: reset consecutiveFailures to 0, set status to "connected"
    - Emit status change events when signal type transitions
    - Respect rate limits (maxRequests, windowMs, minDelayMs)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 4.3, 4.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 8.2 Write property test: Heartbeat signal classification (Property 5)
    - **Property 5: Heartbeat signal classification correctness**
    - For any check: HTTP failure → CHECK_FAILED; success + no activity → ABSENCE; success + activity → PRESENCE; signal never ABSENCE when API call failed
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 8.3 Write property test: CHECK_FAILED does not increment absence counter (Property 6)
    - **Property 6: CHECK_FAILED does not increment absence counter**
    - For any sequence of results, absence counter only increments on ABSENCE, unchanged on CHECK_FAILED
    - **Validates: Requirements 3.5**

  - [x] 8.4 Write property test: Status change events on signal type transitions (Property 11)
    - **Property 11: Status change events emitted on signal type transitions**
    - For any sequence of results, a status change event is emitted iff current signal type differs from previous
    - **Validates: Requirements 6.3**

  - [x] 8.5 Write property test: Rate limit compliance (Property 12)
    - **Property 12: Rate limit compliance**
    - For any sequence of checks, requests within any sliding window of windowMs do not exceed maxRequests, and delay between consecutive requests ≥ minDelayMs
    - **Validates: Requirements 6.4**

  - [x] 8.6 Write property test: Token refresh timing (Property 13)
    - **Property 13: Token refresh timing**
    - For any connection with OAuth2 tokens, refresh is attempted iff expiry - now ≤ 10 min and > 0
    - **Validates: Requirements 6.5**

  - [x] 8.7 Write property test: Status history entry completeness (Property 14)
    - **Property 14: Status history entry completeness**
    - For any IHeartbeatCheckResult, the corresponding IStatusHistoryEntry contains all required fields (connectionId, timestamp, signalType, eventCount, confidence, timeSinceLastActivityMs, httpStatusCode when applicable)
    - **Validates: Requirements 7.1**

  - [x] 8.8 Write property test: Status history filtering and ordering (Property 15)
    - **Property 15: Status history filtering and ordering**
    - For any set of entries and any filter, the result contains only matching entries sorted chronologically by timestamp
    - **Validates: Requirements 7.2**

  - [x] 8.9 Write unit tests for HealthMonitorService
    - Test CHECK_FAILED vs ABSENCE visual distinction (Req 3.4)
    - Test token refresh failure marks status "expired" and notifies user (Req 6.6)
    - Test retry during feed failure state (Req 3.6)
    - _Requirements: 3.4, 3.6, 6.6_

- [x] 9. Checkpoint - Verify all backend services compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Provider Registry extensions and API endpoints in digitalburnbag-api-lib
  - [x] 10.1 Implement ProviderRegistry lifecycle extensions
    - Extend existing registry to load BUILTIN_PROVIDER_CONFIGS on initialization, registering a ConfigDrivenProviderAdapter for each
    - Add custom provider registration with validation via ProviderConfigValidator
    - Add export/import of provider configs to/from JSON
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [x] 10.2 Write property test: Provider registry registration and retrieval (Property 16)
    - **Property 16: Provider registry registration and retrieval**
    - For any valid config, after registration the provider is retrievable by ID and the retrieved config equals the registered config
    - **Validates: Requirements 8.1, 8.2**

  - [x] 10.3 Write property test: Provider config export/import round-trip (Property 18)
    - **Property 18: Provider config export/import round-trip**
    - For any valid registered config, export to JSON then import from that JSON produces an equivalent config
    - **Validates: Requirements 8.4, 8.5**

  - [x] 10.4 Implement new API endpoints in ProviderController
    - `GET /api/providers/connections/:id/history` — get status history with signal type and date range filters
    - `POST /api/providers/connections/:id/check` — trigger immediate heartbeat check
    - `PUT /api/providers/connections/:id/failure-policy` — update failure policy config
    - `POST /api/providers/custom` — register custom provider config (validate before accepting)
    - `GET /api/providers/custom/:id/export` — export provider config as JSON
    - `POST /api/providers/custom/import` — import provider config from JSON
    - `GET /api/providers/aggregate-status` — get aggregate heartbeat status
    - _Requirements: 7.2, 8.2, 8.3, 8.4, 8.5, 9.1_

  - [x] 10.5 Write property test: OAuth state parameter validation (Property 24)
    - **Property 24: OAuth state parameter validation**
    - For any generated state parameter, the callback handler accepts matching state and rejects non-matching state
    - **Validates: Requirements 10.5**

  - [x] 10.6 Write integration tests for API endpoints
    - Test OAuth redirect/callback full flow with mocked provider (Req 1.2)
    - Test connection persistence with encrypted credentials (Req 1.7)
    - Test scheduled checks execute at configured intervals (Req 6.1)
    - Test status history persistence after each check (Req 6.2)
    - Test credential lifecycle: decrypt before call, clear after (Req 10.2)
    - Test credential deletion on disconnect (Req 10.4)
    - _Requirements: 1.2, 1.7, 6.1, 6.2, 10.2, 10.4_

- [x] 11. Create BrightDB repository classes and collections in digitalburnbag-api-lib
  - [x] 11.1 Create BrightDBProviderConnectionRepository class
    - Create `digitalburnbag-api-lib/src/lib/collections/provider-connection-collection.ts`
    - Implement repository class following the existing `BrightDBCanaryRepository` pattern: accept `Collection` from `@brightchain/db` and `IdSerializer<TID>` in constructor
    - Use `filter`, `toDoc`, `fromDoc` helpers from `brightdb-helpers.ts`
    - Implement CRUD methods: getConnectionById, getConnectionsByUser, createConnection, updateConnection, deleteConnection, getConnectionsByStatus
    - Data model matches the Provider Connection schema from design (userId, providerId, status, provider identity fields, credentialsId, timing fields, check config, failure tracking with failurePolicyConfig, absence/duress config, pause state, timestamps)
    - _Requirements: 1.7, 2.4, 4.1_

  - [x] 11.2 Create BrightDBProviderCredentialRepository class
    - Create `digitalburnbag-api-lib/src/lib/collections/provider-credential-collection.ts`
    - Implement repository class following the existing BrightDB collection pattern
    - Store encrypted fields as base64-encoded strings (encryptedAccessToken, encryptedRefreshToken, encryptedApiKey), encryption metadata (encryptionKeyId, iv, authTag as base64 strings), provider identity, validity fields
    - Implement methods: storeCredentials, getCredentialsByConnectionId, deleteCredentialsByConnectionId, updateCredentialValidity
    - _Requirements: 10.1_

  - [x] 11.3 Create BrightDBStatusHistoryRepository class
    - Create `digitalburnbag-api-lib/src/lib/collections/status-history-collection.ts`
    - Implement repository class following the existing BrightDB collection pattern
    - Store fields: connectionId, userId, timestamp, signalType, eventCount, confidence, timeSinceLastActivityMs, httpStatusCode, errorMessage, createdAt
    - Implement application-level 90-day retention via a `purgeExpiredEntries` method that deletes documents where `createdAt` is older than 90 days (BrightDB does not support TTL indexes natively)
    - Implement methods: appendEntry, getEntriesByConnection (with signal type and date range filters), purgeExpiredEntries
    - _Requirements: 7.1, 7.4_

  - [x] 11.4 Create BrightDBCustomProviderConfigRepository class
    - Create `digitalburnbag-api-lib/src/lib/collections/custom-provider-config-collection.ts`
    - Implement repository class following the existing BrightDB collection pattern
    - Store fields: userId, config (ICanaryProviderConfig JSON), isShared, timestamps
    - Implement methods: getConfigById, getConfigsByUser, createConfig, updateConfig, deleteConfig
    - _Requirements: 8.2_

- [x] 12. Checkpoint - Verify BrightDB repositories and API endpoints compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement ProviderDashboard frontend component
  - [x] 13.1 Create ProviderDashboard page component
    - Create `digitalburnbag-react-components/src/lib/components/ProviderDashboard.tsx`
    - Render aggregate health banner from `IApiProviderConnectionsSummaryDTO` (total connected, healthy count, needs-attention count, overall status: healthy/degraded/critical)
    - List connected providers as ConnectionCard components (reuse existing card patterns from MyConnections)
    - Include prominent "Add Provider" button that opens ProviderRegistrationWizard
    - _Requirements: 2.2, 2.4, 2.6_

  - [x] 13.2 Write property test: Dashboard health summary computation (Property 3)
    - **Property 3: Dashboard health summary computation**
    - For any set of connections with various statuses, the summary correctly computes total, healthy, needs-attention counts and overall status (critical if healthy=0 and total>0, degraded if needsAttention>0, healthy otherwise)
    - **Validates: Requirements 2.2**

  - [x] 13.3 Write property test: Provider card rendering includes all required fields (Property 4)
    - **Property 4: Provider card rendering includes all required fields**
    - For any valid IProviderConnectionBase, the rendered output contains provider name, status, last check time, signal type, and time since last activity
    - **Validates: Requirements 2.4**

  - [x] 13.4 Write unit tests for ProviderDashboard
    - Test navigation item appears at top level (Req 2.1)
    - Test status badge for degraded/critical (Req 2.3)
    - Test provider detail navigation from card click (Req 2.5)
    - Test "Add Provider" button opens wizard (Req 2.6)
    - _Requirements: 2.1, 2.3, 2.5, 2.6_

- [x] 14. Implement ProviderDetailView frontend component
  - [x] 14.1 Create ProviderDetailView component
    - Create `digitalburnbag-react-components/src/lib/components/ProviderDetailView.tsx`
    - Render status history as chronological list with signal type and date range filtering
    - Display timeline/chart visualization of signal types over time
    - Show current connection settings with edit capability (failure policy, check interval, absence/duress config)
    - Highlight duress entries with urgent visual treatment (distinct color/icon)
    - Display CHECK_FAILED and ABSENCE with distinct visual indicators (different colors, icons, labels)
    - _Requirements: 2.5, 3.4, 7.2, 7.3, 7.5_

  - [x] 14.2 Write unit tests for ProviderDetailView
    - Test timeline chart renders with sample data (Req 7.3)
    - Test duress highlighting with urgent visual treatment (Req 7.5)
    - Test CHECK_FAILED vs ABSENCE visual distinction (Req 3.4)
    - _Requirements: 3.4, 7.3, 7.5_

- [x] 15. Implement BindingAssistant frontend component
  - [x] 15.1 Create BindingAssistant component
    - Create `digitalburnbag-react-components/src/lib/components/BindingAssistant.tsx`
    - Context menu integration: right-click vault/file/folder → "Bind to Provider" → provider dropdown
    - Drag-and-drop: drag provider card onto vault/file in file browser
    - Configuration panel: canary condition (PRESENCE/ABSENCE/DURESS), protocol action (ProtocolAction enum), absence threshold, cascade settings
    - Searchable multi-select for target vaults/files/folders (display names, not IDs)
    - Validate provider connection status is "connected" before allowing binding creation
    - Show warning with fix link for "error"/"expired" providers
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 15.2 Write property test: Binding creation requires connected provider status (Property 10)
    - **Property 10: Binding creation requires connected provider status**
    - For any provider status, binding creation succeeds only when status is "connected" and is rejected for all other statuses
    - **Validates: Requirements 5.5**

  - [x] 15.3 Write unit tests for BindingAssistant
    - Test context menu "Bind to Provider" option appears (Req 5.1, 5.2)
    - Test drag-and-drop initiates binding creation (Req 5.3)
    - Test names displayed instead of IDs (Req 5.4)
    - Test error/expired warning with fix link (Req 5.6)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

- [x] 16. Implement CustomProviderForm frontend component
  - [x] 16.1 Create CustomProviderForm component
    - Create `digitalburnbag-react-components/src/lib/components/CustomProviderForm.tsx`
    - Fields for all ICanaryProviderConfig properties: id, name, description, category, baseUrl, auth config, rate limit, endpoints
    - Endpoint path configuration with placeholder documentation ({userId}, {since}, {until}, etc.)
    - Response mapping builder with JSONPath preview
    - Import from JSON / Export to JSON buttons
    - _Requirements: 8.6_

  - [x] 16.2 Write unit tests for CustomProviderForm
    - Test all config fields are present (Req 8.6)
    - Test import/export JSON buttons work
    - _Requirements: 8.6_

- [x] 17. Integrate navigation and wire frontend components together
  - [x] 17.1 Add Provider Dashboard to top-level navigation
    - Add ProviderDashboard as a top-level navigation item in the application sidebar at the same hierarchy level as Canaries and Vaults
    - Add visual status indicator (badge/color) on navigation item when overall status is degraded or critical
    - Wire ProviderDashboard → ProviderDetailView navigation on card click
    - Wire ProviderDashboard → ProviderRegistrationWizard on "Add Provider" click
    - Wire ProviderDetailView → BindingAssistant integration
    - _Requirements: 2.1, 2.3, 2.5, 2.6_

  - [x] 17.2 Write property test: Provider grouping preserves all providers (Property 1)
    - **Property 1: Provider grouping preserves all providers with correct categories**
    - For any set of configs with various categories, grouping by category produces groups where every provider has the matching category, none are lost, none duplicated
    - **Validates: Requirements 1.1**

  - [x] 17.3 Write property test: Webhook URL and secret uniqueness (Property 2)
    - **Property 2: Webhook URL and secret uniqueness**
    - For any number of webhook setup invocations, every generated URL is unique and every secret is non-empty
    - **Validates: Requirements 1.4**

  - [x] 17.4 Write unit tests for Provider Connection Flow
    - Test OAuth URL construction with correct scopes and state (Req 1.2)
    - Test API key input validation and persistence (Req 1.3)
    - Test webhook URL/secret generation and copy-to-clipboard (Req 1.4)
    - Test connection success/failure display and retry (Req 1.5, 1.6)
    - Test absence config form defaults and fields (Req 1.8)
    - Test duress config toggle and keyword/pattern fields (Req 1.9)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 1.9_

- [x] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–24)
- Unit tests validate specific examples and edge cases
- All property tests use fast-check with minimum 100 iterations per property
- The `TID extends PlatformID` generic pattern is used consistently across all interfaces
