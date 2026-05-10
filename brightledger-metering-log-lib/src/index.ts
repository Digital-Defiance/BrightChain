// Errors
export * from './lib/errors.js';

// Storage interfaces and types
export type {
  ILogPosition,
  IMeteringLogStorage,
  IStorageEntry,
} from './lib/storage/meteringLogStorage.js';

// Storage implementations
export {
  DEFAULT_GROUP_COMMIT_SIZE,
  FlatFileMeteringStorage,
  MAX_LOG_FILE_SIZE,
  findFileTruncationPoint,
  formatLogFileName,
} from './lib/storage/flatFileMeteringStorage.js';

// Phase 2 — Record schema and CBOR encoding
export {
  asBigInt,
  asBytes,
  decodeMeteringRecord,
  encodeMeteringRecord,
} from './lib/record.js';
export type { MeteringRecord } from './lib/record.js';

// Phase 2 — BLAKE3 hash chain
export {
  GENESIS_HASH,
  computeSignMessage,
  hashRecord,
} from './lib/hashChain.js';

// Phase 2 — Ed25519 process key
export {
  deriveFingerprint,
  generateProcessKey,
  signMessage,
  verifySignature,
} from './lib/processKey.js';
export type { IProcessKey } from './lib/processKey.js';

// Phase 2 — Signature sidecar
export {
  SIDECAR_FILE_NAME,
  SidecarWriter,
  decodeSignatureEntry,
  encodeSignatureEntry,
  getSidecarPath,
  readSignatureEntries,
} from './lib/sidecar.js';
export type { ISignatureEntry } from './lib/sidecar.js';

// Phase 2 — Metering log shard
export {
  DEFAULT_SIGNING_CADENCE,
  MAX_SIGNING_CADENCE,
  MIN_SIGNING_CADENCE,
  MeteringLogShard,
} from './lib/meteringLogShard.js';
export type {
  AppendRecordParams,
  AppendRecordResult,
  MeteringLogShardOptions,
} from './lib/meteringLogShard.js';

// Phase 2 — Range verifier
export { toHex, verifyRange } from './lib/verifier.js';
export type { RevocationEntry, VerifiableRecord } from './lib/verifier.js';

// Phase 3 — Process key lifecycle actions
export {
  MAX_PROCESS_KEY_LIFETIME_MS,
  MAX_PROCESS_KEY_LIFETIME_US,
  createProcessKeyCertAction,
  createProcessKeyRevokeAction,
  encodeProcessKeyCertPayload,
  encodeProcessKeyRevokePayload,
} from './lib/processKeyActions.js';
export type {
  ProcessKeyCertAction,
  ProcessKeyRevokeAction,
} from './lib/processKeyActions.js';

// Phase 3 — Process key ledger
export { InMemoryProcessKeyLedger } from './lib/processKeyLedger.js';
export type { IProcessKeyLedger } from './lib/processKeyLedger.js';

// Phase 4 — RFC-9162 Merkle tree
export {
  largestPowerOf2Below,
  merkleInternalHash,
  merkleLeafHash,
  merkleRootFromLeaves,
  proveInclusion,
  verifyExclusionProof,
  verifyInclusionProof,
} from './lib/merkleTree.js';
export type { ExclusionProof, InclusionProof } from './lib/merkleTree.js';

// Phase 4 — Batch Merkle index store
export {
  INDEX_DIR_NAME,
  batchIndexFileName,
  batchIndexPath,
  deleteBatchIndex,
  generateExclusionProof,
  generateInclusionProof,
  readBatchIndex,
  writeBatchIndex,
} from './lib/merkleStore.js';
export type { BatchMerkleIndex } from './lib/merkleStore.js';

// Phase 5 — Batch accumulator
export { BatchAccumulator } from './lib/batchAccumulator.js';
export type { MemberDelta } from './lib/batchAccumulator.js';

// Phase 5 — Batcher & settlement emission
export {
  Batcher,
  DEFAULT_MAX_AGE_MS,
  DEFAULT_MAX_RECORDS,
  SETTLEMENTS_DIR_NAME,
} from './lib/batchSettlement.js';
export type {
  AddRecordResult,
  BatchSettlementAction,
  BatcherOptions,
  DuplicateAddRecordResult,
  IAssetLedgerAdapter,
} from './lib/batchSettlement.js';

// Phase 6 — Dispute / Challenge Path
export {
  DEFAULT_DISPUTE_RESPONSE_MS,
  DEFAULT_DISPUTE_WINDOW_MS,
  DisputeResolver,
} from './lib/disputeChallenge.js';
export type {
  BatchChallengeAction,
  ChallengeResponse,
  DisputeWindowOptions,
  ResolutionResult,
  SettlementStatus,
  ValidationResult,
} from './lib/disputeChallenge.js';

// Phase 7 — Operational Tier Coupling
export { InMemoryAssetAccountStore } from './lib/assetAccountStore.js';
export type { IAssetAccountStore } from './lib/assetAccountStore.js';
export { applyDisputeReversal } from './lib/disputeChallenge.js';

// Phase 8 — Crash Recovery & Performance
export {
  readShardState,
  recoverShard,
  writeShardState,
} from './lib/crashRecovery.js';
export type { ShardRecoveryResult, ShardState } from './lib/crashRecovery.js';
