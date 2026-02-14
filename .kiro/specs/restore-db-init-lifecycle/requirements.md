# Requirements Document

## Introduction

During the refactoring of `BaseApplication` to support the `IDatabase` interface (via the `mongo-compatible-document-store` spec), several database lifecycle capabilities were moved exclusively into `MongooseDocumentStore`. These capabilities — database initialization functions, URI validation (SSRF protection), and dev database setup — are now only available on the legacy `IDocumentStore` path. When using the new `IDatabase` path, there is no way to provide a database initialization callback, validate connection URIs, or set up in-memory dev databases.

This spec restores these capabilities in a storage-agnostic way so that both the `IDatabase` path and the legacy `IDocumentStore` path have access to the full database lifecycle.

## Glossary

- **BaseApplication**: The core application class in `express-suite` that manages environment, database connection, plugins, and readiness state.
- **Application**: The subclass of BaseApplication that adds Express HTTP server, routing, and middleware.
- **IDatabase**: The storage-agnostic database interface in `brightchain-lib` providing collection access, session/transaction management, and connection lifecycle.
- **IDocumentStore**: The legacy document store interface in `express-suite` wrapping Mongoose-specific database operations.
- **MongooseDocumentStore**: The Mongoose implementation of `IDocumentStore` that currently holds the extracted lifecycle logic.
- **IDatabaseLifecycleHooks**: A new interface defining optional lifecycle callbacks (init function, URI validation, dev store setup) that can be provided to BaseApplication regardless of which database backend is used.
- **DatabaseInitFunction**: A callback that seeds or initializes the database after connection, returning an `IFailableResult`.
- **URIValidator**: A function that validates a database connection URI, throwing on invalid or unsafe URIs.
- **DevStoreProvider**: A function or object that provisions an in-memory or ephemeral database for development/testing, returning a connection URI.
- **IFailableResult**: An existing interface representing the outcome of an operation that can succeed or fail, with optional data and error fields.
- **SSRF**: Server-Side Request Forgery — an attack where a server is tricked into making requests to internal/private network addresses.

## Requirements

### Requirement 1: Database Lifecycle Hooks Interface

**User Story:** As a developer, I want a storage-agnostic lifecycle hooks interface, so that I can provide database initialization, URI validation, and dev setup callbacks regardless of which database backend I use.

#### Acceptance Criteria

1. THE IDatabaseLifecycleHooks interface SHALL define an optional `initializeDatabase` callback that accepts an application reference and returns a `Promise<IFailableResult<TInitResults>>`
2. THE IDatabaseLifecycleHooks interface SHALL define an optional `hashInitResults` callback that accepts init results and returns a string for logging
3. THE IDatabaseLifecycleHooks interface SHALL define an optional `validateUri` callback that accepts a URI string and throws on invalid or unsafe URIs
4. THE IDatabaseLifecycleHooks interface SHALL define an optional `setupDevStore` callback that returns a `Promise<string>` containing the dev database connection URI
5. THE IDatabaseLifecycleHooks interface SHALL be generic over `TInitResults` to support application-specific initialization result types
6. THE IDatabaseLifecycleHooks interface SHALL reside in `brightchain-lib` so that it is available to all packages without introducing Node.js-specific dependencies

### Requirement 2: BaseApplication Lifecycle Hook Integration

**User Story:** As a developer, I want BaseApplication to accept and invoke lifecycle hooks, so that database initialization works on both the IDatabase and IDocumentStore paths.

#### Acceptance Criteria

1. WHEN constructing a BaseApplication with an IDatabase, THE BaseApplication constructor SHALL accept an optional `IDatabaseLifecycleHooks` parameter
2. WHEN constructing a BaseApplication with a legacy IDocumentStore, THE BaseApplication constructor SHALL continue to work without requiring lifecycle hooks
3. WHEN `start()` is called and a `validateUri` hook is provided, THE BaseApplication SHALL invoke the URI validator before connecting to the database
4. WHEN `start()` is called with `IDatabase` and a `setupDevStore` hook is provided and the environment indicates a dev database, THE BaseApplication SHALL invoke the `setupDevStore` hook and use the returned URI for connection
5. WHEN `start()` is called with `IDatabase` and no `setupDevStore` hook is provided and the environment indicates a dev database, THE BaseApplication SHALL proceed without dev store setup
6. WHEN `start()` is called with a legacy IDocumentStore, THE BaseApplication SHALL continue to delegate dev store setup to the IDocumentStore as it does today

### Requirement 3: Database Initialization Execution

**User Story:** As a developer, I want the database initialization function to execute after connection on the IDatabase path, so that I can seed data in dev environments just like the legacy path.

#### Acceptance Criteria

1. WHEN `start()` completes database connection on the IDatabase path and an `initializeDatabase` hook is provided and the environment indicates a dev database, THE BaseApplication SHALL invoke the `initializeDatabase` hook
2. WHEN the `initializeDatabase` hook is invoked, THE BaseApplication SHALL enforce a 5-minute timeout and reject with an error if the timeout is exceeded
3. WHEN the `initializeDatabase` hook succeeds and a `hashInitResults` hook is provided and detailed debug is enabled, THE BaseApplication SHALL log the hash of the init results
4. IF the `initializeDatabase` hook returns a failed result, THEN THE BaseApplication SHALL throw a descriptive error
5. IF the `initializeDatabase` hook times out, THEN THE BaseApplication SHALL throw a timeout error with the elapsed duration

### Requirement 4: URI Validation (SSRF Protection)

**User Story:** As a security-conscious developer, I want URI validation available at the BaseApplication level for both database paths, so that SSRF protection is not limited to the Mongoose path.

#### Acceptance Criteria

1. THE default URI validator SHALL reject URIs that do not start with a recognized database protocol prefix
2. WHILE the application is running in production mode, THE default URI validator SHALL reject URIs targeting localhost, 127.0.0.1, private IPv4 ranges (10.x, 172.16-31.x, 192.168.x), link-local addresses (169.254.x), and IPv6 private/localhost addresses (::1, fc00:, fd00:)
3. WHILE the application is running in non-production mode, THE default URI validator SHALL allow URIs targeting localhost and private addresses
4. WHEN a custom `validateUri` hook is provided in the lifecycle hooks, THE BaseApplication SHALL use the custom validator instead of the default
5. THE default URI validator implementation SHALL reside in `express-suite` since it requires knowledge of MongoDB URI formats and Node.js networking concepts

### Requirement 5: Backward Compatibility

**User Story:** As a maintainer of existing applications, I want the refactoring to maintain full backward compatibility, so that no existing code breaks.

#### Acceptance Criteria

1. WHEN an existing Application subclass passes a `MongooseDocumentStore` with `databaseInitFunction` and `initResultHashFunction`, THE Application class SHALL continue to function identically to its current behavior
2. WHEN an existing BaseApplication consumer passes only an IDocumentStore without lifecycle hooks, THE BaseApplication SHALL behave identically to its current behavior
3. THE Application class constructor signature SHALL remain backward compatible by accepting the same parameters in the same positions
4. WHEN lifecycle hooks are not provided, THE BaseApplication SHALL skip all hook invocations without error

### Requirement 6: Dev Store Lifecycle for IDatabase Path

**User Story:** As a developer using the IDatabase path, I want to be able to provision in-memory dev databases, so that I can run integration tests and local development without an external database server.

#### Acceptance Criteria

1. WHEN `start()` is called with an IDatabase and a `setupDevStore` hook and the environment indicates a dev database, THE BaseApplication SHALL invoke the `setupDevStore` hook before calling `IDatabase.connect()`
2. WHEN the `setupDevStore` hook returns a URI, THE BaseApplication SHALL pass that URI to `IDatabase.connect()`
3. WHEN `stop()` is called and a dev store was provisioned via the lifecycle hook, THE BaseApplication SHALL provide a mechanism for cleanup (via an optional `teardownDevStore` hook on IDatabaseLifecycleHooks)
4. THE IDatabaseLifecycleHooks interface SHALL define an optional `teardownDevStore` callback that returns a `Promise<void>` for cleaning up dev store resources

### Requirement 7: Serialization of Lifecycle Hooks Configuration

**User Story:** As a developer, I want lifecycle hooks to be composable and testable in isolation, so that I can unit test each hook independently.

#### Acceptance Criteria

1. THE IDatabaseLifecycleHooks interface SHALL define each hook as an independent optional function, allowing partial configuration
2. WHEN only a subset of hooks is provided, THE BaseApplication SHALL invoke only the provided hooks and skip the rest
3. THE lifecycle hooks SHALL be stateless functions (or closures) that receive all needed context as parameters, enabling independent unit testing
