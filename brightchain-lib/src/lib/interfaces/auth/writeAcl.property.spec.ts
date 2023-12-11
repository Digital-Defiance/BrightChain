/**
 * Property-based tests for Write ACL serialization.
 * Feature: brightdb-write-acls, Property 1: ACL Document Serialization Round Trip
 *
 * For any valid IAclDocument with arbitrary authorized writers, administrators,
 * scope, version, and timestamps, serializing to JSON and deserializing back
 * SHALL produce an equivalent IAclDocument with all fields preserved.
 *
 * **Validates: Requirements 2.7**
 */

import fc from 'fast-check';
import { WriteMode } from '../../enumerations/writeMode';
import { IAclDocument } from './aclDocument';
import {
  deserializeAclDocument,
  serializeAclDocument,
} from './aclDocumentSerialization';

describe('Feature: brightdb-write-acls, Property 1: ACL Document Serialization Round Trip', () => {
  // --- Smart Generators ---

  /** Arbitrary WriteMode value */
  const arbWriteMode = fc.constantFrom(
    WriteMode.Open,
    WriteMode.Restricted,
    WriteMode.OwnerOnly,
  );

  /** Arbitrary non-empty string without colons (valid for scope names) */
  const arbScopeName = fc
    .string({ minLength: 1, maxLength: 64 })
    .filter((s) => !s.includes(':'));

  /** Arbitrary ACL scope */
  const arbAclScope = fc.record({
    dbName: arbScopeName,
    collectionName: fc.option(arbScopeName, { nil: undefined }),
  });

  /**
   * Arbitrary Uint8Array representing a public key.
   * Uses minLength 1 to ensure non-empty keys for meaningful hex round-trips.
   */
  const arbPublicKey = fc.uint8Array({ minLength: 1, maxLength: 65 });

  /** Arbitrary Uint8Array for signatures */
  const arbSignature = fc.uint8Array({ minLength: 1, maxLength: 72 });

  /**
   * Arbitrary Date with millisecond precision.
   * Constrained to valid ISO date range to avoid NaN after round-trip.
   * Dates are floored to millisecond precision since ISO serialization
   * only preserves milliseconds.
   */
  const arbDate = fc
    .integer({
      min: new Date('2000-01-01T00:00:00.000Z').getTime(),
      max: new Date('2099-12-31T23:59:59.999Z').getTime(),
    })
    .map((ms) => new Date(ms));

  /** Arbitrary IAclDocument */
  const arbAclDocument: fc.Arbitrary<IAclDocument> = fc.record({
    documentId: fc.string({ minLength: 1, maxLength: 128 }),
    writeMode: arbWriteMode,
    authorizedWriters: fc.array(arbPublicKey, { minLength: 0, maxLength: 10 }),
    aclAdministrators: fc.array(arbPublicKey, { minLength: 1, maxLength: 5 }),
    scope: arbAclScope,
    version: fc.nat({ max: 1000 }),
    createdAt: arbDate,
    updatedAt: arbDate,
    creatorPublicKey: arbPublicKey,
    creatorSignature: arbSignature,
    previousVersionBlockId: fc.option(
      fc.string({ minLength: 1, maxLength: 128 }),
      { nil: undefined },
    ),
  });

  // --- Helpers ---

  /** Compare two Uint8Arrays for equality */
  function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /** Deep-compare two IAclDocument instances field by field */
  function aclDocumentsEqual(
    original: IAclDocument,
    roundTripped: IAclDocument,
  ): boolean {
    if (original.documentId !== roundTripped.documentId) return false;
    if (original.writeMode !== roundTripped.writeMode) return false;
    if (original.version !== roundTripped.version) return false;
    if (original.createdAt.getTime() !== roundTripped.createdAt.getTime())
      return false;
    if (original.updatedAt.getTime() !== roundTripped.updatedAt.getTime())
      return false;

    // Scope
    if (original.scope.dbName !== roundTripped.scope.dbName) return false;
    if (original.scope.collectionName !== roundTripped.scope.collectionName)
      return false;

    // Uint8Array fields
    if (
      !uint8ArraysEqual(
        original.creatorPublicKey,
        roundTripped.creatorPublicKey,
      )
    )
      return false;
    if (
      !uint8ArraysEqual(
        original.creatorSignature,
        roundTripped.creatorSignature,
      )
    )
      return false;

    // Array of Uint8Array fields
    if (
      original.authorizedWriters.length !==
      roundTripped.authorizedWriters.length
    )
      return false;
    for (let i = 0; i < original.authorizedWriters.length; i++) {
      if (
        !uint8ArraysEqual(
          original.authorizedWriters[i],
          roundTripped.authorizedWriters[i],
        )
      )
        return false;
    }

    if (
      original.aclAdministrators.length !==
      roundTripped.aclAdministrators.length
    )
      return false;
    for (let i = 0; i < original.aclAdministrators.length; i++) {
      if (
        !uint8ArraysEqual(
          original.aclAdministrators[i],
          roundTripped.aclAdministrators[i],
        )
      )
        return false;
    }

    // Optional previousVersionBlockId
    if (original.previousVersionBlockId !== roundTripped.previousVersionBlockId)
      return false;

    return true;
  }

  // --- Property Test ---

  it('round-trips any IAclDocument through serialize/deserialize', () => {
    fc.assert(
      fc.property(arbAclDocument, (doc: IAclDocument) => {
        const serialized = serializeAclDocument(doc);
        const deserialized = deserializeAclDocument(serialized);
        return aclDocumentsEqual(doc, deserialized);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property-based tests for Capability Token serialization.
 * Feature: brightdb-write-acls, Property 2: Capability Token Serialization Round Trip
 *
 * For any valid ICapabilityToken with arbitrary grantee public key, scope,
 * expiration, and grantor signature, serializing to JSON and deserializing back
 * SHALL produce an equivalent ICapabilityToken with all fields preserved.
 *
 * **Validates: Requirements 6.6**
 */
import { ICapabilityToken } from './capabilityToken';
import {
  deserializeCapabilityToken,
  serializeCapabilityToken,
} from './capabilityTokenSerialization';

describe('Feature: brightdb-write-acls, Property 2: Capability Token Serialization Round Trip', () => {
  // --- Smart Generators ---

  /** Arbitrary non-empty string without colons (valid for scope names) */
  const arbScopeName = fc
    .string({ minLength: 1, maxLength: 64 })
    .filter((s) => !s.includes(':'));

  /** Arbitrary ACL scope */
  const arbAclScope = fc.record({
    dbName: arbScopeName,
    collectionName: fc.option(arbScopeName, { nil: undefined }),
  });

  /**
   * Arbitrary Uint8Array representing a public key.
   * Uses minLength 1 to ensure non-empty keys for meaningful hex round-trips.
   */
  const arbPublicKey = fc.uint8Array({ minLength: 1, maxLength: 65 });

  /** Arbitrary Uint8Array for signatures */
  const arbSignature = fc.uint8Array({ minLength: 1, maxLength: 72 });

  /**
   * Arbitrary Date with millisecond precision.
   * Constrained to valid ISO date range to avoid NaN after round-trip.
   */
  const arbDate = fc
    .integer({
      min: new Date('2000-01-01T00:00:00.000Z').getTime(),
      max: new Date('2099-12-31T23:59:59.999Z').getTime(),
    })
    .map((ms) => new Date(ms));

  /** Arbitrary ICapabilityToken */
  const arbCapabilityToken: fc.Arbitrary<ICapabilityToken> = fc.record({
    granteePublicKey: arbPublicKey,
    scope: arbAclScope,
    expiresAt: arbDate,
    grantorSignature: arbSignature,
    grantorPublicKey: arbPublicKey,
  });

  // --- Helpers ---

  /** Compare two Uint8Arrays for equality */
  function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /** Deep-compare two ICapabilityToken instances field by field */
  function capabilityTokensEqual(
    original: ICapabilityToken,
    roundTripped: ICapabilityToken,
  ): boolean {
    // Uint8Array fields
    if (
      !uint8ArraysEqual(
        original.granteePublicKey,
        roundTripped.granteePublicKey,
      )
    )
      return false;
    if (
      !uint8ArraysEqual(
        original.grantorSignature,
        roundTripped.grantorSignature,
      )
    )
      return false;
    if (
      !uint8ArraysEqual(
        original.grantorPublicKey,
        roundTripped.grantorPublicKey,
      )
    )
      return false;

    // Scope
    if (original.scope.dbName !== roundTripped.scope.dbName) return false;
    if (original.scope.collectionName !== roundTripped.scope.collectionName)
      return false;

    // Date field
    if (original.expiresAt.getTime() !== roundTripped.expiresAt.getTime())
      return false;

    return true;
  }

  // --- Property Test ---

  it('round-trips any ICapabilityToken through serialize/deserialize', () => {
    fc.assert(
      fc.property(arbCapabilityToken, (token: ICapabilityToken) => {
        const serialized = serializeCapabilityToken(token);
        const deserialized = deserializeCapabilityToken(serialized);
        return capabilityTokensEqual(token, deserialized);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property-based tests for Write Proof Signature Correctness.
 * Feature: brightdb-write-acls, Property 16: Write Proof Signature Correctness
 *
 * For any secp256k1 key pair and for any (dbName, collectionName, blockId) triple,
 * creating a Write_Proof by signing SHA-256(dbName + ":" + collectionName + ":" + blockId)
 * with the private key and then verifying with the corresponding public key SHALL return true.
 * Verifying with any other public key SHALL return false.
 *
 * **Validates: Requirements 3.2**
 */
import { secp256k1 } from '@noble/curves/secp256k1';
import { createWriteProofPayload } from './writeProofUtils';

describe('Feature: brightdb-write-acls, Property 16: Write Proof Signature Correctness', () => {
  // --- Smart Generators ---

  /**
   * Arbitrary valid secp256k1 private key (32 bytes).
   * Filtered to ensure the value is within the valid range for secp256k1
   * (1 <= key < curve order). We use filter rather than map to let fast-check
   * handle shrinking correctly.
   */
  const arbPrivateKey = fc
    .uint8Array({ minLength: 32, maxLength: 32 })
    .filter((bytes) => {
      // secp256k1 curve order n
      // A valid private key must be in [1, n-1]
      try {
        secp256k1.getPublicKey(bytes);
        return true;
      } catch {
        return false;
      }
    });

  /**
   * Arbitrary key pair derived from a valid private key.
   * Returns { privateKey, publicKey } where publicKey is the compressed
   * secp256k1 public key (33 bytes).
   */
  const arbKeyPair = arbPrivateKey.map((privateKey) => ({
    privateKey,
    publicKey: secp256k1.getPublicKey(privateKey),
  }));

  /**
   * Arbitrary non-empty string without colons (valid for scope/block names).
   * Colons are excluded since they are used as delimiters in the payload.
   */
  const arbName = fc
    .string({ minLength: 1, maxLength: 64 })
    .filter((s) => !s.includes(':'));

  /** Arbitrary (dbName, collectionName, blockId) triple */
  const arbWriteTarget = fc.record({
    dbName: arbName,
    collectionName: arbName,
    blockId: arbName,
  });

  // --- Property Tests ---

  it('signing and verifying with the same key returns true', () => {
    fc.assert(
      fc.property(arbKeyPair, arbWriteTarget, (keyPair, target) => {
        const payload = createWriteProofPayload(
          target.dbName,
          target.collectionName,
          target.blockId,
          1,
        );
        const signature = secp256k1
          .sign(payload, keyPair.privateKey)
          .toCompactRawBytes();
        return secp256k1.verify(signature, payload, keyPair.publicKey);
      }),
      { numRuns: 100 },
    );
  });

  it('verifying with a different key returns false', () => {
    fc.assert(
      fc.property(
        arbKeyPair,
        arbKeyPair,
        arbWriteTarget,
        (signerKeyPair, differentKeyPair, target) => {
          // Skip when both key pairs happen to be the same
          if (
            signerKeyPair.publicKey.length ===
              differentKeyPair.publicKey.length &&
            signerKeyPair.publicKey.every(
              (b, i) => b === differentKeyPair.publicKey[i],
            )
          ) {
            return true; // vacuously true — same key, skip
          }

          const payload = createWriteProofPayload(
            target.dbName,
            target.collectionName,
            target.blockId,
            1,
          );
          const signature = secp256k1
            .sign(payload, signerKeyPair.privateKey)
            .toCompactRawBytes();
          return !secp256k1.verify(
            signature,
            payload,
            differentKeyPair.publicKey,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
