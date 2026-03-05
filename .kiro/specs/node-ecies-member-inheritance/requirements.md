# Requirements Document

## Introduction

The `@digitaldefiance/node-ecies-lib` package provides a Node.js-specific `Member` class that uses `Buffer` types, while `@digitaldefiance/ecies-lib` provides a platform-agnostic `Member` class that uses `Uint8Array`. Despite `Buffer` extending `Uint8Array`, the two `Member` classes share no inheritance relationship. This forces consumers (e.g., BrightChain's `MemberStore` and backup code services) to use unsafe `as unknown as Member<TID>` casts when passing members between the two type systems.

This feature establishes a proper class inheritance hierarchy where `node-ecies-lib` `Member` extends `ecies-lib` `Member`, and `node-ecies-lib` `IMember` extends `ecies-lib` `IMember`. This aligns the type system with the conceptual relationship (`Buffer` extends `Uint8Array`) and eliminates unsafe casts in downstream consumers.

Both packages are owned by the same team and can be versioned and published together.

## Glossary

- **Base_Member**: The `Member<TID>` class exported by `@digitaldefiance/ecies-lib`, parameterized over `PlatformID` with a default of `Uint8Array`.
- **Node_Member**: The `Member<TID>` class exported by `@digitaldefiance/node-ecies-lib`, parameterized over `PlatformID` with a default of `Buffer`.
- **Base_IMember**: The `IMember<TID, TSignature>` interface exported by `@digitaldefiance/ecies-lib`.
- **Node_IMember**: The `IMember<TID, TSignature>` interface exported by `@digitaldefiance/node-ecies-lib`.
- **Base_ECIESService**: The `ECIESService<TID>` class exported by `@digitaldefiance/ecies-lib`, using `Uint8Array` and `Promise`-based crypto.
- **Node_ECIESService**: The `ECIESService<TID>` class exported by `@digitaldefiance/node-ecies-lib`, using `Buffer` and synchronous crypto.
- **Base_PlatformID**: The `PlatformID` type union from `@digitaldefiance/ecies-lib`: `Uint8Array | GuidV4Uint8Array | ObjectId | string`.
- **Node_PlatformID**: The `PlatformID` type union from `@digitaldefiance/node-ecies-lib`: `BasePlatformID | GuidV4Buffer | Buffer | Types.ObjectId`.
- **Consumer**: Any downstream package (e.g., `brightchain-lib`, `brightchain-api-lib`) that imports `Member` from either library.
- **Unsafe_Cast**: A TypeScript cast using `as unknown as T` to bridge incompatible types at compile time.

## Requirements

### Requirement 1: Node_IMember Interface Extends Base_IMember

**User Story:** As a library maintainer, I want Node_IMember to extend Base_IMember, so that any code accepting Base_IMember also accepts Node_IMember without casts.

#### Acceptance Criteria

1. THE Node_IMember interface SHALL extend Base_IMember with compatible generic parameters such that `Node_IMember<TID, TSignature>` is assignable to `Base_IMember<TID, TSignature>` when `TID` satisfies both PlatformID constraints.
2. THE Node_IMember interface SHALL add the `constants` property of type `IECIESConstants` as an extension beyond Base_IMember.
3. THE Node_IMember interface SHALL add the `getPublicKeyString()` method returning `string` as an extension beyond Base_IMember.
4. THE Node_IMember interface SHALL add the `getIdString()` method returning `string` as an extension beyond Base_IMember.
5. THE Node_IMember interface SHALL narrow the `publicKey` property type from `Uint8Array` to `Buffer`.
6. THE Node_IMember interface SHALL narrow the `idBytes` property type from `Uint8Array` to `Buffer`.
7. THE Node_IMember interface SHALL narrow the `encryptData` return type to `Promise<Buffer> | Buffer` (covariant with `Promise<Uint8Array> | Uint8Array`).
8. THE Node_IMember interface SHALL narrow the `decryptData` return type to `Promise<Buffer> | Buffer` (covariant with `Promise<Uint8Array> | Uint8Array`).
9. THE Node_IMember interface SHALL narrow method parameter types (`sign`, `verify`, `encryptDataStream`, `decryptDataStream`) to accept `Buffer` (which satisfies `Uint8Array` contravariance since `Buffer extends Uint8Array`).

### Requirement 2: Node_Member Class Extends Base_Member

**User Story:** As a library maintainer, I want Node_Member to extend Base_Member, so that Node_Member instances are valid Base_Member instances and can be used wherever Base_Member is expected.

#### Acceptance Criteria

1. THE Node_Member class SHALL extend Base_Member with compatible generic parameters.
2. THE Node_Member constructor SHALL accept a Node_ECIESService and pass it to the Base_Member constructor (since Node_ECIESService shares the same constructor signature shape as Base_ECIESService).
3. THE Node_Member class SHALL override `encryptData` to return `Buffer` synchronously while maintaining a return type compatible with the base class signature (`Promise<Uint8Array> | Uint8Array`).
4. THE Node_Member class SHALL override `decryptData` to return `Buffer` synchronously while maintaining a return type compatible with the base class signature (`Promise<Uint8Array> | Uint8Array`).
5. THE Node_Member class SHALL add the `constants` getter returning `IECIESConstants` from the underlying Node_ECIESService.
6. THE Node_Member class SHALL add the `getPublicKeyString()` method returning the hex-encoded public key.
7. THE Node_Member class SHALL add the `getIdString()` method returning the string representation of the member ID.
8. THE Node_Member class SHALL override property getters (`publicKey`, `idBytes`, `creatorIdBytes`) to return `Buffer` instances (covariant with `Uint8Array`).
9. THE Node_Member class SHALL preserve all existing static factory methods (`newMember`, `fromMnemonic`, `fromJson`, `newMemberWithTypedId`) with their current signatures and behavior.

### Requirement 3: PlatformID Type Compatibility

**User Story:** As a library maintainer, I want Node_PlatformID to be a proper superset of Base_PlatformID, so that the generic constraints on Member classes are compatible across the inheritance chain.

#### Acceptance Criteria

1. THE Node_PlatformID type SHALL be a superset of Base_PlatformID such that every value satisfying Base_PlatformID also satisfies Node_PlatformID.
2. THE Node_Member class SHALL accept any TID that extends Node_PlatformID, which includes all types from Base_PlatformID plus `Buffer`, `GuidV4Buffer`, and `Types.ObjectId`.
3. WHEN a Consumer instantiates Node_Member with `TID = Buffer`, THE Node_Member instance SHALL be assignable to a variable of type `Base_Member<Buffer>` without casts.
4. WHEN a Consumer instantiates Node_Member with `TID = ObjectId`, THE Node_Member instance SHALL be assignable to a variable of type `Base_Member<ObjectId>` without casts.

### Requirement 4: ECIESService Compatibility for Constructor Injection

**User Story:** As a library maintainer, I want Node_ECIESService to be passable to the Base_Member constructor, so that Node_Member can delegate to its parent constructor cleanly.

#### Acceptance Criteria

1. THE Node_ECIESService class SHALL be structurally compatible with Base_ECIESService for the subset of methods that Base_Member invokes internally.
2. IF Node_ECIESService is not structurally assignable to Base_ECIESService due to method signature differences (e.g., synchronous vs. async return types), THEN THE Node_Member constructor SHALL adapt the service reference before passing it to the Base_Member constructor.
3. THE Node_Member class SHALL store a reference to the original Node_ECIESService for use in its own overridden methods (e.g., synchronous `encryptData`, `decryptData`).
4. THE Base_Member class SHALL accept the adapted service without modification to its own constructor signature.

### Requirement 5: Backward Compatibility for Existing Consumers

**User Story:** As a downstream consumer, I want the inheritance change to be backward-compatible, so that my existing code continues to compile and function without modification.

#### Acceptance Criteria

1. THE Node_Member class SHALL maintain the same public API surface (all existing public methods, properties, and static methods) after the inheritance change.
2. THE Base_Member class SHALL maintain the same public API surface after any changes needed to support the inheritance.
3. WHEN a Consumer imports `Member` from `@digitaldefiance/node-ecies-lib`, THE imported class SHALL behave identically to the pre-change version for all existing call sites.
4. WHEN a Consumer imports `Member` from `@digitaldefiance/ecies-lib`, THE imported class SHALL behave identically to the pre-change version for all existing call sites.
5. THE `encryptData` method on Node_Member SHALL continue to return `Buffer` synchronously at runtime, even though the TypeScript return type may be widened to `Promise<Buffer> | Buffer` to satisfy the base class contract.
6. THE `decryptData` method on Node_Member SHALL continue to return `Buffer` synchronously at runtime, even though the TypeScript return type may be widened to `Promise<Buffer> | Buffer` to satisfy the base class contract.

### Requirement 6: Elimination of Unsafe Casts in BrightChain Consumers

**User Story:** As a BrightChain developer, I want to remove `as unknown as Member<TID>` casts from backup code services, so that the code is type-safe and maintainable.

#### Acceptance Criteria

1. WHEN `MemberStore.getMember()` returns a Base_Member and a Consumer needs to pass the result to a function expecting Node_Member, THE type system SHALL allow this without Unsafe_Cast if the member was originally constructed as a Node_Member.
2. WHEN `BackupCode.encryptBackupCodes` expects a Node_Member parameter, THE Consumer SHALL be able to pass a Node_Member instance obtained from MemberStore without Unsafe_Cast.
3. THE `backupCodeService.ts` in `brightchain-api-lib` SHALL compile without any `as unknown as` casts after the MemberStore is parameterized to return Node_Member.
4. THE `brightChainBackupCodeService.ts` in `brightchain-api-lib` SHALL compile without any `as unknown as` casts after the MemberStore is parameterized to return Node_Member.

### Requirement 7: Synchronous vs. Asynchronous Encrypt/Decrypt Covariance

**User Story:** As a library maintainer, I want the return type difference between Base_Member (async) and Node_Member (sync) encrypt/decrypt methods to be handled cleanly, so that the override is type-safe.

#### Acceptance Criteria

1. THE Base_IMember interface SHALL declare `encryptData` with return type `Promise<Uint8Array> | Uint8Array` to permit both synchronous and asynchronous implementations.
2. THE Base_IMember interface SHALL declare `decryptData` with return type `Promise<Uint8Array> | Uint8Array` to permit both synchronous and asynchronous implementations.
3. THE Node_Member class SHALL override `encryptData` with return type `Buffer` (which satisfies `Promise<Uint8Array> | Uint8Array` since `Buffer extends Uint8Array`).
4. THE Node_Member class SHALL override `decryptData` with return type `Buffer` (which satisfies `Promise<Uint8Array> | Uint8Array` since `Buffer extends Uint8Array`).
5. WHEN a Consumer calls `encryptData` on a variable typed as Base_Member, THE Consumer SHALL handle the return value as `Promise<Uint8Array> | Uint8Array` (using `await` or type narrowing).
6. WHEN a Consumer calls `encryptData` on a variable typed as Node_Member, THE Consumer SHALL be able to use the return value as `Buffer` directly without `await`.

### Requirement 8: Version and Release Coordination

**User Story:** As a library maintainer, I want the changes to be released in a coordinated manner, so that consumers can upgrade both packages together without breakage.

#### Acceptance Criteria

1. THE `@digitaldefiance/ecies-lib` package SHALL be published with a minor version bump (non-breaking: the base class return type widening from `Promise<Uint8Array>` to `Promise<Uint8Array> | Uint8Array` is additive).
2. THE `@digitaldefiance/node-ecies-lib` package SHALL be published with a minor version bump (non-breaking: adding a superclass is additive, all existing API is preserved).
3. THE `@digitaldefiance/node-ecies-lib` package SHALL declare a peer dependency on the new minimum version of `@digitaldefiance/ecies-lib`.
4. THE BrightChain workspace packages SHALL update their dependency versions to the new releases before removing Unsafe_Casts.

### Requirement 9: Runtime Instanceof Correctness

**User Story:** As a developer, I want `instanceof` checks to work correctly across the inheritance chain, so that runtime type guards function as expected.

#### Acceptance Criteria

1. WHEN a Node_Member instance is checked with `instanceof Base_Member`, THE check SHALL return `true`.
2. WHEN a Base_Member instance (not a Node_Member) is checked with `instanceof Node_Member`, THE check SHALL return `false`.
3. WHEN a Node_Member instance is checked with `instanceof Node_Member`, THE check SHALL return `true`.
