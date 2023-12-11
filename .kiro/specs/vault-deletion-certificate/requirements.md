# Requirements — Vault Deletion Certificate

## Introduction

This spec adds vault container deletion to Digital Burnbag, with a focus on
cryptographic accountability. Three vault visibility modes (private, unlisted,
public) require different deletion semantics:

- **Private / Unlisted vaults** — the owner may delete the vault and all its
  contents at any time. If the vault is sealed, the server produces a
  **Certificate of Destruction** — a signed document proving the vault was
  destroyed without its contents ever being accessed.
- **Public vaults** — because public vaults may have been discovered, linked to,
  or replicated by the network, outright deletion would break external
  references. Instead, the owner **disowns** the vault: it becomes read-only,
  the owner's identity is removed, and the vault is marked as archived in the
  discovery feed. The owner may still request destruction of a public vault,
  but only after a mandatory cool-down period during which the vault is
  flagged as pending-deletion in the discovery feed.

The Certificate of Destruction is the centrepiece of this spec. It is a
server-signed JSON document that bundles the container-level non-access
verification result, per-file destruction proofs, the seal hash, and a
timestamp — all signed with the operator's secp256k1 identity key. Third
parties can verify the certificate offline using the operator's public key
(served at the existing WCAP public key endpoint).

### Dependencies

- **`digitalburnbag-lib`** — existing `IVaultContainerService`,
  `IDestructionService`, `IContainerDestructionResult`,
  `IContainerNonAccessResult`, `VaultContainerState`, `VaultVisibility`.
- **`digitalburnbag-api-lib`** — existing `VaultContainerController`,
  `EciesSignature` (from `@digitaldefiance/ecies-lib`).
- **`digitalburnbag-wcap-signing`** — operator key pair and PEM endpoint
  (reused for certificate signing).

## Glossary

- **Vault_Container**: The top-level organizational unit in Digital Burnbag.
  Every folder and file lives inside exactly one vault container. Has a
  `visibility` (private, unlisted, public) and a `state` (active, sealed,
  locked, destroyed).
- **Certificate_of_Destruction**: A server-signed JSON document proving that a
  sealed vault was destroyed without its contents being accessed. Contains
  the non-access verification result, per-file destruction proofs, seal hash,
  operator signature, and a timestamp.
- **Non_Access_Verification**: The existing process that checks every file
  vault's seal and cross-references the ledger to confirm zero read entries.
  Returns `IContainerNonAccessResult`.
- **Destruction_Proof**: A per-file cryptographic attestation
  (`IFileDestructionProof`) proving secrets were irrecoverably discarded.
  Contains `destructionHash`, `ledgerEntryHash`, and `timestamp`.
- **Operator_Key**: The server operator's secp256k1 identity key pair, already
  used for WCAP signing. The same key signs Certificates of Destruction.
- **Disown_Operation**: The process of removing the owner's identity from a
  public vault, making it read-only and archived. The vault remains
  accessible but is no longer editable or deletable by the former owner.
- **Cool_Down_Period**: A mandatory waiting period (configurable, default 30
  days) before a public vault can be permanently destroyed. During this
  period the vault is flagged as pending-deletion in the discovery feed.
- **Deletion_Service**: The new service that orchestrates vault deletion,
  certificate generation, and the disown/cool-down workflow for public vaults.
- **Certificate_Verifier**: A pure function that verifies a Certificate of
  Destruction against the operator's public key, without requiring server
  access.

---

## Requirements

### Requirement 1: Delete a private or unlisted vault container

**User Story:** As a vault owner, I want to permanently delete a private or
unlisted vault and all its contents, so that the data is irrecoverably
destroyed and I receive proof of destruction.

#### Acceptance Criteria

1. WHEN the owner calls `DELETE /me/burnbag/vault-containers/:id` on a vault
   with `visibility` of `private` or `unlisted`, THE Deletion_Service SHALL
   call `VaultContainerService.destroyContainer()` to cascade-destroy all
   file vaults within the container.
2. WHEN `destroyContainer()` completes, THE Deletion_Service SHALL mark the
   vault container `state` as `destroyed` and record a container-level
   destruction entry on the ledger.
3. WHEN any individual file destruction fails during the cascade, THE
   Deletion_Service SHALL continue destroying remaining files (best-effort)
   and SHALL include both succeeded and failed file IDs in the response.
4. WHEN all file destructions succeed, THE endpoint SHALL return HTTP 200
   with the `IContainerDestructionResult` (including per-file proofs and
   the container ledger entry hash).
5. WHEN one or more file destructions fail, THE endpoint SHALL return HTTP
   207 (Multi-Status) with the partial `IContainerDestructionResult` so the
   client can see which files succeeded and which failed.
6. IF the vault container is already in `destroyed` state, THEN THE endpoint
   SHALL return HTTP 410 (Gone) with error code `VAULT_ALREADY_DESTROYED`.
7. IF the requester is not the vault owner and does not hold the
   `burnbag:admin` scope, THEN THE endpoint SHALL return HTTP 403.

### Requirement 2: Certificate of Destruction for sealed vaults

**User Story:** As a vault owner, I want a server-signed certificate proving
that my sealed vault was destroyed without its contents ever being accessed,
so that I can demonstrate compliance to auditors or third parties without
needing server access.

#### Acceptance Criteria

1. WHEN a vault in `sealed` state is deleted via
   `DELETE /me/burnbag/vault-containers/:id`, THE Deletion_Service SHALL
   first call `VaultContainerService.verifyNonAccess()` to confirm that all
   file vaults are pristine with zero read entries.
2. WHEN non-access verification confirms all files are pristine
   (`nonAccessConfirmed: true`), THE Deletion_Service SHALL generate a
   Certificate_of_Destruction containing:
   - `containerId`
   - `containerName`
   - `sealHash` (the Merkle root recorded at seal time)
   - `sealedAt` (ISO timestamp of when the vault was sealed)
   - `destroyedAt` (ISO timestamp of destruction)
   - `nonAccessVerification` (the full `IContainerNonAccessResult`)
   - `fileDestructionProofs` (array of `IFileDestructionProof` for each file)
   - `containerLedgerEntryHash` (hex-encoded)
   - `operatorPublicKey` (hex-encoded compressed secp256k1 key)
   - `signature` (base64-encoded 64-byte compact ECDSA signature over the
     SHA-256 hash of the canonical JSON payload)
   - `version` (certificate format version, initially `1`)
3. WHEN the certificate is generated, THE Deletion_Service SHALL sign the
   SHA-256 hash of the canonical JSON payload (all fields except `signature`)
   using the Operator_Key via `EciesSignature.signMessage()`.
4. WHEN the certificate is generated, THE endpoint SHALL return HTTP 200 with
   the `IContainerDestructionResult` and an additional `certificate` field
   containing the full `ICertificateOfDestruction` object.
5. WHEN non-access verification finds accessed files
   (`nonAccessConfirmed: false`), THE Deletion_Service SHALL still proceed
   with destruction but SHALL NOT generate a Certificate_of_Destruction.
   The response SHALL include a `certificateOmittedReason` field with value
   `'SEAL_BROKEN'` and the list of `accessedFileIds`.
6. WHEN the vault is not in `sealed` state (i.e. `active` or `locked`), THE
   Deletion_Service SHALL proceed with destruction without generating a
   certificate. The response SHALL include `certificateOmittedReason` with
   value `'NOT_SEALED'`.
7. THE Certificate_of_Destruction SHALL be persisted in a
   `burnbag_destruction_certificates` collection indexed by `containerId`,
   so it can be retrieved later even after the vault metadata is tombstoned.

### Requirement 3: Certificate of Destruction serialization and verification

**User Story:** As an auditor or third party, I want to verify a Certificate
of Destruction offline using only the operator's public key, so that I can
confirm the vault was destroyed without access independently of the server.

#### Acceptance Criteria

1. THE `serializeCertificate` function SHALL produce a canonical JSON string
   of the certificate payload (all fields except `signature`), with keys
   sorted alphabetically and no optional whitespace, suitable for hashing.
2. THE `verifyCertificate` function SHALL accept an
   `ICertificateOfDestruction` and an operator public key (33-byte compressed
   secp256k1), recompute the SHA-256 hash of the canonical JSON payload, and
   verify the signature using `EciesSignature.verifyMessage()`.
3. FOR ALL valid Certificates of Destruction, serializing the payload,
   hashing, and verifying the signature with the correct operator public key
   SHALL return `{ valid: true }` (round-trip property).
4. WHEN the certificate payload has been tampered with (any field modified),
   THE `verifyCertificate` function SHALL return `{ valid: false,
   reason: 'SIGNATURE_MISMATCH' }`.
5. WHEN the wrong public key is provided, THE `verifyCertificate` function
   SHALL return `{ valid: false, reason: 'SIGNATURE_MISMATCH' }`.
6. THE `serializeCertificate` and `verifyCertificate` functions SHALL reside
   in `digitalburnbag-lib` (browser-safe, no Node.js dependencies) so that
   clients and third-party tools can verify certificates without server
   access.
7. THE `signCertificate` function (which requires the private key) SHALL
   reside in `digitalburnbag-api-lib` (Node.js only).

### Requirement 4: Certificate retrieval endpoint

**User Story:** As a vault owner, I want to retrieve the Certificate of
Destruction for a previously deleted vault, so that I can present it to
auditors at any time after deletion.

#### Acceptance Criteria

1. `GET /me/burnbag/vault-containers/:id/certificate` SHALL return the
   stored `ICertificateOfDestruction` for the specified container.
2. WHEN no certificate exists for the container (vault was not sealed, or
   seal was broken before deletion), THE endpoint SHALL return HTTP 404
   with error code `CERTIFICATE_NOT_FOUND`.
3. WHEN the requester is not the former vault owner and does not hold the
   `burnbag:admin` scope, THE endpoint SHALL return HTTP 403.
4. THE response SHALL include the full certificate JSON so the client can
   pass it to `verifyCertificate` for independent offline verification.

### Requirement 5: Public vault disown operation

**User Story:** As a public vault owner, I want to relinquish ownership of
my public vault so that it remains accessible to the community as a
read-only archive, while I am no longer associated with it.

#### Acceptance Criteria

1. WHEN the owner calls `POST /me/burnbag/vault-containers/:id/disown` on a
   vault with `visibility: 'public'`, THE Deletion_Service SHALL:
   a. Set the vault `state` to `locked` (read-only, no modifications).
   b. Remove the `ownerId` association (set to a system sentinel value
      representing "disowned").
   c. Record a `vault_container_disowned` entry on the ledger.
2. WHEN a vault is disowned, THE vault SHALL remain visible in the public
   discovery feed with a `disowned` badge.
3. WHEN a vault is disowned, THE former owner SHALL no longer appear in the
   vault's metadata or ACL. Existing ACL entries for other principals SHALL
   be preserved as read-only.
4. IF the vault `visibility` is not `public`, THEN THE endpoint SHALL return
   HTTP 409 with error code `DISOWN_REQUIRES_PUBLIC_VISIBILITY`.
5. IF the vault is already disowned (no current owner), THEN THE endpoint
   SHALL return HTTP 409 with error code `VAULT_ALREADY_DISOWNED`.
6. IF the vault is in `destroyed` state, THEN THE endpoint SHALL return
   HTTP 410 with error code `VAULT_ALREADY_DESTROYED`.

### Requirement 6: Public vault deletion with cool-down period

**User Story:** As a public vault owner, I want to permanently delete my
public vault, but only after a mandatory cool-down period, so that the
community has time to archive or migrate any content they depend on.

#### Acceptance Criteria

1. WHEN the owner calls `DELETE /me/burnbag/vault-containers/:id` on a vault
   with `visibility: 'public'`, THE Deletion_Service SHALL NOT immediately
   destroy the vault. Instead, it SHALL:
   a. Set a `pendingDeletionAt` timestamp on the vault equal to
      `now + BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS` (default 30 days).
   b. Mark the vault as `pending-deletion` in the discovery feed.
   c. Record a `vault_container_deletion_scheduled` entry on the ledger.
   d. Return HTTP 202 (Accepted) with the `pendingDeletionAt` timestamp.
2. WHILE a public vault is in `pending-deletion` state, THE vault SHALL
   remain readable but not writable.
3. WHEN the cool-down period elapses, THE Deletion_Service (via a background
   job) SHALL execute the actual destruction using the same cascade logic as
   Requirement 1.
4. WHEN the owner calls `POST /me/burnbag/vault-containers/:id/cancel-deletion`
   before the cool-down expires, THE Deletion_Service SHALL cancel the
   pending deletion, clear `pendingDeletionAt`, and restore the vault to its
   previous state. The endpoint SHALL return HTTP 200.
5. WHEN a sealed public vault's cool-down expires and non-access is confirmed,
   THE Deletion_Service SHALL generate a Certificate_of_Destruction per
   Requirement 2.
6. IF the vault is not `public`, THEN `DELETE` SHALL proceed immediately per
   Requirement 1 (no cool-down).
7. IF the vault already has a `pendingDeletionAt` set, THEN a second
   `DELETE` call SHALL return HTTP 409 with error code
   `DELETION_ALREADY_SCHEDULED` and the existing `pendingDeletionAt`.

### Requirement 7: Vault container state extensions

**User Story:** As a platform engineer, I want the vault container state
machine to support the new disowned and pending-deletion states, so that
the lifecycle transitions are explicit and enforceable.

#### Acceptance Criteria

1. THE `VaultContainerState` enum SHALL be extended with two new values:
   `Disowned = 'disowned'` and `PendingDeletion = 'pending-deletion'`.
2. THE following state transitions SHALL be valid:
   - `Active` → `Destroyed` (private/unlisted immediate delete)
   - `Sealed` → `Destroyed` (sealed vault delete with certificate)
   - `Locked` → `Destroyed` (locked vault delete)
   - `Active` → `PendingDeletion` (public vault delete request)
   - `Sealed` → `PendingDeletion` (sealed public vault delete request)
   - `Locked` → `PendingDeletion` (locked public vault delete request)
   - `PendingDeletion` → `Destroyed` (cool-down elapsed)
   - `PendingDeletion` → previous state (deletion cancelled)
   - `Active` → `Disowned` (public vault disown, transitions through Locked)
   - `Sealed` → `Disowned` (sealed public vault disown)
   - `Locked` → `Disowned` (locked public vault disown)
3. THE following state transitions SHALL be rejected:
   - `Destroyed` → any state
   - `Disowned` → `Active` (disown is irreversible)
   - `Disowned` → `Destroyed` (disowned vaults are community property;
     only `burnbag:admin` may destroy them)
4. WHEN an invalid state transition is attempted, THE service SHALL throw
   with error code `INVALID_STATE_TRANSITION` and include the current and
   requested states.

### Requirement 8: IVaultContainerBase extensions

**User Story:** As a developer, I want the vault container data model to
carry the new fields needed for disown and pending-deletion workflows, so
that the state is fully represented in the persisted record.

#### Acceptance Criteria

1. THE `IVaultContainerBase` interface SHALL be extended with:
   - `pendingDeletionAt?: string` — ISO timestamp when the vault will be
     destroyed after the cool-down period. Only set when state is
     `pending-deletion`.
   - `previousState?: VaultContainerState` — the state before
     `pending-deletion` was entered, used to restore on cancellation.
   - `disownedAt?: string` — ISO timestamp when the vault was disowned.
   - `disownedBy?: TID` — the former owner who disowned the vault.
2. WHEN `state` is `disowned`, THE `ownerId` field SHALL contain a
   well-known sentinel value (e.g. a zero-filled ID) indicating no owner.
3. ALL new fields SHALL be optional so that existing vault container records
   remain valid without migration.

### Requirement 9: REST API surface

**User Story:** As a frontend developer, I want a clear set of endpoints for
vault deletion, disown, and certificate retrieval, so that I can build the
UI workflows.

#### Acceptance Criteria

1. `DELETE /me/burnbag/vault-containers/:id` SHALL handle both immediate
   deletion (private/unlisted) and cool-down scheduling (public) based on
   the vault's `visibility`.
2. `POST /me/burnbag/vault-containers/:id/disown` SHALL disown a public
   vault (Requirement 5).
3. `POST /me/burnbag/vault-containers/:id/cancel-deletion` SHALL cancel a
   pending public vault deletion (Requirement 6 AC 4).
4. `GET /me/burnbag/vault-containers/:id/certificate` SHALL retrieve a
   stored Certificate of Destruction (Requirement 4).
5. ALL endpoints SHALL require authentication. Owner-only access SHALL be
   enforced unless the requester holds `burnbag:admin` scope.
6. ALL endpoints SHALL return `IApiMessageResponse`-shaped responses
   consistent with the existing Burnbag API conventions.

### Requirement 10: Configuration

**User Story:** As a platform operator, I want configurable limits for the
public vault cool-down period and certificate retention, so that I can tune
the system for my deployment.

#### Acceptance Criteria

1. `BURNBAG_PUBLIC_VAULT_COOLDOWN_DAYS` SHALL control the cool-down period
   for public vault deletion. THE default SHALL be 30 days.
2. `BURNBAG_CERTIFICATE_RETENTION_DAYS` SHALL control how long Certificates
   of Destruction are retained in the database. THE default SHALL be 3650
   days (10 years).
3. ALL configuration values SHALL be validated at process startup. IF any
   value is out of range (e.g. cool-down < 1 day), THE process SHALL fail
   fast with a descriptive error.

### Requirement 11: Background job for cool-down expiry

**User Story:** As a platform operator, I want pending public vault deletions
to execute automatically when the cool-down period expires, so that no
manual intervention is required.

#### Acceptance Criteria

1. THE Deletion_Service SHALL include a background job that runs on a
   configurable interval (default: once per hour).
2. WHEN the job runs, THE Deletion_Service SHALL query all vault containers
   with `state: 'pending-deletion'` and `pendingDeletionAt <= now`.
3. FOR EACH expired pending-deletion vault, THE Deletion_Service SHALL
   execute the destruction cascade per Requirement 1 (and generate a
   certificate per Requirement 2 if the vault was sealed).
4. IF the destruction of an individual vault fails, THE job SHALL log the
   error and continue processing remaining vaults.
5. THE job SHALL emit a summary metric: `vaults_destroyed`,
   `certificates_generated`, `failures`.

### Requirement 12: Property tests

**User Story:** As an engineer, I want automated property tests verifying
that certificate signing and verification are correct, that the
serialization round-trips, and that state transitions are enforced.

#### Acceptance Criteria

1. PROPERTY TEST: FOR ALL valid `ICertificateOfDestruction` payloads
   (generated with random container IDs, seal hashes, timestamps, and file
   destruction proofs), signing with a random secp256k1 key pair and then
   verifying with the corresponding public key SHALL return
   `{ valid: true }` (sign-then-verify round-trip).
2. PROPERTY TEST: FOR ALL valid `ICertificateOfDestruction` payloads,
   `serializeCertificate(payload)` followed by `JSON.parse` followed by
   re-serialization SHALL produce an identical string (canonical JSON
   idempotence).
3. PROPERTY TEST: FOR ALL valid `ICertificateOfDestruction` payloads signed
   with key pair A, verifying with a different key pair B (where A ≠ B)
   SHALL return `{ valid: false }` (wrong-key rejection).
4. PROPERTY TEST: FOR ALL valid `ICertificateOfDestruction` payloads, if any
   single byte of the serialized payload is flipped before verification,
   THE `verifyCertificate` function SHALL return `{ valid: false }`
   (tamper detection).
5. ALL property tests SHALL use `fast-check` generators with a minimum of
   1000 runs.
