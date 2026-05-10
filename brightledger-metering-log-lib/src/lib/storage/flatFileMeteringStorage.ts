import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MeteringLogClosedError, MeteringLogLockedError } from '../errors.js';
import type {
  ILogPosition,
  IMeteringLogStorage,
  IStorageEntry,
} from './meteringLogStorage.js';

/** Maximum size of a single log file before rotation (256 MiB). */
export const MAX_LOG_FILE_SIZE = 256 * 1024 * 1024;

/**
 * Number of append calls between automatic fdatasync calls (group commit).
 * A value of 1 means sync every write. Higher values batch syncs for throughput.
 */
export const DEFAULT_GROUP_COMMIT_SIZE = 64;

/** Byte length of the u32-LE length prefix preceding each record payload. */
const LENGTH_PREFIX_SIZE = 4;

/** RegExp matching log file names produced by this implementation. */
const LOG_FILE_PATTERN = /^log\.(\d{6})\.cbor$/;

/** Name of the exclusive writer lock file within the shard directory. */
const LOCK_FILE_NAME = 'writer.lock';

export interface FlatFileMeteringStorageOptions {
  /**
   * Number of append calls between automatic fdatasync calls.
   * Defaults to DEFAULT_GROUP_COMMIT_SIZE (64).
   */
  groupCommitSize?: number;

  /**
   * Maximum file size in bytes before rotating to a new log file.
   * Defaults to MAX_LOG_FILE_SIZE (256 MiB).
   * Override only in tests to avoid writing large amounts of data.
   */
  maxFileSize?: number;
}

/**
 * Flat-file metering log storage back-end.
 *
 * Records are stored as `[u32-LE length][payload bytes]` in sequentially
 * numbered files inside a shard directory:
 *   `<dirPath>/log.000001.cbor`, `log.000002.cbor`, …
 *
 * An exclusive writer lock is held via an `O_EXCL`-created `writer.lock` file
 * for the lifetime of this instance.  A second `FlatFileMeteringStorage.open()`
 * call against the same directory will throw `MeteringLogLockedError`.
 *
 * fsync is called every `groupCommitSize` appends (group-commit) and on every
 * explicit `flush()` or `close()`.
 *
 * Log files are rotated when the current file would exceed MAX_LOG_FILE_SIZE
 * (256 MiB) after appending a new record.
 */
export class FlatFileMeteringStorage implements IMeteringLogStorage {
  private _dirPath: string | null = null;
  private _shardId: GuidV7Uint8Array | null = null;
  private _lockFd: number | null = null;
  private _writeFd: number | null = null;
  private _currentFileSeq = 0;
  private _currentFileSize = 0;
  private _appendsSinceSync = 0;
  private readonly _groupCommitSize: number;
  private readonly _maxFileSize: number;

  constructor(options?: FlatFileMeteringStorageOptions) {
    this._groupCommitSize =
      options?.groupCommitSize ?? DEFAULT_GROUP_COMMIT_SIZE;
    this._maxFileSize = options?.maxFileSize ?? MAX_LOG_FILE_SIZE;
  }

  // ── IMeteringLogStorage ──────────────────────────────────────────────────

  get isOpen(): boolean {
    return this._writeFd !== null;
  }

  get shardId(): GuidV7Uint8Array {
    if (this._shardId === null) {
      throw new MeteringLogClosedError();
    }
    return this._shardId;
  }

  get currentFileSeq(): number {
    return this._currentFileSeq;
  }

  get currentFileSize(): number {
    return this._currentFileSize;
  }

  /**
   * Open the storage for the given shard directory, acquiring an exclusive
   * writer lock.  Creates the directory if it does not exist.
   */
  async open(dirPath: string, shardId: GuidV7Uint8Array): Promise<void> {
    if (this._writeFd !== null) {
      throw new Error('FlatFileMeteringStorage is already open');
    }

    fs.mkdirSync(dirPath, { recursive: true });

    // Acquire exclusive writer lock
    const lockPath = path.join(dirPath, LOCK_FILE_NAME);
    try {
      this._lockFd = fs.openSync(
        lockPath,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
        0o600,
      );
      fs.writeSync(this._lockFd, `${process.pid}\n`);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new MeteringLogLockedError(shardId);
      }
      throw err;
    }

    this._dirPath = dirPath;
    this._shardId = shardId;

    // Find the latest log file (or create the first one)
    const files = this._listLogFiles();
    if (files.length > 0) {
      const last = files[files.length - 1];
      this._currentFileSeq = last.seq;
      const stat = fs.statSync(path.join(dirPath, last.name));
      this._currentFileSize = stat.size;
    } else {
      this._currentFileSeq = 1;
      this._currentFileSize = 0;
    }

    // Open the write fd in append mode
    const writePath = path.join(
      dirPath,
      formatLogFileName(this._currentFileSeq),
    );
    this._writeFd = fs.openSync(
      writePath,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND,
      0o600,
    );
  }

  /** Flush pending writes and release all resources including the write lock. */
  async close(): Promise<void> {
    if (this._writeFd !== null) {
      await this.flush();
      fs.closeSync(this._writeFd);
      this._writeFd = null;
    }

    if (this._lockFd !== null) {
      fs.closeSync(this._lockFd);
      this._lockFd = null;
      if (this._dirPath !== null) {
        try {
          fs.unlinkSync(path.join(this._dirPath, LOCK_FILE_NAME));
        } catch {
          // Best-effort cleanup; ignore errors on lock file removal.
        }
      }
    }

    this._dirPath = null;
    this._shardId = null;
    this._currentFileSeq = 0;
    this._currentFileSize = 0;
    this._appendsSinceSync = 0;
  }

  /**
   * Append a payload to the current log file, preceded by a u32-LE length
   * prefix.  Rotates to a new file if the current file would exceed
   * MAX_LOG_FILE_SIZE.
   */
  async append(payload: Uint8Array): Promise<ILogPosition> {
    if (this._writeFd === null || this._dirPath === null) {
      throw new MeteringLogClosedError();
    }

    const recordSize = LENGTH_PREFIX_SIZE + payload.length;

    // Rotate if the next record would exceed the file size limit.
    // Always allow at least one record even into an empty file.
    if (
      this._currentFileSize > 0 &&
      this._currentFileSize + recordSize > this._maxFileSize
    ) {
      await this._rotate();
    }

    const position: ILogPosition = {
      fileSeq: this._currentFileSeq,
      byteOffset: this._currentFileSize,
    };

    // Write length prefix (u32 LE)
    const prefix = Buffer.allocUnsafe(LENGTH_PREFIX_SIZE);
    prefix.writeUInt32LE(payload.length, 0);
    fs.writeSync(this._writeFd, prefix);
    fs.writeSync(this._writeFd, payload);
    this._currentFileSize += recordSize;

    // Group-commit: fsync every groupCommitSize appends.
    this._appendsSinceSync++;
    if (this._appendsSinceSync >= this._groupCommitSize) {
      fs.fdatasyncSync(this._writeFd);
      this._appendsSinceSync = 0;
    }

    return position;
  }

  /** Flush all pending writes to durable storage. */
  async flush(): Promise<void> {
    if (this._writeFd !== null) {
      fs.fdatasyncSync(this._writeFd);
      this._appendsSinceSync = 0;
    }
  }

  /**
   * Async-iterable scan yielding every *complete* record in log order,
   * optionally starting from the given position.  Partial trailing records
   * are silently omitted.
   */
  async *scan(from?: ILogPosition): AsyncIterable<IStorageEntry> {
    if (this._dirPath === null) {
      throw new MeteringLogClosedError();
    }

    const files = this._listLogFiles();

    for (const file of files) {
      if (from !== undefined && file.seq < from.fileSeq) {
        continue;
      }
      const startOffset =
        from !== undefined && file.seq === from.fileSeq ? from.byteOffset : 0;

      yield* this._scanFile(
        path.join(this._dirPath, file.name),
        file.seq,
        startOffset,
      );
    }
  }

  /**
   * Scan the log and return the byte position of the first incomplete record
   * at the tail, or null if every record is complete.
   */
  async findTruncationPoint(from?: ILogPosition): Promise<ILogPosition | null> {
    if (this._dirPath === null) {
      throw new MeteringLogClosedError();
    }

    const files = this._listLogFiles();

    for (const file of files) {
      if (from !== undefined && file.seq < from.fileSeq) {
        continue;
      }
      const startOffset =
        from !== undefined && file.seq === from.fileSeq ? from.byteOffset : 0;

      const truncAt = findFileTruncationPoint(
        path.join(this._dirPath, file.name),
        startOffset,
      );
      if (truncAt !== null) {
        return { fileSeq: file.seq, byteOffset: truncAt };
      }
    }

    return null;
  }

  /**
   * Truncate the log at the given position.  All bytes at or after the
   * position are discarded.  Files with a higher sequence number are deleted.
   */
  async truncate(position: ILogPosition): Promise<void> {
    if (this._dirPath === null) {
      throw new MeteringLogClosedError();
    }

    const targetPath = path.join(
      this._dirPath,
      formatLogFileName(position.fileSeq),
    );

    // If we are truncating the currently-open file, close the write fd first.
    if (this._currentFileSeq === position.fileSeq && this._writeFd !== null) {
      fs.closeSync(this._writeFd);
      this._writeFd = null;
    }

    // Truncate the target file.
    fs.truncateSync(targetPath, position.byteOffset);

    // Delete any files with a higher sequence number.
    const files = this._listLogFiles();
    for (const file of files) {
      if (file.seq > position.fileSeq) {
        fs.unlinkSync(path.join(this._dirPath, file.name));
      }
    }

    // Re-open the write fd if we closed it.
    this._currentFileSeq = position.fileSeq;
    this._currentFileSize = position.byteOffset;
    this._writeFd = fs.openSync(
      targetPath,
      fs.constants.O_WRONLY | fs.constants.O_APPEND,
      0o600,
    );
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Scan a single log file, yielding complete records from startOffset. */
  private async *_scanFile(
    filePath: string,
    fileSeq: number,
    startOffset: number,
  ): AsyncIterable<IStorageEntry> {
    let fd: number;
    try {
      fd = fs.openSync(filePath, 'r');
    } catch {
      return;
    }

    try {
      let offset = startOffset;

      while (true) {
        const prefixBuf = Buffer.allocUnsafe(LENGTH_PREFIX_SIZE);
        const prefixRead = fs.readSync(
          fd,
          prefixBuf,
          0,
          LENGTH_PREFIX_SIZE,
          offset,
        );

        if (prefixRead === 0) break; // clean EOF
        if (prefixRead < LENGTH_PREFIX_SIZE) break; // partial prefix — stop, not corrupt

        const payloadLen = prefixBuf.readUInt32LE(0);
        const payloadBuf = Buffer.allocUnsafe(payloadLen);
        const payloadRead = fs.readSync(
          fd,
          payloadBuf,
          0,
          payloadLen,
          offset + LENGTH_PREFIX_SIZE,
        );

        if (payloadRead < payloadLen) break; // partial payload — stop

        yield {
          position: { fileSeq, byteOffset: offset },
          payload: new Uint8Array(payloadBuf),
        };

        offset += LENGTH_PREFIX_SIZE + payloadLen;
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  /** Rotate to a new log file. */
  private async _rotate(): Promise<void> {
    if (this._writeFd === null || this._dirPath === null) {
      return;
    }

    fs.fdatasyncSync(this._writeFd);
    fs.closeSync(this._writeFd);

    this._currentFileSeq++;
    this._currentFileSize = 0;
    this._appendsSinceSync = 0;

    const newPath = path.join(
      this._dirPath,
      formatLogFileName(this._currentFileSeq),
    );
    this._writeFd = fs.openSync(
      newPath,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND,
      0o600,
    );
  }

  /** List all log files in this shard directory, sorted by sequence number. */
  private _listLogFiles(): Array<{ seq: number; name: string }> {
    if (this._dirPath === null) {
      return [];
    }
    const entries = fs.readdirSync(this._dirPath);
    const result: Array<{ seq: number; name: string }> = [];
    for (const entry of entries) {
      const match = LOG_FILE_PATTERN.exec(entry);
      if (match) {
        result.push({ seq: parseInt(match[1], 10), name: entry });
      }
    }
    return result.sort((a, b) => a.seq - b.seq);
  }
}

// ── Module-level helpers (also exported for testing) ──────────────────────

/**
 * Format a log file name for the given sequence number.
 * @example formatLogFileName(3) → 'log.000003.cbor'
 */
export function formatLogFileName(seq: number): string {
  return `log.${seq.toString().padStart(6, '0')}.cbor`;
}

/**
 * Scan a single log file and return the byte offset at which the first
 * incomplete (partial) record starts, or null if all records are complete.
 *
 * This is a pure function; it does not modify any files.
 */
export function findFileTruncationPoint(
  filePath: string,
  startOffset = 0,
): number | null {
  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return null;
  }

  try {
    let offset = startOffset;
    const stat = fs.fstatSync(fd);
    const fileSize = stat.size;

    while (offset < fileSize) {
      const partialPrefixStart = offset;

      if (offset + LENGTH_PREFIX_SIZE > fileSize) {
        // Partial length prefix at tail.
        return partialPrefixStart;
      }

      const prefixBuf = Buffer.allocUnsafe(LENGTH_PREFIX_SIZE);
      const prefixRead = fs.readSync(
        fd,
        prefixBuf,
        0,
        LENGTH_PREFIX_SIZE,
        offset,
      );
      if (prefixRead < LENGTH_PREFIX_SIZE) {
        return partialPrefixStart;
      }

      const payloadLen = prefixBuf.readUInt32LE(0);

      if (offset + LENGTH_PREFIX_SIZE + payloadLen > fileSize) {
        // Partial payload at tail.
        return partialPrefixStart;
      }

      offset += LENGTH_PREFIX_SIZE + payloadLen;
    }

    return null; // All records are complete.
  } finally {
    fs.closeSync(fd);
  }
}
