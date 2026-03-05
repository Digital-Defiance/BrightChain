# Design Document: node-ecies-lib Member Inherits from ecies-lib Member

## Overview

This design establishes a proper class inheritance hierarchy where `node-ecies-lib` `Member` extends `ecies-lib` `Member`, and `node-ecies-lib` `IMember` extends `ecies-lib` `IMember`. The change spans two external npm packages (`@digitaldefiance/ecies-lib` and `@digitaldefiance/node-ecies-lib`) and one downstream consumer workspace (`brightchain`).

The core challenge is bridging three differences between the two libraries:
1. `Uint8Array` (base) vs `Buffer` (node) for binary data — solvable because `Buffer extends Uint8Array`
2. `Promise<Uint8Array>` (base async) vs `Buffer` (node sync) for encrypt/decrypt return types — solvable by widening the base return type
3. Independent `ECIESService` classes — solvable via structural typing and an adapter pattern

## Architecture

### Current State (No Inheritance)

```
ecies-lib                          node-ecies-lib
┌─────────────────────┐            ┌──────────────────────────┐
│ IMember<TID>        │            │ IMember<TID>             │
│   publicKey: U8A    │            │   publicKey: Buffer      │
│   encryptData→P<U8A>│            │   encryptData→Buffer     │
│                     │            │   + constants             │
│                     │            │   + getPublicKeyString()  │
│                     │            │   + getIdString()         │
└─────────────────────┘            └──────────────────────────┘
         ▲                                    ▲
         │ implements                         │ implements
┌─────────────────────┐            ┌──────────────────────────┐
│ Member<TID>         │            │ Member<TID>              │
│   (standalone)      │            │   (standalone)           │
└─────────────────────┘            └──────────────────────────┘
```

### Target State (With Inheritance)

```
ecies-lib                          node-ecies-lib
┌─────────────────────────┐
│ IMember<TID, TSig>      │
│   publicKey: Uint8Array │
│   encryptData→           │
│     Promise<U8A> | U8A  │◄─── widened return type
└─────────────────────────┘
         ▲
         │ extends
         │
┌─────────────────────────────────┐
│ INodeMember<TID, TSig>          │
│   extends IMember<TID, TSig>    │
│   publicKey: Buffer  (narrowed) │
│   encryptData→Buffer (narrowed) │
│   + constants: IECIESConstants  │
│   + getPublicKeyString(): string│
│   + getIdString(): string       │
└─────────────────────────────────┘

┌─────────────────────┐
│ Member<TID>         │  (ecies-lib, base class)
│   implements IMember│
│   encryptData→      │
│     Promise<U8A>|U8A│◄─── widened return type
└─────────────────────┘
         ▲
         │ extends
         │
┌──────────────────────────┐
│ Member<TID>              │  (node-ecies-lib, subclass)
│   extends base Member    │
│   implements INodeMember │
│   encryptData→Buffer     │  (sync override, covariant)
│   + constants            │
│   + getPublicKeyString() │
│   + getIdString()        │
│   + Buffer-typed getters │
└──────────────────────────┘
```

## Detailed Design

### Phase 1: Changes to `@digitaldefiance/ecies-lib`

These changes are additive (minor version bump).

#### 1.1 Widen `IMember.encryptData` / `decryptData` Return Types

Current:
```typescript
// ecies-lib/src/interfaces/member.ts
encryptData(data: string | Uint8Array, recipientPublicKey?: Uint8Array): Promise<Uint8Array> | Uint8Array;
decryptData(encryptedData: Uint8Array): Promise<Uint8Array> | Uint8Array;
```

The interface already declares `Promise<Uint8Array> | Uint8Array`. No change needed here — the interface is already compatible.

#### 1.2 Widen `Member.encryptData` / `decryptData` Return Types

Current (ecies-lib Member class):
```typescript
encryptData(data: string | Uint8Array, recipientPublicKey?: Uint8Array): Promise<Uint8Array>;
decryptData(encryptedData: Uint8Array): Promise<Uint8Array>;
```

Change to:
```typescript
encryptData(data: string | Uint8Array, recipientPublicKey?: Uint8Array): Promise<Uint8Array> | Uint8Array;
decryptData(encryptedData: Uint8Array): Promise<Uint8Array> | Uint8Array;
```

The runtime implementation still returns `Promise<Uint8Array>`, but the declared return type is widened to allow subclasses to return `Uint8Array` (or `Buffer`) synchronously. This is a non-breaking change — existing callers already `await` the result, and `await` on a non-Promise value is a no-op.

#### 1.3 Make Base Member Fields `protected`

Current: All fields in `Member` are `private readonly`.

Change: The fields that `Node_Member` needs to access in its constructor or overrides must become `protected`:
- `_eciesService` → `protected readonly _eciesService`
- `_id` → `protected readonly _id`
- `_idBytes` → `protected readonly _idBytes`
- `_publicKey` → `protected readonly _publicKey`
- `_creatorIdBytes` → `protected readonly _creatorIdBytes`

All other private fields remain private (they're accessed via getters in the subclass).

#### 1.4 Export Base Member Class with a Named Alias

To avoid naming collisions when node-ecies-lib imports the base:
```typescript
// ecies-lib/src/index.ts (or wherever the barrel export is)
export { Member } from './member';
export { Member as BaseMember } from './member'; // alias for subclassing
```

This is optional — node-ecies-lib can import with its own alias: `import { Member as BaseMember } from '@digitaldefiance/ecies-lib'`.

### Phase 2: Changes to `@digitaldefiance/node-ecies-lib`

#### 2.1 `IMember` Extends Base `IMember`

Current (node-ecies-lib `interfaces/member.ts`):
```typescript
export interface IMember<TID extends PlatformID = Buffer, TSignature extends Buffer = SignatureBuffer> {
  // ... full standalone interface
}
```

Change to:
```typescript
import { IMember as IBaseMember } from '@digitaldefiance/ecies-lib';

export interface IMember<TID extends PlatformID = Buffer, TSignature extends Buffer = SignatureBuffer>
  extends IBaseMember<TID, TSignature> {
  // Node.js-specific additions only:
  readonly constants: IECIESConstants;
  getPublicKeyString(): string;
  getIdString(): string;

  // Narrowed types (covariant overrides):
  readonly publicKey: Buffer;
  readonly idBytes: Buffer;
  readonly creatorIdBytes: Buffer;

  // Narrowed return types:
  encryptData(data: string | Buffer, recipientPublicKey?: Buffer): Promise<Buffer> | Buffer;
  decryptData(encryptedData: Buffer): Promise<Buffer> | Buffer;

  // Narrowed method signatures:
  sign(data: Buffer): TSignature;
  signData(data: Buffer): TSignature;
  verify(signature: TSignature, data: Buffer): boolean;
  verifySignature(data: Buffer, signature: Buffer, publicKey: Buffer): boolean;
}
```

The narrowed property types are valid because `Buffer extends Uint8Array` (covariant for readonly properties). The narrowed method parameter types work because `Buffer extends Uint8Array` and the methods accept a subtype.

#### 2.2 `Member` Class Extends Base `Member`

Current (node-ecies-lib `member.ts`):
```typescript
export class Member<TID extends PlatformID = Buffer> implements IMember<TID> {
  private readonly _eciesService;
  // ... all fields duplicated from base
}
```

Change to:
```typescript
import { Member as BaseMember } from '@digitaldefiance/ecies-lib';

export class Member<TID extends PlatformID = Buffer> extends BaseMember<TID> implements IMember<TID> {
  // Store the Node-specific service for sync operations
  private readonly _nodeEciesService: ECIESService<TID>;

  constructor(
    eciesService: ECIESService<TID>,
    type: MemberType,
    name: string,
    email: EmailString,
    publicKey: Buffer,
    privateKey?: SecureBuffer,
    wallet?: Wallet,
    id?: TID,
    dateCreated?: Date,
    dateUpdated?: Date,
    creatorId?: TID,
  ) {
    // Pass to base constructor — ECIESService is structurally compatible
    // for the methods Base_Member uses internally
    super(
      eciesService as unknown as BaseECIESService<TID>,
      type, name, email,
      publicKey,       // Buffer is Uint8Array ✓
      privateKey, wallet, id, dateCreated, dateUpdated, creatorId,
    );
    this._nodeEciesService = eciesService;
  }

  // --- Node.js-specific additions ---

  get constants(): IECIESConstants {
    return this._nodeEciesService.constants;
  }

  getPublicKeyString(): string {
    return Buffer.from(this.publicKey).toString('hex');
  }

  getIdString(): string {
    return String(this.id);
  }

  // --- Covariant overrides (Buffer return types) ---

  override get publicKey(): Buffer {
    return Buffer.from(super.publicKey);
    // Or access protected _publicKey directly if it's already a Buffer
  }

  override get idBytes(): Buffer {
    return Buffer.from(super.idBytes);
  }

  override get creatorIdBytes(): Buffer {
    return Buffer.from(super.creatorIdBytes);
  }

  // --- Sync encrypt/decrypt overrides ---

  override encryptData(data: string | Buffer, recipientPublicKey?: Buffer): Buffer {
    // Node.js synchronous implementation using Node crypto
    // (existing implementation, unchanged)
  }

  override decryptData(encryptedData: Buffer): Buffer {
    // Node.js synchronous implementation using Node crypto
    // (existing implementation, unchanged)
  }

  // --- Static factory methods ---
  // These must be re-declared to return Node_Member, not Base_Member.
  // The implementations call the base static methods but construct Node_Member instances.

  static override newMember<TID extends PlatformID = Buffer>(
    eciesService: ECIESService<TID>,
    type: MemberType,
    name: string,
    email: EmailString,
    forceMnemonic?: SecureString,
    createdBy?: TID,
  ): { member: Member<TID>; mnemonic: SecureString } {
    // Existing implementation — constructs Node_Member
  }

  static override fromMnemonic<TID extends PlatformID = Buffer>(
    mnemonic: SecureString,
    eciesService: ECIESService<TID>,
    memberType?: MemberType,
    name?: string,
    email?: EmailString,
  ): Member<TID> {
    // Existing implementation — constructs Node_Member
  }

  static override fromJson<TID extends PlatformID = Buffer>(
    json: string,
    eciesService: ECIESService<TID>,
  ): Member<TID> {
    // Existing implementation — constructs Node_Member
  }
}
```

#### 2.3 ECIESService Constructor Compatibility

The `Node_ECIESService` and `Base_ECIESService` are NOT in an inheritance relationship. However, `Base_Member` only uses a subset of `ECIESService` methods internally (primarily `idProvider`, `constants`, and crypto operations).

Strategy: Use `as unknown as BaseECIESService<TID>` in the `super()` call. This is safe because:
- Both services share the same constructor signature shape (`config?: Partial<IECIESConfig> | IConstants, eciesParams?: IECIESConstants`)
- Both expose `idProvider: IIdProvider<TID>` and `constants: IConstants`
- The base Member's internal usage of the service is limited to ID generation and key operations that are structurally compatible

If we want to avoid the cast, we could extract an `IECIESServiceCore<TID>` interface that both services implement, and have `Base_Member` accept that interface instead. This is a cleaner but larger change — recommended as a follow-up.

#### 2.4 Handling `private` → `protected` Field Access

The base Member's fields need to be `protected` for the subclass to access them in overrides. Specifically:
- `_eciesService` — needed if Node_Member wants to call base crypto methods
- `_publicKey`, `_idBytes`, `_creatorIdBytes` — needed for Buffer-typed getter overrides

If making fields protected is undesirable, the alternative is to use the public getters and wrap with `Buffer.from()`. This has a minor performance cost (extra allocation) but avoids changing the base class's encapsulation.

Recommended approach: Use public getters + `Buffer.from()` for the initial implementation. This minimizes changes to ecies-lib.

### Phase 3: Changes to BrightChain Workspace

#### 3.1 Update Dependencies

```json
// package.json
{
  "@digitaldefiance/ecies-lib": "^4.20.0",
  "@digitaldefiance/node-ecies-lib": "^4.20.0"
}
```

#### 3.2 Remove Unsafe Casts in `backupCodeService.ts`

Current:
```typescript
const encryptedCodes = await BackupCode.encryptBackupCodes(
  backupUser as unknown as Member<TID>,
  systemUser,
  codes,
);
```

After (once MemberStore returns Node_Member or the types are compatible):
```typescript
const encryptedCodes = await BackupCode.encryptBackupCodes(
  backupUser,  // Node_Member extends Base_Member — no cast needed
  systemUser,
  codes,
);
```

This requires that `MemberStore.getMember()` returns a type assignable to `Node_Member`. Since `MemberStore` is in `brightchain-lib` and imports `Member` from `ecies-lib`, there are two approaches:

**Option A (Recommended):** Make `MemberStore` generic over the Member type:
```typescript
class MemberStore<TID extends PlatformID = Uint8Array, TMember extends Member<TID> = Member<TID>> {
  async getMember(id: TID): Promise<TMember> { ... }
}
```
Then in `brightchain-api-lib`, instantiate as `MemberStore<Buffer, NodeMember<Buffer>>`.

**Option B:** Keep `MemberStore` returning `Base_Member`, and have the consumer narrow with `instanceof`:
```typescript
const backupUser = await this.memberStore.getMember(memberId);
if (!(backupUser instanceof NodeMember)) {
  throw new Error('Expected NodeMember');
}
// backupUser is now typed as NodeMember<TID>
```

Option A is cleaner but requires a larger refactor. Option B works immediately with the inheritance change.

#### 3.3 Remove Unsafe Casts in `brightChainBackupCodeService.ts`

Same pattern as 3.2 — remove `as unknown as Member<TID>` casts once the type hierarchy is established.

#### 3.4 Fix `Uint8Array` vs `Buffer` Assignment Error

Current error in `brightChainBackupCodeService.ts:257`:
```
Type 'Uint8Array' is not assignable to type 'Buffer'
```

This occurs where `systemUser.decryptData()` returns `Uint8Array` (base type) but the code expects `Buffer`. After the inheritance change, if `systemUser` is typed as `Node_Member`, `decryptData()` returns `Buffer` directly — the error resolves naturally.

## Data Model

No data model changes. The `IStoredBackupCode` interface and persistence layer are unaffected.

## Release Plan

### Step 1: Publish `@digitaldefiance/ecies-lib` v4.20.0
- Widen `Member.encryptData`/`decryptData` return types to `Promise<Uint8Array> | Uint8Array`
- Optionally make select fields `protected`
- Minor version bump (additive, non-breaking)

### Step 2: Publish `@digitaldefiance/node-ecies-lib` v4.20.0
- `IMember` extends base `IMember`
- `Member` extends base `Member`
- Add peer dependency: `@digitaldefiance/ecies-lib >= 4.20.0`
- Minor version bump (additive — all existing API preserved)

### Step 3: Update BrightChain workspace
- Bump both dependency versions
- Remove `as unknown as` casts
- Optionally refactor `MemberStore` to be generic over Member type

## Testing Strategy

### Unit Tests (in ecies-lib)
- Verify `Member.encryptData` still returns `Promise<Uint8Array>` at runtime
- Verify existing tests pass unchanged

### Unit Tests (in node-ecies-lib)
- Verify `new Member(...) instanceof BaseMember` returns `true`
- Verify `Member.encryptData` still returns `Buffer` synchronously
- Verify `Member.decryptData` still returns `Buffer` synchronously
- Verify all existing tests pass unchanged
- Verify static factory methods return `Node_Member` instances
- Verify `constants`, `getPublicKeyString()`, `getIdString()` work

### Integration Tests (in BrightChain)
- Verify `MemberStore.getMember()` result can be passed to `BackupCode.encryptBackupCodes()` without casts
- Verify backup code generation, validation, and recovery work end-to-end
- Run full e2e test suite

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ECIESService structural incompatibility in `super()` call | Build failure in node-ecies-lib | Use `as unknown as` cast in constructor (internal, not exposed to consumers) or extract shared interface |
| Base Member private fields inaccessible to subclass | Cannot override getters efficiently | Use public getters + `Buffer.from()` wrapping instead of direct field access |
| Static factory method return type mismatch | Consumers get `BaseMember` instead of `NodeMember` from static methods | Override all static factory methods in Node_Member to return correct type |
| `encryptData` return type widening breaks callers who don't `await` | Compile errors in consumers that destructure the result synchronously | The base implementation still returns Promise — only the declared type widens. Callers using `await` are unaffected. |
| Circular dependency between packages | Build failure | node-ecies-lib already depends on ecies-lib for types — no new dependency direction introduced |
