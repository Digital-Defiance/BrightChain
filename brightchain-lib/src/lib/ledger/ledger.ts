/**
 * @fileoverview Ledger — append-only blockchain ledger persisted as
 * RawDataBlock instances within any IBlockStore implementation.
 *
 * Each entry is serialized, padded to BlockSize, and stored as a RawDataBlock.
 * A metadata block tracks the chain head, length, ledger ID, and the full
 * sequenceNumber → blockChecksum index for cold-start reconstruction.
 *
 * The metadata block is stored at a deterministic Checksum derived from the
 * ledgerId so that `Ledger.load()` can locate it without external state.
 * Because the metadata content changes on each append while the storage key
 * stays fixed, the metadata block uses a validation-exempt RawDataBlock
 * subclass that allows a caller-specified checksum to differ from the
 * content hash.
 *
 * Governance support: the Ledger enforces role-based access control via an
 * AuthorizedSignerSet. The genesis entry must be a governance genesis payload
 * containing the initial signer set and quorum policy. Subsequent governance
 * entries require admin role and quorum satisfaction.
 *
 * @see Design: Block Chain Ledger — Ledger
 * @see Requirements 5.1–5.6, 6.1–6.6, 7.1–7.5, 10.1–10.4, 11.2–11.4,
 *      12.2–12.8, 13.1–13.9, 14.1–14.7, 15.1–15.5, 17.6–17.9, 18.5–18.7
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { RawDataBlock } from '../blocks/rawData';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { LedgerError, LedgerErrorType } from '../errors/ledgerError';
import { IAuthorizedSigner } from '../interfaces/ledger/authorizedSigner';
import { IBrightTrustPolicy } from '../interfaces/ledger/brightTrustPolicy';
import { IConsistencyProof } from '../interfaces/ledger/consistencyProof';
import { IGovernanceAction } from '../interfaces/ledger/governanceAction';
import { ILedgerEntry } from '../interfaces/ledger/ledgerEntry';
import { ILedgerSigner } from '../interfaces/ledger/ledgerSigner';
import {
  IMerkleProof,
  MerkleDirection,
} from '../interfaces/ledger/merkleProof';
import { IProofVerificationResult } from '../interfaces/ledger/proofVerificationResult';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { ChecksumService } from '../services/checksum.service';
import { Checksum } from '../types/checksum';
import { padToBlockSize, unpadCblData } from '../utils/xorUtils';
import { AuthorizedSignerSet } from './authorizedSignerSet';
import { GovernancePayloadSerializer } from './governancePayloadSerializer';
import { IncrementalMerkleTree } from './incrementalMerkleTree';
import { LedgerEntrySerializer } from './ledgerEntrySerializer';

/** Magic bytes identifying a ledger metadata block: "LMET" in ASCII. */
const METADATA_MAGIC = 0x4c4d4554;
/** Current metadata format version. */
const METADATA_VERSION = 0x0001;
/** SHA3-512 hash length in bytes. */
const HASH_LENGTH = 64;

/**
 * A RawDataBlock subclass that skips checksum validation.
 *
 * Used exclusively for the ledger metadata block, which is stored at a
 * deterministic checksum (derived from the ledgerId) that intentionally
 * differs from the SHA3-512 of its content. The MemoryBlockStore calls
 * `block.validate()` during `setData()`; this subclass makes that a no-op
 * so the block can be stored under the deterministic key.
 *
 * @internal
 */
class LedgerMetadataBlock extends RawDataBlock {
  constructor(blockSize: BlockSize, data: Uint8Array, checksum: Checksum) {
    super(
      blockSize,
      data,
      undefined,
      checksum,
      BlockType.RawData,
      BlockDataType.RawData,
      true,
      true,
    );
  }

  public override validateSync(): void {
    // No-op: metadata block uses a deterministic key, not a content hash.
  }

  public override async validateAsync(): Promise<void> {
    // No-op
  }

  public override validate(): void {
    // No-op
  }
}

/**
 * Append-only blockchain ledger backed by an IBlockStore.
 *
 * Maintains an in-memory index (sequenceNumber → block Checksum) for O(1)
 * lookups and persists a metadata block after each append for cold-start
 * reconstruction via `Ledger.load()`.
 *
 * Enforces role-based access control via an AuthorizedSignerSet when
 * governance is enabled (i.e., when a GovernancePayloadSerializer is provided).
 */
export class Ledger {
  private readonly index: Map<number, Checksum> = new Map();
  private readonly checksumService: ChecksumService = new ChecksumService();
  private merkleTree: IncrementalMerkleTree;
  private _length = 0;
  private _head: Checksum | null = null;
  private _headEntryHash: Checksum | null = null;
  private _authorizedSignerSet: AuthorizedSignerSet | null = null;

  constructor(
    private readonly store: IBlockStore,
    private readonly blockSize: BlockSize,
    private readonly serializer: LedgerEntrySerializer,
    private readonly ledgerId: string,
    private readonly governanceSerializer?: GovernancePayloadSerializer,
  ) {
    this.merkleTree = new IncrementalMerkleTree(this.checksumService);
  }

  // ── Public getters ────────────────────────────────────────────────

  /** Current chain length. */
  get length(): number {
    return this._length;
  }

  /** Head block Checksum (block storage key), or null if empty. */
  get head(): Checksum | null {
    return this._head;
  }

  /** Current quorum policy, or undefined if governance not initialized. */
  get brightTrustPolicy(): IBrightTrustPolicy | undefined {
    return this._authorizedSignerSet?.brightTrustPolicy;
  }

  /**
   * Current Merkle root, or null if the ledger is empty.
   * @see Requirements 9.1, 7.1
   */
  get merkleRoot(): Checksum | null {
    if (this.merkleTree.size === 0) {
      return null;
    }
    return this.merkleTree.root;
  }

  // ── Append ────────────────────────────────────────────────────────

  /**
   * Append a new entry to the ledger.
   * Returns the Checksum of the stored block.
   *
   * If governance is enabled:
   * - Genesis entry (sequenceNumber 0) must be a governance genesis payload.
   * - Subsequent entries require the signer to be authorized (active admin or writer).
   */
  async append(payload: Uint8Array, signer: ILedgerSigner): Promise<Checksum> {
    const sequenceNumber = this._length;

    // Governance: handle genesis entry
    if (sequenceNumber === 0 && this.governanceSerializer) {
      return this.appendGenesisEntry(payload, signer);
    }

    // Governance: check authorization for non-genesis entries
    if (this._authorizedSignerSet) {
      if (!this._authorizedSignerSet.canAppend(signer.publicKey)) {
        throw new LedgerError(
          LedgerErrorType.UnauthorizedSigner,
          'Signer is not authorized to append entries',
        );
      }
    }

    return this.appendInternal(payload, signer);
  }

  /**
   * Append a governance entry. Requires admin role and quorum satisfaction.
   *
   * @param actions - Governance actions to apply
   * @param primarySigner - The primary signer (must be active admin)
   * @param cosigners - Additional signers for quorum (each provides their own signature over the actions)
   */
  async appendGovernance(
    actions: IGovernanceAction[],
    primarySigner: ILedgerSigner,
    cosigners?: { signer: ILedgerSigner; signature: SignatureUint8Array }[],
  ): Promise<Checksum> {
    if (!this.governanceSerializer) {
      throw new LedgerError(
        LedgerErrorType.UnauthorizedGovernance,
        'Governance is not enabled on this ledger',
      );
    }

    if (!this._authorizedSignerSet) {
      throw new LedgerError(
        LedgerErrorType.UnauthorizedGovernance,
        'Authorized signer set not initialized (no genesis entry)',
      );
    }

    // Verify primary signer is active admin
    if (!this._authorizedSignerSet.isActiveAdmin(primarySigner.publicKey)) {
      throw new LedgerError(
        LedgerErrorType.UnauthorizedGovernance,
        'Primary signer is not an active admin',
      );
    }

    // Validate actions speculatively (clone to check safety constraints)
    const speculative = this._authorizedSignerSet.clone();
    for (const action of actions) {
      speculative.applyAction(action); // throws on safety violation
    }

    // Serialize actions for signing
    const actionsForSigning =
      this.governanceSerializer.serializeActionsForSigning(actions);

    // Collect cosignatures
    const cosignatures: {
      signerPublicKey: Uint8Array;
      signature: SignatureUint8Array;
    }[] = [];

    // Primary signer signs the actions
    const primarySignature = primarySigner.sign(actionsForSigning);
    cosignatures.push({
      signerPublicKey: primarySigner.publicKey,
      signature: primarySignature,
    });

    // Add additional cosigner signatures
    if (cosigners) {
      for (const cosigner of cosigners) {
        if (
          !this._authorizedSignerSet.isActiveAdmin(cosigner.signer.publicKey)
        ) {
          throw new LedgerError(
            LedgerErrorType.UnauthorizedGovernance,
            'Cosigner is not an active admin',
          );
        }
        cosignatures.push({
          signerPublicKey: cosigner.signer.publicKey,
          signature: cosigner.signature,
        });
      }
    }

    // Verify quorum
    const signerKeys = cosignatures.map((c) => c.signerPublicKey);
    if (!this._authorizedSignerSet.verifyQuorum(signerKeys)) {
      throw new LedgerError(
        LedgerErrorType.QuorumNotMet,
        `Quorum not met: have ${signerKeys.length} signatures, need ${this._authorizedSignerSet.requiredSignatures}`,
      );
    }

    // Build governance payload
    const governancePayload = this.governanceSerializer.serialize({
      actions,
      cosignatures,
    });

    // Append as regular entry
    const checksum = await this.appendInternal(
      governancePayload,
      primarySigner,
    );

    // Apply governance actions to the live signer set (after successful persistence)
    for (const action of actions) {
      this._authorizedSignerSet.applyAction(action);
    }

    return checksum;
  }

  // ── Signer info ───────────────────────────────────────────────────

  /** Get info about a specific signer. */
  getSignerInfo(publicKey: Uint8Array): IAuthorizedSigner | undefined {
    return this._authorizedSignerSet?.getSigner(publicKey);
  }

  /** Get the full current authorized signer set. */
  getAuthorizedSigners(): IAuthorizedSigner[] {
    return this._authorizedSignerSet?.getAllSigners() ?? [];
  }

  // ── Read operations ───────────────────────────────────────────────

  /**
   * Get entry by sequence number.
   * @throws LedgerError if not found
   */
  async getEntry(sequenceNumber: number): Promise<ILedgerEntry> {
    const blockChecksum = this.index.get(sequenceNumber);
    if (blockChecksum === undefined) {
      throw new LedgerError(
        LedgerErrorType.EntryNotFound,
        `Entry with sequenceNumber ${sequenceNumber} not found`,
      );
    }

    const block = await this.store.getData(blockChecksum);
    const unpadded = unpadCblData(block.data);
    return this.serializer.deserialize(unpadded);
  }

  /**
   * Get entries in range [start, end] inclusive.
   * @throws LedgerError for invalid range
   */
  async getEntries(start: number, end: number): Promise<ILedgerEntry[]> {
    if (start > end) {
      throw new LedgerError(
        LedgerErrorType.InvalidRange,
        `Invalid range: start (${start}) > end (${end})`,
      );
    }
    if (start < 0 || end >= this._length) {
      throw new LedgerError(
        LedgerErrorType.InvalidRange,
        `Range [${start}, ${end}] out of bounds for ledger of length ${this._length}`,
      );
    }

    const entries: ILedgerEntry[] = [];
    for (let i = start; i <= end; i++) {
      entries.push(await this.getEntry(i));
    }
    return entries;
  }

  /**
   * Get the most recent entry, or null if empty.
   */
  async getLatestEntry(): Promise<ILedgerEntry | null> {
    if (this._length === 0) {
      return null;
    }
    return this.getEntry(this._length - 1);
  }

  // ── Merkle proof operations ───────────────────────────────────────

  /**
   * Get an inclusion proof for the entry at the given sequence number.
   *
   * @param sequenceNumber - Zero-based sequence number of the entry
   * @returns An IMerkleProof with the authentication path from leaf to root
   * @throws LedgerError(MerkleProofFailed) if sequenceNumber is out of range
   *
   * @see Requirements 9.2, 18.1
   */
  getInclusionProof(sequenceNumber: number): IMerkleProof {
    if (sequenceNumber < 0 || sequenceNumber >= this._length) {
      throw new LedgerError(
        LedgerErrorType.MerkleProofFailed,
        `Sequence number ${sequenceNumber} is out of range [0, ${this._length})`,
      );
    }
    return this.merkleTree.getInclusionProof(sequenceNumber);
  }

  /**
   * Get a consistency proof between an earlier length and the current length.
   *
   * @param earlierLength - The earlier ledger length M
   * @returns An IConsistencyProof with the intermediate hashes
   * @throws LedgerError(ConsistencyProofFailed) if earlierLength > current length
   *
   * @see Requirements 9.3
   */
  getConsistencyProof(earlierLength: number): IConsistencyProof {
    return this.merkleTree.getConsistencyProof(earlierLength);
  }

  // ── Private: genesis entry handling ───────────────────────────────

  /**
   * Handle the genesis entry for a governance-enabled ledger.
   * The payload must be a governance genesis payload containing the
   * initial signer set and quorum policy.
   */
  private async appendGenesisEntry(
    payload: Uint8Array,
    signer: ILedgerSigner,
  ): Promise<Checksum> {
    if (!this.governanceSerializer) {
      throw new LedgerError(
        LedgerErrorType.UnauthorizedGovernance,
        'Governance serializer not available',
      );
    }

    // Verify payload is a governance genesis payload
    if (!GovernancePayloadSerializer.isGovernancePayload(payload)) {
      throw new LedgerError(
        LedgerErrorType.UnauthorizedGovernance,
        'Genesis entry must be a governance genesis payload (0x01 prefix)',
      );
    }

    // Deserialize to extract genesis data
    const parsed = this.governanceSerializer.deserialize(payload);
    if (!parsed.genesis) {
      throw new LedgerError(
        LedgerErrorType.UnauthorizedGovernance,
        'Genesis entry must use genesis subtype (0x00)',
      );
    }

    // Initialize the authorized signer set
    this._authorizedSignerSet = new AuthorizedSignerSet(
      parsed.genesis.signers as IAuthorizedSigner[],
      parsed.genesis.brightTrustPolicy,
    );

    // Verify the signer is in the initial set and authorized
    if (!this._authorizedSignerSet.canAppend(signer.publicKey)) {
      // Roll back
      this._authorizedSignerSet = null;
      throw new LedgerError(
        LedgerErrorType.UnauthorizedSigner,
        'Genesis signer is not authorized in the initial signer set',
      );
    }

    // Append the genesis entry
    return this.appendInternal(payload, signer);
  }

  // ── Private: core append logic ────────────────────────────────────

  /**
   * Internal append logic shared by regular and governance appends.
   * Does NOT check authorization — callers must do that first.
   */
  private async appendInternal(
    payload: Uint8Array,
    signer: ILedgerSigner,
  ): Promise<Checksum> {
    const sequenceNumber = this._length;
    const previousEntryHash = this._headEntryHash;
    const timestamp = new Date();

    // 1. Compute entryHash
    const partial = {
      sequenceNumber,
      timestamp,
      previousEntryHash,
      signerPublicKey: signer.publicKey,
      payload,
    };
    const entryHash = this.serializer.computeEntryHash(partial);

    // 2. Sign the entryHash
    const signature = signer.sign(entryHash.toUint8Array());

    // 3. Build full entry
    const entry: ILedgerEntry = { ...partial, entryHash, signature };

    // 4. Serialize and pad
    const serialized = this.serializer.serialize(entry);
    const padded = padToBlockSize(serialized, this.blockSize);

    // 5. Create RawDataBlock and store
    const block = new RawDataBlock(
      this.blockSize,
      padded,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      true,
      this.checksumService,
    );
    const blockChecksum = block.idChecksum;

    // Req 5.5: On BlockStore failure, do not update chain head or index.
    await this.store.setData(block);

    // 6. Update in-memory state (only after successful store)
    this.index.set(sequenceNumber, blockChecksum);
    this._length = sequenceNumber + 1;
    this._head = blockChecksum;
    this._headEntryHash = entryHash;

    // 6b. Append entry hash to Merkle tree (Req 2.1, 7.1)
    this.merkleTree.append(entryHash);

    // 7. Persist metadata block
    try {
      await this.persistMetadata();
    } catch {
      // Metadata persistence failure is non-fatal for the append itself;
      // the entry is already stored.
    }

    return blockChecksum;
  }

  // ── Metadata persistence ──────────────────────────────────────────

  /**
   * Compute the deterministic storage key for this ledger's metadata block.
   * The key is SHA3-512("ledger-meta:" + ledgerId).
   */
  private computeMetadataKey(): Checksum {
    return this.checksumService.calculateChecksumForString(
      `ledger-meta:${this.ledgerId}`,
    );
  }

  /**
   * Serialize the current metadata into binary.
   *
   * Format (version 0x0001):
   *   magic           4 bytes  0x4C4D4554 ("LMET")
   *   version         2 bytes  0x0001
   *   ledgerIdLength  4 bytes  uint32 BE
   *   ledgerId        var      UTF-8
   *   length          4 bytes  uint32 BE
   *   hasHead         1 byte   0x00 or 0x01
   *   headChecksum    0|64     SHA3-512 bytes (block checksum of head)
   *   hasMerkleRoot   1 byte   0x00 or 0x01
   *   merkleRoot      0|64     SHA3-512 Merkle root
   *   frontierCount   2 bytes  uint16 BE — number of frontier hashes
   *   frontier        var      frontierCount × 64 bytes SHA3-512 hashes
   *   index entries   var      seqNum (uint32 BE) + blockChecksum (64 bytes)
   *
   * @see Requirements 7.1, 7.3, 8.1, 8.4
   */
  private serializeMetadata(): Uint8Array {
    const encoder = new TextEncoder();
    const ledgerIdBytes = encoder.encode(this.ledgerId);
    const headBytes = this._head ? this._head.toUint8Array() : null;

    // Merkle root: present when tree has leaves
    const hasMerkleRoot = this.merkleTree.size > 0;
    const merkleRootBytes = hasMerkleRoot
      ? this.merkleTree.root.toUint8Array()
      : null;

    // Frontier hashes
    const frontier = this.merkleTree.currentFrontier;
    const frontierCount = frontier.length;

    const indexEntrySize = 4 + HASH_LENGTH;
    const indexSize = this._length * indexEntrySize;

    const size =
      4 + // magic
      2 + // version
      4 + // ledgerIdLength
      ledgerIdBytes.length + // ledgerId
      4 + // length
      1 + // hasHead
      (headBytes ? HASH_LENGTH : 0) + // headChecksum
      1 + // hasMerkleRoot
      (merkleRootBytes ? HASH_LENGTH : 0) + // merkleRoot
      2 + // frontierCount
      frontierCount * HASH_LENGTH + // frontier hashes
      indexSize; // index entries

    const buf = new Uint8Array(size);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let offset = 0;

    view.setUint32(offset, METADATA_MAGIC, false);
    offset += 4;
    view.setUint16(offset, METADATA_VERSION, false);
    offset += 2;
    view.setUint32(offset, ledgerIdBytes.length, false);
    offset += 4;
    buf.set(ledgerIdBytes, offset);
    offset += ledgerIdBytes.length;
    view.setUint32(offset, this._length, false);
    offset += 4;

    if (headBytes) {
      buf[offset] = 0x01;
      offset += 1;
      buf.set(headBytes, offset);
      offset += HASH_LENGTH;
    } else {
      buf[offset] = 0x00;
      offset += 1;
    }

    // Merkle root (Req 7.1)
    if (merkleRootBytes) {
      buf[offset] = 0x01;
      offset += 1;
      buf.set(merkleRootBytes, offset);
      offset += HASH_LENGTH;
    } else {
      buf[offset] = 0x00;
      offset += 1;
    }

    // Frontier (Req 8.1, 8.4)
    view.setUint16(offset, frontierCount, false);
    offset += 2;
    for (const hash of frontier) {
      buf.set(hash.toUint8Array(), offset);
      offset += HASH_LENGTH;
    }

    // Index entries
    for (let i = 0; i < this._length; i++) {
      const checksum = this.index.get(i);
      if (checksum) {
        view.setUint32(offset, i, false);
        offset += 4;
        buf.set(checksum.toUint8Array(), offset);
        offset += HASH_LENGTH;
      }
    }

    return buf;
  }

  /**
   * Persist the metadata block to the store under a deterministic key.
   */
  private async persistMetadata(): Promise<void> {
    const metadataBytes = this.serializeMetadata();
    const padded = padToBlockSize(metadataBytes, this.blockSize);
    const metadataKey = this.computeMetadataKey();

    // Delete old metadata block first (same key, different content)
    try {
      await this.store.deleteData(metadataKey);
    } catch {
      // May not exist yet — that's fine
    }

    const block = new LedgerMetadataBlock(this.blockSize, padded, metadataKey);
    await this.store.setData(block);
  }

  // ── Static proof verification ───────────────────────────────────

  /**
   * Verify an inclusion proof against a Merkle root.
   * Static — no Ledger instance needed. Suitable for light clients.
   *
   * Recomputes hashes from the leaf to the root using the proof path,
   * then compares the result to the provided Merkle root.
   *
   * @param proof - The inclusion proof to verify
   * @param merkleRoot - The expected Merkle root
   * @returns An IProofVerificationResult indicating success or failure
   *
   * @see Requirements 9.4, 4.1, 4.2, 4.3, 4.4, 15.3, 18.3
   */
  static verifyInclusionProof(
    proof: IMerkleProof,
    merkleRoot: Checksum,
  ): IProofVerificationResult {
    // Validate proof structure: path length vs tree size
    if (proof.treeSize === 1) {
      if (proof.path.length !== 0) {
        return {
          isValid: false,
          error: `Malformed proof: treeSize is 1 but path length is ${proof.path.length} (expected 0)`,
        };
      }
    } else if (proof.treeSize > 1) {
      if (proof.path.length === 0) {
        return {
          isValid: false,
          error: `Malformed proof: treeSize is ${proof.treeSize} but path length is 0 (expected > 0)`,
        };
      }
    }

    const checksumService = new ChecksumService();

    let current = proof.leafHash;
    for (const step of proof.path) {
      const currentBytes = current.toUint8Array();
      const stepBytes = step.hash.toUint8Array();
      const combined = new Uint8Array(currentBytes.length + stepBytes.length);

      if (step.direction === MerkleDirection.LEFT) {
        // Sibling is on the left: SHA3-512(sibling || current)
        combined.set(stepBytes, 0);
        combined.set(currentBytes, stepBytes.length);
      } else {
        // Sibling is on the right: SHA3-512(current || sibling)
        combined.set(currentBytes, 0);
        combined.set(stepBytes, currentBytes.length);
      }

      current = checksumService.calculateChecksum(combined);
    }

    if (current.equals(merkleRoot)) {
      return { isValid: true };
    }

    return { isValid: false, error: 'Root mismatch' };
  }

  /**
   * Verify a consistency proof between two Merkle roots.
   * Static — no Ledger instance needed.
   *
   * Implements the RFC 6962 Section 2.1.4 consistency proof verification
   * algorithm. The proof hashes are consumed in order to reconstruct both
   * the earlier and later roots.
   *
   * @param proof - The consistency proof to verify
   * @param earlierRoot - The Merkle root at the earlier length
   * @param laterRoot - The Merkle root at the later length
   * @param earlierLength - The earlier ledger length M
   * @param laterLength - The later ledger length N
   * @returns An IProofVerificationResult indicating success or failure
   *
   * @see Requirements 9.5, 6.1, 6.2, 6.3
   */
  static verifyConsistencyProof(
    proof: IConsistencyProof,
    earlierRoot: Checksum,
    laterRoot: Checksum,
    earlierLength: number,
    laterLength: number,
  ): IProofVerificationResult {
    // Trivial cases: M=0 or M=N
    if (earlierLength === 0) {
      // Empty tree is trivially consistent with any later state
      return { isValid: true };
    }

    if (earlierLength === laterLength) {
      // Same size — roots must match, proof should be empty
      if (earlierRoot.equals(laterRoot)) {
        return { isValid: true };
      }
      return { isValid: false, error: 'Root mismatch for same-size trees' };
    }

    if (earlierLength > laterLength) {
      return {
        isValid: false,
        error: `Earlier length ${earlierLength} exceeds later length ${laterLength}`,
      };
    }

    if (proof.hashes.length === 0) {
      return {
        isValid: false,
        error: 'Empty proof for non-trivial consistency check',
      };
    }

    const checksumService = new ChecksumService();

    // RFC 6962 Section 2.1.4 verification algorithm
    // Walk the decomposition path to determine how proof hashes combine
    // to reconstruct both the earlier and later roots.
    let hashIndex = 0;
    let fn = earlierLength - 1; // last node index in earlier tree
    let sn = laterLength - 1; // last node index in later tree

    // Remove common left-spine: while fn is odd (fn is a right child),
    // shift both down. This finds the position of the old tree's root
    // in the decomposition.
    while (fn % 2 === 1) {
      fn >>>= 1;
      sn >>>= 1;
    }

    // When fn === 0 after the loop, M was a power of 2. In this case,
    // the proof generation omits the old root (startFromOldRoot=true),
    // so the verifier must use earlierRoot as the starting hash.
    let fr: Checksum;
    let sr: Checksum;

    if (fn === 0) {
      // M is a power of 2: old root was omitted from proof
      fr = earlierRoot;
      sr = earlierRoot;
    } else {
      // M is not a power of 2: first proof hash is the old subtree root
      if (hashIndex >= proof.hashes.length) {
        return {
          isValid: false,
          error: 'Proof too short',
        };
      }
      fr = proof.hashes[hashIndex];
      sr = proof.hashes[hashIndex];
      hashIndex++;
    }

    while (sn > 0) {
      if (hashIndex >= proof.hashes.length) {
        return {
          isValid: false,
          error: 'Proof too short',
        };
      }

      const nextHash = proof.hashes[hashIndex];
      hashIndex++;

      if (fn % 2 === 1 || fn === sn) {
        // The next hash is on the left; both fr and sr get it prepended
        fr = Ledger.hashChildren(checksumService, nextHash, fr);
        sr = Ledger.hashChildren(checksumService, nextHash, sr);

        // If fn is odd, keep going up while fn is odd
        while (fn !== 0 && fn % 2 === 1) {
          fn >>>= 1;
          sn >>>= 1;
        }
      } else {
        // The next hash is on the right; only sr gets it appended
        sr = Ledger.hashChildren(checksumService, sr, nextHash);
      }

      fn >>>= 1;
      sn >>>= 1;
    }

    // Verify both reconstructed roots match
    if (!fr.equals(earlierRoot)) {
      return {
        isValid: false,
        error: 'Consistency proof failed: earlier root mismatch',
      };
    }

    if (!sr.equals(laterRoot)) {
      return {
        isValid: false,
        error: 'Consistency proof failed: later root mismatch',
      };
    }

    return { isValid: true };
  }

  /**
   * Hash two child nodes: SHA3-512(left || right).
   * Helper for static verification methods.
   */
  private static hashChildren(
    checksumService: ChecksumService,
    left: Checksum,
    right: Checksum,
  ): Checksum {
    const leftBytes = left.toUint8Array();
    const rightBytes = right.toUint8Array();
    const combined = new Uint8Array(leftBytes.length + rightBytes.length);
    combined.set(leftBytes, 0);
    combined.set(rightBytes, leftBytes.length);
    return checksumService.calculateChecksum(combined);
  }

  // ── Static load ───────────────────────────────────────────────────

  /**
   * Load ledger state from the block store.
   *
   * 1. Compute metadata block key from ledgerId
   * 2. Try to retrieve metadata block from store
   * 3. If not found, return empty ledger
   * 4. Parse metadata to get head checksum, length, and index
   * 5. Restore headEntryHash by reading the head entry
   * 6. Replay governance entries to reconstruct AuthorizedSignerSet
   * 7. Return populated ledger
   */
  static async load(
    store: IBlockStore,
    blockSize: BlockSize,
    serializer: LedgerEntrySerializer,
    ledgerId: string,
    governanceSerializer?: GovernancePayloadSerializer,
  ): Promise<Ledger> {
    const ledger = new Ledger(
      store,
      blockSize,
      serializer,
      ledgerId,
      governanceSerializer,
    );
    const metadataKey = ledger.computeMetadataKey();

    const hasMetadata = await store.has(metadataKey);
    if (!hasMetadata) {
      return ledger; // Empty ledger (Req 7.5)
    }

    let metadataBlock: RawDataBlock;
    try {
      metadataBlock = await store.getData(metadataKey);
    } catch {
      return ledger; // Treat as empty if unreadable
    }

    const metadataBytes = unpadCblData(metadataBlock.data);
    const parsed = Ledger.parseMetadata(metadataBytes);

    if (parsed.length === 0 || parsed.headChecksum === null) {
      return ledger;
    }

    // Populate ledger state
    ledger._length = parsed.length;
    ledger._head = parsed.headChecksum;

    for (const [seqNum, blockChecksum] of parsed.index) {
      ledger.index.set(seqNum, blockChecksum);
    }

    // Restore headEntryHash by reading the head entry
    try {
      const headBlock = await store.getData(parsed.headChecksum);
      const unpadded = unpadCblData(headBlock.data);
      const headEntry = serializer.deserialize(unpadded);
      ledger._headEntryHash = headEntry.entryHash;
    } catch {
      // Degraded state — reads still work via index
    }

    // Replay governance entries to reconstruct AuthorizedSignerSet
    if (governanceSerializer) {
      await ledger.replayGovernance();
    }

    // Restore Merkle tree from persisted frontier or rebuild from leaves
    // @see Requirements 7.2, 8.2, 8.3
    await ledger.restoreMerkleTree(
      parsed.merkleRoot,
      parsed.frontier,
      parsed.length,
      store,
      serializer,
    );

    return ledger;
  }

  /**
   * Replay all entries from genesis to head to reconstruct the
   * AuthorizedSignerSet from governance entries.
   */
  private async replayGovernance(): Promise<void> {
    if (!this.governanceSerializer || this._length === 0) {
      return;
    }

    for (let i = 0; i < this._length; i++) {
      const entry = await this.getEntry(i);

      if (i === 0) {
        // Genesis entry — must be governance genesis
        if (GovernancePayloadSerializer.isGovernancePayload(entry.payload)) {
          const parsed = this.governanceSerializer.deserialize(entry.payload);
          if (parsed.genesis) {
            this._authorizedSignerSet = new AuthorizedSignerSet(
              parsed.genesis.signers as IAuthorizedSigner[],
              parsed.genesis.brightTrustPolicy,
            );
          }
        }
      } else if (
        this._authorizedSignerSet &&
        GovernancePayloadSerializer.isGovernancePayload(entry.payload)
      ) {
        // Governance amendment entry — apply actions
        const parsed = this.governanceSerializer.deserialize(entry.payload);
        for (const action of parsed.actions) {
          this._authorizedSignerSet.applyAction(action);
        }
      }
    }
  }

  /**
   * Restore the Merkle tree during `Ledger.load()`.
   *
   * Strategy:
   * 1. If a Merkle root and frontier are persisted, attempt fast restoration
   *    via `IncrementalMerkleTree.fromFrontier()`. Verify the restored root
   *    matches the persisted root.
   * 2. On mismatch, fall back to full reconstruction from entry hashes.
   * 3. If no Merkle root in metadata, rebuild from all entry hashes.
   *
   * @see Requirements 7.2, 8.2, 8.3
   */
  private async restoreMerkleTree(
    persistedMerkleRoot: Checksum | null,
    persistedFrontier: Checksum[],
    entryCount: number,
    store: IBlockStore,
    serializer: LedgerEntrySerializer,
  ): Promise<void> {
    // Case 1: Frontier-based fast restoration
    if (persistedMerkleRoot !== null && persistedFrontier.length > 0) {
      const restored = IncrementalMerkleTree.fromFrontier(
        persistedFrontier,
        entryCount,
        this.checksumService,
      );

      if (restored.root.equals(persistedMerkleRoot)) {
        // Frontier restoration succeeded — use the restored tree
        this.merkleTree = restored;
        return;
      }

      // Mismatch — fall back to full reconstruction (Req 8.3)
      console.warn(
        `Merkle frontier restoration root mismatch for ledger "${this.ledgerId}". ` +
          `Persisted root does not match frontier-computed root. ` +
          `Falling back to full reconstruction from entry hashes.`,
      );
    }

    // Case 2: No Merkle root in metadata, or frontier mismatch fallback —
    // rebuild from all entry hashes
    if (entryCount > 0) {
      const entryHashes: Checksum[] = [];
      for (let i = 0; i < entryCount; i++) {
        const blockChecksum = this.index.get(i);
        if (blockChecksum === undefined) {
          continue;
        }
        try {
          const block = await store.getData(blockChecksum);
          const unpadded = unpadCblData(block.data);
          const entry = serializer.deserialize(unpadded);
          entryHashes.push(entry.entryHash);
        } catch {
          // Skip unreadable entries — degraded state
        }
      }

      if (entryHashes.length > 0) {
        this.merkleTree = IncrementalMerkleTree.fromLeaves(
          entryHashes,
          this.checksumService,
        );
      }
    }
  }

  /**
   * Parse a metadata block's binary content.
   *
   * Returns the parsed fields including Merkle root and frontier
   * so that `Ledger.load()` can restore the Merkle tree state.
   *
   * @see Requirements 7.2, 7.3, 8.1, 8.4
   */
  private static parseMetadata(data: Uint8Array): {
    ledgerId: string;
    length: number;
    headChecksum: Checksum | null;
    merkleRoot: Checksum | null;
    frontier: Checksum[];
    index: Map<number, Checksum>;
  } {
    if (data.length < 11) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata block too short',
      );
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;

    // magic
    const magic = view.getUint32(offset, false);
    offset += 4;
    if (magic !== METADATA_MAGIC) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        `Invalid metadata magic: expected 0x${METADATA_MAGIC.toString(16)}, got 0x${magic.toString(16)}`,
      );
    }

    // version
    const version = view.getUint16(offset, false);
    offset += 2;
    if (version !== METADATA_VERSION) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        `Unsupported metadata version: ${version}`,
      );
    }

    // ledgerIdLength + ledgerId
    if (offset + 4 > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata ledgerIdLength overflows',
      );
    }
    const ledgerIdLength = view.getUint32(offset, false);
    offset += 4;
    if (offset + ledgerIdLength > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata ledgerId overflows',
      );
    }
    const decoder = new TextDecoder();
    const ledgerId = decoder.decode(
      data.slice(offset, offset + ledgerIdLength),
    );
    offset += ledgerIdLength;

    // length
    if (offset + 4 > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata length field overflows',
      );
    }
    const length = view.getUint32(offset, false);
    offset += 4;

    // hasHead
    if (offset + 1 > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata hasHead field overflows',
      );
    }
    const hasHead = data[offset];
    offset += 1;

    let headChecksum: Checksum | null = null;
    if (hasHead === 0x01) {
      if (offset + HASH_LENGTH > data.length) {
        throw new LedgerError(
          LedgerErrorType.MetadataCorrupted,
          'Metadata headChecksum overflows',
        );
      }
      headChecksum = Checksum.fromUint8Array(
        data.slice(offset, offset + HASH_LENGTH),
      );
      offset += HASH_LENGTH;
    }

    // hasMerkleRoot (Req 7.2)
    let merkleRoot: Checksum | null = null;
    if (offset + 1 > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata hasMerkleRoot field overflows',
      );
    }
    const hasMerkleRoot = data[offset];
    offset += 1;

    if (hasMerkleRoot === 0x01) {
      if (offset + HASH_LENGTH > data.length) {
        throw new LedgerError(
          LedgerErrorType.MetadataCorrupted,
          'Metadata merkleRoot overflows',
        );
      }
      merkleRoot = Checksum.fromUint8Array(
        data.slice(offset, offset + HASH_LENGTH),
      );
      offset += HASH_LENGTH;
    }

    // frontierCount + frontier hashes (Req 8.4)
    const frontier: Checksum[] = [];
    if (offset + 2 > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata frontierCount field overflows',
      );
    }
    const frontierCount = view.getUint16(offset, false);
    offset += 2;

    if (offset + frontierCount * HASH_LENGTH > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata frontier hashes overflow',
      );
    }
    for (let i = 0; i < frontierCount; i++) {
      frontier.push(
        Checksum.fromUint8Array(data.slice(offset, offset + HASH_LENGTH)),
      );
      offset += HASH_LENGTH;
    }

    // Parse index entries: each is seqNum (4) + checksum (64) = 68 bytes
    const index = new Map<number, Checksum>();
    const indexEntrySize = 4 + HASH_LENGTH;
    while (offset + indexEntrySize <= data.length) {
      const seqNum = view.getUint32(offset, false);
      offset += 4;
      const blockChecksum = Checksum.fromUint8Array(
        data.slice(offset, offset + HASH_LENGTH),
      );
      offset += HASH_LENGTH;
      index.set(seqNum, blockChecksum);
    }

    return { ledgerId, length, headChecksum, merkleRoot, frontier, index };
  }
}
