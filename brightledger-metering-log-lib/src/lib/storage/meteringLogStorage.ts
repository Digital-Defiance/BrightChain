import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';

/**
 * A position within the metering log's flat-file storage.
 * The position encodes both the log file sequence number and the byte offset
 * within that file, allowing callers to resume scans across rotated files.
 */
export interface ILogPosition {
  /** 1-based file sequence number (log.000001.cbor = fileSeq 1). */
  readonly fileSeq: number;
  /** Byte offset within that file at which the record's length-prefix starts. */
  readonly byteOffset: number;
}

/**
 * A single entry yielded by the scan-forward reader.
 */
export interface IStorageEntry {
  /** Position of this record in the log. */
  readonly position: ILogPosition;
  /** The raw payload bytes stored for this record (CBOR or other encoding). */
  readonly payload: Uint8Array;
}

/**
 * Pluggable storage back-end for the metering log.
 *
 * Implementations MUST:
 * - Enforce exclusive write access (only one writer at a time per shard).
 * - Provide append-only writes with length-prefix framing (u32 LE).
 * - Support scan-forward reads that tolerate partially-written tail records.
 * - Support truncation to a given position for crash recovery.
 */
export interface IMeteringLogStorage {
  /** Open the storage back-end for a given shard directory. */
  open(dirPath: string, shardId: GuidV7Uint8Array): Promise<void>;

  /** Flush any pending writes and release all resources. */
  close(): Promise<void>;

  /**
   * Append a payload to the log, preceded by a u32-LE length prefix.
   * Returns the position at which the record was written.
   */
  append(payload: Uint8Array): Promise<ILogPosition>;

  /**
   * Ensure all pending writes have been flushed to durable storage.
   * Group-commit implementations batch fsync calls here.
   */
  flush(): Promise<void>;

  /**
   * Async-iterable scan from an optional start position.
   * Yields every complete record in log order.  Partial trailing records are
   * silently skipped (not yielded), allowing crash-recovery logic above this
   * layer to call truncate() on the truncation point returned by
   * findTruncationPoint().
   */
  scan(from?: ILogPosition): AsyncIterable<IStorageEntry>;

  /**
   * Scan and return the truncation point: the position of the first byte of the
   * first incomplete (partial) record at the tail, or null if the log is intact.
   * Used by crash-recovery to truncate the file cleanly.
   */
  findTruncationPoint(from?: ILogPosition): Promise<ILogPosition | null>;

  /**
   * Truncate the log at the given position.  All data at or after the position
   * is discarded.  Files with a higher sequence number than the target file are
   * deleted.
   */
  truncate(position: ILogPosition): Promise<void>;

  /** Whether the storage is currently open. */
  readonly isOpen: boolean;

  /** Shard identifier (available after open). */
  readonly shardId: GuidV7Uint8Array;

  /** Total bytes written to the current log file. */
  readonly currentFileSize: number;

  /** Current log file sequence number (1-based). */
  readonly currentFileSeq: number;
}
