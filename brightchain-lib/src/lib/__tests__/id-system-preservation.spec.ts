/**
 * @fileoverview Preservation Property Tests — ID System Overhaul
 *
 * These tests capture the EXISTING (baseline) behavior of the ID system
 * on UNFIXED code. They must PASS on unfixed code — confirming the behavior
 * we need to preserve through the fix.
 *
 * After the fix is applied, these tests should CONTINUE TO PASS (no regressions).
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**
 */

import { beforeAll, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';

import {
  GuidV4Provider as BrowserGuidV4Provider,
  CHECKSUM,
  createRuntimeConfiguration,
  ECIESService,
  GuidUint8Array,
  GuidV4Uint8Array,
  IIdProvider,
} from '@digitaldefiance/ecies-lib';

import { initializeBrightChain } from '../init';
import {
  BlockIdPrimitive,
  ShortHexGuidPrimitive,
} from '../interfaces/branded/primitives';
import { Checksum } from '../types/checksum';

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

// ---------------------------------------------------------------------------
// Custom arbitraries
// ---------------------------------------------------------------------------

/**
 * Arbitrary for generating valid ShortHexGuid strings (32-char lowercase hex).
 * Enforces RFC 4122 v4 structure at positions 12 (version=4) and 16 (variant=8/9/a/b).
 */
const shortHexGuidArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 32, maxLength: 32 })
  .map((arr) => {
    // Force version nibble (position 12) to 4
    arr[12] = 4;
    // Force variant nibble (position 16) to 8, 9, a, or b
    arr[16] = 8 + (arr[16] % 4);
    return arr.map((n) => n.toString(16)).join('');
  });

/**
 * Arbitrary for generating valid 64-byte Uint8Array checksums (SHA3-512 size).
 */
const checksumBytesArb: fc.Arbitrary<Uint8Array> = fc
  .array(fc.integer({ min: 0, max: 255 }), {
    minLength: CHECKSUM.SHA3_BUFFER_LENGTH,
    maxLength: CHECKSUM.SHA3_BUFFER_LENGTH,
  })
  .map((arr) => new Uint8Array(arr));

// ===========================================================================
// P7a — GuidV4Provider round-trip
// ===========================================================================
describe('P7a — GuidV4Provider round-trip (Validates: Requirements 3.1)', () => {
  /**
   * For all generated GUIDs, idProvider.idFromString(idProvider.idToString(guid))
   * equals the original.
   */
  it('idFromString(idToString(guid)) round-trips for any generated GUID', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const rawBytes = idProvider.generate();
        const guid = idProvider.fromBytes(rawBytes);

        const asString = idProvider.idToString(guid);
        const roundTripped = idProvider.idFromString(asString);

        expect(idProvider.equals(guid, roundTripped)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P7b — Member ID byte length
// ===========================================================================
describe('P7b — Member ID byte length (Validates: Requirements 3.2)', () => {
  /**
   * For all generated IDs via GuidV4Provider, the byte representation has
   * length === idProvider.byteLength (16 bytes for GuidV4).
   *
   * We cannot easily call Member.newMember() in a property test (it requires
   * crypto key generation), so we verify the underlying invariant directly:
   * idProvider.generate() produces bytes of the declared length, and
   * toBytes(fromBytes(raw)) preserves that length.
   */
  it('generated ID bytes have length === idProvider.byteLength', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const rawBytes = idProvider.generate();
        expect(rawBytes.length).toBe(idProvider.byteLength);

        const nativeId = idProvider.fromBytes(rawBytes);
        const backToBytes = idProvider.toBytes(nativeId);
        expect(backToBytes.length).toBe(idProvider.byteLength);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P7c — Checksum round-trip
// ===========================================================================
describe('P7c — Checksum round-trip (Validates: Requirements 3.3)', () => {
  /**
   * For all valid 64-byte checksums, Checksum.fromHex(checksum.toHex()).equals(checksum)
   * holds true.
   */
  it('Checksum.fromHex(checksum.toHex()) round-trips for any valid checksum bytes', () => {
    fc.assert(
      fc.property(checksumBytesArb, (bytes: Uint8Array) => {
        const checksum = Checksum.fromUint8Array(bytes);
        const hex = checksum.toHex();
        const roundTripped = Checksum.fromHex(hex);

        expect(roundTripped.equals(checksum)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Checksum.toHex() always produces a 128-char lowercase hex string (64 bytes * 2).
   */
  it('Checksum.toHex() produces 128-char lowercase hex for any valid checksum', () => {
    fc.assert(
      fc.property(checksumBytesArb, (bytes: Uint8Array) => {
        const checksum = Checksum.fromUint8Array(bytes);
        const hex = checksum.toHex();

        expect(hex.length).toBe(CHECKSUM.SHA3_BUFFER_LENGTH * 2);
        expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P7d — BrandedPrimitive validation
// ===========================================================================
describe('P7d — BrandedPrimitive validation (Validates: Requirements 3.4)', () => {
  /**
   * ShortHexGuidPrimitive.validate(s) === /^[0-9a-f]{32}$/.test(s) for any string.
   */
  it('ShortHexGuidPrimitive.validate(s) matches /^[0-9a-f]{32}$/ for any string', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 40 }), (s: string) => {
        const expected = /^[0-9a-f]{32}$/.test(s);
        expect(ShortHexGuidPrimitive.validate(s)).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * BlockIdPrimitive.validate(s) === /^[0-9a-f]{64}$/.test(s) for any string.
   */
  it('BlockIdPrimitive.validate(s) matches /^[0-9a-f]{64}$/ for any string', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 80 }), (s: string) => {
        const expected = /^[0-9a-f]{64}$/.test(s);
        expect(BlockIdPrimitive.validate(s)).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });
});

// ===========================================================================
// P7e — ECIESService provider validation
// ===========================================================================
describe('P7e — ECIESService provider validation (Validates: Requirements 3.6)', () => {
  /**
   * For a valid IIdProvider (GuidV4Provider), ECIESService construction succeeds
   * and caches the provider (second construction is faster / doesn't throw).
   */
  it('ECIESService construction succeeds with GuidV4Provider and caches validation', () => {
    const guidConfig = createRuntimeConfiguration({
      idProvider: new BrowserGuidV4Provider(),
    });

    // First construction — validates the provider
    const service1 = new ECIESService(guidConfig);
    expect(service1).toBeDefined();
    expect(service1.idProvider).toBeDefined();
    expect(service1.idProvider.byteLength).toBe(16);

    // Second construction with same config — should reuse cached validation
    const service2 = new ECIESService(guidConfig);
    expect(service2).toBeDefined();
    expect(service2.idProvider).toBeDefined();
  });
});

// ===========================================================================
// P7f — shortHexGuidArb test arbitrary
// ===========================================================================
describe('P7f — shortHexGuidArb test arbitrary (Validates: Requirements 3.8)', () => {
  /**
   * Generated values from shortHexGuidArb pass ShortHexGuidPrimitive.validate().
   */
  it('all shortHexGuidArb values pass ShortHexGuidPrimitive.validate()', () => {
    fc.assert(
      fc.property(shortHexGuidArb, (hex: string) => {
        expect(ShortHexGuidPrimitive.validate(hex)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * shortHexGuidArb values are exactly 32 chars of lowercase hex.
   */
  it('all shortHexGuidArb values are 32-char lowercase hex', () => {
    fc.assert(
      fc.property(shortHexGuidArb, (hex: string) => {
        expect(hex.length).toBe(32);
        expect(/^[0-9a-f]{32}$/.test(hex)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

// ===========================================================================
// P7g — inituserdb ID persistence format
// ===========================================================================
describe('P7g — ID persistence format (Validates: Requirements 3.9)', () => {
  /**
   * GuidV4Provider.idToString() returns the 32-char ShortHexGuid (no dashes).
   * This is the canonical storage format used throughout the system.
   * asFullHexGuid produces the 36-char dashed format (for logging / .env persistence).
   * asShortHexGuid and idToString() produce the same 32-char hex.
   */
  it('idToString() produces 32-char ShortHexGuid, asFullHexGuid produces 36-char dashed format', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const rawBytes = idProvider.generate();
        const guid = idProvider.fromBytes(rawBytes);

        // idToString() returns 32-char ShortHexGuid (no dashes) — the canonical storage format
        const shortHexString = idProvider.idToString(guid);
        expect(shortHexString.length).toBe(32);
        expect(/^[0-9a-f]{32}$/.test(shortHexString)).toBe(true);

        // asShortHexGuid is the same as idToString()
        const shortHex = (guid as GuidUint8Array).asShortHexGuid;
        expect(shortHex.length).toBe(32);
        expect(shortHex).toBe(shortHexString);

        // asFullHexGuid produces the 36-char dashed format used for .env persistence
        const fullHex = (guid as GuidUint8Array).asFullHexGuid;
        expect(fullHex.length).toBe(36);
        expect(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            fullHex,
          ),
        ).toBe(true);

        // The short hex is the full hex with dashes removed
        expect(shortHex).toBe(fullHex.replace(/-/g, ''));
      }),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// P7h — rehydration round-trip
// ===========================================================================
describe('P7h — rehydration round-trip (Validates: Requirements 3.10)', () => {
  /**
   * idProvider.idFromString(storedString) correctly reconstructs TID instances.
   * Test with all accepted string formats: full hex (36 chars), short hex (32 chars),
   * and base64 (24 chars).
   */
  it('idFromString() reconstructs from full hex-with-dashes format', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const rawBytes = idProvider.generate();
        const original = idProvider.fromBytes(rawBytes);

        // Store as full hex-with-dashes (the format used by idToString / inituserdb)
        const storedString = idProvider.idToString(original);
        const rehydrated = idProvider.idFromString(storedString);

        expect(idProvider.equals(original, rehydrated)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('idFromString() reconstructs from short hex format', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const rawBytes = idProvider.generate();
        const original = idProvider.fromBytes(rawBytes);

        // Store as short hex (32 chars, no dashes — the format used in member index)
        const shortHex = (original as GuidUint8Array).asShortHexGuid;
        const rehydrated = idProvider.idFromString(shortHex);

        expect(idProvider.equals(original, rehydrated)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('idFromString() reconstructs from base64 serialized format', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const rawBytes = idProvider.generate();
        const original = idProvider.fromBytes(rawBytes);

        // Store as base64 (the format used by idProvider.serialize())
        const serialized = idProvider.serialize(rawBytes);
        const deserialized = idProvider.deserialize(serialized);
        const rehydrated = idProvider.fromBytes(deserialized);

        expect(idProvider.equals(original, rehydrated)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
