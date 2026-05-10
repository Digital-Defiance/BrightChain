import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  deleteBatchIndex,
  generateExclusionProof,
  generateInclusionProof,
  readBatchIndex,
  writeBatchIndex,
} from '../merkleStore.js';
import {
  largestPowerOf2Below,
  merkleInternalHash,
  merkleLeafHash,
  merkleRootFromLeaves,
  proveInclusion,
  verifyExclusionProof,
  verifyInclusionProof,
} from '../merkleTree.js';
import { encodeMeteringRecord } from '../record.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a 32-byte buffer with `seed` at byte 0 (rest zero). */
function seedBytes(seed: number): Uint8Array {
  const buf = new Uint8Array(32);
  buf[0] = seed & 0xff;
  buf[1] = (seed >>> 8) & 0xff;
  return buf;
}

/** Create a CBOR-encoded fake MeteringRecord. */
function fakeRecord(
  seq: bigint,
  memberId: Uint8Array,
  opId: string,
): Uint8Array {
  return encodeMeteringRecord({
    seq,
    prev_hash: new Uint8Array(32),
    ts: BigInt(Date.now()) * 1000n,
    op: 'test.charge',
    memberId,
    assetId: 'joule',
    amount: 10n,
    opId,
    context_hash: new Uint8Array(32),
  });
}

/** Build N leaf hashes using fakeRecord(seq=i, memberId, opId=`op-${i}`). */
function buildLeaves(
  n: number,
  memberId: Uint8Array,
): { leaves: Uint8Array[]; encoded: Uint8Array[] } {
  const encoded: Uint8Array[] = [];
  const leaves: Uint8Array[] = [];
  for (let i = 0; i < n; i++) {
    const enc = fakeRecord(BigInt(i), memberId, `op-${i}`);
    encoded.push(enc);
    leaves.push(merkleLeafHash(enc));
  }
  return { leaves, encoded };
}

// ── RFC-9162 Merkle Tree — core functions ─────────────────────────────────────

describe('RFC-9162 Merkle Tree — core functions', () => {
  const dummyRecord = fakeRecord(0n, seedBytes(1), 'op-0');

  it('merkleLeafHash produces a 32-byte hash', () => {
    const h = merkleLeafHash(dummyRecord);
    expect(h).toHaveLength(32);
  });

  it('merkleLeafHash differs from plain BLAKE3 of the same input', () => {
    const { blake3 } = require('@noble/hashes/blake3') as {
      blake3: (m: Uint8Array) => Uint8Array;
    };
    const h = merkleLeafHash(dummyRecord);
    const plain = blake3(dummyRecord);
    expect(Buffer.from(h).equals(Buffer.from(plain))).toBe(false);
  });

  it('merkleInternalHash produces a 32-byte hash', () => {
    const left = merkleLeafHash(dummyRecord);
    const right = merkleLeafHash(fakeRecord(1n, seedBytes(1), 'op-1'));
    expect(merkleInternalHash(left, right)).toHaveLength(32);
  });

  it('merkleInternalHash is not commutative (order matters)', () => {
    const a = new Uint8Array(32).fill(0xaa);
    const b = new Uint8Array(32).fill(0xbb);
    const ab = merkleInternalHash(a, b);
    const ba = merkleInternalHash(b, a);
    expect(Buffer.from(ab).equals(Buffer.from(ba))).toBe(false);
  });

  it('largestPowerOf2Below: known values', () => {
    expect(largestPowerOf2Below(2)).toBe(1);
    expect(largestPowerOf2Below(3)).toBe(2);
    expect(largestPowerOf2Below(4)).toBe(2);
    expect(largestPowerOf2Below(5)).toBe(4);
    expect(largestPowerOf2Below(8)).toBe(4);
    expect(largestPowerOf2Below(9)).toBe(8);
  });

  it('largestPowerOf2Below throws on n < 2', () => {
    expect(() => largestPowerOf2Below(0)).toThrow(RangeError);
    expect(() => largestPowerOf2Below(1)).toThrow(RangeError);
  });

  it('merkleRootFromLeaves: empty returns 32-byte hash', () => {
    const root = merkleRootFromLeaves([]);
    expect(root).toHaveLength(32);
  });

  it('merkleRootFromLeaves: single leaf returns that leaf unchanged', () => {
    const leaf = merkleLeafHash(dummyRecord);
    const root = merkleRootFromLeaves([leaf]);
    expect(Buffer.from(root).equals(Buffer.from(leaf))).toBe(true);
  });

  it('merkleRootFromLeaves: two leaves = internalHash(leaf0, leaf1)', () => {
    const l0 = merkleLeafHash(fakeRecord(0n, seedBytes(1), 'op-0'));
    const l1 = merkleLeafHash(fakeRecord(1n, seedBytes(1), 'op-1'));
    const root = merkleRootFromLeaves([l0, l1]);
    const expected = merkleInternalHash(l0, l1);
    expect(Buffer.from(root).equals(Buffer.from(expected))).toBe(true);
  });

  it('merkleRootFromLeaves: different leaf order produces different root', () => {
    const l0 = merkleLeafHash(fakeRecord(0n, seedBytes(1), 'op-0'));
    const l1 = merkleLeafHash(fakeRecord(1n, seedBytes(1), 'op-1'));
    const r1 = merkleRootFromLeaves([l0, l1]);
    const r2 = merkleRootFromLeaves([l1, l0]);
    expect(Buffer.from(r1).equals(Buffer.from(r2))).toBe(false);
  });
});

// ── Inclusion proofs ──────────────────────────────────────────────────────────

describe('Inclusion proofs', () => {
  const memberId = seedBytes(42);

  it('proveInclusion throws on empty tree', () => {
    expect(() => proveInclusion([], 0)).toThrow(RangeError);
  });

  it('proveInclusion throws on out-of-bounds index', () => {
    const { leaves } = buildLeaves(4, memberId);
    expect(() => proveInclusion(leaves, 4)).toThrow(RangeError);
    expect(() => proveInclusion(leaves, -1)).toThrow(RangeError);
  });

  it('single-leaf tree: empty audit path, leaf equals root', () => {
    const { leaves } = buildLeaves(1, memberId);
    const proof = proveInclusion(leaves, 0);
    expect(proof.auditPath).toHaveLength(0);
    expect(proof.treeSize).toBe(1);
    expect(Buffer.from(proof.leafHash).equals(Buffer.from(proof.root))).toBe(
      true,
    );
  });

  it('two-leaf tree: audit path has exactly one element', () => {
    const { leaves } = buildLeaves(2, memberId);
    const proof0 = proveInclusion(leaves, 0);
    expect(proof0.auditPath).toHaveLength(1);
    expect(
      Buffer.from(proof0.auditPath[0]).equals(Buffer.from(leaves[1])),
    ).toBe(true);

    const proof1 = proveInclusion(leaves, 1);
    expect(proof1.auditPath).toHaveLength(1);
    expect(
      Buffer.from(proof1.auditPath[0]).equals(Buffer.from(leaves[0])),
    ).toBe(true);
  });

  it('verifyInclusionProof: valid proofs return true for trees of sizes 1–8', () => {
    for (let n = 1; n <= 8; n++) {
      const { leaves } = buildLeaves(n, memberId);
      for (let i = 0; i < n; i++) {
        const proof = proveInclusion(leaves, i);
        expect(verifyInclusionProof(proof)).toBe(true);
      }
    }
  });

  it('verifyInclusionProof: tampered leafHash returns false', () => {
    const { leaves } = buildLeaves(5, memberId);
    const proof = proveInclusion(leaves, 2);
    const tampered = { ...proof, leafHash: new Uint8Array(32).fill(0xff) };
    expect(verifyInclusionProof(tampered)).toBe(false);
  });

  it('verifyInclusionProof: tampered auditPath returns false', () => {
    const { leaves } = buildLeaves(5, memberId);
    const proof = proveInclusion(leaves, 2);
    const badPath = proof.auditPath.map((h) => {
      const copy = new Uint8Array(h);
      copy[0] ^= 0xff;
      return copy;
    });
    const tampered = { ...proof, auditPath: badPath };
    expect(verifyInclusionProof(tampered)).toBe(false);
  });

  it('verifyInclusionProof: wrong root returns false', () => {
    const { leaves } = buildLeaves(5, memberId);
    const proof = proveInclusion(leaves, 2);
    const tampered = { ...proof, root: new Uint8Array(32).fill(0xde) };
    expect(verifyInclusionProof(tampered)).toBe(false);
  });

  it('inclusion proof for 5-leaf tree: audit path has depth 3', () => {
    // RFC-9162: tree of 5 → depth 3 for leaves 0..3, depth 2 for leaf 4
    const { leaves } = buildLeaves(5, memberId);
    const proofMiddle = proveInclusion(leaves, 2);
    expect(proofMiddle.auditPath).toHaveLength(3);
    const proofLast = proveInclusion(leaves, 4);
    expect(proofLast.auditPath).toHaveLength(1);
  });
});

// ── Exclusion proofs ──────────────────────────────────────────────────────────

describe('Exclusion proofs', () => {
  const memberA = seedBytes(10);
  const memberB = seedBytes(20);

  it('verifyExclusionProof: absent opId returns true', () => {
    const { leaves, encoded } = buildLeaves(8, memberA);
    // Add some memberB records
    for (let i = 0; i < 4; i++) {
      const enc = fakeRecord(BigInt(8 + i), memberB, `op-b-${i}`);
      encoded.push(enc);
      leaves.push(merkleLeafHash(enc));
    }
    const root = merkleRootFromLeaves(leaves);
    const idx = { fromSeq: 0n, toSeq: 11n, leaves, root };

    const proof = generateExclusionProof(idx, encoded, memberA, 'op-MISSING');
    expect(proof.memberRecords).toHaveLength(8); // only memberA records
    expect(verifyExclusionProof(proof)).toBe(true);
  });

  it('verifyExclusionProof: present opId returns false', () => {
    const { leaves, encoded } = buildLeaves(8, memberA);
    const root = merkleRootFromLeaves(leaves);
    const idx = { fromSeq: 0n, toSeq: 7n, leaves, root };

    // 'op-3' IS in the batch
    const proof = generateExclusionProof(idx, encoded, memberA, 'op-3');
    expect(verifyExclusionProof(proof)).toBe(false);
  });

  it('verifyExclusionProof: tampered encodedRecord returns false', () => {
    const { leaves, encoded } = buildLeaves(4, memberA);
    const root = merkleRootFromLeaves(leaves);
    const idx = { fromSeq: 0n, toSeq: 3n, leaves, root };

    const proof = generateExclusionProof(idx, encoded, memberA, 'op-MISSING');
    // Tamper the first memberRecord's encodedRecord
    const tampered = {
      ...proof,
      memberRecords: proof.memberRecords.map((mr, i) =>
        i === 0
          ? {
              ...mr,
              encodedRecord: new Uint8Array(mr.encodedRecord).fill(0xcc),
            }
          : mr,
      ),
    };
    expect(verifyExclusionProof(tampered)).toBe(false);
  });

  it('verifyExclusionProof: no-record member returns true', () => {
    const { leaves, encoded } = buildLeaves(4, memberA);
    const root = merkleRootFromLeaves(leaves);
    const idx = { fromSeq: 0n, toSeq: 3n, leaves, root };

    // memberB has no records in this batch at all
    const proof = generateExclusionProof(idx, encoded, memberB, 'op-anything');
    expect(proof.memberRecords).toHaveLength(0);
    expect(verifyExclusionProof(proof)).toBe(true);
  });
});

// ── BatchMerkleStore (disk I/O) ───────────────────────────────────────────────

describe('BatchMerkleStore', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merkle-store-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writeBatchIndex / readBatchIndex round-trips correctly', () => {
    const memberId = seedBytes(7);
    const { leaves } = buildLeaves(8, memberId);

    const written = writeBatchIndex(tmpDir, 0n, 7n, leaves);
    const loaded = readBatchIndex(tmpDir, 0n, 7n);

    expect(loaded.fromSeq).toBe(0n);
    expect(loaded.toSeq).toBe(7n);
    expect(loaded.leaves).toHaveLength(8);
    expect(Buffer.from(loaded.root).equals(Buffer.from(written.root))).toBe(
      true,
    );
    for (let i = 0; i < 8; i++) {
      expect(Buffer.from(loaded.leaves[i]).equals(Buffer.from(leaves[i]))).toBe(
        true,
      );
    }
  });

  it('generateInclusionProof from stored index verifies', () => {
    const memberId = seedBytes(8);
    const { leaves } = buildLeaves(10, memberId);
    const idx = writeBatchIndex(tmpDir, 100n, 109n, leaves);

    for (let i = 0; i < 10; i++) {
      const proof = generateInclusionProof(idx, i);
      expect(verifyInclusionProof(proof)).toBe(true);
    }
  });

  it('generateExclusionProof from stored index verifies', () => {
    const memberA = seedBytes(11);
    const memberB = seedBytes(12);
    const { leaves: aLeaves, encoded: aEncoded } = buildLeaves(6, memberA);
    const bEncoded = [];
    const bLeaves = [];
    for (let i = 0; i < 4; i++) {
      const enc = fakeRecord(BigInt(6 + i), memberB, `op-b-${i}`);
      bEncoded.push(enc);
      bLeaves.push(merkleLeafHash(enc));
    }
    const allLeaves = [...aLeaves, ...bLeaves];
    const allEncoded = [...aEncoded, ...bEncoded];
    const idx = writeBatchIndex(tmpDir, 0n, 9n, allLeaves);

    const proof = generateExclusionProof(idx, allEncoded, memberA, 'op-ABSENT');
    expect(proof.memberRecords).toHaveLength(6);
    expect(verifyExclusionProof(proof)).toBe(true);
  });

  it('deleteBatchIndex removes the file', () => {
    const { leaves } = buildLeaves(4, seedBytes(3));
    writeBatchIndex(tmpDir, 0n, 3n, leaves);
    const filePath = path.join(tmpDir, 'batch_0_3.idx');
    expect(fs.existsSync(filePath)).toBe(true);

    deleteBatchIndex(tmpDir, 0n, 3n);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('deleteBatchIndex is a no-op when file does not exist', () => {
    expect(() => deleteBatchIndex(tmpDir, 99n, 199n)).not.toThrow();
  });

  it('readBatchIndex throws on missing file', () => {
    expect(() => readBatchIndex(tmpDir, 999n, 9999n)).toThrow();
  });
});

// ── Property tests ────────────────────────────────────────────────────────────

describe('Property tests', () => {
  it('all inclusion proofs verify for a 32-leaf tree', () => {
    const memberId = seedBytes(99);
    const { leaves } = buildLeaves(32, memberId);

    for (let i = 0; i < 32; i++) {
      const proof = proveInclusion(leaves, i);
      expect(verifyInclusionProof(proof)).toBe(true);
    }
  });

  it('all inclusion proofs verify for trees of size 1–20', () => {
    const memberId = seedBytes(77);
    for (let n = 1; n <= 20; n++) {
      const { leaves } = buildLeaves(n, memberId);
      for (let i = 0; i < n; i++) {
        const proof = proveInclusion(leaves, i);
        expect(verifyInclusionProof(proof)).toBe(true);
      }
    }
  });

  it('non-member exclusion proof verifies for a 32-record batch', () => {
    const memberId = seedBytes(55);
    const { leaves, encoded } = buildLeaves(32, memberId);
    const root = merkleRootFromLeaves(leaves);
    const idx = { fromSeq: 0n, toSeq: 31n, leaves, root };

    // 'op-NOTEXIST' is definitely not in the batch
    const proof = generateExclusionProof(idx, encoded, memberId, 'op-NOTEXIST');
    expect(proof.memberRecords).toHaveLength(32);
    expect(verifyExclusionProof(proof)).toBe(true);
  });

  it('exclusion proof fails when opId is actually present', () => {
    const memberId = seedBytes(66);
    const { leaves, encoded } = buildLeaves(16, memberId);
    const root = merkleRootFromLeaves(leaves);
    const idx = { fromSeq: 0n, toSeq: 15n, leaves, root };

    // 'op-7' IS in the batch (leaf index 7)
    const proof = generateExclusionProof(idx, encoded, memberId, 'op-7');
    expect(verifyExclusionProof(proof)).toBe(false);
  });

  it('single-bit flip in any leaf invalidates all affected proofs', () => {
    const memberId = seedBytes(33);
    const { leaves } = buildLeaves(8, memberId);

    // Flip one bit in leaf 3
    const corrupted = leaves.map((l, i) => {
      if (i !== 3) return l;
      const c = new Uint8Array(l);
      c[0] ^= 0x01;
      return c;
    });

    // Proof generated from the original tree should fail against corrupted root
    const originalProof = proveInclusion(leaves, 3);
    const corruptedRoot = merkleRootFromLeaves(corrupted);
    const mismatchedProof = {
      ...originalProof,
      root: corruptedRoot,
    };
    expect(verifyInclusionProof(mismatchedProof)).toBe(false);
  });
});
