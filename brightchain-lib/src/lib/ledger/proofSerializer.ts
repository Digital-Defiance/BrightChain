/**
 * @fileoverview Deterministic binary serialization for Merkle inclusion proofs
 * and consistency proofs.
 *
 * Uses only browser-compatible APIs (DataView, Uint8Array) — no Node.js Buffer.
 *
 * @see Design: Merkle Tree Commitment Layer — Proof Serialization
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.7, 10.8, 15.4
 */

import { Checksum } from '../types/checksum';
import {
  LedgerSerializationError,
  LedgerSerializationErrorType,
} from '../errors/ledgerSerializationError';
import {
  IMerkleProof,
  IMerkleProofStep,
  MerkleDirection,
} from '../interfaces/ledger/merkleProof';
import { IConsistencyProof } from '../interfaces/ledger/consistencyProof';

/** Current serialization format version. */
const FORMAT_VERSION = 0x01;

/** Proof type byte for inclusion proofs. */
const PROOF_TYPE_INCLUSION = 0x01;

/** Proof type byte for consistency proofs. */
const PROOF_TYPE_CONSISTENCY = 0x02;

/** SHA3-512 hash size in bytes. */
const HASH_SIZE = 64;

/**
 * Minimum size of a serialized inclusion proof (no path steps):
 * version(1) + proofType(1) + leafHash(64) + leafIndex(4) + treeSize(4) + pathLength(2) = 76
 */
const INCLUSION_HEADER_SIZE = 76;

/** Size of each inclusion proof path step: hash(64) + direction(1) = 65 */
const PATH_STEP_SIZE = 65;

/**
 * Minimum size of a serialized consistency proof (no hashes):
 * version(1) + proofType(1) + earlierSize(4) + laterSize(4) + hashCount(2) = 12
 */
const CONSISTENCY_HEADER_SIZE = 12;

/**
 * Deterministic binary serializer for Merkle inclusion proofs and consistency proofs.
 *
 * All methods are static. Uses only Uint8Array and DataView for browser compatibility.
 */
export class ProofSerializer {
  /**
   * Serialize an inclusion proof to a Uint8Array.
   *
   * Binary format:
   * | Offset | Size            | Field      |
   * |--------|-----------------|------------|
   * | 0      | 1               | version    |
   * | 1      | 1               | proofType  |
   * | 2      | 64              | leafHash   |
   * | 66     | 4               | leafIndex  |
   * | 70     | 4               | treeSize   |
   * | 74     | 2               | pathLength |
   * | 76     | pathLength × 65 | path       |
   */
  static serializeInclusionProof(proof: IMerkleProof): Uint8Array {
    const pathLength = proof.path.length;
    const totalSize = INCLUSION_HEADER_SIZE + pathLength * PATH_STEP_SIZE;
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    // version + proofType
    buffer[0] = FORMAT_VERSION;
    buffer[1] = PROOF_TYPE_INCLUSION;

    // leafHash (64 bytes)
    buffer.set(proof.leafHash.toUint8Array(), 2);

    // leafIndex (uint32 BE)
    view.setUint32(66, proof.leafIndex, false);

    // treeSize (uint32 BE)
    view.setUint32(70, proof.treeSize, false);

    // pathLength (uint16 BE)
    view.setUint16(74, pathLength, false);

    // path steps
    let offset = INCLUSION_HEADER_SIZE;
    for (const step of proof.path) {
      buffer.set(step.hash.toUint8Array(), offset);
      buffer[offset + HASH_SIZE] = step.direction;
      offset += PATH_STEP_SIZE;
    }

    return buffer;
  }

  /**
   * Deserialize a Uint8Array into an inclusion proof.
   *
   * @throws LedgerSerializationError for truncated, malformed, or unrecognized data
   */
  static deserializeInclusionProof(data: Uint8Array): IMerkleProof {
    if (data.length < INCLUSION_HEADER_SIZE) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.DataTooShort,
        `Inclusion proof data too short: expected at least ${INCLUSION_HEADER_SIZE} bytes, got ${data.length}`,
      );
    }

    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );

    // version
    const version = data[0];
    if (version !== FORMAT_VERSION) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.UnsupportedVersion,
        `Unrecognized proof version: 0x${version.toString(16).padStart(2, '0')}`,
      );
    }

    // proofType
    const proofType = data[1];
    if (proofType !== PROOF_TYPE_INCLUSION) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.InvalidMagic,
        `Expected inclusion proof type 0x${PROOF_TYPE_INCLUSION.toString(16).padStart(2, '0')}, got 0x${proofType.toString(16).padStart(2, '0')}`,
      );
    }

    // leafHash
    const leafHash = Checksum.fromUint8Array(data.slice(2, 2 + HASH_SIZE));

    // leafIndex
    const leafIndex = view.getUint32(66, false);

    // treeSize
    const treeSize = view.getUint32(70, false);

    // pathLength
    const pathLength = view.getUint16(74, false);

    // Validate remaining data is sufficient for path
    const expectedSize = INCLUSION_HEADER_SIZE + pathLength * PATH_STEP_SIZE;
    if (data.length < expectedSize) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.FieldOverflow,
        `Inclusion proof path truncated: expected ${expectedSize} bytes, got ${data.length}`,
      );
    }

    // Parse path steps
    const path: IMerkleProofStep[] = [];
    let offset = INCLUSION_HEADER_SIZE;
    for (let i = 0; i < pathLength; i++) {
      const hash = Checksum.fromUint8Array(
        data.slice(offset, offset + HASH_SIZE),
      );
      const directionByte = data[offset + HASH_SIZE];
      if (
        directionByte !== MerkleDirection.LEFT &&
        directionByte !== MerkleDirection.RIGHT
      ) {
        throw new LedgerSerializationError(
          LedgerSerializationErrorType.InvalidMagic,
          `Invalid proof step direction byte: 0x${directionByte.toString(16).padStart(2, '0')}`,
        );
      }
      path.push({ hash, direction: directionByte as MerkleDirection });
      offset += PATH_STEP_SIZE;
    }

    return { leafHash, leafIndex, treeSize, path };
  }

  /**
   * Serialize a consistency proof to a Uint8Array.
   *
   * Binary format:
   * | Offset | Size              | Field       |
   * |--------|-------------------|-------------|
   * | 0      | 1                 | version     |
   * | 1      | 1                 | proofType   |
   * | 2      | 4                 | earlierSize |
   * | 6      | 4                 | laterSize   |
   * | 10     | 2                 | hashCount   |
   * | 12     | hashCount × 64   | hashes      |
   */
  static serializeConsistencyProof(proof: IConsistencyProof): Uint8Array {
    const hashCount = proof.hashes.length;
    const totalSize = CONSISTENCY_HEADER_SIZE + hashCount * HASH_SIZE;
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    // version + proofType
    buffer[0] = FORMAT_VERSION;
    buffer[1] = PROOF_TYPE_CONSISTENCY;

    // earlierSize (uint32 BE)
    view.setUint32(2, proof.earlierSize, false);

    // laterSize (uint32 BE)
    view.setUint32(6, proof.laterSize, false);

    // hashCount (uint16 BE)
    view.setUint16(10, hashCount, false);

    // hashes
    let offset = CONSISTENCY_HEADER_SIZE;
    for (const hash of proof.hashes) {
      buffer.set(hash.toUint8Array(), offset);
      offset += HASH_SIZE;
    }

    return buffer;
  }

  /**
   * Deserialize a Uint8Array into a consistency proof.
   *
   * @throws LedgerSerializationError for truncated, malformed, or unrecognized data
   */
  static deserializeConsistencyProof(data: Uint8Array): IConsistencyProof {
    if (data.length < CONSISTENCY_HEADER_SIZE) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.DataTooShort,
        `Consistency proof data too short: expected at least ${CONSISTENCY_HEADER_SIZE} bytes, got ${data.length}`,
      );
    }

    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );

    // version
    const version = data[0];
    if (version !== FORMAT_VERSION) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.UnsupportedVersion,
        `Unrecognized proof version: 0x${version.toString(16).padStart(2, '0')}`,
      );
    }

    // proofType
    const proofType = data[1];
    if (proofType !== PROOF_TYPE_CONSISTENCY) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.InvalidMagic,
        `Expected consistency proof type 0x${PROOF_TYPE_CONSISTENCY.toString(16).padStart(2, '0')}, got 0x${proofType.toString(16).padStart(2, '0')}`,
      );
    }

    // earlierSize
    const earlierSize = view.getUint32(2, false);

    // laterSize
    const laterSize = view.getUint32(6, false);

    // hashCount
    const hashCount = view.getUint16(10, false);

    // Validate remaining data is sufficient for hashes
    const expectedSize = CONSISTENCY_HEADER_SIZE + hashCount * HASH_SIZE;
    if (data.length < expectedSize) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.FieldOverflow,
        `Consistency proof hashes truncated: expected ${expectedSize} bytes, got ${data.length}`,
      );
    }

    // Parse hashes
    const hashes: Checksum[] = [];
    let offset = CONSISTENCY_HEADER_SIZE;
    for (let i = 0; i < hashCount; i++) {
      hashes.push(
        Checksum.fromUint8Array(data.slice(offset, offset + HASH_SIZE)),
      );
      offset += HASH_SIZE;
    }

    return { earlierSize, laterSize, hashes };
  }
}
