import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  GuidUint8Array,
  type GuidV7Uint8Array,
} from '@digitaldefiance/ecies-lib';

import { MeteringLogClosedError, MeteringLogLockedError } from '../errors.js';
import {
  findFileTruncationPoint,
  FlatFileMeteringStorage,
  formatLogFileName,
  MAX_LOG_FILE_SIZE,
} from '../storage/flatFileMeteringStorage.js';

// ── Shard ID constants ───────────────────────────────────────────────────────

const PERSIST_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000001',
) as GuidV7Uint8Array;
const SHARD_A = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000002',
) as GuidV7Uint8Array;
const TEST_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000003',
) as GuidV7Uint8Array;
const LOCKED_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000004',
) as GuidV7Uint8Array;
const REOPEN_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000005',
) as GuidV7Uint8Array;
const RT_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000006',
) as GuidV7Uint8Array;
const MANY_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000007',
) as GuidV7Uint8Array;
const EMPTY_PAYLOAD_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000008',
) as GuidV7Uint8Array;
const POS_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000009',
) as GuidV7Uint8Array;
const RESUME_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000a',
) as GuidV7Uint8Array;
const ROTATE_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000b',
) as GuidV7Uint8Array;
const ROTATE_SCAN_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000c',
) as GuidV7Uint8Array;
const MULTI_FILE_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000d',
) as GuidV7Uint8Array;
const INTACT_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000e',
) as GuidV7Uint8Array;
const PARTIAL_PREFIX_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-00000000000f',
) as GuidV7Uint8Array;
const PARTIAL_PAYLOAD_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000010',
) as GuidV7Uint8Array;
const TRUNCATE_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000011',
) as GuidV7Uint8Array;
const TRUNC_SHARD = GuidUint8Array.parse(
  '01234567-0123-7000-8000-000000000012',
) as GuidV7Uint8Array;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a temporary directory that is cleaned up after the test. */
function makeTmpDir(): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metering-test-'));
  return {
    dir,
    cleanup: () => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best effort
      }
    },
  };
}

/** Build a simple test payload of `size` bytes filled with `byte`. */
function makePayload(size: number, byte = 0x42): Uint8Array {
  return new Uint8Array(size).fill(byte);
}

/** Collect all entries from an async iterable into an array. */
async function collectScan(
  storage: FlatFileMeteringStorage,
): Promise<
  Array<{ fileSeq: number; byteOffset: number; payload: Uint8Array }>
> {
  const results: Array<{
    fileSeq: number;
    byteOffset: number;
    payload: Uint8Array;
  }> = [];
  for await (const entry of storage.scan()) {
    results.push({
      fileSeq: entry.position.fileSeq,
      byteOffset: entry.position.byteOffset,
      payload: entry.payload,
    });
  }
  return results;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FlatFileMeteringStorage', () => {
  describe('open / close', () => {
    it('creates the shard directory if it does not exist', async () => {
      const { dir, cleanup } = makeTmpDir();
      const shardDir = path.join(dir, 'shard-a');
      const storage = new FlatFileMeteringStorage();

      try {
        await storage.open(shardDir, SHARD_A);
        expect(fs.existsSync(shardDir)).toBe(true);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('creates a writer.lock file while open', async () => {
      const { dir, cleanup } = makeTmpDir();
      const storage = new FlatFileMeteringStorage();

      try {
        await storage.open(dir, TEST_SHARD);
        expect(fs.existsSync(path.join(dir, 'writer.lock'))).toBe(true);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('removes the writer.lock file on close', async () => {
      const { dir, cleanup } = makeTmpDir();
      const storage = new FlatFileMeteringStorage();

      await storage.open(dir, TEST_SHARD);
      await storage.close();

      expect(fs.existsSync(path.join(dir, 'writer.lock'))).toBe(false);
      cleanup();
    });

    it('reports isOpen correctly', async () => {
      const { dir, cleanup } = makeTmpDir();
      const storage = new FlatFileMeteringStorage();

      expect(storage.isOpen).toBe(false);
      await storage.open(dir, TEST_SHARD);
      expect(storage.isOpen).toBe(true);
      await storage.close();
      expect(storage.isOpen).toBe(false);

      cleanup();
    });
  });

  // ── Lock contention ──────────────────────────────────────────────────────

  describe('exclusive writer lock', () => {
    it('throws MeteringLogLockedError when a second writer opens the same directory', async () => {
      const { dir, cleanup } = makeTmpDir();
      const first = new FlatFileMeteringStorage();
      const second = new FlatFileMeteringStorage();

      try {
        await first.open(dir, LOCKED_SHARD);
        await expect(second.open(dir, LOCKED_SHARD)).rejects.toThrow(
          MeteringLogLockedError,
        );
      } finally {
        await first.close();
        // second was never successfully opened
        cleanup();
      }
    });

    it('allows re-open after the first writer closes', async () => {
      const { dir, cleanup } = makeTmpDir();
      const first = new FlatFileMeteringStorage();
      const second = new FlatFileMeteringStorage();

      try {
        await first.open(dir, REOPEN_SHARD);
        await first.close();
        await expect(second.open(dir, REOPEN_SHARD)).resolves.toBeUndefined();
      } finally {
        await second.close();
        cleanup();
      }
    });
  });

  // ── Append & scan round-trip ─────────────────────────────────────────────

  describe('append / scan round-trip', () => {
    it('round-trips a single small record', async () => {
      const { dir, cleanup } = makeTmpDir();
      const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });

      try {
        await storage.open(dir, RT_SHARD);
        const payload = makePayload(32);
        await storage.append(payload);
        await storage.flush();

        const entries = await collectScan(storage);
        expect(entries).toHaveLength(1);
        expect(entries[0].payload).toEqual(payload);
        expect(entries[0].fileSeq).toBe(1);
        expect(entries[0].byteOffset).toBe(0);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('round-trips many records in order', async () => {
      const { dir, cleanup } = makeTmpDir();
      const storage = new FlatFileMeteringStorage({ groupCommitSize: 10 });

      try {
        await storage.open(dir, MANY_SHARD);

        const payloads = Array.from({ length: 100 }, (_, i) =>
          makePayload(64, i % 256),
        );
        for (const p of payloads) {
          await storage.append(p);
        }
        await storage.flush();

        const entries = await collectScan(storage);
        expect(entries).toHaveLength(100);
        for (let i = 0; i < 100; i++) {
          expect(entries[i].payload).toEqual(payloads[i]);
        }
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('handles an empty payload correctly', async () => {
      const { dir, cleanup } = makeTmpDir();
      const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });

      try {
        await storage.open(dir, EMPTY_PAYLOAD_SHARD);
        await storage.append(new Uint8Array(0));
        await storage.flush();

        const entries = await collectScan(storage);
        expect(entries).toHaveLength(1);
        expect(entries[0].payload.length).toBe(0);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('returns correct positions for successive records', async () => {
      const { dir, cleanup } = makeTmpDir();
      const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });

      try {
        await storage.open(dir, POS_SHARD);

        // Each record: 4 bytes prefix + payloadLen bytes.
        // Record 0 at offset 0, record 1 at offset 4+10=14, record 2 at 14+4+20=38
        const p0 = await storage.append(makePayload(10));
        const p1 = await storage.append(makePayload(20));
        const p2 = await storage.append(makePayload(5));
        await storage.flush();

        expect(p0).toEqual({ fileSeq: 1, byteOffset: 0 });
        expect(p1).toEqual({ fileSeq: 1, byteOffset: 14 }); // 4+10
        expect(p2).toEqual({ fileSeq: 1, byteOffset: 38 }); // 14+4+20
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('resumes scan from a given position', async () => {
      const { dir, cleanup } = makeTmpDir();
      const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });

      try {
        await storage.open(dir, RESUME_SHARD);

        const p0 = makePayload(8, 0xaa);
        const p1 = makePayload(8, 0xbb);
        const p2 = makePayload(8, 0xcc);
        await storage.append(p0);
        const pos1 = await storage.append(p1);
        await storage.append(p2);
        await storage.flush();

        // Scan from position of p1 — should yield p1 and p2 only.
        const results: Uint8Array[] = [];
        for await (const e of storage.scan(pos1)) {
          results.push(e.payload);
        }

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual(p1);
        expect(results[1]).toEqual(p2);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('throws MeteringLogClosedError on append when not open', async () => {
      const storage = new FlatFileMeteringStorage();
      await expect(storage.append(makePayload(4))).rejects.toThrow(
        MeteringLogClosedError,
      );
    });
  });

  // ── Log rotation ─────────────────────────────────────────────────────────

  describe('log file rotation', () => {
    it('rotates to a new file when maxFileSize would be exceeded', async () => {
      const { dir, cleanup } = makeTmpDir();

      // 4 bytes prefix + 50 bytes payload = 54 bytes per record.
      // maxFileSize = 100 bytes: after the first record (54 bytes), the
      // second record (54 bytes) would push total to 108 > 100, so rotation
      // happens before the second record is written.
      const storage = new FlatFileMeteringStorage({
        groupCommitSize: 1,
        maxFileSize: 100,
      });

      try {
        await storage.open(dir, ROTATE_SHARD);

        const p1 = makePayload(50, 0x01);
        const p2 = makePayload(50, 0x02);
        await storage.append(p1);
        await storage.append(p2);
        await storage.flush();

        // Both log files should exist
        expect(fs.existsSync(path.join(dir, 'log.000001.cbor'))).toBe(true);
        expect(fs.existsSync(path.join(dir, 'log.000002.cbor'))).toBe(true);
        expect(storage.currentFileSeq).toBe(2);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('scan returns all records across rotated files in order', async () => {
      const { dir, cleanup } = makeTmpDir();

      const storage = new FlatFileMeteringStorage({
        groupCommitSize: 1,
        maxFileSize: 100,
      });

      try {
        await storage.open(dir, ROTATE_SCAN_SHARD);

        const payloads = Array.from({ length: 5 }, (_, i) =>
          makePayload(50, i + 1),
        );
        for (const p of payloads) {
          await storage.append(p);
        }
        await storage.flush();

        const entries = await collectScan(storage);
        expect(entries).toHaveLength(5);
        for (let i = 0; i < 5; i++) {
          expect(entries[i].payload).toEqual(payloads[i]);
        }
        // All 5 records with 54-byte each, max 100 bytes per file → 5 separate files
        expect(storage.currentFileSeq).toBe(5);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('MAX_LOG_FILE_SIZE constant is 256 MiB', () => {
      expect(MAX_LOG_FILE_SIZE).toBe(256 * 1024 * 1024);
    });

    it('scans across manually-created rotated files', async () => {
      const { dir, cleanup } = makeTmpDir();

      // Manually create two log files and verify scan reads both.
      const file1 = path.join(dir, 'log.000001.cbor');
      const file2 = path.join(dir, 'log.000002.cbor');

      const p1 = makePayload(8, 0x11);
      const p2 = makePayload(8, 0x22);

      function writeRecord(filePath: string, payload: Uint8Array): void {
        const prefix = Buffer.allocUnsafe(4);
        prefix.writeUInt32LE(payload.length, 0);
        const fd = fs.openSync(filePath, 'w');
        fs.writeSync(fd, prefix);
        fs.writeSync(fd, payload);
        fs.closeSync(fd);
      }

      writeRecord(file1, p1);
      writeRecord(file2, p2);

      const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
      try {
        // Open in append mode — storage will pick up the existing file 2.
        await storage.open(dir, MULTI_FILE_SHARD);
        expect(storage.currentFileSeq).toBe(2);

        const entries = await collectScan(storage);
        expect(entries).toHaveLength(2);
        expect(entries[0].fileSeq).toBe(1);
        expect(entries[0].payload).toEqual(p1);
        expect(entries[1].fileSeq).toBe(2);
        expect(entries[1].payload).toEqual(p2);
      } finally {
        await storage.close();
        cleanup();
      }
    });
  });

  // ── Partial-write recovery ───────────────────────────────────────────────

  describe('partial-write recovery (truncation)', () => {
    it('findTruncationPoint returns null for an intact log', async () => {
      const { dir, cleanup } = makeTmpDir();
      const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });

      try {
        await storage.open(dir, INTACT_SHARD);
        await storage.append(makePayload(16));
        await storage.append(makePayload(32));
        await storage.flush();

        const truncAt = await storage.findTruncationPoint();
        expect(truncAt).toBeNull();
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('findTruncationPoint detects a partial length prefix', async () => {
      const { dir, cleanup } = makeTmpDir();

      // Write two complete records, then append 2 bytes of a partial prefix.
      const filePath = path.join(dir, 'log.000001.cbor');
      fs.mkdirSync(dir, { recursive: true });

      const payload = makePayload(8);
      const prefix = Buffer.allocUnsafe(4);
      prefix.writeUInt32LE(payload.length, 0);

      const fd = fs.openSync(filePath, 'w');
      // Two complete records
      fs.writeSync(fd, prefix);
      fs.writeSync(fd, payload);
      fs.writeSync(fd, prefix);
      fs.writeSync(fd, payload);
      // Partial prefix (only 2 bytes)
      fs.writeSync(fd, prefix.subarray(0, 2));
      fs.closeSync(fd);

      const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
      try {
        await storage.open(dir, PARTIAL_PREFIX_SHARD);

        const truncAt = await storage.findTruncationPoint();
        expect(truncAt).not.toBeNull();
        // The partial prefix starts at: 2 * (4 + 8) = 24
        expect(truncAt?.byteOffset).toBe(24);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('findTruncationPoint detects a partial payload', async () => {
      const { dir, cleanup } = makeTmpDir();
      const filePath = path.join(dir, 'log.000001.cbor');
      fs.mkdirSync(dir, { recursive: true });

      const payload = makePayload(16);
      const prefix = Buffer.allocUnsafe(4);
      prefix.writeUInt32LE(payload.length, 0);

      const fd = fs.openSync(filePath, 'w');
      // One complete record
      fs.writeSync(fd, prefix);
      fs.writeSync(fd, payload);
      // One partial: write prefix + only 5 of 16 bytes
      fs.writeSync(fd, prefix);
      fs.writeSync(fd, payload.subarray(0, 5));
      fs.closeSync(fd);

      const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
      try {
        await storage.open(dir, PARTIAL_PAYLOAD_SHARD);

        const truncAt = await storage.findTruncationPoint();
        expect(truncAt).not.toBeNull();
        // Partial record starts at: 4 + 16 = 20
        expect(truncAt?.byteOffset).toBe(20);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    it('truncate removes partial record and allows continued appending', async () => {
      const { dir, cleanup } = makeTmpDir();
      const filePath = path.join(dir, 'log.000001.cbor');
      fs.mkdirSync(dir, { recursive: true });

      const goodPayload = makePayload(8, 0xab);
      const prefix = Buffer.allocUnsafe(4);
      prefix.writeUInt32LE(goodPayload.length, 0);

      const fd = fs.openSync(filePath, 'w');
      // One complete record
      fs.writeSync(fd, prefix);
      fs.writeSync(fd, goodPayload);
      // Partial prefix
      fs.writeSync(fd, prefix.subarray(0, 1));
      fs.closeSync(fd);

      const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
      try {
        await storage.open(dir, TRUNCATE_SHARD);

        const truncAt = await storage.findTruncationPoint();
        expect(truncAt).not.toBeNull();

        if (truncAt) {
          await storage.truncate(truncAt);
        }

        // After truncation only the complete record should be present.
        const entries = await collectScan(storage);
        expect(entries).toHaveLength(1);
        expect(entries[0].payload).toEqual(goodPayload);

        // Should still be able to append.
        const newPayload = makePayload(4, 0xcd);
        await storage.append(newPayload);
        await storage.flush();

        const entries2 = await collectScan(storage);
        expect(entries2).toHaveLength(2);
        expect(entries2[1].payload).toEqual(newPayload);
      } finally {
        await storage.close();
        cleanup();
      }
    });

    /**
     * Requirement 10.3 (Phase 1 coverage): a record truncated at every byte
     * offset from the start of the partial record to the end of the partial
     * record MUST produce a log whose scan yields only the preceding complete
     * records.
     */
    it('recovers correctly when last record is truncated at every byte offset', async () => {
      const { dir: baseDir, cleanup } = makeTmpDir();

      const goodPayload = makePayload(12, 0x01);
      const truncPayload = makePayload(20, 0x02);
      const prefix = Buffer.allocUnsafe(4);

      // Build the "full" bytes of the second record (prefix + payload).
      prefix.writeUInt32LE(truncPayload.length, 0);
      const fullRecord = Buffer.concat([prefix, truncPayload]);

      // For every truncation point within the partial record (0..fullRecord.length-1)
      for (let truncBytes = 0; truncBytes < fullRecord.length; truncBytes++) {
        const shardDir = path.join(baseDir, `trunc-${truncBytes}`);
        fs.mkdirSync(shardDir);

        const filePath = path.join(shardDir, 'log.000001.cbor');
        const goodPrefix = Buffer.allocUnsafe(4);
        goodPrefix.writeUInt32LE(goodPayload.length, 0);

        const wfd = fs.openSync(filePath, 'w');
        fs.writeSync(wfd, goodPrefix);
        fs.writeSync(wfd, goodPayload);
        if (truncBytes > 0) {
          fs.writeSync(wfd, fullRecord.subarray(0, truncBytes));
        }
        fs.closeSync(wfd);

        const storage = new FlatFileMeteringStorage({ groupCommitSize: 1 });
        try {
          await storage.open(shardDir, TRUNC_SHARD);

          const truncAt = await storage.findTruncationPoint();
          if (truncAt !== null) {
            await storage.truncate(truncAt);
          }

          const entries = await collectScan(storage);
          expect(entries).toHaveLength(1);
          expect(entries[0].payload).toEqual(goodPayload);
        } finally {
          await storage.close();
        }
      }

      cleanup();
    });
  });

  // ── Persistence across open/close ────────────────────────────────────────

  describe('persistence', () => {
    it('persists records across close and re-open', async () => {
      const { dir, cleanup } = makeTmpDir();

      const first = new FlatFileMeteringStorage({ groupCommitSize: 1 });
      await first.open(dir, PERSIST_SHARD);
      const p1 = makePayload(8, 0xaa);
      const p2 = makePayload(8, 0xbb);
      await first.append(p1);
      await first.append(p2);
      await first.close();

      const second = new FlatFileMeteringStorage({ groupCommitSize: 1 });
      try {
        await second.open(dir, PERSIST_SHARD);
        const entries = await collectScan(second);
        expect(entries).toHaveLength(2);
        expect(entries[0].payload).toEqual(p1);
        expect(entries[1].payload).toEqual(p2);
      } finally {
        await second.close();
        cleanup();
      }
    });
  });
});

// ── Module-level helpers ─────────────────────────────────────────────────────

describe('formatLogFileName', () => {
  it('pads sequence numbers to 6 digits', () => {
    expect(formatLogFileName(1)).toBe('log.000001.cbor');
    expect(formatLogFileName(42)).toBe('log.000042.cbor');
    expect(formatLogFileName(999999)).toBe('log.999999.cbor');
  });
});

describe('findFileTruncationPoint', () => {
  it('returns null for an empty file', () => {
    const { dir, cleanup } = makeTmpDir();
    const filePath = path.join(dir, 'empty.cbor');
    fs.writeFileSync(filePath, Buffer.alloc(0));
    expect(findFileTruncationPoint(filePath)).toBeNull();
    cleanup();
  });

  it('returns null for a file with exactly one complete record', () => {
    const { dir, cleanup } = makeTmpDir();
    const filePath = path.join(dir, 'one.cbor');
    const payload = makePayload(8);
    const prefix = Buffer.allocUnsafe(4);
    prefix.writeUInt32LE(payload.length, 0);
    const fd = fs.openSync(filePath, 'w');
    fs.writeSync(fd, prefix);
    fs.writeSync(fd, payload);
    fs.closeSync(fd);
    expect(findFileTruncationPoint(filePath)).toBeNull();
    cleanup();
  });

  it('returns 0 when there is only a partial prefix and no complete records', () => {
    const { dir, cleanup } = makeTmpDir();
    const filePath = path.join(dir, 'partial.cbor');
    fs.writeFileSync(filePath, Buffer.from([0x08, 0x00])); // 2-byte partial prefix
    expect(findFileTruncationPoint(filePath)).toBe(0);
    cleanup();
  });
});
