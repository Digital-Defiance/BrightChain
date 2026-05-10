import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  GuidUint8Array,
  type GuidV7Uint8Array,
} from '@digitaldefiance/ecies-lib';

import { GENESIS_HASH, computeSignMessage, hashRecord } from '../hashChain.js';
import { MeteringLogShard } from '../meteringLogShard.js';
import { generateProcessKey } from '../processKey.js';
import { decodeMeteringRecord, encodeMeteringRecord } from '../record.js';
import { getSidecarPath, readSignatureEntries } from '../sidecar.js';
import { FlatFileMeteringStorage } from '../storage/flatFileMeteringStorage.js';
import type { IStorageEntry } from '../storage/meteringLogStorage.js';
import { toHex, verifyRange, type VerifiableRecord } from '../verifier.js';
// ── Shard ID constants ──────────────────────────────────────────────────────

const TEST_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000001',
) as GuidV7Uint8Array;
const VERIFY_VALID = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000002',
) as GuidV7Uint8Array;
const FORGED_SIG = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000003',
) as GuidV7Uint8Array;
const TAMPERED_CHAIN = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000004',
) as GuidV7Uint8Array;
const UNKNOWN_KEY = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000005',
) as GuidV7Uint8Array;
const BAD_TIP = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000006',
) as GuidV7Uint8Array;
const RECOVERY_TEST = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000007',
) as GuidV7Uint8Array;
const FP_TEST = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000008',
) as GuidV7Uint8Array;
const CLOSE_SIG_TEST = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000009',
) as GuidV7Uint8Array;
// ─── helpers ──────────────────────────────────────────────────────────────────

/** Collect all entries from the shard's scan iterator. */
async function collectScan(shard: MeteringLogShard): Promise<IStorageEntry[]> {
  const entries: IStorageEntry[] = [];
  for await (const entry of shard.scan()) {
    entries.push(entry);
  }
  return entries;
}

/** Build a VerifiableRecord array from raw storage entries. */
function toVerifiable(entries: IStorageEntry[]): VerifiableRecord[] {
  return entries.map((e) => ({
    seq: decodeMeteringRecord(e.payload).seq,
    encodedPayload: e.payload,
  }));
}

/** 32-byte zero buffer used as a placeholder for memberId / contextHash in tests. */
const ZERO_32 = new Uint8Array(32);

/** Append `count` dummy records to `shard`. */
async function appendN(shard: MeteringLogShard, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await shard.appendRecord({
      op: 'test.op',
      memberId: ZERO_32,
      assetId: 'test-asset',
      amount: BigInt(i),
      opId: `op-${i}-${Date.now()}`,
      contextHash: ZERO_32,
    });
  }
}

// ─── fixture factory ──────────────────────────────────────────────────────────

interface Fixture {
  tmpDir: string;
  shardId: GuidV7Uint8Array;
  shard: MeteringLogShard;
  cleanup: () => Promise<void>;
}

/** Create a fresh shard backed by a temp directory with K=16 for fast tests. */
async function createFixture(signingCadence = 16): Promise<Fixture> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
  const shardId = TEST_SHARD;
  const processKey = generateProcessKey();

  const storage = new FlatFileMeteringStorage({
    groupCommitSize: 1,
    maxFileSize: 1024 * 1024,
  });

  const shard = new MeteringLogShard(storage, {
    processKey,
    signingCadence,
  });

  await shard.open(tmpDir, shardId);

  const cleanup = async (): Promise<void> => {
    if (shard.isOpen) {
      await shard.close();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  };

  return { tmpDir, shardId, shard, cleanup };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('MeteringRecord CBOR round-trip', () => {
  it('encodes and decodes a record preserving all fields', () => {
    const processKey = generateProcessKey();
    const record = {
      seq: 0n,
      prev_hash: new Uint8Array(GENESIS_HASH),
      ts: BigInt(Date.now()) * 1000n,
      op: 'joule.charge',
      memberId: new Uint8Array(32).fill(0xab),
      assetId: 'joule',
      amount: -5000n,
      opId: 'idempotency-key-1',
      context_hash: processKey.fingerprint,
    };

    const encoded = encodeMeteringRecord(record);
    const decoded = decodeMeteringRecord(encoded);

    expect(decoded.seq).toBe(0n);
    expect(decoded.op).toBe('joule.charge');
    expect(decoded.assetId).toBe('joule');
    expect(decoded.amount).toBe(-5000n);
    expect(decoded.opId).toBe('idempotency-key-1');
    expect(
      Buffer.from(decoded.prev_hash).equals(Buffer.from(GENESIS_HASH)),
    ).toBe(true);
    expect(
      Buffer.from(decoded.memberId).equals(Buffer.from(record.memberId)),
    ).toBe(true);
    expect(
      Buffer.from(decoded.context_hash).equals(
        Buffer.from(processKey.fingerprint),
      ),
    ).toBe(true);
  });

  it('encodes a large seq (> 2^32) without loss', () => {
    const bigSeq = 5_000_000_000n;
    const record = {
      seq: bigSeq,
      prev_hash: ZERO_32,
      ts: 0n,
      op: 'test',
      memberId: ZERO_32,
      assetId: 'x',
      amount: 0n,
      opId: 'x',
      context_hash: ZERO_32,
    };
    const decoded = decodeMeteringRecord(encodeMeteringRecord(record));
    expect(decoded.seq).toBe(bigSeq);
  });
});

describe('Hash chain — genesis record', () => {
  it('genesis record has zero prev_hash', async () => {
    const { shard, cleanup } = await createFixture();
    try {
      await appendN(shard, 1);
      const entries = await collectScan(shard);
      expect(entries).toHaveLength(1);

      const rec = decodeMeteringRecord(entries[0].payload);
      expect(rec.seq).toBe(0n);
      expect(Buffer.from(rec.prev_hash).equals(Buffer.from(GENESIS_HASH))).toBe(
        true,
      );
    } finally {
      await cleanup();
    }
  });

  it('genesis record context_hash is the process key fingerprint', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
    const processKey = generateProcessKey();
    const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
    const shard = new MeteringLogShard(storage, {
      processKey,
      signingCadence: 64,
    });
    await shard.open(tmpDir, FP_TEST);
    try {
      await shard.appendRecord({
        op: 'init',
        memberId: ZERO_32,
        assetId: 'x',
        amount: 0n,
        opId: 'o0',
        contextHash: new Uint8Array(32).fill(0xff), // should be overridden
      });
      const entries = await collectScan(shard);
      const rec = decodeMeteringRecord(entries[0].payload);
      expect(
        Buffer.from(rec.context_hash).equals(
          Buffer.from(processKey.fingerprint),
        ),
      ).toBe(true);
    } finally {
      await shard.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('Hash chain — chaining integrity', () => {
  it('each record prev_hash equals BLAKE3 of the previous record bytes', async () => {
    const { shard, cleanup } = await createFixture();
    try {
      await appendN(shard, 6);
      const entries = await collectScan(shard);
      expect(entries).toHaveLength(6);

      for (let i = 1; i < entries.length; i++) {
        const expectedPrevHash = hashRecord(entries[i - 1].payload);
        const curr = decodeMeteringRecord(entries[i].payload);
        expect(
          Buffer.from(curr.prev_hash).equals(Buffer.from(expectedPrevHash)),
        ).toBe(true);
      }
    } finally {
      await cleanup();
    }
  });

  it('tipHash on the shard equals hashRecord of the last stored payload', async () => {
    const { shard, cleanup } = await createFixture();
    try {
      await appendN(shard, 5);
      const entries = await collectScan(shard);
      const lastPayload = entries[entries.length - 1].payload;
      const expectedTip = hashRecord(lastPayload);
      expect(Buffer.from(shard.tipHash).equals(Buffer.from(expectedTip))).toBe(
        true,
      );
    } finally {
      await cleanup();
    }
  });
});

describe('Signing cadence', () => {
  it('emits exactly one signature after K records', async () => {
    const K = 16;
    const { tmpDir, shard, cleanup } = await createFixture(K);
    try {
      await appendN(shard, K);
      const sigs = readSignatureEntries(getSidecarPath(tmpDir));
      expect(sigs).toHaveLength(1);
      expect(sigs[0].seq).toBe(BigInt(K - 1));
    } finally {
      await cleanup();
    }
  });

  it('emits two signatures after 2K records', async () => {
    const K = 16;
    const { tmpDir, shard, cleanup } = await createFixture(K);
    try {
      await appendN(shard, 2 * K);
      const sigs = readSignatureEntries(getSidecarPath(tmpDir));
      expect(sigs).toHaveLength(2);
      expect(sigs[0].seq).toBe(BigInt(K - 1));
      expect(sigs[1].seq).toBe(BigInt(2 * K - 1));
    } finally {
      await cleanup();
    }
  });

  it('does not emit a signature before K records', async () => {
    const K = 16;
    const { tmpDir, shard, cleanup } = await createFixture(K);
    try {
      await appendN(shard, K - 1);
      const sigs = readSignatureEntries(getSidecarPath(tmpDir));
      expect(sigs).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it('flush() emits a signature when there are unsigned records', async () => {
    const K = 64;
    const { tmpDir, shard, cleanup } = await createFixture(K);
    try {
      await appendN(shard, 3); // fewer than K
      await shard.flush();
      const sigs = readSignatureEntries(getSidecarPath(tmpDir));
      expect(sigs).toHaveLength(1);
      expect(sigs[0].seq).toBe(2n);
    } finally {
      await cleanup();
    }
  });

  it('close() emits a signature when there are unsigned records', async () => {
    const K = 64;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
    const processKey = generateProcessKey();
    const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
    const shard = new MeteringLogShard(storage, {
      processKey,
      signingCadence: K,
    });
    await shard.open(tmpDir, CLOSE_SIG_TEST);

    await appendN(shard, 3); // fewer than K
    await shard.close(); // should emit signature

    const sigs = readSignatureEntries(getSidecarPath(tmpDir));
    expect(sigs).toHaveLength(1);
    expect(sigs[0].seq).toBe(2n);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('verifyRange — valid chain', () => {
  it('returns true for a valid chain with a covering signature', async () => {
    const K = 16;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
    const processKey = generateProcessKey();
    const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
    const shard = new MeteringLogShard(storage, {
      processKey,
      signingCadence: K,
    });
    const shardId = VERIFY_VALID;
    await shard.open(tmpDir, shardId);

    await appendN(shard, K); // triggers signature at seq=K-1

    const entries = await collectScan(shard);
    const records = toVerifiable(entries);
    const sigs = readSignatureEntries(getSidecarPath(tmpDir));

    const processKeys = new Map<string, Uint8Array>();
    processKeys.set(toHex(processKey.fingerprint), processKey.publicKey);

    await shard.close();

    expect(verifyRange(records, sigs, processKeys, shardId)).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('verifyRange — failure cases', () => {
  it('returns false when records array is empty', () => {
    const processKeys = new Map<string, Uint8Array>();
    expect(verifyRange([], [], processKeys, UNKNOWN_KEY)).toBe(false);
  });

  it('returns false when there is no covering signature', async () => {
    const K = 16;
    const { shardId, shard, cleanup, tmpDir } = await createFixture(K);
    try {
      await appendN(shard, K - 1); // no signature emitted yet

      const entries = await collectScan(shard);
      const records = toVerifiable(entries);
      const sigs = readSignatureEntries(getSidecarPath(tmpDir));

      const processKeys = new Map<string, Uint8Array>();
      // processKeys is empty (no known keys)

      expect(verifyRange(records, sigs, processKeys, shardId)).toBe(false);
    } finally {
      await cleanup();
    }
  });

  it('returns false with a forged (zeroed) signature', async () => {
    const K = 16;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
    const processKey = generateProcessKey();
    const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
    const shard = new MeteringLogShard(storage, {
      processKey,
      signingCadence: K,
    });
    const shardId = FORGED_SIG;
    await shard.open(tmpDir, shardId);

    await appendN(shard, K);

    const entries = await collectScan(shard);
    const records = toVerifiable(entries);
    const realSigs = readSignatureEntries(getSidecarPath(tmpDir));

    // Tamper: replace the signature bytes with zeros.
    const tamperedSigs = realSigs.map((s) => ({
      ...s,
      sig: new Uint8Array(64), // all zeros — invalid Ed25519 sig
    }));

    const processKeys = new Map<string, Uint8Array>();
    processKeys.set(toHex(processKey.fingerprint), processKey.publicKey);

    await shard.close();

    expect(verifyRange(records, tamperedSigs, processKeys, shardId)).toBe(
      false,
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns false when the hash chain is broken (tampered record)', async () => {
    const K = 16;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
    const processKey = generateProcessKey();
    const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
    const shard = new MeteringLogShard(storage, {
      processKey,
      signingCadence: K,
    });
    const shardId = TAMPERED_CHAIN;
    await shard.open(tmpDir, shardId);

    await appendN(shard, K);

    const entries = await collectScan(shard);
    const records = toVerifiable(entries);
    const sigs = readSignatureEntries(getSidecarPath(tmpDir));

    // Tamper: flip a byte in record[1]'s payload.
    const tamperedRecords = records.map((r, i) => {
      if (i !== 1) return r;
      const mutated = new Uint8Array(r.encodedPayload);
      mutated[mutated.length - 1] ^= 0xff; // flip last byte
      return { seq: r.seq, encodedPayload: mutated };
    });

    const processKeys = new Map<string, Uint8Array>();
    processKeys.set(toHex(processKey.fingerprint), processKey.publicKey);

    await shard.close();

    expect(verifyRange(tamperedRecords, sigs, processKeys, shardId)).toBe(
      false,
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns false when the process key is not in the known-keys map', async () => {
    const K = 16;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
    const processKey = generateProcessKey();
    const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
    const shard = new MeteringLogShard(storage, {
      processKey,
      signingCadence: K,
    });
    const shardId = UNKNOWN_KEY;
    await shard.open(tmpDir, shardId);

    await appendN(shard, K);

    const entries = await collectScan(shard);
    const records = toVerifiable(entries);
    const sigs = readSignatureEntries(getSidecarPath(tmpDir));

    // Empty processKeys map — verifier cannot look up the public key.
    const processKeys = new Map<string, Uint8Array>();

    await shard.close();

    expect(verifyRange(records, sigs, processKeys, shardId)).toBe(false);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns false when signature tipHash does not match the actual chain tip', async () => {
    const K = 16;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
    const processKey = generateProcessKey();
    const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
    const shard = new MeteringLogShard(storage, {
      processKey,
      signingCadence: K,
    });
    const shardId = BAD_TIP;
    await shard.open(tmpDir, shardId);

    await appendN(shard, K);

    const entries = await collectScan(shard);
    const records = toVerifiable(entries);
    const realSigs = readSignatureEntries(getSidecarPath(tmpDir));

    // Produce a "fake" signature entry where we re-sign but with a wrong tipHash.
    const wrongTip = new Uint8Array(32).fill(0xde);
    const fakeMessage = computeSignMessage(
      shardId,
      realSigs[0].seq,
      wrongTip,
      processKey.fingerprint,
    );
    const fakeSig = (await import('@noble/curves/ed25519')).ed25519.sign(
      fakeMessage,
      processKey.privateKey,
    );

    const tamperedSigs = [
      {
        ...realSigs[0],
        tipHash: wrongTip,
        sig: fakeSig,
      },
    ];

    const processKeys = new Map<string, Uint8Array>();
    processKeys.set(toHex(processKey.fingerprint), processKey.publicKey);

    await shard.close();

    // verifyRange computes the real tip and compares it to sig.tipHash;
    // since they differ, it should return false.
    expect(verifyRange(records, tamperedSigs, processKeys, shardId)).toBe(
      false,
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('MeteringLogShard — construction validation', () => {
  it('throws RangeError when signingCadence is below MIN', () => {
    const processKey = generateProcessKey();
    const storage = new FlatFileMeteringStorage();
    expect(
      () => new MeteringLogShard(storage, { processKey, signingCadence: 1 }),
    ).toThrow(RangeError);
  });

  it('throws RangeError when signingCadence is above MAX', () => {
    const processKey = generateProcessKey();
    const storage = new FlatFileMeteringStorage();
    expect(
      () => new MeteringLogShard(storage, { processKey, signingCadence: 1000 }),
    ).toThrow(RangeError);
  });
});

describe('MeteringLogShard — state recovery', () => {
  it('reconstructs seq and tipHash from existing records on reopen', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
    const processKey = generateProcessKey();
    const shardId = RECOVERY_TEST;

    // First session: write 3 records.
    const storage1 = new FlatFileMeteringStorage({ groupCommitSize: 1 });
    const shard1 = new MeteringLogShard(storage1, {
      processKey,
      signingCadence: 64,
    });
    await shard1.open(tmpDir, shardId);
    await appendN(shard1, 3);
    const tipAfterWrite = new Uint8Array(shard1.tipHash);
    const seqAfterWrite = shard1.seq;
    await shard1.close();

    // Second session: reopen and verify state.
    const storage2 = new FlatFileMeteringStorage({ groupCommitSize: 1 });
    const shard2 = new MeteringLogShard(storage2, {
      processKey,
      signingCadence: 64,
    });
    await shard2.open(tmpDir, shardId);

    expect(shard2.seq).toBe(seqAfterWrite);
    expect(Buffer.from(shard2.tipHash).equals(Buffer.from(tipAfterWrite))).toBe(
      true,
    );

    await shard2.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
