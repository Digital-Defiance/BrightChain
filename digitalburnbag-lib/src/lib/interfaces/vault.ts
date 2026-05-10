import { VaultState } from '../enumerations/vault-state';

/**
 * The sensitive material inside a Vault: an encryption key and a Recipe.
 * Validates: Requirements 1.5, 4.4
 */
export interface ISecretPayload {
  encryptionKey: Uint8Array;
  recipe: IRecipe;
}

/**
 * Metadata describing how to reconstruct a file from distributed blocks.
 * Validates: Requirements 9.1
 */
export interface IRecipe {
  blockIds: Uint8Array[];
  totalBlockCount: number;
  erasureCoding?: IErasureCodingParams;
}

/**
 * Erasure coding parameters for a Recipe.
 * Validates: Requirements 9.1
 */
export interface IErasureCodingParams {
  dataShards: number;
  parityShards: number;
  shardSize: number;
}

/**
 * All data a Verifier needs to confirm Vault integrity, non-access, or destruction.
 * Validates: Requirements 1.5, 5.5, 6.1, 8.1
 */
export interface IVerificationBundle {
  version: number;
  merkleRoot: Uint8Array; // 64 bytes (SHA3-512)
  accessSeal: Uint8Array; // 64 bytes (HMAC-SHA3-512)
  creatorPublicKey: Uint8Array; // 33 bytes (compressed secp256k1)
  bloomWitness: Uint8Array; // Serialized Bloom filter
  treeDepth: number;
  destructionProof?: IDestructionProof;
}

/**
 * A signed attestation proving secrets were irrecoverably discarded.
 * Validates: Requirements 5.5, 6.1
 */
export interface IDestructionProof {
  treeSeed: Uint8Array; // 32 bytes
  nonce: Uint8Array; // 32 bytes
  timestamp: number; // UTC milliseconds
  signature: Uint8Array; // secp256k1 signature
  creatorPublicKey: Uint8Array; // 33 bytes
}

/**
 * Internal state of a Vault, including encrypted payload and cryptographic metadata.
 * Validates: Requirements 1.5, 11.7, 14.1, 14.5
 */
export interface IVaultInternals {
  encryptedPayload: Uint8Array;
  iv: Uint8Array; // AES-GCM IV (12 bytes)
  authTag: Uint8Array; // AES-GCM auth tag (16 bytes)
  pbkdf2Salt: Uint8Array;
  encryptedTreeSeed: Uint8Array;
  custodialPublicKey: Uint8Array; // 33 bytes
  creationLedgerEntryHash: Uint8Array;
  merkleRoot: Uint8Array; // 64 bytes
  treeDepth: number;
  accessSeal: Uint8Array; // Mutable
  state: VaultState;
}

/**
 * Result of creating a new Vault via VaultFactory.
 * Validates: Requirements 1.5
 */
export interface IVaultCreationResult {
  vault: unknown; // Will be Vault class; use unknown to avoid circular deps
  verificationBundle: IVerificationBundle;
}

/**
 * Result of reading a Vault's Secret_Payload.
 * Validates: Requirements 4.4
 */
export interface IReadResult {
  encryptionKey: Uint8Array;
  recipe: IRecipe;
}

/**
 * A full Merkle commitment tree built from a Tree_Seed.
 * Validates: Requirements 2.6
 */
export interface IMerkleTree {
  root: Uint8Array; // 64 bytes (SHA3-512)
  leaves: Uint8Array[]; // 2^D leaves
  depth: number;
  allNodes(): Uint8Array[];
}

/**
 * An O(log N) authentication path from a leaf to the Merkle root.
 * Validates: Requirements 2.6
 */
export interface IMerkleProof {
  leafValue: Uint8Array;
  leafIndex: number;
  siblings: Uint8Array[];
  directions: boolean[]; // true = sibling is on the right
}

/**
 * Result of verifying a Merkle tree against an expected root.
 * Validates: Requirements 2.6
 */
export interface ITreeVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Result of verifying a Destruction_Proof.
 * Validates: Requirements 6.1
 */
export interface IProofVerificationResult {
  valid: boolean;
  signatureValid: boolean;
  chainValid: boolean;
  timestampValid: boolean;
  sealStatus: 'pristine' | 'accessed' | 'unknown';
  error?: string;
}

/**
 * Result of ledger-based non-access verification.
 * Validates: Requirements 15.3
 */
export interface ILedgerVerificationResult {
  nonAccessConfirmed: boolean;
  sealStatus: 'pristine' | 'accessed' | 'unknown';
  ledgerReadCount: number;
  ledgerKeyReleaseCount: number;
  consistent: boolean;
  error?: string;
}

/**
 * Configuration for VaultFactory.
 * Validates: Requirements 12.2
 */
export interface IVaultFactoryConfig {
  treeDepth: number;
  bloomFalsePositiveRate: number;
  pbkdf2Iterations: number;
}

/**
 * Options for destruction proof verification.
 * Validates: Requirements 6.1
 */
export interface IVerificationOptions {
  timestampToleranceSeconds: number;
}

/**
 * Result of encrypting a Tree_Seed under the Custodian's ECIES public key.
 * Validates: Requirements 14.1, 16.1
 */
export interface ICustodialEncryptionResult {
  encryptedTreeSeed: Uint8Array;
  custodialPublicKey: Uint8Array; // 33 bytes (compressed secp256k1)
}

/**
 * An admin co-signature for custodial key release quorum approval.
 * Validates: Requirements 16.1
 */
export interface IAdminSignature {
  signerPublicKey: Uint8Array;
  signature: Uint8Array;
}

/**
 * Injectable interface for custodial key management.
 * Abstracts key storage and release logic so that different backends
 * (HSM, separate service, threshold scheme, ledger admin quorum) can be plugged in.
 *
 * All implementations MUST record key releases on the Ledger before returning keys.
 * Validates: Requirements 16.1, 16.2, 16.6
 */
export interface ICustodian {
  /**
   * Encrypt a Tree_Seed under the Custodian's ECIES public key.
   * Returns the ECIES-encrypted tree seed and the custodian's public key.
   */
  encryptTreeSeed(treeSeed: Uint8Array): Promise<ICustodialEncryptionResult>;

  /**
   * Request release of the decryption key for a vault's encrypted Tree_Seed.
   * The custodian MUST append a Key_Release_Record to the Ledger before returning.
   * @param creationLedgerEntryHash - identifies the vault
   * @param encryptedTreeSeed - the ECIES-encrypted tree seed to decrypt
   * @param requesterPublicKey - public key of the requesting party (for authorization)
   * @param adminSignatures - co-signatures from admin quorum (for LedgerQuorumCustodian)
   */
  requestKeyRelease(
    creationLedgerEntryHash: Uint8Array,
    encryptedTreeSeed: Uint8Array,
    requesterPublicKey: Uint8Array,
    adminSignatures?: IAdminSignature[],
  ): Promise<Uint8Array>;

  /**
   * Query whether a key release has been recorded on the Ledger for a given vault.
   */
  hasKeyReleaseRecord(creationLedgerEntryHash: Uint8Array): Promise<boolean>;
}
