# Requirements Document

## Introduction

Port the cryptographic backup code scheme from the upstream `@digitaldefiance/node-express-suite` `BackupCodeService` and `BackupCode` classes into a BrightChain-native implementation. The upstream uses Argon2id KDF, HKDF-SHA256 checksums for constant-time validation, AEAD encryption of the user's private key per backup code, and ECIES wrapping with the system user's key. However, the upstream service layer is built around MongoDB (user documents, Mongoose queries, MongoDB sessions). BrightChain uses BrightDB — a custom block-based storage layer with `MemberStore`, CBL blocks, and member profiles.

This feature requires:
1. Porting the cryptographic primitives (generation, encryption, validation, recovery) from the upstream `BackupCode` class into a new BrightChain-native service
2. Reimplementing the service-layer operations (`useBackupCode`, `recoverKeyWithBackupCode`, `rewrapAllUsersBackupCodes`) to work with `MemberStore` and BrightDB instead of MongoDB
3. Updating the `IStoredBackupCode` interface in `brightchain-lib` to match the upstream `IBackupCode` shape
4. Updating the `UserController` endpoints to use the new service
5. Removing the existing simplified bcrypt-based `BackupCodeService`
6. Changing the backup code count from the current hardcoded 10 to a configurable value driven by `IBackupCodeConstants.Count`

The upstream `BackupCode` static methods and `BackupCodeService` class methods serve as the **template** for the reimplementation — the cryptographic scheme is preserved exactly, but all storage interactions are rewritten for BrightDB.

## Glossary

- **BrightChain_BackupCodeService**: The new backup code service to be implemented in `brightchain-api-lib`, porting the upstream cryptographic scheme to work with BrightDB and `MemberStore`.
- **Upstream_BackupCode**: The `BackupCode` class from `@digitaldefiance/node-express-suite` whose static methods (`generateBackupCode`, `generateBackupCodes`, `encryptBackupCodes`, `validateBackupCode`) define the cryptographic scheme to be ported.
- **Upstream_BackupCodeService**: The `BackupCodeService` class from `@digitaldefiance/node-express-suite` whose instance methods (`useBackupCode`, `recoverKeyWithBackupCode`, `rewrapAllUsersBackupCodes`) define the service-layer operations to be reimplemented for BrightDB.
- **Local_BackupCodeService**: The existing simplified `BackupCodeService` in `brightchain-api-lib/src/lib/services/backupCodeService.ts` that uses bcrypt hashing and will be replaced.
- **IBackupCode**: The upstream interface from `@digitaldefiance/suite-core-lib` with shape `{ version, checksumSalt, checksum, encrypted }`.
- **IStoredBackupCode**: The interface in `brightchain-lib` (currently `{ hash, used, createdAt }`) that will be redefined to match the `IBackupCode` shape.
- **MemberStore**: The BrightChain storage layer (`brightchain-lib`) that persists member data as CBL blocks, including backup codes in the private profile.
- **UserController**: The Express controller in `brightchain-api-lib` that exposes backup code HTTP endpoints.
- **BackendMember**: The `Member` class from `@digitaldefiance/node-ecies-lib` representing a user with ECIES key material.
- **System_User**: A privileged BackendMember whose ECIES key pair is used to wrap/unwrap backup code AEAD blobs.
- **IBackupCodeConstants**: The configuration interface in `brightchain-lib` defining `Count`, `NormalizedHexRegex`, and `DisplayRegex` for backup code generation and validation.
- **Service_Container**: The `application.services` registry used to resolve named service singletons.

## Requirements

### Requirement 1: Replace IStoredBackupCode with Upstream IBackupCode Shape

**User Story:** As a developer, I want the stored backup code interface to match the upstream cryptographic scheme's data shape, so that the storage layer supports Argon2id/AEAD backup codes instead of bcrypt hashes.

#### Acceptance Criteria

1. THE brightchain-lib SHALL export an `IStoredBackupCode` interface with fields: `version` (string), `checksumSalt` (string), `checksum` (string), `encrypted` (string).
2. THE brightchain-lib SHALL remove the legacy `hash`, `used`, and `createdAt` fields from `IStoredBackupCode`.
3. THE `IPrivateMemberProfileStorageData` interface SHALL reference the updated `IStoredBackupCode` type for its `backupCodes` field.
4. THE `IPrivateMemberProfileHydratedData` interface SHALL reference the updated `IStoredBackupCode` type for its `backupCodes` field.
5. THE `IPrivateMemberData` interface SHALL reference the updated `IStoredBackupCode` type for its `backupCodes` field.
6. THE `IBrightChainUserInitEntry` interface SHALL reference `IStoredBackupCode[]` from `brightchain-lib` for its `backupCodes` field instead of importing `IBackupCode` from `@digitaldefiance/suite-core-lib`.

### Requirement 2: Port Upstream Cryptographic Primitives into BrightChain_BackupCodeService

**User Story:** As a developer, I want the upstream backup code cryptographic scheme ported into a BrightChain-native service, so that backup codes use Argon2id/AEAD/ECIES without depending on MongoDB.

#### Acceptance Criteria

1. THE BrightChain_BackupCodeService SHALL implement a `generateCodes` method that generates N backup codes (where N is `IBackupCodeConstants.Count`) using the same random generation scheme as Upstream_BackupCode.
2. THE BrightChain_BackupCodeService SHALL implement backup code encryption using the same cryptographic flow as Upstream_BackupCode: Argon2id KDF for the encryption key, HKDF-SHA256 for the checksum, AEAD encryption of the user's private key, and ECIES wrapping with the System_User's public key.
3. THE BrightChain_BackupCodeService SHALL implement a `validateBackupCode` method that performs constant-time HKDF-SHA256 checksum comparison, matching the upstream validation scheme.
4. THE BrightChain_BackupCodeService SHALL implement a `useBackupCode` method that validates a submitted code against stored codes, removes the matched entry from the array, and returns the updated array and matched entry.
5. THE BrightChain_BackupCodeService SHALL implement a `recoverKeyWithBackupCode` method that unwraps the ECIES layer using the System_User's private key, then decrypts the AEAD blob using the Argon2id-derived key from the submitted code, recovering the user's private key.
6. THE BrightChain_BackupCodeService SHALL persist all backup code data through `MemberStore.updateMember()` to the member's private profile, storing and retrieving `IStoredBackupCode[]` from BrightDB block storage.
7. THE BrightChain_BackupCodeService SHALL accept `MemberStore` as a constructor dependency instead of a MongoDB-backed user model.
8. THE BrightChain_BackupCodeService SHALL accept `ECIESService` and `KeyWrappingService` as constructor dependencies for cryptographic operations.
9. FOR ALL valid backup codes, encrypting then validating with the original plaintext SHALL return true (round-trip property).
10. FOR ALL valid backup codes, encrypting then recovering SHALL produce the original user private key (round-trip property).

### Requirement 3: Configurable Backup Code Count

**User Story:** As a developer, I want the backup code count driven by `IBackupCodeConstants.Count` instead of a hardcoded value, so that the count can be configured per deployment.

#### Acceptance Criteria

1. THE BrightChain_BackupCodeService SHALL read the backup code count from `IBackupCodeConstants.Count` provided via application constants.
2. THE BrightChain_BackupCodeService SHALL generate exactly `IBackupCodeConstants.Count` backup codes when generating a new set.
3. THE Local_BackupCodeService hardcoded count of 10 SHALL be replaced by the configurable constant.

### Requirement 4: Update Backup Code Generation Endpoint

**User Story:** As a user, I want the generate-backup-codes endpoint to produce codes using the ported Argon2id/AEAD scheme, so that each code can recover my private key.

#### Acceptance Criteria

1. WHEN a user requests backup code generation, THE UserController SHALL call BrightChain_BackupCodeService to generate and encrypt backup codes for the authenticated user.
2. WHEN backup codes are generated, THE BrightChain_BackupCodeService SHALL encrypt each code using the user's BackendMember and the System_User, producing an `IStoredBackupCode[]` array.
3. WHEN encrypted backup codes are produced, THE BrightChain_BackupCodeService SHALL persist the `IStoredBackupCode[]` array to the member's private profile via MemberStore.
4. WHEN backup code generation succeeds, THE UserController SHALL return the plaintext backup code strings to the caller exactly once.
5. IF backup code generation fails, THEN THE UserController SHALL return an HTTP 500 response with a descriptive error message.
6. THE generated backup codes SHALL conform to the format defined by `IBackupCodeConstants.DisplayRegex`.

### Requirement 5: Update Backup Code Count Endpoint

**User Story:** As a user, I want to know how many backup codes I have remaining, so that I can regenerate them before running out.

#### Acceptance Criteria

1. WHEN a user requests the backup code count, THE BrightChain_BackupCodeService SHALL retrieve the `IStoredBackupCode[]` array from the member's private profile via MemberStore.
2. WHEN the `IStoredBackupCode[]` array is retrieved, THE UserController SHALL return the length of the array as the remaining code count.
3. IF the member's private profile contains no backup codes, THEN THE UserController SHALL return a count of zero.

### Requirement 6: Add Backup Code Recovery Endpoint

**User Story:** As a user, I want to recover my account using a backup code, so that I can regain access when I have lost my mnemonic or password.

#### Acceptance Criteria

1. WHEN a user submits a backup code for recovery, THE UserController SHALL accept a request body containing the backup code string and an optional new password.
2. WHEN a valid backup code is submitted, THE BrightChain_BackupCodeService SHALL call `useBackupCode()` to consume the code and obtain the matched `IStoredBackupCode` entry.
3. WHEN a backup code is consumed, THE BrightChain_BackupCodeService SHALL call `recoverKeyWithBackupCode()` to decrypt the user's private key from the AEAD blob using the System_User's ECIES key.
4. WHEN key recovery succeeds, THE BrightChain_BackupCodeService SHALL persist the updated backup codes array (with the consumed code removed) to the member's private profile via MemberStore.
5. WHEN key recovery succeeds, THE UserController SHALL return an HTTP 200 response containing the recovered session credentials.
6. IF the submitted backup code does not match any stored code, THEN THE UserController SHALL return an HTTP 401 response with an invalid-code error message.
7. IF key recovery fails due to a decryption error, THEN THE UserController SHALL return an HTTP 500 response with a descriptive error message.

### Requirement 7: Backup Code Regeneration Endpoint

**User Story:** As a user, I want to regenerate all my backup codes, so that I can invalidate any potentially compromised codes and receive a fresh set.

#### Acceptance Criteria

1. WHEN a user requests backup code regeneration, THE BrightChain_BackupCodeService SHALL clear all existing `IStoredBackupCode` entries from the member's private profile via MemberStore.
2. WHEN existing codes are cleared, THE BrightChain_BackupCodeService SHALL generate and persist a new set of encrypted backup codes using the ported cryptographic scheme (as specified in Requirement 2).
3. WHEN regeneration succeeds, THE UserController SHALL return the new plaintext backup code strings to the caller exactly once.
4. WHEN regeneration completes, every previously-generated plaintext code SHALL fail validation against the new stored backup codes.

### Requirement 8: System User Availability for Key Wrapping

**User Story:** As a developer, I want the system user available to the BrightChain_BackupCodeService at runtime, so that backup code AEAD blobs can be wrapped and unwrapped with the system ECIES key. This is provided by the SystemUserService.

#### Acceptance Criteria

1. WHEN the application finishes initialization, THE application SHALL provide the System_User BackendMember to the BrightChain_BackupCodeService.
2. IF the System_User is not available when a backup code operation is attempted, THEN THE BrightChain_BackupCodeService SHALL throw a descriptive error.
3. THE System_User BackendMember SHALL be the same instance used by other cryptographic services (ECIESService, KeyWrappingService).

### Requirement 9: System Key Rotation Support

**User Story:** As an administrator, I want to re-wrap all users' backup code blobs when the system key is rotated, so that backup codes remain recoverable after key rotation.

#### Acceptance Criteria

1. WHEN a system key rotation is initiated, THE BrightChain_BackupCodeService SHALL re-wrap all users' backup codes by replacing the outer ECIES wrapping with the new System_User's key without modifying the inner AEAD ciphertext.
2. WHEN re-wrapping a user's backup codes, THE BrightChain_BackupCodeService SHALL iterate over members using MemberStore.queryIndex() and MemberStore.getMemberProfile() instead of MongoDB batch queries.
3. WHEN re-wrapping completes for a user, THE updated `IStoredBackupCode[]` array SHALL be persisted to the member's private profile via MemberStore.updateMember().
4. IF re-wrapping fails for a specific user, THEN THE BrightChain_BackupCodeService SHALL log the error and continue processing remaining users.
5. WHEN re-wrapping completes, all previously-valid plaintext backup codes SHALL still validate and recover the user's original private key using the new System_User key.

### Requirement 10: Remove Local BackupCodeService

**User Story:** As a developer, I want the local simplified BackupCodeService removed, so that there is a single authoritative backup code implementation using the ported cryptographic scheme.

#### Acceptance Criteria

1. THE `brightchain-api-lib` SHALL remove the file `services/backupCodeService.ts`.
2. THE `brightchain-api-lib` services barrel export (`services/index.ts`) SHALL remove the re-export of the Local_BackupCodeService.
3. THE UserController SHALL import the BrightChain_BackupCodeService type instead of the Local_BackupCodeService.
4. THE Service_Container SHALL register the BrightChain_BackupCodeService instance under the `'backupCodeService'` key.
5. THE existing property-based test file `backupCodeService.property.spec.ts` SHALL be updated or replaced to test the BrightChain_BackupCodeService against the ported cryptographic scheme.

### Requirement 11: Register BrightChain_BackupCodeService in Service Container

**User Story:** As a developer, I want the new BrightChain_BackupCodeService registered in the service container, so that all consumers resolve the BrightDB-native implementation.

#### Acceptance Criteria

1. WHEN the application starts, THE Service_Container SHALL register the BrightChain_BackupCodeService instance under the `'backupCodeService'` key.
2. WHEN the application starts, THE Service_Container SHALL cease registering the Local_BackupCodeService.
3. THE BrightChain_BackupCodeService SHALL be constructed with `MemberStore`, `ECIESService`, `KeyWrappingService`, and application constants as dependencies.
4. THE `application.ts` SHALL remove the import and instantiation of the Local_BackupCodeService.

### Requirement 12: Shared Interface Placement

**User Story:** As a developer, I want backup code interfaces in `brightchain-lib` and Node.js-specific service implementations in `brightchain-api-lib`, so that frontend clients can consume the data shapes without backend dependencies.

#### Acceptance Criteria

1. THE `IStoredBackupCode` interface SHALL remain in `brightchain-lib` so that both frontend and backend can reference the backup code data shape.
2. THE `IBackupCodeConstants` interface SHALL remain in `brightchain-lib` so that both frontend and backend can reference the configuration.
3. THE BrightChain_BackupCodeService implementation SHALL reside in `brightchain-api-lib` since it depends on Node.js cryptographic primitives (Argon2id, HKDF, AEAD) and `MemberStore`.
4. THE `IBackupCodesResponseData` interface SHALL remain in `brightchain-lib` for shared response typing.
