# Requirements Document

## Introduction

BrightChain currently uses a no-op database initialization function and an in-memory-only block store, meaning all data is lost on restart. The user endpoints (register, login, profile, update) exist but lack persistent backing, proper credential verification, and stack-agnostic design. This feature introduces persistent database initialization for the BrightChain stack, completes the user management endpoints to parity with the previous MongoDB-backed implementation, and ensures the system remains agnostic to the underlying storage backend.

## Glossary

- **App**: The BrightChain API server application class (`brightchain-api-lib/application.ts`) that extends the upstream Application from `@digitaldefiance/node-express-suite`.
- **BlockStore**: The storage abstraction (`IBlockStore` in `brightchain-lib`) that provides block-level persistence. Implementations include `MemoryBlockStore` (ephemeral) and future disk-based stores.
- **BrightChainDb**: The MongoDB-compatible document database (`brightchain-db`) built on top of a BlockStore with a head registry for tracking collection state.
- **HeadRegistry**: A registry tracking the latest block ID per collection. `InMemoryHeadRegistry` is ephemeral; `PersistentHeadRegistry` writes to disk.
- **MemberStore**: The service (`brightchain-lib/services/memberStore.ts`) that stores member identity data as CBL blocks in a BlockStore.
- **EnergyAccountStore**: The in-memory store (`brightchain-lib/stores/energyAccountStore.ts`) tracking energy balance and reputation per member.
- **AuthService**: The authentication service (`brightchain-api-lib/services/auth.ts`) handling registration, login, and JWT token management.
- **UserController**: The Express controller (`brightchain-api-lib/controllers/api/user.ts`) exposing user management HTTP endpoints.
- **DatabaseInitFunction**: A function passed to the upstream Application constructor that initializes the database layer during startup.
- **Stack**: The combination of storage backend and initialization logic. The system should operate identically whether backed by MongoDB or BrightChain blocks.

## Requirements

### Requirement 1: Persistent Database Initialization

**User Story:** As a node operator, I want the BrightChain stack to initialize a persistent database on startup, so that data survives application restarts.

#### Acceptance Criteria

1. WHEN the App starts, THE DatabaseInitFunction SHALL create a BlockStore backed by persistent storage and return a success result containing references to the initialized stores.
2. WHEN a `dataDir` path is provided in the environment configuration, THE App SHALL use that path for persistent block storage and head registry files.
3. IF the configured `dataDir` does not exist or is inaccessible, THEN THE DatabaseInitFunction SHALL return a failure result with a descriptive error message.
4. WHEN the App starts with persistent storage configured, THE App SHALL initialize a BrightChainDb instance using the persistent BlockStore and a PersistentHeadRegistry.
5. WHEN the App starts without a `dataDir` configured, THE App SHALL fall back to MemoryBlockStore and InMemoryHeadRegistry with a logged warning.
6. WHEN the DatabaseInitFunction completes successfully, THE App SHALL use the initialized BlockStore for MemberStore, EnergyAccountStore, and all other dependent services.

### Requirement 2: Stack-Agnostic Storage Abstraction

**User Story:** As a developer, I want the application layer to be agnostic to the underlying storage stack, so that the same code works whether backed by MongoDB or BrightChain blocks.

#### Acceptance Criteria

1. THE App SHALL depend only on the `IBlockStore` interface for all storage operations, not on any concrete BlockStore implementation.
2. WHEN the storage backend is changed from MemoryBlockStore to a disk-based BlockStore, THE UserController, AuthService, and MemberStore SHALL continue to function without code changes.
3. THE DatabaseInitFunction SHALL accept a configuration object specifying the storage backend type and return a uniform result structure regardless of which backend is used.
4. WHEN serializing initialization results, THE DatabaseInitFunction SHALL encode the result as JSON for logging and diagnostics.
5. THE App SHALL expose a generic `IInitResult<TBackend>` interface in `brightchain-lib` so that both BrightChain and non-BrightChain stacks produce compatible initialization outputs.

### Requirement 3: User Registration Endpoint

**User Story:** As a new user, I want to register an account with BrightChain, so that I can participate in the network with a persistent identity.

#### Acceptance Criteria

1. WHEN a valid registration request containing username, email, and password is received, THE AuthService SHALL create a new member via MemberStore, create an EnergyAccount with trial credits, and return a JWT token with the member ID and energy balance.
2. WHEN a registration request is missing username, email, or password, THE UserController SHALL reject the request with a 400 status code and a descriptive validation error.
3. WHEN a registration request contains a password, THE AuthService SHALL hash the password using bcrypt before storing it alongside the member record.
4. WHEN a registration request uses an email already associated with an existing member, THE AuthService SHALL reject the registration with a conflict error.
5. IF member creation fails in the MemberStore, THEN THE AuthService SHALL propagate the error and THE UserController SHALL return a 500 status code with an error message.

### Requirement 4: User Login Endpoint

**User Story:** As a registered user, I want to log in with my credentials, so that I can access my account and the network.

#### Acceptance Criteria

1. WHEN a valid login request containing username and password is received, THE AuthService SHALL look up the member by username, verify the password hash, and return a JWT token with the member ID and energy balance.
2. WHEN a login request contains an incorrect password, THE AuthService SHALL reject the login and THE UserController SHALL return a 401 status code with an "Invalid credentials" message.
3. WHEN a login request references a username that does not exist, THE AuthService SHALL reject the login and THE UserController SHALL return a 401 status code with an "Invalid credentials" message.
4. WHEN a login request is missing username or password, THE UserController SHALL reject the request with a 400 status code and a descriptive validation error.

### Requirement 5: User Profile Retrieval Endpoint

**User Story:** As an authenticated user, I want to retrieve my profile, so that I can view my account details, energy balance, and reputation.

#### Acceptance Criteria

1. WHEN an authenticated request is received at the profile endpoint, THE UserController SHALL retrieve the member's energy account and member profile and return them with a 200 status code.
2. WHEN the profile response is constructed, THE UserController SHALL include memberId, energyBalance, availableBalance, earned, spent, reserved, reputation, createdAt, lastUpdated, and profile metadata.
3. IF the requesting user's token is missing or invalid, THEN THE UserController SHALL return a 401 status code with a "Not authenticated" message.
4. IF the MemberStore fails to retrieve the member profile, THEN THE UserController SHALL return the energy account data without the profile section rather than failing entirely.

### Requirement 6: User Profile Update Endpoint

**User Story:** As an authenticated user, I want to update my profile settings, so that I can customize my replication and storage preferences.

#### Acceptance Criteria

1. WHEN an authenticated request with valid update data is received, THE UserController SHALL update the member's settings in MemberStore and return the updated profile with a 200 status code.
2. WHEN the update request includes settings (autoReplication, minRedundancy, preferredRegions), THE MemberStore SHALL persist the updated settings to the BlockStore.
3. IF the requesting user's token is missing or invalid, THEN THE UserController SHALL return a 401 status code with a "Not authenticated" message.
4. IF the MemberStore update fails, THEN THE UserController SHALL return a 500 status code with an error message.

### Requirement 7: Persistent EnergyAccountStore

**User Story:** As a node operator, I want energy accounts to persist across restarts, so that users do not lose their energy balance and reputation.

#### Acceptance Criteria

1. THE EnergyAccountStore SHALL serialize energy account data to the BlockStore so that accounts survive application restarts.
2. WHEN an energy account is created or updated, THE EnergyAccountStore SHALL persist the change to the BlockStore immediately.
3. WHEN the App starts with an existing persistent BlockStore, THE EnergyAccountStore SHALL load previously stored energy accounts from the BlockStore.
4. WHEN serializing an EnergyAccount to JSON and deserializing it back, THE EnergyAccountStore SHALL produce an equivalent EnergyAccount object (round-trip property).

### Requirement 8: Shared User Data Interfaces (DTO Pattern)

**User Story:** As a developer, I want shared interfaces for user data that work across frontend and backend, so that both sides use consistent data structures.

#### Acceptance Criteria

1. THE system SHALL define base user data interfaces in `brightchain-lib` using generic type parameters (e.g., `IUserProfile<TID>`) so that frontend and backend can use the same structure with different ID types.
2. THE system SHALL define API response interfaces in `brightchain-api-lib` that extend Express Response and wrap the base data interfaces from `brightchain-lib`.
3. WHEN the UserController constructs a response, THE UserController SHALL use the shared base data interface to populate the response body.
4. THE base data interfaces SHALL avoid importing Node.js-specific or Express-specific types.

### Requirement 9: Input Validation

**User Story:** As a system operator, I want all user input to be validated before processing, so that the system rejects malformed or malicious requests.

#### Acceptance Criteria

1. WHEN a registration request is received, THE UserController SHALL validate that the email field contains a valid email format before passing it to the AuthService.
2. WHEN a registration request is received, THE UserController SHALL validate that the username is non-empty and contains only allowed characters (alphanumeric, hyphens, underscores).
3. WHEN a registration request is received, THE UserController SHALL validate that the password meets minimum length requirements (at least 8 characters).
4. WHEN any user endpoint receives a request body that fails validation, THE UserController SHALL return a 400 status code with field-specific error messages.
