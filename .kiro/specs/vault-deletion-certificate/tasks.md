# Tasks — Vault Deletion Certificate

## Task 1: Extend VaultContainerState enum and IVaultContainerBase interface

Add the new state values and data model fields needed for disown and pending-deletion workflows.

**Requirements:** 7, 8

- [x] 1.1 Add `Disowned = 'disowned'` and `PendingDeletion = 'pending-deletion'` to `VaultContainerState` enum in `digitalburnbag-lib/src/lib/enumerations/vault-container-state.ts`
- [x] 1.2 Add new optional fields to `IVaultContainerBase` in `digitalburnbag-lib/src/lib/interfaces/bases/vault-container.ts`:
  - `pendingDeletionAt?: string` — ISO timestamp for scheduled destruction
  - `previousState?: VaultContainerState` — state before PendingDeletion, for cancellation restore
  - `disownedAt?: string` — ISO timestamp when disowned
  - `disownedBy?: TID` — former owner who disowned the vault
- [x] 1.3 Define `DISOWNED_OWNER_SENTINEL` constant (zero-filled ID) in `digitalburnbag-lib/src/lib/constants.ts`
- [x] 1.4 Update `digitalburnbag-lib/src/lib/index.ts` to export new enum values and constant

## Task 2: Create Certificate of Destruction interfaces

Define the new interfaces for the exportable certificate and its sub-components.

**Requirements:** 2, 3

- [x] 2.1 Create `digitalburnbag-lib/src/lib/interfaces/bases/certificate-of-destruction.ts` with:
  - `ICertificateOfDestruction` — the full exportable certificate
  - `ICertificateNonAccessVerification` — serializable non-access result
  - `ICertificateFileDestructionProof` — serializable per-file proof
  - `ICertificateVerifyResult` — verification result type
- [x] 2.2 Export new interfaces from `digitalburnbag-lib/src/lib/interfaces/index.ts`
- [x] 2.3 Export new interfaces from `digitalburnbag-lib/src/lib/index.ts`

## Task 3: Create deletion-related error classes

Add new error classes for deletion, disown, and certificate operations.

**Requirements:** 1, 4, 5, 6, 7

- [x] 3.1 Add error classes to `digitalburnbag-lib/src/lib/errors.ts`:
  - `InvalidStateTransitionError` — invalid state machine transition
  - `VaultAlreadyDisownedError` — disown called on already disowned vault
  - `DisownRequiresPublicVisibilityError` — disown called on non-public vault
  - `DeletionAlreadyScheduledError` — DELETE called on vault with pending deletion
  - `CertificateNotFoundError` — certificate requested for vault without one
- [x] 3.2 Export new error classes from `digitalburnbag-lib/src/lib/index.ts`
- [x] 3.3 Write unit tests for error classes in `digitalburnbag-lib/src/lib/__tests__/deletion-errors.spec.ts`

## Task 4: Implement certificate serialization functions (browser-safe)

Create the canonical JSON serialization and verification functions in digitalburnbag-lib.

**Requirements:** 3

- [x] 4.1 Create `digitalburnbag-lib/src/lib/serialization/certificate-serializer.ts` with:
  - `serializeCertificate(certificate)` — canonical JSON with sorted keys, no whitespace
  - `verifyCertificate(certificate, operatorPublicKey)` — verify signature against public key
- [x] 4.2 Export functions from `digitalburnbag-lib/src/lib/serialization/index.ts`
- [x] 4.3 Export functions from `digitalburnbag-lib/src/lib/index.ts`
- [x] 4.4 Write unit tests in `digitalburnbag-lib/src/lib/__tests__/certificate-serializer.spec.ts`

## Task 5: Implement certificate signing function (Node.js only)

Create the server-side signing function in digitalburnbag-api-lib.

**Requirements:** 2, 3

- [x] 5.1 Create `digitalburnbag-api-lib/src/lib/services/certificate-signing-service.ts` with:
  - `signCertificate(certificate, operatorPrivateKey)` — sign with EciesSignature.signMessage()
- [x] 5.2 Export from `digitalburnbag-api-lib/src/lib/services/index.ts`
- [x] 5.3 Export from `digitalburnbag-api-lib/src/lib/index.ts`
- [x] 5.4 Write unit tests in `digitalburnbag-api-lib/src/lib/__tests__/certificate-signing-service.spec.ts`

## Task 6: Create state transition validation

Implement the state machine transition validation logic.

**Requirements:** 7

- [x] 6.1 Create `digitalburnbag-lib/src/lib/services/state-transition-validator.ts` with:
  - `isValidTransition(currentState, targetState, isAdmin?)` — check if transition is allowed
  - `assertValidTransition(currentState, targetState, isAdmin?)` — throw if invalid
  - Define the allowed transitions matrix per Requirement 7.2
- [x] 6.2 Export from `digitalburnbag-lib/src/lib/services/index.ts`
- [x] 6.3 Write unit tests in `digitalburnbag-lib/src/lib/__tests__/state-transition-validator.spec.ts`

## Task 7: Create IDeletionService interface and result types

Define the service interface and result types for the deletion orchestration.

**Requirements:** 1, 2, 5, 6

- [x] 7.1 Create `digitalburnbag-lib/src/lib/interfaces/services/deletion-service.ts` with:
  - `IDeletionService<TID>` interface
  - `IVaultDeletionResult<TID>` discriminated union type
  - `IImmediateDeletionResult<TID>` — for private/unlisted vaults
  - `IPendingDeletionResult` — for public vaults
  - `ICooldownExpiryResult` — for background job results
- [x] 7.2 Export from `digitalburnbag-lib/src/lib/interfaces/services/index.ts`
- [x] 7.3 Export from `digitalburnbag-lib/src/lib/interfaces/index.ts`

## Task 8: Create ICertificateRepository interface

Define the repository interface for certificate persistence.

**Requirements:** 2, 4

- [x] 8.1 Create `digitalburnbag-lib/src/lib/interfaces/services/certificate-repository.ts` with:
  - `ICertificateRepository` interface
  - `storeCertificate(certificate)` method
  - `getCertificateByContainerId(containerId)` method
- [x] 8.2 Export from `digitalburnbag-lib/src/lib/interfaces/services/index.ts`

## Task 9: Implement DeletionService

Create the service that orchestrates vault deletion, certificate generation, and disown/cool-down workflows.

**Requirements:** 1, 2, 5, 6

- [x] 9.1 Create `digitalburnbag-lib/src/lib/services/deletion-service.ts` implementing `IDeletionService`:
  - `deleteVaultContainer(containerId, requesterId)` — dispatch based on visibility
  - `disownVaultContainer(containerId, requesterId)` — disown public vault
  - `cancelPendingDeletion(containerId, requesterId)` — cancel pending deletion
  - `executePendingDeletions()` — process expired cool-downs (for background job)
  - `getCertificate(containerId, requesterId)` — retrieve stored certificate
- [x] 9.2 Implement private/unlisted immediate deletion flow with certificate generation for sealed vaults
- [x] 9.3 Implement public vault cool-down scheduling flow
- [x] 9.4 Implement disown flow with state transition and ledger entry
- [x] 9.5 Implement cancel-deletion flow with state restoration
- [x] 9.6 Export from `digitalburnbag-lib/src/lib/services/index.ts`
- [x] 9.7 Write unit tests in `digitalburnbag-lib/src/lib/__tests__/deletion-service.spec.ts`

## Task 10: Create BrightDB certificate repository

Implement the MongoDB-backed certificate repository.

**Requirements:** 2, 4

- [x] 10.1 Create `digitalburnbag-api-lib/src/lib/collections/certificate-collection.ts` with:
  - `BrightDBCertificateRepository` implementing `ICertificateRepository`
  - Collection name: `burnbag_destruction_certificates`
  - Unique index on `containerId`
  - TTL index on `expiresAt` for automatic expiration
- [x] 10.2 Export from `digitalburnbag-api-lib/src/lib/collections/index.ts`
- [x] 10.3 Write unit tests in `digitalburnbag-api-lib/src/lib/__tests__/certificate-collection.spec.ts`

## Task 11: Create deletion configuration

Add configuration for cool-down period and certificate retention.

**Requirements:** 10

- [x] 11.1 Create `digitalburnbag-api-lib/src/lib/config/deletionConfig.ts` with:
  - `IBurnbagDeletionConfig` interface
  - `validateDeletionConfig()` function with fail-fast validation
  - Environment variables: `BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS`, `BURNBAG_CERTIFICATE_RETENTION_DAYS`, `BURNBAG_COOLDOWN_JOB_INTERVAL_MS`
- [x] 11.2 Export from `digitalburnbag-api-lib/src/lib/config/index.ts`
- [x] 11.3 Write unit tests in `digitalburnbag-api-lib/src/lib/__tests__/config/deletionConfig.spec.ts`

## Task 12: Extend VaultContainerController with deletion endpoints

Add the new REST API endpoints for deletion, disown, cancel-deletion, and certificate retrieval.

**Requirements:** 1, 4, 5, 6, 9

- [x] 12.1 Modify `DELETE /:id` handler in `VaultContainerController` to delegate to `DeletionService.deleteVaultContainer()`:
  - Return 200 for immediate deletion success
  - Return 202 for public vault cool-down scheduling
  - Return 207 for partial file destruction failure
  - Return 410 for already destroyed vault
  - Return 403 for unauthorized
- [x] 12.2 Add `POST /:id/disown` handler:
  - Delegate to `DeletionService.disownVaultContainer()`
  - Return 200 on success
  - Return 409 for non-public vault or already disowned
  - Return 410 for destroyed vault
- [x] 12.3 Add `POST /:id/cancel-deletion` handler:
  - Delegate to `DeletionService.cancelPendingDeletion()`
  - Return 200 on success
  - Return 409 if no pending deletion
- [x] 12.4 Add `GET /:id/certificate` handler:
  - Delegate to `DeletionService.getCertificate()`
  - Return 200 with certificate JSON
  - Return 404 if no certificate exists
  - Return 403 for unauthorized

## Task 13: Create cool-down expiry background job

Implement the scheduled job that processes expired pending deletions.

**Requirements:** 11

- [x] 13.1 Create `digitalburnbag-api-lib/src/lib/scheduled/cooldown-expiry-job.ts` with:
  - `createCooldownExpiryJob(deps, intervalMs)` factory function
  - Query vaults with `state: 'pending-deletion'` and `pendingDeletionAt <= now`
  - Execute destruction cascade for each expired vault
  - Generate certificate if vault was sealed and pristine
  - Continue processing on individual failures
  - Emit summary metrics: `vaultsDestroyed`, `certificatesGenerated`, `failures`
- [x] 13.2 Register job in `digitalburnbag-api-lib/src/lib/scheduled/platform-jobs.ts`
- [x] 13.3 Write unit tests in `digitalburnbag-api-lib/src/lib/__tests__/services/cooldown-expiry-job.spec.ts`

## Task 14: Write property-based tests for certificate signing/verification

Implement the property tests for certificate cryptographic operations.

**Requirements:** 12

- [x] 14.1 Create `digitalburnbag-lib/src/lib/__tests__/certificate-of-destruction.property.spec.ts` with:
  - Property 1: Sign-then-verify round-trip (1000 iterations)
  - Property 2: Canonical JSON serialization idempotence (1000 iterations)
  - Property 3: Wrong-key rejection (1000 iterations)
  - Property 4: Tamper detection via byte flip (1000 iterations)
  - Property 6: Certificate completeness (1000 iterations)
- [x] 14.2 Add generators to `digitalburnbag-lib/src/lib/__tests__/arbitraries.ts`:
  - `arbCertificatePayload` — random certificate payloads
  - `arbSecp256k1KeyPair` — random key pairs
  - `arbByteFlipIndex` — random byte position for tamper testing

## Task 15: Write property-based tests for state transitions

Implement the property test for state machine correctness.

**Requirements:** 12

- [x] 15.1 Create `digitalburnbag-lib/src/lib/__tests__/vault-container-state-transitions.property.spec.ts` with:
  - Property 5: State transition correctness (all state pairs, 1000 iterations)
  - Test all valid transitions succeed
  - Test all invalid transitions are rejected with `INVALID_STATE_TRANSITION`
- [x] 15.2 Add `arbVaultContainerState` generator to `digitalburnbag-lib/src/lib/__tests__/arbitraries.ts`

## Task 16: Write integration tests for deletion endpoints

Verify the full request/response cycle through the controller layer.

**Requirements:** 1, 4, 5, 6, 9

- [x] 16.1 Create `digitalburnbag-api-lib/src/lib/__tests__/controller-integration/vault-deletion.integration.spec.ts` with:
  - DELETE private vault → 200 + destruction result
  - DELETE sealed vault → 200 + destruction result + certificate
  - DELETE public vault → 202 + pendingDeletionAt
  - DELETE with partial failure → 207 + partial result
  - DELETE already destroyed → 410
  - DELETE unauthorized → 403
  - POST disown public → 200
  - POST disown non-public → 409
  - POST disown already disowned → 409
  - POST cancel-deletion → 200
  - POST cancel-deletion no pending → 409
  - GET certificate → 200 + certificate
  - GET certificate not found → 404
  - GET certificate unauthorized → 403
