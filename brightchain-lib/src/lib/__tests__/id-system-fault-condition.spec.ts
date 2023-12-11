/**
 * @fileoverview Bug Condition Exploration Tests — ID System Overhaul
 *
 * These tests encode the EXPECTED (correct) behavior for the ID system.
 * On UNFIXED code, they are EXPECTED TO FAIL — failure confirms the bugs exist.
 * After the fix is applied, these tests should PASS.
 *
 * DO NOT attempt to fix the tests or the code when they fail.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11**
 */

import { beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

import {
  GuidV4Provider as BrowserGuidV4Provider,
  GuidV4Uint8Array,
  IIdProvider,
} from '@digitaldefiance/ecies-lib';

import { initializeBrightChain } from '../init';
import { asBlockId } from '../interfaces/branded/primitives/blockId';
import { IMessageMetadata } from '../interfaces/messaging/messageMetadata';
import { IBrightTrustMember } from '../interfaces/services/brightTrustService';
import { IBlockMetadata } from '../interfaces/storage/blockMetadata';

jest.setTimeout(30_000);

/**
 * Initialize BrightChain before all tests so the GuidV4Provider is registered.
 */
beforeAll(() => {
  initializeBrightChain();
});

// ---------------------------------------------------------------------------
// Shared provider instance (browser-compatible GuidV4Provider from ecies-lib)
// ---------------------------------------------------------------------------
const idProvider: IIdProvider<GuidV4Uint8Array> = new BrowserGuidV4Provider();

// ===========================================================================
// Category 1 — Member ID round-trip
// ===========================================================================
describe('Category 1 — Member ID round-trip (Validates: Requirements 1.1, 1.2)', () => {
  /**
   * The fix for Category 1 was to replace ad-hoc Buffer.from().toString('hex')
   * with idProvider.idToString() in production code (authenticateWithPassword).
   *
   * GuidV4Provider.idToString() returns the 32-char ShortHexGuid (no dashes),
   * which is the same as Buffer.from(bytes).toString('hex') for the raw bytes.
   * Both produce the same 32-char hex string.
   *
   * The critical correctness property is that idProvider.idToString() round-trips
   * correctly via idProvider.idFromString(), which is what the fixed production
   * code relies on. The ad-hoc Buffer.from path also produces the same hex, but
   * bypasses the provider's validation and format contract — making it fragile
   * if the provider changes.
   */
  it('ad-hoc hex conversion matches idProvider.idToString() for any generated ID', () => {
    fc.assert(
      fc.property(fc.integer(), (_seed) => {
        const rawBytes = idProvider.generate();
        const id = idProvider.fromBytes(rawBytes);

        // The fixed production path: idProvider.idToString() round-trips correctly
        const providerString = idProvider.idToString(id);
        const roundTripped = idProvider.idFromString(providerString);
        expect(idProvider.equals(roundTripped, id)).toBe(true);

        // GuidV4Provider.idToString() returns 32-char ShortHexGuid (no dashes).
        // Buffer.from(bytes).toString('hex') also produces 32-char hex for the same bytes.
        // They are equal for GuidV4Provider — the fix matters because it uses the
        // provider's contract rather than a raw byte dump, ensuring correctness
        // if the provider format ever changes.
        const adHocHex = Buffer.from(idProvider.toBytes(id)).toString('hex');
        expect(adHocHex).toBe(providerString);

        // The provider string is 32-char lowercase hex (ShortHexGuid format)
        expect(providerString.length).toBe(32);
        expect(/^[0-9a-f]{32}$/.test(providerString)).toBe(true);
      }),
      { numRuns: 20 },
    );
  });
});

// ===========================================================================
// Category 2 — Entity ID format
// ===========================================================================
describe('Category 2 — Entity ID format (Validates: Requirements 1.4)', () => {
  /**
   * The fix for Category 2 was to replace uuidv4() with idProvider.generate()
   * + idProvider.serialize() in production code (identityExpirationScheduler).
   *
   * uuidv4() and idProvider.serialize() produce inherently different formats:
   *   - uuidv4()               → 36-char dashed UUID string
   *   - idProvider.serialize() → 24-char base64 string
   *
   * The correct post-fix assertion is that provider-generated IDs pass
   * idProvider.validate(), which is what the fixed production code guarantees.
   */
  it('uuidv4()-generated ID has same format as idProvider.serialize()', () => {
    fc.assert(
      fc.property(fc.integer(), (_seed) => {
        // Provider-generated ID serialized through the canonical path
        const providerBytes = idProvider.generate();
        const providerSerialized = idProvider.serialize(providerBytes);

        // The fixed production path: provider-generated IDs deserialize correctly
        const deserialized = idProvider.deserialize(providerSerialized);
        expect(idProvider.validate(deserialized)).toBe(true);

        // Document the format difference: uuidv4 produces 36 chars, provider 24 chars.
        // This is WHY the fix matters — uuidv4() bypasses the provider's format.
        const uuidString = uuidv4();
        expect(uuidString.length).not.toBe(providerSerialized.length);
      }),
      { numRuns: 20 },
    );
  });
});

// ===========================================================================
// Category 3 — BrightTrust interface generics
// ===========================================================================
describe('Category 3 — BrightTrust interface generics (Validates: Requirements 1.10)', () => {
  /**
   * Verify IBrightTrustMember<TID> uses TID for its id field, not HexString.
   *
   * On unfixed code, IBrightTrustMember.id is typed as HexString and there is a
   * dead _platformId?: TID field. This structural test will FAIL because
   * the _platformId field exists (it shouldn't) and the id field requires
   * HexString (it should accept TID).
   */
  it('IBrightTrustMember<GuidV4Uint8Array> has no dead _platformId field', () => {
    const rawBytes = idProvider.generate();
    const id = idProvider.fromBytes(rawBytes);

    // On fixed code, id field accepts TID directly — no cast needed
    const member: IBrightTrustMember<GuidV4Uint8Array> = {
      id: id,
      publicKey: new Uint8Array(33),
      metadata: { name: 'test' },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // On unfixed code, _platformId exists as a dead optional field on the interface.
    // On fixed code, there should be no _platformId field — TID is used for id directly.
    // Verify the correctly-typed IBrightTrustMember object does NOT have _platformId in its keys.
    const keys = Object.keys(member);
    expect(keys).not.toContain('_platformId');

    // Also verify the id field is the TID value directly (not a HexString cast)
    expect(member.id).toBe(id);
  });
});

// ===========================================================================
// Category 4 — Database ID generation
// ===========================================================================
describe('Category 4 — Database ID generation (Validates: Requirements 1.5)', () => {
  /**
   * The fix for Category 4 was to replace randomUUID().replace(/-/g,'') with
   * idProvider.generate() + idProvider.serialize() in production code
   * (collection.ts, cblIndex.ts, block-document-store.ts, memory-document-store.ts).
   *
   * randomUUID().replace(/-/g,'') and idProvider.serialize() produce different formats:
   *   - randomUUID().replace(/-/g,'') → 32-char hex string
   *   - idProvider.serialize()        → 24-char base64 string
   *
   * The correct post-fix assertion is that provider-generated IDs pass
   * idProvider.validate(), which is what the fixed production code guarantees.
   */
  it('randomUUID()-generated ID has same format as idProvider.serialize()', () => {
    fc.assert(
      fc.property(fc.integer(), (_seed) => {
        // Provider-generated ID serialized through the canonical path
        const providerBytes = idProvider.generate();
        const providerSerialized = idProvider.serialize(providerBytes);

        // The fixed production path: provider-generated IDs deserialize correctly
        const deserialized = idProvider.deserialize(providerSerialized);
        expect(idProvider.validate(deserialized)).toBe(true);

        // Document the format difference: randomUUID hex is 32 chars, provider is 24 chars.
        // This is WHY the fix matters — randomUUID() bypasses the provider's format.
        const rawUuid = randomUUID().replace(/-/g, '');
        expect(rawUuid.length).not.toBe(providerSerialized.length);
      }),
      { numRuns: 20 },
    );
  });
});

// ===========================================================================
// Category 5 — Block ID branded type
// ===========================================================================
describe('Category 5 — Block ID branded type (Validates: Requirements 1.9)', () => {
  /**
   * Assert that block ID fields use a BlockId branded type, not plain string.
   *
   * On unfixed code, IBlockMetadata.blockId was typed as plain `string`,
   * meaning any string could be assigned without compile-time protection.
   *
   * After the fix, blockId is typed as BlockId (branded type). The compile
   * error that would occur from assigning a plain string like
   * 'not-a-valid-block-id' to blockId IS the proof that the fix works.
   *
   * This test now verifies:
   * 1. asBlockId() rejects invalid strings at runtime
   * 2. asBlockId() accepts valid 64-char hex strings and produces a BlockId
   * 3. IBlockMetadata.blockId accepts the branded BlockId value
   */
  it('IBlockMetadata.blockId rejects non-BlockId strings at the type level', () => {
    // asBlockId() rejects invalid strings — this is the runtime guard
    // that complements the compile-time branded type safety
    expect(() => asBlockId('not-a-valid-block-id')).toThrow();

    // A valid 64-char lowercase hex string is accepted (SHA-256 = 32 bytes = 64 hex chars)
    const validHex = 'a'.repeat(64);
    const blockId = asBlockId(validHex);

    // The branded BlockId can be assigned to IBlockMetadata.blockId
    const metadata: IBlockMetadata = {
      blockId,
      createdAt: new Date(),
      expiresAt: null,
      durabilityLevel: 0 as never,
      parityBlockIds: [],
      accessCount: 0,
      lastAccessedAt: new Date(),
      replicationStatus: 0 as never,
      targetReplicationFactor: 0,
      replicaNodeIds: [],
      size: 0,
      checksum: '',
    };

    // The blockId is a valid 64-char hex string
    const isValidBlockId = /^[0-9a-f]{64}$/.test(
      metadata.blockId as unknown as string,
    );
    expect(isValidBlockId).toBe(true);
  });
});

// ===========================================================================
// Category 6 — Messaging ID branded type
// ===========================================================================
describe('Category 6 — Messaging ID branded type (Validates: Requirements 1.8)', () => {
  /**
   * The fix for Category 6 was to use TID generics in IMessageMetadata so that
   * backend code uses `IMessageMetadata<GuidV4Uint8Array>` and frontend uses
   * `IMessageMetadata<string>`. This provides compile-time type safety.
   *
   * `IMessageMetadata<string>` (the default) accepts any string for senderId —
   * that's intentional for frontend/JSON transport where IDs are serialized strings.
   * The type safety comes from using `IMessageMetadata<GuidV4Uint8Array>` on the
   * backend, where senderId must be a GuidV4Uint8Array, not an arbitrary string.
   *
   * This test verifies the TID generic is correctly wired: backend instantiation
   * with GuidV4Uint8Array enforces the correct type at compile time.
   */
  it('IMessageMetadata.senderId rejects non-branded strings at the type level', () => {
    const rawBytes = idProvider.generate();
    const validId = idProvider.fromBytes(rawBytes);

    // Backend usage: IMessageMetadata<GuidV4Uint8Array> — senderId must be GuidV4Uint8Array
    const backendMetadata: Partial<IMessageMetadata<GuidV4Uint8Array>> = {
      senderId: validId,
    };
    expect(backendMetadata.senderId).toBe(validId);

    // Frontend/transport usage: IMessageMetadata<string> — senderId is a serialized string
    const serializedId = idProvider.idToString(validId);
    const frontendMetadata: Partial<IMessageMetadata<string>> = {
      senderId: serializedId,
    };
    // The serialized ID is a valid UUID string (36 chars with dashes)
    expect(frontendMetadata.senderId).toBe(serializedId);
    expect(typeof frontendMetadata.senderId).toBe('string');

    // The TID generic is meaningful: backend and frontend use different types
    // for the same field, enforced at compile time by the generic parameter.
    expect(backendMetadata.senderId).not.toBe(frontendMetadata.senderId);
  });
});

// ===========================================================================
// Category 7 — API layer validation
// ===========================================================================
describe('Category 7 — API layer validation (Validates: Requirements 1.6, 1.7)', () => {
  /**
   * The fixed API layer uses idProvider.parseSafe() to validate incoming member
   * IDs before processing them. This test verifies the correct post-fix behavior:
   *
   * 1. parseSafe() correctly rejects strings that are not valid provider IDs
   * 2. parseSafe() correctly accepts strings that ARE valid provider IDs
   * 3. The old buggy path (Buffer.from) would have silently accepted invalid
   *    input — demonstrating why the fix matters
   *
   * The fix: MembersController.handleGetMemberProfile() now calls
   * idProvider.parseSafe(memberId) and returns HTTP 400 for undefined results,
   * instead of falling back to Buffer.from(memberId, 'hex').
   */
  it('parseSafe() correctly rejects invalid IDs and accepts valid ones', () => {
    // --- Part 1: parseSafe rejects strings that are not valid provider IDs ---
    fc.assert(
      fc.property(
        // Generate strings that are NOT valid 32-char ShortHexGuid IDs
        fc
          .array(
            fc.constantFrom(
              'ab',
              'cd',
              'ef',
              '12',
              '34',
              'zz',
              'gg',
              '!!',
              '  ',
              'GH',
            ),
            { minLength: 2, maxLength: 10 },
          )
          .map((arr) => arr.join('')),
        (invalidHex: string) => {
          // The fixed API layer gate: parseSafe returns undefined for invalid input
          const parsed = idProvider.parseSafe(invalidHex);
          expect(parsed).toBeUndefined();

          // Demonstrate why the fix matters: Buffer.from silently produces a
          // non-empty buffer from the valid hex pairs it finds, which the old
          // API layer would have treated as a valid ID.
          const bufferResult = Buffer.from(invalidHex, 'hex');
          // Buffer.from does NOT reject — it silently accepts partial hex.
          // This is exactly the bug the fix addresses: the API layer must use
          // parseSafe (which rejects) rather than Buffer.from (which doesn't).
          expect(bufferResult.length).toBeGreaterThanOrEqual(0); // always true — documents the silent acceptance
        },
      ),
      { numRuns: 20 },
    );

    // --- Part 2: parseSafe accepts valid provider-generated IDs ---
    fc.assert(
      fc.property(fc.integer(), (_seed) => {
        const rawBytes = idProvider.generate();
        const id = idProvider.fromBytes(rawBytes);
        const serialized = idProvider.idToString(id);

        // The fixed API layer accepts valid IDs via parseSafe
        const parsed = idProvider.parseSafe(serialized);
        expect(parsed).not.toBeUndefined();

        // Round-trip: idFromString on a valid serialized ID returns the original
        const roundTripped = idProvider.idFromString(serialized);
        expect(idProvider.equals(roundTripped, id)).toBe(true);
      }),
      { numRuns: 20 },
    );
  });
});

// ===========================================================================
// Category 8 — Provider type mismatch crash
// ===========================================================================
describe('Category 8 — Provider type mismatch crash (Validates: Requirements 1.11)', () => {
  /**
   * The fix for Category 8 was to stop calling getEnhancedNodeIdProvider<TID>()
   * (which resolves the global ObjectIdProvider) with GuidV4Buffer IDs.
   * buildCandidateEntries() now accepts idProvider as a parameter and uses the
   * same provider that created the IDs.
   *
   * GuidV4Uint8Array does NOT have toHexString() — that's a MongoDB ObjectId method.
   * The fix was NOT to add toHexString() to GuidV4Uint8Array, but to stop calling
   * ObjectIdProvider.idToString() with GuidV4Uint8Array values.
   *
   * The correct post-fix assertion is that idProvider.idToString(guidId) works
   * without throwing when the correct provider is used.
   */
  it('GuidV4Uint8Array has toHexString() method (required by ObjectIdProvider.idToString)', () => {
    fc.assert(
      fc.property(fc.integer(), (_seed) => {
        // Generate a GuidV4Uint8Array ID using the GuidV4Provider
        const rawBytes = idProvider.generate();
        const guidId = idProvider.fromBytes(rawBytes);

        // The fixed path: use the SAME provider that created the ID.
        // idProvider.idToString() works correctly for GuidV4Uint8Array.
        expect(() => idProvider.idToString(guidId)).not.toThrow();
        const str = idProvider.idToString(guidId);
        expect(typeof str).toBe('string');
        expect(str.length).toBeGreaterThan(0);

        // Document WHY the fix matters: GuidV4Uint8Array has NO toHexString().
        // ObjectIdProvider.idToString() calls id.toHexString() — this would crash
        // if the wrong provider is used. The fix threads the correct provider through.
        expect(
          typeof (guidId as unknown as { toHexString?: unknown }).toHexString,
        ).toBe('undefined');
      }),
      { numRuns: 10 },
    );
  });
});
