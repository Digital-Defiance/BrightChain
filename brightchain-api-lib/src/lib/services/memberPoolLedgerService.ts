/**
 * @fileoverview Member Pool Ledger Service
 *
 * Manages the audit ledger for the BrightChain member pool.
 * Every write to the member pool (insert, update, delete) produces
 * a corresponding signed, hash-chained ledger entry.
 *
 * The ledger provides:
 * - Tamper-evident history of all pool writes
 * - Non-repudiation (each entry is signed by the writing node)
 * - O(log N) inclusion proofs via Merkle tree
 * - Consistency proofs for cross-node verification
 *
 * @see .kiro/specs/member-pool-security/design.md — Phase 6
 * @see docs/architecture/blockchain-ledger.md
 */

import {
  BlockSize,
  ChecksumService,
  GovernancePayloadSerializer,
  Ledger,
  LedgerEntrySerializer,
  QuorumType,
  SignerRole,
  SignerStatus,
  type IBlockStore,
  type ILedgerSigner,
} from '@brightchain/brightchain-lib';
import { KeyPairLedgerSigner } from './keyPairLedgerSigner';

/** The ledger ID for the member pool audit trail */
export const MEMBER_POOL_LEDGER_ID = 'brightchain:member-pool:ledger';

/**
 * Operation types recorded in ledger entries.
 */
export enum LedgerOperationType {
  Insert = 0x10,
  Update = 0x11,
  Delete = 0x12,
  AclChange = 0x20,
  NodeAdmission = 0x21,
  NodeBan = 0x22,
}

/**
 * Encode a ledger entry payload for a pool write operation.
 * Format: [operationType(1)] [collectionNameLen(2)] [collectionName] [docIdLen(2)] [docId] [headBlockIdLen(2)] [headBlockId]
 */
export function encodeLedgerPayload(
  operationType: LedgerOperationType,
  collectionName: string,
  documentId: string,
  headBlockId?: string,
): Uint8Array {
  const collBytes = new TextEncoder().encode(collectionName);
  const docBytes = new TextEncoder().encode(documentId);
  const headBytes = headBlockId
    ? new TextEncoder().encode(headBlockId)
    : new Uint8Array(0);

  // 0x00 prefix (regular payload) + operation type + fields
  const totalLen =
    1 + 1 + 2 + collBytes.length + 2 + docBytes.length + 2 + headBytes.length;
  const buf = new Uint8Array(totalLen);
  const view = new DataView(buf.buffer);
  let offset = 0;

  buf[offset++] = 0x00; // Regular payload prefix
  buf[offset++] = operationType;
  view.setUint16(offset, collBytes.length);
  offset += 2;
  buf.set(collBytes, offset);
  offset += collBytes.length;
  view.setUint16(offset, docBytes.length);
  offset += 2;
  buf.set(docBytes, offset);
  offset += docBytes.length;
  view.setUint16(offset, headBytes.length);
  offset += 2;
  buf.set(headBytes, offset);

  return buf;
}

/**
 * Member Pool Ledger Service
 *
 * Wraps the Ledger class with member-pool-specific operations.
 * Provides methods to record writes, ACL changes, and node events.
 */
export class MemberPoolLedgerService {
  private ledger: Ledger | null = null;
  private signer: ILedgerSigner | null = null;
  private readonly enabled: boolean;

  constructor(
    private readonly blockStore: IBlockStore,
    private readonly blockSize: BlockSize,
    enabled = true,
  ) {
    this.enabled = enabled;
  }

  /**
   * Initialize the ledger. Creates a new ledger or loads an existing one.
   *
   * @param systemPublicKey - System user's ECDSA public key
   * @param systemPrivateKey - System user's ECDSA private key
   */
  async initialize(
    systemPublicKey: Uint8Array,
    systemPrivateKey: Uint8Array,
  ): Promise<void> {
    if (!this.enabled) return;

    const checksumService = new ChecksumService();
    const serializer = new LedgerEntrySerializer(checksumService);
    const govSerializer = new GovernancePayloadSerializer();

    this.signer = new KeyPairLedgerSigner(systemPublicKey, systemPrivateKey);

    // Try to load existing ledger
    this.ledger = await Ledger.load(
      this.blockStore,
      this.blockSize,
      serializer,
      MEMBER_POOL_LEDGER_ID,
      govSerializer,
    );

    // If empty, create genesis entry with the system user as admin
    if (this.ledger.length === 0) {
      const genesisPayload = govSerializer.serializeGenesis({
        brightTrustPolicy: {
          type: QuorumType.Threshold,
          threshold: 1,
        },
        signers: [
          {
            publicKey: systemPublicKey,
            role: SignerRole.Admin,
            status: SignerStatus.Active,
            metadata: new Map([['type', 'system-user']]),
          },
        ],
      });

      await this.ledger.append(genesisPayload, this.signer);
    }
  }

  /**
   * Record a write operation (insert/update/delete) in the ledger.
   */
  async recordWrite(
    operationType: LedgerOperationType,
    collectionName: string,
    documentId: string,
    headBlockId?: string,
  ): Promise<void> {
    if (!this.enabled || !this.ledger || !this.signer) return;

    const payload = encodeLedgerPayload(
      operationType,
      collectionName,
      documentId,
      headBlockId,
    );

    await this.ledger.append(payload, this.signer);
  }

  /**
   * Record an ACL change in the ledger.
   */
  async recordAclChange(
    description: string,
    nodePublicKeyHex: string,
  ): Promise<void> {
    if (!this.enabled || !this.ledger || !this.signer) return;

    const payload = encodeLedgerPayload(
      LedgerOperationType.AclChange,
      '__pool_security__',
      nodePublicKeyHex,
    );

    await this.ledger.append(payload, this.signer);
  }

  /**
   * Get the current ledger length.
   */
  get length(): number {
    return this.ledger?.length ?? 0;
  }

  /**
   * Get the current Merkle root (hex string), or null if empty.
   */
  get merkleRootHex(): string | null {
    const root = this.ledger?.merkleRoot;
    return root ? root.toHex() : null;
  }

  /**
   * Get the underlying Ledger instance (for advanced operations like proofs).
   */
  getLedger(): Ledger | null {
    return this.ledger;
  }

  /**
   * Whether the ledger is enabled and initialized.
   */
  get isActive(): boolean {
    return this.enabled && this.ledger !== null && this.ledger.length > 0;
  }
}

/**
 * Create a gossip announcement for a ledger entry.
 * Used to propagate ledger entries to peer nodes.
 */
export function createLedgerEntryAnnouncement(
  ledgerId: string,
  sequenceNumber: number,
  entryHash: string,
  signerPublicKey: string,
  nodeId: string,
): import('@brightchain/brightchain-lib').BlockAnnouncement {
  return {
    type: 'ledger_entry',
    blockId: '' as import('@brightchain/brightchain-lib').BlockId,
    nodeId,
    timestamp: new Date(),
    ttl: 5,
    ledgerEntry: {
      ledgerId,
      sequenceNumber,
      entryHash,
      signerPublicKey,
    },
  };
}

/**
 * Handle a received ledger_entry gossip announcement.
 * Verifies the entry is for our ledger and that the sequence number
 * is the expected next entry. If valid, the receiving node should
 * fetch the full entry from the announcing peer and append it locally.
 *
 * @param announcement - The ledger_entry gossip announcement
 * @param localLedgerLength - The local ledger's current length
 * @returns Whether the entry should be fetched and appended
 */
export function shouldFetchLedgerEntry(
  announcement: import('@brightchain/brightchain-lib').BlockAnnouncement,
  localLedgerLength: number,
  expectedLedgerId: string,
): { shouldFetch: boolean; reason?: string } {
  if (announcement.type !== 'ledger_entry' || !announcement.ledgerEntry) {
    return { shouldFetch: false, reason: 'Not a ledger_entry announcement' };
  }

  const entry = announcement.ledgerEntry;

  if (entry.ledgerId !== expectedLedgerId) {
    return { shouldFetch: false, reason: 'Wrong ledger ID' };
  }

  if (entry.sequenceNumber < localLedgerLength) {
    return { shouldFetch: false, reason: 'Already have this entry' };
  }

  if (entry.sequenceNumber > localLedgerLength) {
    // Gap detected — need reconciliation, not just this entry
    return {
      shouldFetch: false,
      reason: `Gap detected: local length ${localLedgerLength}, received seq ${entry.sequenceNumber}`,
    };
  }

  // Sequence number matches — this is the next expected entry
  return { shouldFetch: true };
}

/**
 * Create a consistency proof request for ledger reconciliation.
 * Used during reconciliation to verify that a peer's ledger is
 * a valid extension of our local ledger.
 *
 * @param localLength - Our local ledger length
 * @param localMerkleRoot - Our local Merkle root (hex)
 * @returns An object describing what we need from the peer
 */
export function createLedgerReconciliationRequest(
  localLength: number,
  localMerkleRoot: string | null,
): {
  localLength: number;
  localMerkleRoot: string | null;
  requestType: 'consistency_proof' | 'full_sync';
} {
  if (localLength === 0 || !localMerkleRoot) {
    return {
      localLength,
      localMerkleRoot,
      requestType: 'full_sync',
    };
  }

  return {
    localLength,
    localMerkleRoot,
    requestType: 'consistency_proof',
  };
}
