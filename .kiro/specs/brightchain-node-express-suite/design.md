# Design Document: @brightchain/node-express-suite (Extract, Split, and Extend)

## Overview

This design describes extracting generic BrightDB-backed Express infrastructure from `brightchain-api-lib` into a new `@brightchain/node-express-suite` library. The approach is "extract, split, and extend" — NOT a rewrite from scratch.

### Dependency Hierarchy

```
@digitaldefiance/node-express-suite     ← Generic Mongo-based Express infra (external, unchanged)
        ↓ extends
@brightchain/node-express-suite         ← Generic BrightDB-based Express infra (extracted from api-lib)
        ↓ extends
@brightchain/brightchain-api-lib        ← BrightChain domain features only
        ↓ consumes
brightchain-api                         ← The actual running application
```

### Key Principles

1. **No code is deleted or lost** — everything either moves or stays
2. **Split files become base class (new lib) + subclass (api-lib)**
3. `brightchain-api-lib` adds `@brightchain/node-express-suite` as a dependency
4. All existing tests in `brightchain-api-lib` must continue to pass
5. The `brightchain-api` application's `main.ts` should require minimal or no changes

## Architecture

### File Movement Plan

#### Straight Moves (copy to new lib, remove from api-lib, update imports)

| Source (api-lib) | Destination (new lib) | Notes |
|---|---|---|
| `src/lib/datastore/document-store.ts` | `src/lib/datastore/document-store.ts` | Interfaces only, no domain deps |
| `src/lib/datastore/block-document-store.ts` | `src/lib/datastore/block-document-store.ts` | Uses brightchain-lib + db only |
| `src/lib/datastore/block-document-store-factory.ts` | `src/lib/datastore/block-document-store-factory.ts` | Needs DiskBlockAsyncStore ref removed (see below) |
| `src/lib/datastore/memory-document-store.ts` | `src/lib/datastore/memory-document-store.ts` | Pure in-memory impl |
| `src/lib/datastore/index.ts` | `src/lib/datastore/index.ts` | Barrel re-export |
| `src/lib/shared-types.ts` | `src/lib/shared-types.ts` | Type aliases only |
| `src/lib/types/backend-id.ts` | `src/lib/types/backend-id.ts` | Type alias |
| `src/lib/validation/userValidation.ts` | `src/lib/validation/userValidation.ts` | Pure validation, no deps |
| `src/lib/middleware/validateBody.ts` | `src/lib/middleware/validateBody.ts` | Uses branded-interface only |
| `src/lib/middleware/index.ts` | `src/lib/middleware/index.ts` | Barrel |
| `src/lib/services/sessionAdapter.ts` | `src/lib/services/sessionAdapter.ts` | Uses @brightchain/db only |

**Special case: `block-document-store-factory.ts`** — Currently imports `DiskBlockAsyncStore` from api-lib's `stores/` directory. The factory needs to be refactored to accept a block store directly or use a factory pattern that doesn't depend on `DiskBlockAsyncStore`. Alternatively, `DiskBlockAsyncStore` could also move if it has no domain dependencies.

#### Split Files (base class → new lib, subclass stays in api-lib)

##### Environment

**New lib: `src/lib/environment.ts`** — `BrightDbEnvironment`
```typescript
// Extracted from api-lib's Environment class
// Contains ONLY BrightDB-specific env var parsing
export class BrightDbEnvironment<TID extends PlatformID = DefaultBackendIdType>
  extends BaseEnvironment<TID> {
  // Moved from api-lib Environment:
  private _blockStorePath?: string;
  private _blockStoreBlockSizes: BlockSize[];
  private _useMemoryDocumentStore: boolean;
  private _blockStoreType: BlockStoreType;
  private _azureConfig?: IAzureEnvironmentConfig;
  private _s3Config?: IS3EnvironmentConfig;
  private _devDatabasePoolName: string | undefined;

  // Accessors: blockStorePath, blockStoreBlockSizes, blockStoreType,
  // useMemoryDocumentStore, azureConfig, s3Config, devDatabasePoolName
}
```

**Api-lib: `src/lib/environment.ts`** — `Environment extends BrightDbEnvironment`
```typescript
// Retains domain-specific env vars
export class Environment<TID extends PlatformID = DefaultBackendIdType>
  extends BrightDbEnvironment<TID>
  implements IEnvironment<TID> {
  // Stays in api-lib:
  private _upnp: IUpnpConfig;
  private _fontAwesomeKitId: string;
  private _aws: IEnvironmentAws;
  private _memberPoolName: string;
  private _useTransactions: boolean;
  private _adminId: TID | undefined;
  // + all domain-specific defaults (JWT_SECRET, EMAIL_SENDER, etc.)
}
```

##### Application

**New lib: `src/lib/application.ts`** — `BrightDbApplication`
```typescript
// Extracted from api-lib's App class
// Contains ONLY generic BrightDB app lifecycle
export class BrightDbApplication<TID extends PlatformID> extends UpstreamApplication<
  TID, BrightDbEnvironment<TID>, IConstants, any
> {
  protected _httpServer: Server | null = null;
  private readonly _brightchainDocumentStore: DocumentStore;

  // Moved from api-lib App:
  // - db accessor (returns DocumentStore)
  // - getModel method (returns DocumentCollection or Model)
  // - HTTP server capture in start()
  // - httpServer getter
}
```

**Api-lib: `src/lib/application.ts`** — `App extends BrightDbApplication`
```typescript
// Retains ALL domain-specific service wiring
export class App<TID extends PlatformID> extends BrightDbApplication<TID> {
  // Stays in api-lib:
  // - All domain service fields (wsServer, clientWsServer, eventSystem, etc.)
  // - quorum subsystem fields
  // - start() override with domain service initialization
  // - stop() override with domain service cleanup
  // - Domain-specific getters (getApiRouter, getEventSystem, etc.)
}
```

##### Database Plugin

**New lib: `src/lib/plugins/bright-db-database-plugin.ts`** — `BrightDbDatabasePlugin`
```typescript
// Extracted from api-lib's BrightChainDatabasePlugin
// Contains ONLY generic BrightDB lifecycle
export class BrightDbDatabasePlugin<TID extends PlatformID>
  implements IDatabasePlugin<TID> {
  readonly name = 'brightdb';
  readonly version = '1.0.0';

  protected _connected = false;
  protected _blockStore: IBlockStore | null = null;
  protected _brightDb: BrightDb | null = null;

  // Moved from api-lib:
  // - connect() → calls brightchainDatabaseInit()
  // - disconnect() → releases references, idempotent
  // - isConnected()
  // - database accessor (throws if not connected)
  // - brightDb accessor (throws if not connected)
  // - blockStore accessor (throws if not connected)
  // - init(app) → creates auth provider (generic version)
  // - stop() → delegates to disconnect()
}
```

**Api-lib: `src/lib/plugins/brightchain-database-plugin.ts`** — `BrightChainDatabasePlugin extends BrightDbDatabasePlugin`
```typescript
// Retains domain-specific store management
export class BrightChainDatabasePlugin<TID extends PlatformID>
  extends BrightDbDatabasePlugin<TID> {
  // Stays in api-lib:
  // - _memberStore, _energyStore fields
  // - memberStore, energyStore accessors
  // - seedWithRbac(), seedProductionIfEmpty()
  // - buildMemberInitConfig(), buildMemberInitInput(), buildRbacUserInputs()
  // - initializeDevStore(), setupDevStore(), teardownDevStore()
  // - isDatabaseEmpty()
  // - _lastInitResult
  // Overrides:
  // - connect() → calls super.connect() then initializes MemberStore + EnergyAccountStore
  // - init(app) → creates BrightChainAuthenticationProvider (domain version)
}
```

##### Configure App Helper

**New lib: `src/lib/plugins/configure-bright-db-app.ts`** — `configureBrightDbApp`
```typescript
// Generic wiring: create plugin, register on app
export function configureBrightDbApp<TID extends PlatformID>(
  app: IApplication<TID>,
  environment: BrightDbEnvironment<TID>,
  pluginOptions?: IBrightDbDatabasePluginOptions,
): { plugin: BrightDbDatabasePlugin<TID> } {
  const plugin = new BrightDbDatabasePlugin<TID>(environment, pluginOptions);
  // Register plugin on app
  if ('useDatabasePlugin' in app && typeof app.useDatabasePlugin === 'function') {
    app.useDatabasePlugin(plugin);
  } else {
    app.plugins.register(plugin);
  }
  return { plugin };
}
```

**Api-lib: `src/lib/plugins/configure-brightchain-app.ts`** — `configureBrightChainApp`
```typescript
// Calls configureBrightDbApp internally, then adds domain config
export function configureBrightChainApp<TID extends PlatformID>(
  app: IApplication<TID>,
  environment: Environment<TID>,
  constants: IConstants = AppConstants,
  pluginOptions: IBrightChainDatabasePluginOptions = {},
): ConfigureBrightChainResult<TID> {
  // 1. GUID provider + constants setup
  // 2. registerNodeRuntimeConfiguration()
  // 3. initializeBrightChain()
  // 4. Create BrightChainDatabasePlugin (domain subclass, NOT generic)
  // 5. Register plugin
  // Note: configureBrightChainApp creates its own BrightChainDatabasePlugin
  //       rather than calling configureBrightDbApp, because it needs the
  //       domain-specific subclass. But it can reuse the registration pattern.
}
```

##### Authentication Provider

**New lib: `src/lib/services/bright-db-authentication-provider.ts`** — `BrightDbAuthenticationProvider`
```typescript
// Generic BrightDB-backed auth using collections directly
export class BrightDbAuthenticationProvider<TID extends PlatformID>
  implements IAuthenticationProvider<TID> {
  constructor(protected readonly db: BrightDb, protected readonly jwtSecret: string);

  // Generic implementations:
  // - findUserById() → queries 'users' collection
  // - buildRequestUserDTO() → queries 'users' + 'roles' collections
  // - verifyToken() → jwt.verify with jwtSecret
}
```

**Api-lib: `src/lib/services/brightchain-authentication-provider.ts`** — `BrightChainAuthenticationProvider extends BrightDbAuthenticationProvider`
```typescript
// Adds MemberStore-based lookup, mnemonic auth, password auth
export class BrightChainAuthenticationProvider<TID extends PlatformID>
  extends BrightDbAuthenticationProvider<TID> {
  // Overrides:
  // - findUserById() → tries MemberStore first, falls back to super
  // - buildRequestUserDTO() → tries MemberStore first, falls back to super
  // Adds:
  // - authenticateWithMnemonic()
  // - authenticateWithPassword()
}
```

##### Constants

**New lib: `src/lib/constants.ts`** — Generic BrightDB constants
```typescript
// Base express constants for a BrightDB app (no domain-specific values)
import { createExpressConstants } from '@digitaldefiance/node-express-suite';
export const BrightDbConstants = createExpressConstants('localhost', 'localhost', {
  Site: 'BrightDB',
});
```

**Api-lib: `src/lib/constants.ts`** — Domain constants (unchanged, imports from Suite if needed)

##### Middlewares

**New lib: `src/lib/middlewares.ts`** — Generic middleware init
```typescript
// Standard Express security middleware without domain-specific CSP
export class BrightDbMiddlewares {
  static init(app: Application): void {
    // helmet (with generic CSP), cors, json, urlencoded
  }
}
```

**Api-lib: `src/lib/middlewares.ts`** — Domain middleware (unchanged, or extends Suite's)

### Database Initialization Refactoring

The `brightchainDatabaseInit` function currently imports `createEnergyAccountHydrationSchema` from api-lib's hydration module. To make it movable:

1. The function will accept an optional `modelRegistrations` callback parameter
2. The callback receives the `BrightDb` instance and can register any models
3. Api-lib's `BrightChainDatabasePlugin.connect()` will pass the energy account model registration as the callback

```typescript
// New lib version
export async function brightchainDatabaseInit<TID extends PlatformID>(
  environment: BrightDbEnvironment<TID>,
  options?: {
    modelRegistrations?: (db: BrightDb) => void | Promise<void>;
  },
): Promise<IInitResult<IBrightChainInitData>> {
  // ... create blockStore, BrightDb ...
  if (options?.modelRegistrations) {
    await options.modelRegistrations(db);
  }
  // ... create MemberStore, EnergyAccountStore ...
}
```

### Re-export Barrels

The `src/index.ts` barrel re-exports:

1. **All moved modules**: datastore, shared-types, validation, middleware, session adapter
2. **New base classes**: `BrightDbApplication`, `BrightDbDatabasePlugin`, `BrightDbEnvironment`, `BrightDbAuthenticationProvider`, `configureBrightDbApp`, `BrightDbMiddlewares`, `BrightDbConstants`
3. **Upstream re-exports**: Controllers, routers, middleware, services, decorators, validation, types, plugins from `@digitaldefiance/node-express-suite`
4. **BrightDB re-exports**: `BrightDb`, `Collection`, `Model`, query engines, schema validation, transactions, indexing from `@brightchain/db`
5. **BrightChain-lib re-exports**: `BlockSize`, `BlockStoreType`, `validBlockSizes`, `InMemoryDatabase`, `MemoryBlockStore` from `@brightchain/brightchain-lib`

## Correctness Properties

### Property 1: Import path migration preserves functionality

*For any* module in Api-Lib that previously imported a moved symbol from a local path, changing the import to reference `@brightchain/node-express-suite` SHALL produce identical runtime behavior. The TypeScript types SHALL remain compatible.

**Validates: Requirements 2.5, 3.2, 4.3, 5.2, 6.2, 15.2**

### Property 2: Subclass compatibility

*For any* split file where a base class is extracted to the Suite, the Api-Lib subclass SHALL pass all existing tests without modification to test assertions. The subclass SHALL be a drop-in replacement for the original class.

**Validates: Requirements 7.5, 8.5, 9.5, 10.2, 11.3**

### Property 3: Plugin connect/disconnect lifecycle

*For any* `BrightDbDatabasePlugin` instance with a valid in-memory environment configuration, calling `connect()` SHALL transition `isConnected()` from `false` to `true`, and calling `disconnect()` SHALL transition it back to `false`. `disconnect()` SHALL be idempotent.

**Validates: Requirements 9.2**

### Property 4: Database accessor guard

*For any* `BrightDbDatabasePlugin` that has NOT been connected, accessing `database`, `brightDb`, or `blockStore` SHALL throw a descriptive error.

**Validates: Requirements 9.4**

### Property 5: Environment variable parsing round-trip

*For any* valid combination of BrightDB environment variables, constructing a `BrightDbEnvironment` SHALL produce an instance where the typed accessors return values consistent with the input environment variables.

**Validates: Requirements 7.2, 7.3**

### Property 6: Build and test pass-through

*For any* state of the migration (after each task group), running `yarn nx build brightchain-api-lib` and `yarn nx test brightchain-api-lib` SHALL succeed. This is the primary correctness guarantee.

**Validates: Requirements 15.4, 16.1, 16.2**

## Error Handling

Error handling is inherited from the existing implementations. No new error handling patterns are introduced — the extraction preserves existing error behavior:

- **Plugin not connected**: Same error messages as current `BrightChainDatabasePlugin`
- **Invalid block store type**: Same validation error from current `Environment`
- **Missing cloud config**: Same validation errors from current `Environment`
- **Database init failure**: Same `IInitResult` failure pattern from current `brightchainDatabaseInit`

## Testing Strategy

### Primary Strategy: Existing Tests Must Pass

The primary testing strategy is that ALL existing tests in `brightchain-api-lib` continue to pass after each migration step. This is verified at checkpoints.

### New Library Tests

Minimal new tests for the Suite:
1. **Export verification tests** — Assert that all expected symbols are exported from `src/index.ts`
2. **Base class unit tests** — For split files, verify the base class works independently (e.g., `BrightDbDatabasePlugin` connect/disconnect lifecycle, `BrightDbEnvironment` parsing)
3. **Integration smoke test** — A single test that creates a `BrightDbDatabasePlugin` with in-memory config, connects, verifies `isConnected()`, and disconnects

### Test Migration

Tests that are specific to moved files (e.g., `block-document-store.access.property.spec.ts`, `block-document-store.encrypted.property.spec.ts`) should be moved alongside their source files. Tests for split files stay in api-lib since they test the full (domain-specific) behavior.
