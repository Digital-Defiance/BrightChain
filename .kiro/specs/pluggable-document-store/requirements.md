# Requirements Document — Pluggable Document Store

> **Status: PARTIALLY COMPLETED / SUPERSEDED**
>
> Tasks 1–3 of this spec were completed successfully. The remaining work (tasks 4–10+) has been **superseded** by the [`mongo-compatible-document-store`](../mongo-compatible-document-store/requirements.md) spec, which takes a stronger architectural approach by promoting `brightchain-db`'s types to shared `IDatabase`/`ICollection<T>`/`IClientSession` interfaces in `brightchain-lib`.

## Introduction

This spec introduced an `IDocumentStore` abstraction layer into `@digitaldefiance/node-express-suite` to decouple `BaseApplication` from mongoose. A `MongooseDocumentStore` wrapper preserved existing behavior. The interface and implementation were created and exported successfully (tasks 1–3). However, the architecture evolved: the `mongo-compatible-document-store` spec defines `IDatabase`, `ICollection<T>`, and `IClientSession` as shared interfaces in `brightchain-lib`, making `IDocumentStore` and `MongooseDocumentStore` transitional artifacts that will be replaced.

## Glossary

- **IDocumentStore**: The storage-agnostic interface created by this spec, located at `express-suite/packages/digitaldefiance-node-express-suite/src/interfaces/document-store.ts`. Will be replaced by `IDatabase`.
- **MongooseDocumentStore**: The `IDocumentStore` implementation wrapping mongoose, located at `express-suite/packages/digitaldefiance-node-express-suite/src/services/mongoose-document-store.ts`. Will be replaced by `MongooseDatabase`.
- **IDatabase**: The successor interface defined in the `mongo-compatible-document-store` spec, to be placed in `brightchain-lib`.
- **MongooseDatabase**: The successor adapter defined in the `mongo-compatible-document-store` spec, implementing `IDatabase`.

## Requirements

### Requirement 1: IDocumentStore Interface ✅ COMPLETED

**User Story:** As a library consumer, I want a storage-agnostic interface for database operations, so that I can substitute different storage backends without modifying application code.

#### Acceptance Criteria

1. THE IDocumentStore interface SHALL declare a `connect` method accepting an optional URI string and returning a Promise of void.
2. THE IDocumentStore interface SHALL declare a `disconnect` method returning a Promise of void.
3. THE IDocumentStore interface SHALL declare an `isConnected` method returning a boolean indicating whether the store is ready for operations.
4. THE IDocumentStore interface SHALL declare a `getModel` method accepting a model name string and returning a model/collection handle.
5. THE IDocumentStore interface SHALL declare an optional `setupDevStore` method returning a Promise of string or void, for provisioning development/test databases.
6. THE IDocumentStore interface SHALL declare an optional `initializeDevStore` method accepting an application reference and returning a Promise, for seeding development data.
7. THE IDocumentStore interface SHALL be exported from the `express-suite` package barrel (`index.ts`).

### Requirement 2: MongooseDocumentStore Implementation ✅ COMPLETED

**User Story:** As an existing consumer of node-express-suite, I want the current mongoose behavior preserved in a dedicated class, so that upgrading to the pluggable architecture requires zero changes to my code.

#### Acceptance Criteria

1. THE MongooseDocumentStore SHALL implement the IDocumentStore interface.
2. WHEN `connect` is called with a URI, THE MongooseDocumentStore SHALL perform the same mongoose connection logic currently in `BaseApplication.connectDatabase`, including URI validation, connection options, schema map initialization, and ModelRegistry population.
3. WHEN `disconnect` is called, THE MongooseDocumentStore SHALL perform the same mongoose disconnection logic currently in `BaseApplication.disconnectDatabase`.
4. WHEN `isConnected` is called, THE MongooseDocumentStore SHALL return true only when the underlying mongoose connection readyState equals 1.
5. WHEN `getModel` is called with a model name, THE MongooseDocumentStore SHALL return the same model that `ModelRegistry.instance.get(modelName).model` returns.
6. WHEN `setupDevStore` is called, THE MongooseDocumentStore SHALL create a `MongoMemoryReplSet` instance and return its connection URI, matching the existing `BaseApplication.setupDevDatabase` behavior.
7. WHEN `initializeDevStore` is called, THE MongooseDocumentStore SHALL execute the database initialization function with timeout handling, matching the existing `BaseApplication.initializeDevDatabase` behavior.
8. THE MongooseDocumentStore SHALL accept a `schemaMapFactory`, `databaseInitFunction`, `initResultHashFunction`, environment configuration, and constants through its constructor.
9. THE MongooseDocumentStore SHALL be exported from the `express-suite` package barrel (`index.ts`).

### Requirement 3: Build Verification ✅ COMPLETED

**User Story:** As a library maintainer, I want the new interface and implementation to compile cleanly and not break existing tests.

#### Acceptance Criteria

1. THE `express-suite` package SHALL build without errors after adding `IDocumentStore` and `MongooseDocumentStore`.
2. ALL existing tests (2721) SHALL continue to pass.

### Requirement 4: BaseApplication Refactoring — SUPERSEDED

> **SUPERSEDED by [`mongo-compatible-document-store`](../mongo-compatible-document-store/requirements.md) Requirement 7.**
> BaseApplication will be refactored to depend on `IDatabase` (not `IDocumentStore`).

### Requirement 5: IApplication Interface Update — SUPERSEDED

> **SUPERSEDED by [`mongo-compatible-document-store`](../mongo-compatible-document-store/requirements.md) Requirement 7.**

### Requirement 6: Type Safety — SUPERSEDED

> **SUPERSEDED by [`mongo-compatible-document-store`](../mongo-compatible-document-store/requirements.md) Requirements 1–4.**
> Type safety is addressed at the `IDatabase`/`ICollection<T>` level with shared interfaces in `brightchain-lib`.

### Requirement 7: Export and Module Organization — PARTIALLY COMPLETED / SUPERSEDED

> Requirements 7.1–7.5 (export of `IDocumentStore` and `MongooseDocumentStore`) were **completed** as part of tasks 1–3.
> Further module reorganization is **superseded** by the `mongo-compatible-document-store` spec.
