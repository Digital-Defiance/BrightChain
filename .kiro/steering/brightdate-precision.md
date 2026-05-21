---
inclusion: fileMatch
fileMatchPattern: '**/{schemas,documents,services,stores}/**/*.ts'
---

# BrightDate Precision Discipline (BrightChain Workspace)

## When to relax `.toBe(timestamp)` to `.toBeCloseTo(timestamp, 6)`

Several BrightChain test suites assert that a BrightDate timestamp
round-trips exactly through a hydrate/dehydrate cycle:

```ts
const dehydrated = schema.dehydrate(original);
const rehydrated = schema.hydrate(dehydrated);
expect(rehydrated.dateCreated).toBe(original.dateCreated); // ❌ flaky
```

Per BrightDate spec §4.1, this is **not guaranteed** for arbitrary
inputs — Float64 BrightDate has a `~2⁻⁵² × magnitude ≈ 120 ns` round-trip
tax for off-day-anchor inputs. In practice, the `BrightDate ↔ ISO 8601
string ↔ BrightDate` path used by BrightChain schemas loses sub-ms
precision because ISO 8601 itself is ms-precision.

**Use `.toBeCloseTo(timestamp, 6)`** (≈ 86 ms tolerance) for these
assertions — far above the round-trip tax, far below any meaningful
wall-clock precision.

```ts
expect(rehydrated.dateCreated).toBeCloseTo(
  original.dateCreated as number,
  6,
);
```

## Bit-exact round-trip is achievable but not free

If a future requirement needs a bit-exact `hydrate ∘ dehydrate` (for
example, signing the hydrated form of a profile), the right move is to
change the **storage format**, not the in-memory BrightDate type.

The bottleneck is ISO 8601 ms-precision, not Float64. Switching the
runtime type to `ExactBrightDate` (BigInt picoseconds) without also
changing the persisted format is silently lossy at the ISO boundary.

Two viable paths if the requirement arrives:

1. **Sign the dehydrated bytes** — standard cryptographic discipline.
   The hydrated form's round-trip tax becomes irrelevant because
   signatures cover the storage form, not the in-memory form. No
   schema change required.

2. **Persist a higher-precision representation** — store the timestamp
   as a numeric BigInt-picosecond field (or an `ExactBrightDate`
   sortable-string per BrightDate spec §6.2) instead of an ISO string.
   This requires schema migration and persisted-data migration.

Path (1) is preferred and lower-cost. Path (2) is only justified when
the signed quantity is the in-memory shape and the storage format is
not under the signer's control.

## Where this applies

The pattern shows up wherever BrightChain hydrates a stored document
to runtime objects:

- `brightchain-lib/src/lib/schemas/member/memberSchema.ts`
- `brightchain-lib/src/lib/schemas/messaging/messageMetadataSchema.ts`
- `brightchain-lib/src/lib/documents/member/memberProfileHydration.ts`
- `brightchain-lib/src/lib/documents/member/memberHydration.ts`
- `brightchain-api-lib/src/lib/stores/diskBlockMetadataStore.ts`
- `brightchain-api-lib/src/lib/stores/diskMessageMetadataStore.ts`

Property tests that exercise `hydrate ∘ dehydrate` round-trips on
timestamp fields in these schemas should use `.toBeCloseTo(_, 6)`.
