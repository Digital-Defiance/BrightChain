import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';

/**
 * Error thrown when a second writer attempts to open a shard that is already
 * locked by another process.
 */
export class MeteringLogLockedError extends Error {
  public readonly shardId: GuidV7Uint8Array;

  constructor(shardId: GuidV7Uint8Array) {
    super(
      `Metering log shard "${shardId.asShortHexGuid}" is locked by another writer`,
    );
    this.name = 'MeteringLogLockedError';
    this.shardId = shardId;
  }
}

/**
 * Error thrown during crash recovery when a length-prefixed record has a valid
 * length prefix but the payload fails CBOR decode or hash-chain verification.
 */
export class MeteringLogCorruptError extends Error {
  public readonly shardId: GuidV7Uint8Array;
  public readonly fileSeq: number;
  public readonly byteOffset: number;

  constructor(
    shardId: GuidV7Uint8Array,
    fileSeq: number,
    byteOffset: number,
    detail?: string,
  ) {
    super(
      `Metering log shard "${shardId.asShortHexGuid}" is corrupt at file ${fileSeq} offset ${byteOffset}` +
        (detail ? `: ${detail}` : ''),
    );
    this.name = 'MeteringLogCorruptError';
    this.shardId = shardId;
    this.fileSeq = fileSeq;
    this.byteOffset = byteOffset;
  }
}

/**
 * Error thrown when an operation is attempted on a storage instance that has
 * not been opened, or has already been closed.
 */
export class MeteringLogClosedError extends Error {
  constructor() {
    super('Metering log storage is not open');
    this.name = 'MeteringLogClosedError';
  }
}

/**
 * Error thrown when an appendRecord call is made with a (memberId, opId) pair
 * that has already been seen within the current batch window.
 */
export class DuplicateOpIdError extends Error {
  public readonly opId: string;

  constructor(opId: string) {
    super(`Duplicate operation id "${opId}" within batch window`);
    this.name = 'DuplicateOpIdError';
    this.opId = opId;
  }
}

/**
 * Error thrown when a record is appended but the process key certificate has
 * not yet been confirmed by the asset ledger.
 */
export class ProcessKeyNotConfirmedError extends Error {
  constructor(fingerprint: string) {
    super(
      `Process key "${fingerprint}" has not been confirmed in the asset ledger`,
    );
    this.name = 'ProcessKeyNotConfirmedError';
  }
}

/**
 * Error thrown when the current process key has expired (notAfter reached).
 */
export class ProcessKeyExpiredError extends Error {
  constructor(fingerprint: string) {
    super(`Process key "${fingerprint}" has expired; rotation required`);
    this.name = 'ProcessKeyExpiredError';
  }
}

/**
 * Error thrown by asset-ledger validation when a batch's fromSeq does not
 * follow immediately from the previous batch's toSeq.
 */
export class BatchOutOfOrderError extends Error {
  public readonly fromSeq: bigint;
  public readonly expectedFromSeq: bigint;

  constructor(fromSeq: bigint, expectedFromSeq: bigint) {
    super(
      `Batch out of order: fromSeq=${fromSeq} but expected ${expectedFromSeq}`,
    );
    this.name = 'BatchOutOfOrderError';
    this.fromSeq = fromSeq;
    this.expectedFromSeq = expectedFromSeq;
  }
}

/**
 * Error thrown during challenge response validation when the tipHash in a
 * BatchSettlementAction does not match the recomputed hash of the records.
 */
export class BatchTipMismatchError extends Error {
  constructor(shardId: GuidV7Uint8Array, fromSeq: bigint, toSeq: bigint) {
    super(
      `Batch tip hash mismatch for shard "${shardId.asShortHexGuid}" seq ${fromSeq}–${toSeq}`,
    );
    this.name = 'BatchTipMismatchError';
  }
}

/**
 * Error thrown by the inclusion/exclusion proof verifier when the Merkle path
 * does not match the claimed root.
 */
export class MerkleProofInvalidError extends Error {
  constructor(detail?: string) {
    super(`Merkle proof is invalid${detail ? `: ${detail}` : ''}`);
    this.name = 'MerkleProofInvalidError';
  }
}

/**
 * Error thrown when a BatchChallengeAction is submitted after the dispute
 * window for the settlement has closed.
 */
export class DisputeWindowClosedError extends Error {
  public readonly settlementBatchId: string;

  constructor(settlementBatchId: string) {
    super(
      `Dispute window for settlement "${settlementBatchId}" has already closed`,
    );
    this.name = 'DisputeWindowClosedError';
    this.settlementBatchId = settlementBatchId;
  }
}

/**
 * Error thrown during challenge resolution when the shard operator fails to
 * respond within disputeResponseMs.
 */
export class DisputeResponseTimeoutError extends Error {
  public readonly settlementBatchId: string;

  constructor(settlementBatchId: string) {
    super(
      `Operator did not respond to dispute for settlement "${settlementBatchId}" in time`,
    );
    this.name = 'DisputeResponseTimeoutError';
    this.settlementBatchId = settlementBatchId;
  }
}
