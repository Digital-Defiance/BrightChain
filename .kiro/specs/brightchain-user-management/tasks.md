# Implementation Plan: BrightChain User Management

## Overview

Implement the complete user management layer for BrightChain: shared interfaces, password change, backup code management, mnemonic recovery, session adapter, controller endpoints, DEV_DATABASE environment unification, and end-to-end tests. Tasks are ordered by dependency — shared interfaces first, then services, then controller, then environment, then integration tests.

## Tasks

- [x] 1. Define shared user management interfaces in brightchain-lib
  - [x] 1.1 Create `IPasswordChangeRequest`, `IPasswordChangeResponse<TId>`, `IRecoveryRequest`, `IRecoveryResponse<TId>` interfaces in `brightchain-lib/src/lib/interfaces/userManagement.ts`
    - `IPasswordChangeRequest`: `currentPassword: string`, `newPassword: string`
    - `IPasswordChangeResponse<TId>`: `memberId: TId`, `success: boolean`
    - `IRecoveryRequest`: `email: string`, `mnemonic: string`, `newPassword?: string`
    - `IRecoveryResponse<TId>`: `token: string`, `memberId: TId`, `passwordReset: boolean`
    - Export all from `brightchain-lib` barrel file
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 1.2 Extend `IBackupCodesResponseData` to include `count: number` field alongside existing `backupCodes: string[]`
    - Update the existing interface in `brightchain-lib/src/lib/interfaces/responses/`
    - Ensure `ICodeCountResponseData` is also exported
    - _Requirements: 7.3_

  - [x] 1.3 Add `IStoredBackupCode` interface (`hash: string`, `used: boolean`, `createdAt: number`) to brightchain-lib
    - Add optional `backupCodes?: IStoredBackupCode[]` field to the member private profile data type
    - _Requirements: 2.1, 2.6_

  - [x] 1.4 Create API response interfaces in `brightchain-api-lib/src/lib/interfaces/responses/`
    - `IApiPasswordChangeResponse extends IApiMessageResponse` with `data: IPasswordChangeResponse<string>`
    - `IApiRecoveryResponse extends IApiMessageResponse` with `data: IRecoveryResponse<string>`
    - Export from brightchain-api-lib barrel
    - _Requirements: 7.6_

- [x] 2. Implement validation functions
  - [x] 2.1 Create `validatePasswordChange(body: unknown): IValidationResult` in `brightchain-api-lib/src/lib/validation/userValidation.ts`
    - Require `currentPassword` (string, non-empty) and `newPassword` (string, ≥8 chars)
    - Return `{ valid: false, errors: [...] }` with field-level messages on failure
    - Follow existing validation pattern from `handleRegister`/`handleLogin`
    - _Requirements: 1.3, 5.7_

  - [x] 2.2 Create `validateRecovery(body: unknown): IValidationResult` in the same file
    - Require `email` (valid format) and `mnemonic` (string, non-empty)
    - Optional `newPassword` — if present, must be ≥8 chars
    - _Requirements: 5.7_

  - [x] 2.3 Write property test for password policy validation (Property 3)
    - **Property 3: Password policy validation rejects short passwords**
    - For any string with length < 8, `validatePasswordChange` should return `{ valid: false }` with error on `newPassword` field
    - Test file: `brightchain-api-lib/src/__tests__/services/authService.password.property.spec.ts`
    - **Validates: Requirements 1.3**

- [x] 3. Implement AuthService password change and mnemonic recovery
  - [x] 3.1 Add `changePassword(memberId: Uint8Array, currentPassword: string, newPassword: string): Promise<void>` to AuthService
    - Retrieve stored hash via `getPasswordHash(memberId)`
    - `bcrypt.compare(currentPassword, storedHash)` — throw "Invalid credentials" on mismatch
    - `bcrypt.hash(newPassword, BCRYPT_ROUNDS)` and `storePasswordHash(memberId, newHash)`
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 3.2 Write property test for password change round-trip (Property 1)
    - **Property 1: Password change round-trip**
    - For any valid new password, after `changePassword`, `bcrypt.compare(newPassword, getPasswordHash(memberId))` returns `true`
    - Test file: `brightchain-api-lib/src/__tests__/services/authService.password.property.spec.ts`
    - **Validates: Requirements 1.1**

  - [x] 3.3 Write property test for wrong password preserving stored hash (Property 2)
    - **Property 2: Wrong password preserves stored hash**
    - For any incorrect current password, `changePassword` throws "Invalid credentials" and stored hash is unchanged
    - Test file: `brightchain-api-lib/src/__tests__/services/authService.password.property.spec.ts`
    - **Validates: Requirements 1.2**

  - [x] 3.4 Add `recoverWithMnemonic(email: string, mnemonic: SecureString, newPassword?: string): Promise<IRecoveryResponse<string>>` to AuthService
    - Call `BrightChainAuthenticationProvider.authenticateWithMnemonic(email, mnemonic)`
    - On success, sign JWT via `signToken`
    - If `newPassword` provided, hash and persist via `storePasswordHash`
    - Return `{ token, memberId, passwordReset: !!newPassword }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.5 Write property test for mnemonic recovery round-trip (Property 9)
    - **Property 9: Mnemonic recovery round-trip**
    - For any registered member, `recoverWithMnemonic(email, mnemonic, newPassword)` returns valid JWT, correct memberId, `passwordReset: true`, and new password verifies
    - Test file: `brightchain-api-lib/src/__tests__/services/authService.recovery.property.spec.ts`
    - **Validates: Requirements 3.1, 3.2, 3.5**

  - [x] 3.6 Write property test for invalid mnemonic rejection (Property 10)
    - **Property 10: Invalid mnemonic rejected**
    - For any wrong mnemonic, `recoverWithMnemonic` throws "Invalid credentials"
    - Test file: `brightchain-api-lib/src/__tests__/services/authService.recovery.property.spec.ts`
    - **Validates: Requirements 3.3**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement BackupCodeService
  - [x] 5.1 Create `BackupCodeService` class in `brightchain-api-lib/src/lib/services/backupCodeService.ts`
    - Constructor takes `MemberStore` and optional `bcryptRounds`
    - `generateCodes(memberId)`: generate 10 codes via `crypto.randomBytes(8)` formatted as `XXXX-XXXX-XXXX-XXXX`, bcrypt-hash each, store `{ hash, used: false, createdAt }` array in member profile via `MemberStore.updateMember`, return plaintext codes
    - `getCodeCount(memberId)`: return count of entries where `used === false`
    - `validateCode(memberId, code)`: compare against stored hashes, mark matched as `used: true`, persist update
    - `regenerateCodes(memberId)`: clear all existing codes, call `generateCodes`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.2 Write property test for backup code generation invariant (Property 4)
    - **Property 4: Backup code generation invariant**
    - `generateCodes` returns exactly 10 distinct codes, `getCodeCount` returns 10
    - Test file: `brightchain-api-lib/src/__tests__/services/backupCodeService.property.spec.ts`
    - **Validates: Requirements 2.1, 2.2**

  - [x] 5.3 Write property test for valid backup code authentication (Property 5)
    - **Property 5: Valid backup code authentication succeeds and decrements count**
    - Any unused code validates successfully, count decrements by 1
    - Test file: `brightchain-api-lib/src/__tests__/services/backupCodeService.property.spec.ts`
    - **Validates: Requirements 2.3**

  - [x] 5.4 Write property test for used/invalid backup code rejection (Property 6)
    - **Property 6: Used or invalid backup codes are rejected**
    - Used codes and random strings are rejected by `validateCode`
    - Test file: `brightchain-api-lib/src/__tests__/services/backupCodeService.property.spec.ts`
    - **Validates: Requirements 2.4**

  - [x] 5.5 Write property test for backup code regeneration (Property 7)
    - **Property 7: Backup code regeneration invalidates old codes**
    - After `regenerateCodes`, old codes are rejected, new count is 10
    - Test file: `brightchain-api-lib/src/__tests__/services/backupCodeService.property.spec.ts`
    - **Validates: Requirements 2.5**

  - [x] 5.6 Write property test for bcrypt-hashed storage (Property 8)
    - **Property 8: Backup codes stored as bcrypt hashes**
    - Stored entries match bcrypt pattern `/^\$2[aby]\$/` and none equal plaintext codes
    - Test file: `brightchain-api-lib/src/__tests__/services/backupCodeService.property.spec.ts`
    - **Validates: Requirements 2.6**

- [x] 6. Implement BrightChainSessionAdapter
  - [x] 6.1 Create `ISessionDocument` interface and `BrightChainSessionAdapter` class in `brightchain-api-lib/src/lib/services/sessionAdapter.ts`
    - Constructor takes `BrightChainDb` instance
    - `createSession(memberId, token, ttlMs)`: generate UUID sessionId, SHA-256 hash token, store document in `sessions` collection, return sessionId
    - `getSession(sessionId)`: retrieve by sessionId, return null if not found or expired
    - `validateToken(token)`: SHA-256 hash token, query by tokenHash, check expiration, return document or null
    - `deleteSession(sessionId)`: remove document from collection
    - `cleanExpired()`: remove all documents where `expiresAt < Date.now()`, return count removed
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.2 Write property test for session create-validate round-trip (Property 11)
    - **Property 11: Session create-validate round-trip**
    - After `createSession`, `validateToken` returns correct session with matching memberId and tokenHash
    - Test file: `brightchain-api-lib/src/__tests__/services/sessionAdapter.property.spec.ts`
    - **Validates: Requirements 4.2, 4.3**

  - [x] 6.3 Write property test for expired/missing token (Property 12)
    - **Property 12: Expired or missing token returns null**
    - Expired sessions and unknown tokens return null from `validateToken`
    - Test file: `brightchain-api-lib/src/__tests__/services/sessionAdapter.property.spec.ts`
    - **Validates: Requirements 4.4**

  - [x] 6.4 Write property test for session deletion (Property 13)
    - **Property 13: Session deletion invalidates token**
    - After `deleteSession`, `validateToken` returns null
    - Test file: `brightchain-api-lib/src/__tests__/services/sessionAdapter.property.spec.ts`
    - **Validates: Requirements 4.5**

  - [x] 6.5 Write property test for cleanExpired (Property 14)
    - **Property 14: cleanExpired removes only expired sessions**
    - Only sessions with `expiresAt` in the past are removed; non-expired sessions remain valid
    - Test file: `brightchain-api-lib/src/__tests__/services/sessionAdapter.property.spec.ts`
    - **Validates: Requirements 4.6**

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Expand UserController with new endpoints
  - [x] 8.1 Add `PUT /api/user/password` endpoint (`handleChangePassword`) to UserController
    - Validate request body with `validatePasswordChange`
    - Extract authenticated member ID from request
    - Delegate to `AuthService.changePassword`
    - Return 200 with `IApiPasswordChangeResponse` on success, 400 on validation failure, 401 on wrong password, 500 on persistence error
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 5.1, 5.7_

  - [x] 8.2 Add `POST /api/user/backup-codes` endpoint (`handleGenerateBackupCodes`) to UserController
    - Require authentication
    - Delegate to `BackupCodeService.generateCodes`
    - Return 200 with `IApiBackupCodesResponse` containing plaintext codes and count
    - _Requirements: 2.1, 5.2_

  - [x] 8.3 Add `GET /api/user/backup-codes/count` endpoint (`handleBackupCodeCount`) to UserController
    - Require authentication
    - Delegate to `BackupCodeService.getCodeCount`
    - Return 200 with `IApiCodeCountResponse`
    - _Requirements: 2.2, 5.3_

  - [x] 8.4 Add `POST /api/user/recover` endpoint (`handleRecover`) to UserController
    - No authentication required
    - Validate request body with `validateRecovery`
    - Delegate to `AuthService.recoverWithMnemonic`
    - Return 200 with `IApiRecoveryResponse` on success, 401 on invalid credentials
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.4, 5.7_

  - [x] 8.5 Add `POST /api/user/logout` endpoint (`handleLogout`) to UserController
    - Require authentication
    - Extract session ID from request/token
    - Delegate to `SessionAdapter.deleteSession`
    - Return 200 on success
    - _Requirements: 4.5, 5.5_

  - [x] 8.6 Wire `BackupCodeService` and `BrightChainSessionAdapter` into UserController constructor/initialization
    - Instantiate services in the application bootstrap (where AuthService and MemberStore are created)
    - Pass service instances to UserController
    - Register new routes in `initRouteDefinitions()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.7 Write property test for unauthenticated request rejection (Property 15)
    - **Property 15: Unauthenticated requests return 401**
    - For any authenticated endpoint, requests without valid JWT return 401
    - Test file: `brightchain-api-lib/src/__tests__/controllers/userController.auth.property.spec.ts`
    - **Validates: Requirements 5.6**

- [x] 9. Implement DEV_DATABASE environment unification
  - [x] 9.1 Update `Environment` class to read `DEV_DATABASE` as string pool name
    - Add `_devDatabasePoolName: string | undefined` private field
    - Parse `DEV_DATABASE` from env: non-empty trimmed string → set pool name, else undefined
    - Derive `_useMemoryDocumentStore` from `_devDatabasePoolName !== undefined`
    - Add `get devDatabasePoolName(): string | undefined` getter
    - Deprecate `USE_MEMORY_DOCSTORE` — `useMemoryDocumentStore` now derives from `DEV_DATABASE`
    - _Requirements: 6.1, 6.4_

  - [x] 9.2 Update `brightchainDatabaseInit` to use `devDatabasePoolName`
    - When `environment.devDatabasePoolName` is set: create MemoryBlockStore, use pool name
    - When not set and `blockStorePath` exists: create DiskBlockStore (existing behavior)
    - When neither is set: throw descriptive error
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.3 Update `serve:dev:stream` script in `package.json` to pass `DEV_DATABASE` env var
    - _Requirements: 6.5_

  - [x] 9.4 Write property test for DEV_DATABASE controls useMemoryDocumentStore (Property 16)
    - **Property 16: DEV_DATABASE controls useMemoryDocumentStore**
    - `useMemoryDocumentStore` is `true` iff `DEV_DATABASE` is non-empty; `devDatabasePoolName` equals trimmed value
    - Test file: `brightchain-api-lib/src/__tests__/services/environment.property.spec.ts`
    - **Validates: Requirements 6.1, 6.2, 6.4**

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement MemberStore round-trip property tests
  - [x] 11.1 Write property test for member creation round-trip (Property 17)
    - **Property 17: Member creation round-trip**
    - For any valid member input, `createMember` then `getMember` preserves `name`, `email`, `type`, `publicKey`
    - Test file: `brightchain-lib/src/__tests__/memberStore.roundtrip.property.spec.ts`
    - **Validates: Requirements 9.1**

  - [x] 11.2 Write property test for profile update round-trip (Property 18)
    - **Property 18: Profile update round-trip**
    - For any valid profile update, `updateMember` then `getMemberProfile` preserves updated fields
    - Test file: `brightchain-lib/src/__tests__/memberStore.roundtrip.property.spec.ts`
    - **Validates: Requirements 9.2**

  - [x] 11.3 Write property test for password hash storage round-trip (Property 19)
    - **Property 19: Password hash storage round-trip**
    - For any valid bcrypt hash, `storePasswordHash` then `getPasswordHash` returns identical hash
    - Test file: `brightchain-lib/src/__tests__/memberStore.roundtrip.property.spec.ts`
    - **Validates: Requirements 9.3**

- [x] 12. Implement end-to-end Playwright integration tests
  - [x] 12.1 Create e2e test file `brightchain-api-e2e/src/brightchain-api/user-management.e2e.spec.ts` with test setup
    - Configure server startup with `DEV_DATABASE=test-pool` for in-memory backend
    - Set up base URL and request helpers
    - _Requirements: 8.1, 8.10_

  - [x] 12.2 Implement registration e2e test
    - Submit valid registration data, verify 201 response with token and member ID
    - _Requirements: 8.2_

  - [x] 12.3 Implement login e2e test
    - Register a user, log in with same credentials, verify 200 with token
    - _Requirements: 8.3_

  - [x] 12.4 Implement profile retrieval e2e test
    - Register, authenticate, verify profile returns correct username, email, energy balance
    - _Requirements: 8.4_

  - [x] 12.5 Implement password change e2e test
    - Register, change password, verify old password login fails, new password login succeeds
    - _Requirements: 8.5_

  - [x] 12.6 Implement backup code generation and count e2e test
    - Register, generate backup codes, verify 10 codes returned, verify count endpoint returns 10
    - _Requirements: 8.6_

  - [x] 12.7 Implement backup code authentication e2e test
    - Generate codes, use one to authenticate, verify count decreases by 1, verify reuse fails
    - _Requirements: 8.7_

  - [x] 12.8 Implement mnemonic recovery e2e test
    - Register (capture mnemonic), recover with mnemonic and new password, verify login with new password
    - _Requirements: 8.8_

  - [x] 12.9 Implement logout e2e test
    - Authenticate, call logout, verify subsequent requests with same token return 401
    - _Requirements: 8.9_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- All 19 correctness properties from the design are covered as property test sub-tasks
- Checkpoints at tasks 4, 7, 10, and 13 ensure incremental validation
- Property tests use `fast-check` library; run via `NX_TUI=false npx nx run <project>:test --outputStyle=stream`
- E2E tests use Playwright; run via `NX_TUI=false npx nx run brightchain-api-e2e:e2e --outputStyle=stream`
- Shared interfaces go in `brightchain-lib`, Node.js-specific services go in `brightchain-api-lib`, per workspace conventions
