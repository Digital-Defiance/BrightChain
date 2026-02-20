# Implementation Plan: BrightChain Database Initialization & User Endpoints

## Overview

Incremental implementation starting with shared interfaces and storage foundations, then building up through auth enhancements, validation, and endpoint completion. Each step builds on the previous and wires into the existing codebase.

## Tasks

- [x] 1. Define shared DTO interfaces and storage abstractions in brightchain-lib
  - [x] 1.1 Create `IDocumentStore` and `IDocumentCollection` interfaces in `brightchain-lib/src/lib/interfaces/storage/documentStore.ts`
    - Minimal interface that BrightChainDb can satisfy without brightchain-lib depending on brightchain-db
    - Include `collection<T>(name)`, `connect()`, `isConnected()` methods
    - _Requirements: 2.1, 2.5_

  - [x] 1.2 Create shared user DTO interfaces in `brightchain-lib/src/lib/interfaces/userDto.ts`
    - `IUserProfile<TID>`, `IUserProfileMetadata`, `IAuthResponse<TID>`, `IRegistrationRequest`, `ILoginRequest`
    - Use generic type parameter `TID` for stack-agnostic ID types per AGENTS.md DTO pattern
    - _Requirements: 8.1, 8.4_

  - [x] 1.3 Create `IInitResult<TBackend>` interface in `brightchain-lib/src/lib/interfaces/initResult.ts`
    - Generic init result with `success`, `error?`, `backend?` fields
    - `IBrightChainInitData` with `blockStore`, `db`, `memberStore`, `energyStore`
    - _Requirements: 2.5_

  - [x] 1.4 Add `passwordHash` field to `IPrivateMemberProfileHydratedData` in brightchain-lib
    - Optional `passwordHash?: string` field for bcrypt hash storage
    - _Requirements: 3.3_

  - [x] 1.5 Export new interfaces from brightchain-lib barrel file
    - _Requirements: 8.1_

- [x] 2. Make EnergyAccountStore persistent
  - [x] 2.1 Update `EnergyAccountStore` to accept an optional `IDocumentStore` and persist on write
    - Add `IDocumentStore` constructor parameter (optional, backward-compatible)
    - On `set()`: write to in-memory map AND persist to document store collection `energy_accounts`
    - Add `loadFromStore()` method to hydrate from document store on startup
    - Maintain backward compatibility: no document store = pure in-memory (existing behavior)
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 2.2 Write property test: EnergyAccount serialization round-trip
    - **Property 11: EnergyAccount serialization round-trip**
    - Generate random valid EnergyAccount objects, verify `fromDto(toDto(account))` equivalence
    - **Validates: Requirements 7.4**

  - [x] 2.3 Write property test: EnergyAccountStore persistence round-trip
    - **Property 10: EnergyAccount store persistence round-trip**
    - Store random accounts, create new store from same backing, verify recovery
    - Use an in-memory IDocumentStore mock for testing
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement DiskBlockStore and database initialization
  - [x] 4.1 Create `DiskBlockStore` in `brightchain-api-lib/src/lib/stores/diskBlockStore.ts`
    - Implement `IBlockStore` interface with filesystem-backed storage
    - Store blocks as files at `{basePath}/blocks/{checksumHex}`
    - Store metadata as JSON at `{basePath}/meta/{checksumHex}.json`
    - Ensure directory creation on first write
    - _Requirements: 1.1, 1.2_

  - [x] 4.2 Update `BlockStoreFactory.createDiskStore` to support a pluggable factory
    - Add a static `registerDiskStoreFactory` method to `BlockStoreFactory`
    - `brightchain-api-lib` calls this at import time to register `DiskBlockStore`
    - Keeps Node.js-specific code out of brightchain-lib
    - _Requirements: 2.1_

  - [x] 4.3 Create `brightchainDatabaseInit` function in `brightchain-api-lib/src/lib/databaseInit.ts`
    - Read `blockStorePath` and `blockStoreBlockSize` from Environment
    - If `blockStorePath`: validate path, create DiskBlockStore, create BrightChainDb with `dataDir`
    - If no `blockStorePath`: create MemoryBlockStore, log warning, create BrightChainDb without dataDir
    - Initialize MemberStore, EnergyAccountStore (with BrightChainDb as IDocumentStore), load energy accounts
    - Return `IInitResult<IBrightChainInitData>`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 4.4 Refactor `App.start()` to use `brightchainDatabaseInit`
    - Replace inline BlockStore/MemberStore/EnergyAccountStore creation with init function call
    - Register all services from init result
    - Handle init failure by throwing with descriptive error
    - _Requirements: 1.6, 2.2_

  - [x] 4.5 Write property test: Init result structure uniformity
    - **Property 13: Init result structure uniformity**
    - Generate random environment configs (with/without blockStorePath), verify result shape is consistent
    - **Validates: Requirements 2.3, 2.4**

  - [x] 4.6 Write unit tests for database initialization
    - Test: valid dataDir creates persistent stores
    - Test: missing dataDir falls back to memory with warning
    - Test: inaccessible dataDir returns failure result
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement input validation
  - [x] 6.1 Create validation utilities in `brightchain-api-lib/src/lib/validation/userValidation.ts`
    - `validateRegistration(body)`: check username (non-empty, alphanumeric/hyphen/underscore), email (format), password (min 8 chars)
    - `validateLogin(body)`: check username (non-empty), password (non-empty)
    - Return `IValidationResult` with `valid` boolean and `errors` array of `{ field, message }`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 6.2 Write property test: Registration validation
    - **Property 1: Registration validation rejects all invalid inputs with field-specific errors**
    - Generate random invalid registration bodies (missing fields, bad email, short password, invalid username chars)
    - Verify `valid === false` and errors reference the correct field
    - **Validates: Requirements 3.2, 9.1, 9.2, 9.3, 9.4**

  - [x] 6.3 Write property test: Login validation
    - **Property 6: Login validation rejects incomplete requests**
    - Generate random login bodies with missing username or password
    - Verify `valid === false` and errors reference the missing field
    - **Validates: Requirements 4.4**

- [x] 7. Enhance AuthService with password hashing and credential lookup
  - [x] 7.1 Add bcrypt dependency and update `AuthService.register()` in `brightchain-api-lib/src/lib/services/auth.ts`
    - Hash password with bcrypt (12 rounds) before member creation
    - Store password hash in member's private profile via `MemberStore.updateMember`
    - Check for duplicate email before creating member
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 7.2 Update `AuthService.login()` with proper credential verification
    - Look up member by username via `MemberStore.queryIndex({ name })`
    - Retrieve stored password hash from member's private profile
    - Verify with `bcrypt.compare`
    - Return JWT on success, throw on failure
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.3 Add helper methods `storePasswordHash` and `getPasswordHash` to AuthService
    - `storePasswordHash(memberId, hash)`: update member private profile with passwordHash field
    - `getPasswordHash(memberId)`: retrieve passwordHash from member private profile
    - _Requirements: 3.3, 4.1_

  - [x] 7.4 Write property test: Password hashing round-trip
    - **Property 2: Password hashing round-trip**
    - Generate random password strings, hash with bcrypt, verify `bcrypt.compare` returns true
    - **Validates: Requirements 3.3**

  - [x] 7.5 Write property test: Duplicate email rejection
    - **Property 3: Duplicate email rejection**
    - Register with random valid data, attempt second registration with same email, verify conflict error
    - **Validates: Requirements 3.4**

  - [x] 7.6 Write property test: Register-then-login round-trip
    - **Property 4: Register-then-login round-trip**
    - Generate random valid credentials, register, then login with same credentials, verify JWT contains same memberId
    - **Validates: Requirements 3.1, 4.1**

  - [x] 7.7 Write property test: Invalid credentials rejection
    - **Property 5: Invalid credentials rejection**
    - Register with random credentials, attempt login with different password or non-existent username, verify error
    - **Validates: Requirements 4.2, 4.3**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Complete UserController endpoints with validation and shared DTOs
  - [x] 9.1 Create API response interfaces in `brightchain-api-lib/src/lib/interfaces/userApiResponse.ts`
    - `IUserProfileApiResponse` extending `IApiMessageResponse` wrapping `IUserProfile<string>`
    - `IAuthApiResponse` extending `IApiMessageResponse` wrapping `IAuthResponse<string>`
    - _Requirements: 8.2_

  - [x] 9.2 Update `UserController.handleRegister` to use validation and shared DTOs
    - Call `validateRegistration` before AuthService, return 400 on validation failure
    - Use `IRegistrationRequest` from brightchain-lib for request typing
    - Use `IAuthResponse` for response body
    - _Requirements: 3.2, 8.3, 9.1, 9.2, 9.3, 9.4_

  - [x] 9.3 Update `UserController.handleLogin` to use validation and shared DTOs
    - Call `validateLogin` before AuthService, return 400 on validation failure
    - Use `ILoginRequest` from brightchain-lib for request typing
    - _Requirements: 4.4, 8.3_

  - [x] 9.4 Update `UserController.handleProfile` to use shared DTOs
    - Construct response using `IUserProfile<string>` interface
    - Ensure all required fields are present in response
    - _Requirements: 5.1, 5.2, 8.3_

  - [x] 9.5 Update `UserController.handleUpdateProfile` to use shared DTOs
    - Ensure settings persistence and proper error handling
    - _Requirements: 6.1, 6.2_

  - [x] 9.6 Write property test: Authentication token enforcement
    - **Property 7: Authentication token enforcement**
    - Generate random requests without valid tokens to protected endpoints, verify 401
    - **Validates: Requirements 5.3, 6.3**

  - [x] 9.7 Write property test: Profile retrieval completeness
    - **Property 8: Profile retrieval returns all required fields**
    - Register random users, retrieve profiles, verify all required fields present
    - **Validates: Requirements 5.1, 5.2**

  - [x] 9.8 Write property test: Profile settings update persistence round-trip
    - **Property 9: Profile settings update persistence round-trip**
    - Generate random valid settings, update profile, retrieve profile, verify settings match
    - **Validates: Requirements 6.1, 6.2**

  - [x] 9.9 Write unit tests for UserController error handling
    - Test: MemberStore failure during registration returns 500 (Requirement 3.5)
    - Test: MemberStore profile retrieval failure returns energy data without profile (Requirement 5.4)
    - Test: MemberStore update failure returns 500 (Requirement 6.4)
    - _Requirements: 3.5, 5.4, 6.4_

- [x] 10. Backend-agnostic equivalence testing
  - [x] 10.1 Write property test: Backend-agnostic operation equivalence
    - **Property 12: Backend-agnostic operation equivalence**
    - Generate random MemberStore operation sequences, run against MemoryBlockStore and DiskBlockStore, verify equivalent results
    - **Validates: Requirements 2.2**

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- DiskBlockStore goes in brightchain-api-lib (Node.js-specific), not brightchain-lib (browser-compatible)
- EnergyAccountStore uses IDocumentStore interface to avoid circular dependency with brightchain-db
- All shared interfaces go in brightchain-lib per AGENTS.md conventions
