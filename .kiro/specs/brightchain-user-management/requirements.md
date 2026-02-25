# Requirements Document

## Introduction

BrightChain has migrated from Mongoose/MongoDB to a custom document database backed by block stores (brightchain-db). The express-suite upstream provides user management (controllers, services, session adapters, authentication providers) built on Mongoose. BrightChain already has partial equivalents — a `BrightChainAuthenticationProvider`, an `AuthService`, a `UserController` with register/login/profile endpoints, and a `MemberStore` — but several critical user management capabilities are missing or incomplete.

This feature fills the gaps: password change, backup code management, mnemonic-based recovery, a BrightChain session adapter, and a unified `DEV_DATABASE` environment variable that replaces `USE_MEMORY_DOCSTORE` to mirror the express-suite pattern. It also delivers end-to-end Playwright integration tests proving the full user lifecycle works against the BrightChain backend without mocks.

## Glossary

- **UserController**: The Express controller in `brightchain-api-lib` that handles HTTP endpoints for user registration, login, profile retrieval, profile update, password change, backup codes, and account recovery.
- **AuthService**: The service in `brightchain-api-lib` that orchestrates authentication logic — registration, login, token signing/verification, and password hashing — against the MemberStore.
- **MemberStore**: The service in `brightchain-lib` that persists and retrieves member data (identity, profiles, credentials) in the BrightChain block store.
- **BrightChainAuthenticationProvider**: The `IAuthenticationProvider` implementation in `brightchain-api-lib` that delegates user lookup, credential verification, and JWT operations to MemberStore and bcrypt/mnemonic — fully decoupled from Mongoose.
- **SessionAdapter**: A service in `brightchain-api-lib` that manages user sessions (creation, retrieval, invalidation) backed by BrightChainDb instead of Mongoose.
- **BackupCodeService**: A service that generates, encrypts, stores, validates, and regenerates one-time-use backup codes for account recovery.
- **Environment**: The configuration class in `brightchain-api-lib` that reads environment variables and exposes typed accessors for database paths, block sizes, JWT secrets, and the `DEV_DATABASE` toggle.
- **BrightChainDb**: The document database in `brightchain-db` that stores documents as CBL-indexed blocks, supporting collections, queries, and transactions.
- **BlockStore**: The storage backend (memory or disk) that persists raw blocks for BrightChainDb.
- **DEV_DATABASE**: An environment variable whose presence (with a non-empty pool name value) triggers an in-memory BrightChain store for development, mirroring the express-suite pattern where `DEV_DATABASE` triggers an in-memory MongoDB.
- **Playwright**: The end-to-end testing framework used for integration tests against the running API server.

## Requirements

### Requirement 1: Password Change

**User Story:** As an authenticated user, I want to change my password, so that I can maintain account security.

#### Acceptance Criteria

1. WHEN an authenticated user submits a valid current password and a new password, THE AuthService SHALL verify the current password against the stored hash, hash the new password, and persist the new hash via MemberStore.
2. WHEN an authenticated user submits an incorrect current password, THE AuthService SHALL reject the request with an "Invalid credentials" error without modifying the stored hash.
3. WHEN a password change request contains a new password that does not meet the password policy, THE UserController SHALL return a 400 response with validation errors.
4. WHEN a password is changed successfully, THE UserController SHALL return a 200 response with a confirmation message.
5. IF the MemberStore fails to persist the new password hash, THEN THE AuthService SHALL propagate the error and THE UserController SHALL return a 500 response.

### Requirement 2: Backup Code Management

**User Story:** As an authenticated user, I want to generate, view the count of, and use backup codes, so that I can recover my account if I lose my primary credentials.

#### Acceptance Criteria

1. WHEN an authenticated user requests backup code generation, THE BackupCodeService SHALL generate a set of 10 one-time-use backup codes, encrypt the codes using the member's public key via the system member, and persist the encrypted codes in the user document via MemberStore.
2. WHEN an authenticated user requests the backup code count, THE UserController SHALL return the number of remaining unused backup codes without revealing the codes themselves.
3. WHEN a user authenticates using a valid unused backup code, THE AuthService SHALL mark the code as used, persist the updated code list, and return a valid authentication token.
4. WHEN a user attempts to authenticate using an already-used or invalid backup code, THE AuthService SHALL reject the request with an "Invalid credentials" error.
5. WHEN an authenticated user requests backup code regeneration, THE BackupCodeService SHALL invalidate all existing codes and generate a fresh set of 10 codes.
6. THE BackupCodeService SHALL store backup codes in bcrypt-hashed form so that raw codes are not recoverable from storage.

### Requirement 3: Mnemonic-Based Account Recovery

**User Story:** As a user who has lost password access, I want to recover my account using my mnemonic phrase, so that I can regain access and set a new password.

#### Acceptance Criteria

1. WHEN a user submits a valid email and mnemonic phrase, THE AuthService SHALL call `authenticateWithMnemonic` on the BrightChainAuthenticationProvider to verify the mnemonic loads the member's private key.
2. WHEN mnemonic authentication succeeds, THE AuthService SHALL issue a JWT token and return it alongside the member ID.
3. WHEN a user submits an invalid mnemonic for a known email, THE AuthService SHALL reject the request with an "Invalid credentials" error.
4. WHEN a user submits a mnemonic for an unknown email, THE AuthService SHALL reject the request with an "Invalid credentials" error without revealing whether the email exists.
5. WHEN mnemonic recovery succeeds and the user provides a new password, THE AuthService SHALL hash and persist the new password via MemberStore, replacing the previous password hash.

### Requirement 4: BrightChain Session Adapter

**User Story:** As a developer, I want a session adapter backed by BrightChainDb, so that user sessions are managed without any Mongoose dependency.

#### Acceptance Criteria

1. THE SessionAdapter SHALL implement the `ISessionAdapter` interface from `@digitaldefiance/node-express-suite`.
2. WHEN a user logs in successfully, THE SessionAdapter SHALL create a session document in a `sessions` collection in BrightChainDb, storing the member ID, token hash, creation timestamp, and expiration timestamp.
3. WHEN a request includes a valid session token, THE SessionAdapter SHALL retrieve the corresponding session document and confirm the session has not expired.
4. WHEN a session token is expired or not found, THE SessionAdapter SHALL return null to indicate an invalid session.
5. WHEN a user logs out, THE SessionAdapter SHALL delete the session document from BrightChainDb.
6. THE SessionAdapter SHALL support a `cleanExpired` method that removes all session documents whose expiration timestamp is in the past.

### Requirement 5: User Controller Endpoint Expansion

**User Story:** As a developer, I want the UserController to expose endpoints for password change, backup codes, mnemonic recovery, and logout, so that the full user management lifecycle is available via the API.

#### Acceptance Criteria

1. THE UserController SHALL expose a `PUT /user/password` endpoint that accepts `{ currentPassword, newPassword }` and delegates to AuthService for password change.
2. THE UserController SHALL expose a `POST /user/backup-codes` endpoint that generates new backup codes and returns the plaintext codes in the response (one-time display).
3. THE UserController SHALL expose a `GET /user/backup-codes/count` endpoint that returns the number of remaining unused backup codes.
4. THE UserController SHALL expose a `POST /auth/recover` endpoint that accepts `{ email, mnemonic, newPassword? }` and delegates to AuthService for mnemonic recovery.
5. THE UserController SHALL expose a `POST /auth/logout` endpoint that invalidates the current session via the SessionAdapter.
6. WHEN any authenticated endpoint receives a request without a valid token, THE UserController SHALL return a 401 response.
7. THE UserController SHALL validate all request bodies using the existing validation pattern before delegating to services.

### Requirement 6: DEV_DATABASE Environment Unification

**User Story:** As a developer, I want `DEV_DATABASE` to control whether BrightChain uses an in-memory or disk-based store, so that the configuration mirrors the express-suite pattern and `USE_MEMORY_DOCSTORE` is no longer needed.

#### Acceptance Criteria

1. WHEN `DEV_DATABASE` is set to a non-empty string, THE Environment SHALL use the value as the pool name and THE database initialization SHALL create an in-memory BlockStore and an in-memory BrightChainDb (InMemoryHeadRegistry).
2. WHEN `DEV_DATABASE` is not set or is empty, THE Environment SHALL require `BRIGHTCHAIN_BLOCKSTORE_PATH` and THE database initialization SHALL create a DiskBlockStore and a BrightChainDb with PersistentHeadRegistry at the specified path.
3. WHEN `DEV_DATABASE` is not set and `BRIGHTCHAIN_BLOCKSTORE_PATH` is not set, THE database initialization SHALL fail with a descriptive error message.
4. THE Environment SHALL deprecate the `USE_MEMORY_DOCSTORE` property and THE `useMemoryDocumentStore` getter SHALL derive its value from the presence of `DEV_DATABASE` instead.
5. THE `serve:dev:stream` script SHALL pass `DEV_DATABASE` through to the API process so that the in-memory store is activated during development.

### Requirement 7: Shared User Management Interfaces in brightchain-lib

**User Story:** As a developer, I want shared user management interfaces (password change request/response, backup code data, recovery request/response) defined in brightchain-lib with generic type parameters, so that both frontend and backend can consume them.

#### Acceptance Criteria

1. THE brightchain-lib SHALL export an `IPasswordChangeRequest` interface with fields `currentPassword` and `newPassword` typed as `string`.
2. THE brightchain-lib SHALL export an `IPasswordChangeResponse<TId>` interface with a generic `memberId: TId` field and a `success: boolean` field.
3. THE brightchain-lib SHALL export an `IBackupCodesResponseData` interface (or extend the existing one) with fields `codes: string[]` and `count: number`.
4. THE brightchain-lib SHALL export an `IRecoveryRequest` interface with fields `email: string`, `mnemonic: string`, and an optional `newPassword: string`.
5. THE brightchain-lib SHALL export an `IRecoveryResponse<TId>` interface with fields `token: string`, `memberId: TId`, and `passwordReset: boolean`.
6. THE brightchain-api-lib SHALL export API response interfaces that extend `IApiMessageResponse` and embed the corresponding brightchain-lib data interfaces.

### Requirement 8: End-to-End Playwright Integration Tests

**User Story:** As a developer, I want end-to-end Playwright tests that exercise the full user lifecycle against a real BrightChain backend (no mocks), so that I have confidence the user management layer works correctly.

#### Acceptance Criteria

1. THE e2e test suite SHALL start the API server with `DEV_DATABASE` set to an in-memory pool name, ensuring no external database dependency.
2. THE e2e test suite SHALL test user registration: submit valid registration data and verify a 201 response with a token and member ID.
3. THE e2e test suite SHALL test user login: register a user, then log in with the same credentials and verify a 200 response with a token.
4. THE e2e test suite SHALL test profile retrieval: register a user, authenticate, and verify the profile endpoint returns the correct username, email, and energy balance.
5. THE e2e test suite SHALL test password change: register a user, change the password, verify login with the old password fails, and verify login with the new password succeeds.
6. THE e2e test suite SHALL test backup code generation: register a user, generate backup codes, verify 10 codes are returned, and verify the count endpoint returns 10.
7. THE e2e test suite SHALL test backup code authentication: generate backup codes, use one to authenticate, verify the count decreases by 1, and verify the same code cannot be reused.
8. THE e2e test suite SHALL test mnemonic recovery: register a user (capturing the mnemonic), use the mnemonic to recover the account with a new password, and verify login with the new password succeeds.
9. THE e2e test suite SHALL test logout: authenticate, call the logout endpoint, and verify subsequent requests with the same token return 401.
10. THE e2e test suite SHALL run without mocks, using the real BrightChain block store and BrightChainDb in-memory backend.

### Requirement 9: Round-Trip Property for User Document Serialization

**User Story:** As a developer, I want a round-trip property test for user document serialization, so that I can be confident that persisting and retrieving user data through MemberStore preserves all fields.

#### Acceptance Criteria

1. FOR ALL valid member creation inputs, creating a member via MemberStore, then retrieving the member via `getMember`, SHALL produce a member whose `name`, `email`, `type`, and `publicKey` match the original input.
2. FOR ALL valid profile update inputs, updating a member profile via `updateMember` then retrieving via `getMemberProfile` SHALL produce a profile whose updated fields match the input.
3. FOR ALL valid password hashes, storing a password hash via `storePasswordHash` then retrieving via `getPasswordHash` SHALL return the identical hash string.
