# Implementation Plan: Upstream Backup Codes

## Overview

Port the upstream `@digitaldefiance/node-express-suite` cryptographic backup code scheme into BrightChain. Replace `IStoredBackupCode` with the upstream `IBackupCode` shape, implement `BrightChainBackupCodeService` delegating crypto to upstream `BackupCode` static methods, update `UserController` endpoints, wire into the service container, and remove the local bcrypt-based `BackupCodeService`. All storage uses `MemberStore`/BrightDB instead of MongoDB.

## Tasks

- [x] 1. Update IStoredBackupCode interface and related types in brightchain-lib
  - [x] 1.1 Redefine IStoredBackupCode to match upstream IBackupCode shape
    - In `brightchain-lib/src/lib/interfaces/userManagement.ts`, replace the existing `IStoredBackupCode` fields (`hash`, `used`, `createdAt`) with: `version` (string), `checksumSalt` (string), `checksum` (string), `encrypted` (string)
    - Add JSDoc comments describing each field (scheme version, hex-encoded HKDF-SHA256 salt, hex-encoded checksum, hex-encoded ECIES-wrapped AEAD blob)
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Update private profile and member data interfaces
    - In `brightchain-lib/src/lib/interfaces/member/profileStorage.ts`, update JSDoc on `IPrivateMemberProfileStorageData.backupCodes` and `IPrivateMemberProfileHydratedData.backupCodes` to remove references to "bcrypt-hashed" and "one-time-use"
    - In `brightchain-lib/src/lib/interfaces/member/memberData.ts`, update JSDoc on `IPrivateMemberData.backupCodes` similarly
    - Verify all three interfaces reference the updated `IStoredBackupCode` type
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 1.3 Update IBrightChainUserInitEntry to use IStoredBackupCode
    - In `brightchain-lib/src/lib/interfaces/member/brightChainUserInitEntry.ts`, change the `backupCodes` field type from `IBackupCode` (imported from `@digitaldefiance/suite-core-lib`) to `IStoredBackupCode[]` (from `brightchain-lib`)
    - Remove the `import type { IBackupCode } from '@digitaldefiance/suite-core-lib'` line
    - Add import for `IStoredBackupCode` from the local interfaces
    - _Requirements: 1.6_

- [x] 2. Implement BrightChainBackupCodeService in brightchain-api-lib
  - [x] 2.1 Create BrightChainBackupCodeService class with constructor and system user management
    - Create `brightchain-api-lib/src/lib/services/brightChainBackupCodeService.ts`
    - Implement constructor accepting `MemberStore`, `ECIESService`, `KeyWrappingService`, and `IBackupCodeConstants` as dependencies
    - Implement `setSystemUser(user)` and private `getSystemUser()` methods; `getSystemUser()` throws `'System user not available'` if not set
    - _Requirements: 2.7, 2.8, 8.1, 8.2, 8.3_

  - [x] 2.2 Implement generateCodes method
    - Delegate to upstream `BackupCode.generateBackupCodes(count)` to produce plaintext codes
    - Call `BackupCode.encryptBackupCodes(backupUser, systemUser, codes)` to produce `IStoredBackupCode[]`
    - Persist encrypted codes to member's private profile via `MemberStore.updateMember()`
    - Return plaintext code strings formatted per `IBackupCodeConstants.DisplayRegex`
    - Read count from `this.backupCodeConstants.Count`
    - _Requirements: 2.1, 2.2, 2.6, 3.1, 3.2_

  - [x] 2.3 Implement validateBackupCode and useBackupCode methods
    - `validateBackupCode`: delegate to `BackupCode.validateBackupCode()` for constant-time HKDF-SHA256 checksum comparison
    - `useBackupCode(encryptedBackupCodes, backupCode)`: iterate stored codes, find match via `validateBackupCode`, filter it out, return `{ newCodesArray, code }`
    - Throw `InvalidBackupCodeError` if no match found
    - _Requirements: 2.3, 2.4_

  - [x] 2.4 Implement recoverKeyWithBackupCode method
    - Accept `memberId`, `backupCode`, and optional `newPassword`
    - Retrieve stored codes from member profile, call `useBackupCode()` to consume the code
    - Unwrap ECIES layer using system user's private key, then decrypt AEAD blob using Argon2id-derived key from the submitted code (delegate to upstream `BackupCode.getBackupKeyV1()` and decryption methods)
    - Persist updated codes array (consumed code removed) via `MemberStore.updateMember()`
    - Return recovered `BackendMember` and remaining code count
    - _Requirements: 2.5, 2.6_

  - [x] 2.5 Implement getCodeCount method
    - Retrieve `IStoredBackupCode[]` from member's private profile via `MemberStore.getMemberProfile()`
    - Return `array.length`, or 0 if no backup codes exist
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.6 Implement regenerateCodes method
    - Clear existing `IStoredBackupCode[]` entries from member's private profile
    - Call `generateCodes()` to generate and persist a fresh set
    - Return new plaintext code strings
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 2.7 Implement rewrapAllUsersBackupCodes method for key rotation
    - Accept old and new system `BackendMember` instances
    - Iterate over members using `MemberStore.queryIndex()` and `MemberStore.getMemberProfile()`
    - For each member, unwrap each code's ECIES layer with old system key, re-wrap with new system key, without modifying inner AEAD ciphertext
    - Persist re-wrapped `IStoredBackupCode[]` via `MemberStore.updateMember()`
    - Log errors for individual user failures and continue processing remaining users
    - Return count of successfully re-wrapped users
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 2.8 Add barrel export for BrightChainBackupCodeService
    - Add `export * from './brightChainBackupCodeService'` to `brightchain-api-lib/src/lib/services/index.ts`
    - _Requirements: 10.3_

- [x] 3. Checkpoint - Verify service implementation compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update UserController endpoints
  - [x] 4.1 Update UserController imports
    - In `brightchain-api-lib/src/lib/controllers/api/user.ts`, replace the `BackupCodeService` import with `BrightChainBackupCodeService`
    - Update the service container resolution to use `BrightChainBackupCodeService` type
    - _Requirements: 10.3_

  - [x] 4.2 Update generateBackupCodes endpoint
    - Resolve `BrightChainBackupCodeService` from service container
    - Call `service.generateCodes(memberId)` which handles generation, encryption, and persistence internally
    - Return plaintext backup code strings to the caller exactly once
    - Return HTTP 500 with descriptive error on failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.3 Update getBackupCodeCount endpoint
    - Call `service.getCodeCount(memberId)` which retrieves from MemberStore
    - Return array length as remaining count; return 0 if no codes exist
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.4 Implement recoverWithBackupCode endpoint (new)
    - Add `POST /api/user/recover-backup` endpoint
    - Accept `{ backupCode: string, newPassword?: string }` in request body
    - Call `service.recoverKeyWithBackupCode(memberId, backupCode, newPassword)`
    - Return HTTP 200 with recovered session credentials on success
    - Return HTTP 401 if code doesn't match (`InvalidBackupCodeError`)
    - Return HTTP 500 on decryption failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 4.5 Implement regenerateBackupCodes endpoint
    - Add regeneration logic to the existing `POST /api/user/backup-codes` endpoint (or create a separate `PUT` endpoint)
    - Call `service.regenerateCodes(memberId)` which clears old codes and generates fresh set
    - Return new plaintext code strings to the caller exactly once
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 5. Checkpoint - Verify endpoints compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Wire BrightChainBackupCodeService into service container
  - [x] 6.1 Update application.ts service registration
    - In `brightchain-api-lib/src/lib/application.ts`, remove the import and instantiation of the local `BackupCodeService`
    - Import `BrightChainBackupCodeService`
    - Construct `BrightChainBackupCodeService` with `MemberStore`, `ECIESService`, `KeyWrappingService`, and application constants (`IBackupCodeConstants`)
    - Register under `'backupCodeService'` key in the service container
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 6.2 Wire system user into BrightChainBackupCodeService
    - After the system user is loaded during initialization, call `backupCodeService.setSystemUser(systemUser)` using the same `BackendMember` instance used by other crypto services
    - Ensure the system user is the same instance used by `ECIESService` and `KeyWrappingService`
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 7. Remove local BackupCodeService
  - [x] 7.1 Delete local BackupCodeService file
    - Delete `brightchain-api-lib/src/lib/services/backupCodeService.ts`
    - _Requirements: 10.1_

  - [x] 7.2 Remove barrel export of local BackupCodeService
    - Remove `export * from './backupCodeService'` from `brightchain-api-lib/src/lib/services/index.ts`
    - _Requirements: 10.2_

  - [x] 7.3 Fix any remaining references to local BackupCodeService
    - Search the codebase for any remaining imports or references to the deleted local service and update them to use `BrightChainBackupCodeService`
    - _Requirements: 10.3, 10.4_

- [x] 8. Checkpoint - Verify removal compiles and existing tests pass
  - Run `npx nx test brightchain-api-lib --testPathPatterns backupCodeService` and `npx nx test brightchain-lib`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Property-based and unit tests
  - [x] 9.1 Write property test: Generation invariant (Property 1)
    - **Property 1: Generation invariant**
    - For any configured `IBackupCodeConstants.Count` and any member, `generateCodes(memberId)` returns exactly `Count` distinct plaintext strings each matching `DisplayRegex`, and `getCodeCount(memberId)` returns `Count`
    - Create/update `brightchain-api-lib/src/__tests__/services/backupCodeService.property.spec.ts`
    - Use `fast-check` `asyncProperty` with minimum 100 iterations, 600s timeout
    - **Validates: Requirements 2.1, 3.1, 3.2, 4.6, 5.2**

  - [x] 9.2 Write property test: Encrypt-then-validate round-trip (Property 2)
    - **Property 2: Encrypt-then-validate round-trip**
    - For any generated backup code and its `IStoredBackupCode[]`, validating with the original plaintext returns true; any random string not in the set returns false
    - Use `fast-check` `asyncProperty` with minimum 100 iterations
    - **Validates: Requirements 2.3, 2.9**

  - [x] 9.3 Write property test: Consumption removes exactly one code (Property 3)
    - **Property 3: Consumption removes exactly one code**
    - For any `IStoredBackupCode[]` of length N and any valid plaintext code, `useBackupCode` returns array of length N-1 without the consumed code's checksum
    - Use `fast-check` `asyncProperty` with minimum 100 iterations
    - **Validates: Requirements 2.4, 5.2, 6.2, 6.4**

  - [x] 9.4 Write property test: Encrypt-then-recover round-trip (Property 4)
    - **Property 4: Encrypt-then-recover round-trip**
    - For any member with a known private key and any generated backup code, encrypting then recovering produces the original private key
    - Use `fast-check` `asyncProperty` with minimum 100 iterations
    - **Validates: Requirements 2.5, 2.10, 6.3**

  - [x] 9.5 Write property test: Regeneration invalidates old codes (Property 5)
    - **Property 5: Regeneration invalidates old codes**
    - For any member with existing codes, `regenerateCodes` returns `Count` new distinct codes, and every previously-generated code fails validation against the new stored codes
    - Use `fast-check` `asyncProperty` with minimum 100 iterations
    - **Validates: Requirements 7.1, 7.2, 7.4**

  - [x] 9.6 Write property test: Key rotation preserves recoverability (Property 6)
    - **Property 6: Key rotation preserves recoverability**
    - For any member with codes encrypted under an old system key, after `rewrapAllUsersBackupCodes`, every plaintext code still validates and still recovers the original private key
    - Use `fast-check` `asyncProperty` with minimum 100 iterations
    - **Validates: Requirements 9.1, 9.3, 9.5**

  - [x] 9.7 Write unit tests for edge cases and error conditions
    - Test system user not available throws before `setSystemUser()` is called
    - Test empty backup codes array returns count 0
    - Test invalid code format is rejected
    - Test double consumption (same code used twice) fails on second attempt
    - Test controller returns correct HTTP status codes (401 for invalid code, 500 for internal errors)
    - Place in `brightchain-api-lib/src/__tests__/services/backupCodeService.spec.ts`
    - _Requirements: 8.2, 5.3, 6.6, 6.7_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Run `npx nx test brightchain-api-lib --testPathPatterns backupCodeService` and `npx nx test brightchain-lib`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `fast-check` (already in the codebase) with `asyncProperty` and minimum 100 iterations each, 600s timeout due to Argon2id cost
- The existing `backupCodeService.property.spec.ts` is replaced/updated in task 9.1
- Use `npx nx` to run all build/test commands per workspace conventions
- Test flag is `--testPathPatterns` (plural) per AGENTS.md
- `IStoredBackupCode` stays in `brightchain-lib` (shared); `BrightChainBackupCodeService` lives in `brightchain-api-lib` (Node.js-specific) per workspace rules (Requirement 12)
