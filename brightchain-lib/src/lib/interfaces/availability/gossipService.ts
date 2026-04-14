/**
 * @fileoverview Gossip Service Interface
 *
 * Defines the interface for gossip-based block announcements across the network.
 * Enables nodes to announce new blocks and removals to peers, supporting
 * efficient block discovery without polling.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 * @see Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 10.1 (Unified Gossip Delivery)
 */

import type { HexString } from '@digitaldefiance/ecies-lib';
import { ProposalActionType } from '../../enumerations/proposalActionType';
import type { BlockId } from '../branded/primitives/blockId';
import type { ICBLIndexEntry } from '../storage/cblIndex';
import { PoolId, isValidPoolId } from '../storage/pooledBlockStore';

/**
 * Metadata for message delivery via gossip protocol.
 * Attached to 'add' type BlockAnnouncements to indicate the announcement
 * is part of a logical message delivery.
 *
 * @see Requirements 1.2
 */
export interface MessageDeliveryMetadata {
  /** Unique identifier for the message being delivered */
  messageId: string;

  /** IDs of the intended recipients */
  recipientIds: string[];

  /** Delivery priority level affecting fanout and TTL */
  priority: 'normal' | 'high';

  /** Block IDs containing the message content */
  blockIds: BlockId[];

  /** The CBL block ID that serves as the manifest for this delivery */
  cblBlockId: BlockId;

  /** Whether the recipient should send a delivery acknowledgment */
  ackRequired: boolean;

  /**
   * When true, this announcement is intended for the Email Gateway to pick up
   * for outbound SMTP delivery to external recipients. The recipientIds will
   * contain the external email addresses that need SMTP routing.
   *
   * @see Requirement 1.1 — route external recipients to Email Gateway via gossip
   */
  gatewayOutbound?: boolean;
}

/**
 * Metadata for delivery acknowledgment via gossip protocol.
 * Attached to 'ack' type BlockAnnouncements to confirm message receipt.
 *
 * @see Requirements 1.3
 */
export interface DeliveryAckMetadata {
  /** The message ID being acknowledged */
  messageId: string;

  /** The recipient ID sending the acknowledgment */
  recipientId: string;

  /** The delivery status being reported */
  status: 'delivered' | 'read' | 'failed' | 'bounced';

  /** The node ID of the original message sender */
  originalSenderNode: string;
}

/**
 * Metadata for HeadRegistry head pointer update announcements.
 * Attached to 'head_update' type BlockAnnouncements to propagate
 * head pointer changes across nodes.
 *
 * @see Requirements 2.1
 */
export interface HeadUpdateMetadata {
  /** The database name containing the collection */
  dbName: string;

  /** The collection whose head pointer was updated */
  collectionName: string;
}

/**
 * Metadata for pool lifecycle announcements via gossip protocol.
 * Attached to 'pool_announce' type BlockAnnouncements to propagate
 * pool creation/update information across nodes for pool discovery.
 *
 * @see Requirements 8.1, 8.2, 8.4
 */
export interface PoolAnnouncementMetadata {
  /** Number of blocks in the pool */
  blockCount: number;

  /** Total size of the pool in bytes */
  totalSize: number;

  /** Whether the pool has encryption enabled */
  encrypted: boolean;

  /** ECIES-encrypted pool details for authorized members (base64), present when encrypted is true */
  encryptedMetadata?: string;
}

/**
 * Metadata for BrightTrust proposal announcements via gossip protocol.
 * Attached to 'brightTrust_proposal' type BlockAnnouncements to propagate
 * proposal submissions across BrightTrust nodes.
 *
 * @see Requirements 5.2, 5.3
 */
export interface BrightTrustProposalMetadata {
  /** Unique identifier for the proposal */
  proposalId: HexString;

  /** Human-readable description of the proposal (max 4096 chars) */
  description: string;

  /** The type of action this proposal requests */
  actionType: ProposalActionType;

  /** JSON-serialized action payload */
  actionPayload: string;

  /** Member ID of the proposer */
  proposerMemberId: HexString;

  /** Timestamp after which the proposal expires */
  expiresAt: Date;

  /** Number of approve votes required for the proposal to pass */
  requiredThreshold: number;

  /** Optional CBL reference for supporting documentation (e.g., legal orders) */
  attachmentCblId?: BlockId;
}

/**
 * Metadata for BrightTrust vote announcements via gossip protocol.
 * Attached to 'brightTrust_vote' type BlockAnnouncements to propagate
 * vote submissions across BrightTrust nodes.
 *
 * @see Requirements 7.1, 7.2
 */
export interface BrightTrustVoteMetadata {
  /** The proposal ID this vote is for */
  proposalId: HexString;

  /** Member ID of the voter */
  voterMemberId: HexString;

  /** The vote decision */
  decision: 'approve' | 'reject';

  /** Optional comment from the voter (max 1024 chars) */
  comment?: string;

  /** ECIES-encrypted share, encrypted to the proposer's public key. Present only on approve votes. */
  encryptedShare?: Uint8Array;
}

/**
 * Metadata for a pool join request via gossip protocol.
 * Sent by a new node requesting write access to a pool.
 *
 * @see Member Pool Security spec, Phase 2
 */
export interface PoolJoinRequestMetadata {
  /** The pool ID being requested */
  poolId: string;
  /** The requesting node's system user ID */
  requestingNodeId: string;
  /** The requesting node's ECDSA public key (hex-encoded, compressed secp256k1) */
  requestingPublicKey: string;
  /** Optional message from the operator */
  message?: string;
}

/**
 * Metadata for a pool join approval via gossip protocol.
 * Sent by a pool admin after approving a join request.
 *
 * @see Member Pool Security spec, Phase 2
 */
export interface PoolJoinApprovalMetadata {
  /** The pool ID being granted access to */
  poolId: string;
  /** The approved node's system user ID */
  approvedNodeId: string;
  /** The approved node's ECDSA public key (hex-encoded) */
  approvedPublicKey: string;
  /** The admin who approved the request (hex-encoded public key) */
  approverPublicKey: string;
  /** Signature of the updated ACL by the approving admin (hex-encoded) */
  aclSignature: string;
  /** The new ACL version number */
  aclVersion: number;
}

/**
 * Metadata for a pool join denial via gossip protocol.
 * Sent by a pool admin after denying a join request.
 *
 * @see Member Pool Security spec, Phase 2
 */
export interface PoolJoinDenialMetadata {
  /** The pool ID that was requested */
  poolId: string;
  /** The denied node's system user ID */
  deniedNodeId: string;
  /** Optional reason for denial */
  reason?: string;
}

/**
 * Metadata for a ledger entry announcement via gossip protocol.
 * Sent when a new entry is appended to the audit ledger.
 *
 * @see Member Pool Security spec, Phase 6
 */
export interface LedgerEntryMetadata {
  /** The ledger ID this entry belongs to */
  ledgerId: string;
  /** The entry's sequence number in the chain */
  sequenceNumber: number;
  /** The entry's hash (hex-encoded SHA3-512) */
  entryHash: string;
  /** The signer's public key (hex-encoded) */
  signerPublicKey: string;
}

/**
 * Block announcement message sent via gossip protocol.
 * Contains information about a block being added, removed, or acknowledged.
 *
 * @see Requirements 6.1, 6.5
 * @see Requirements 1.1, 1.2, 1.3, 1.5, 1.6
 */
export interface BlockAnnouncement {
  /**
   * Type of announcement:
   * - 'add' for new blocks (may include messageDelivery metadata)
   * - 'remove' for deleted blocks
   * - 'ack' for delivery acknowledgments (must include deliveryAck metadata)
   * - 'pool_deleted' for pool deletion propagation (requires poolId)
   * - 'cbl_index_update' for new/updated CBL index entries (requires cblIndexEntry and poolId)
   * - 'cbl_index_delete' for soft-deleted CBL index entries (requires cblIndexEntry and poolId)
   * - 'head_update' for HeadRegistry head pointer updates (requires headUpdate metadata)
   * - 'acl_update' for approved ACL updates (requires poolId and aclBlockId)
   * - 'pool_announce' for pool creation/update announcements (requires poolId and poolAnnouncement)
   * - 'pool_remove' for pool removal announcements (requires poolId)
   * - 'brightTrust_proposal' for BrightTrust proposal announcements (requires brightTrustProposal metadata)
   * - 'brightTrust_vote' for BrightTrust vote announcements (requires brightTrustVote metadata)
   * - 'pool_join_request' for requesting write access to a pool (requires poolJoinRequest metadata)
   * - 'pool_join_approved' for approving a pool join request (requires poolJoinApproval metadata)
   * - 'pool_join_denied' for denying a pool join request (requires poolJoinDenial metadata)
   *
   * @see Requirements 1.1, 2.1, 5.2, 7.1, 8.1, 8.6, 13.4
   */
  type:
    | 'add'
    | 'remove'
    | 'ack'
    | 'pool_deleted'
    | 'cbl_index_update'
    | 'cbl_index_delete'
    | 'head_update'
    | 'acl_update'
    | 'pool_announce'
    | 'pool_remove'
    | 'brightTrust_proposal'
    | 'brightTrust_vote'
    | 'pool_join_request'
    | 'pool_join_approved'
    | 'pool_join_denied'
    | 'ledger_entry';

  /**
   * The block ID being announced (hex string)
   */
  blockId: BlockId;

  /**
   * The node ID that originated this announcement
   */
  nodeId: string;

  /**
   * Timestamp when the announcement was created
   */
  timestamp: Date;

  /**
   * Time-to-live: number of hops remaining before the announcement expires.
   * Decremented on each forward. Announcements with TTL=0 are not forwarded.
   *
   * @see Requirements 6.4
   */
  ttl: number;

  /**
   * Optional message delivery metadata. Only allowed on 'add' type announcements.
   *
   * @see Requirements 1.2, 1.5
   */
  messageDelivery?: MessageDeliveryMetadata;

  /**
   * Optional delivery acknowledgment metadata. Only allowed on 'ack' type announcements.
   *
   * @see Requirements 1.3, 1.6
   */
  deliveryAck?: DeliveryAckMetadata;

  /**
   * Optional pool ID for pool-scoped announcements.
   * Required for 'pool_deleted', 'cbl_index_update', and 'cbl_index_delete' types.
   * Optional for 'add' and 'remove' types.
   *
   * @see Requirements 1.5, 1.6, 2.1, 8.1, 8.6
   */
  poolId?: PoolId;

  /**
   * Optional CBL index entry data for CBL index synchronization.
   * Required for 'cbl_index_update' and 'cbl_index_delete' types.
   * Contains the entry being announced (update) or the entry being soft-deleted (delete).
   *
   * @see Requirements 8.1, 8.6
   */
  cblIndexEntry?: ICBLIndexEntry;

  /**
   * Optional HeadRegistry update metadata for head pointer synchronization.
   * Required for 'head_update' type announcements.
   * The blockId field carries the new head block ID.
   *
   * @see Requirements 2.1
   */
  headUpdate?: HeadUpdateMetadata;

  /**
   * Optional ACL block ID for ACL update propagation.
   * Required for 'acl_update' type announcements.
   * Contains the block ID of the approved ACL document in the block store.
   *
   * @see Requirements 13.4
   */
  aclBlockId?: BlockId;

  /**
   * Optional pool announcement metadata for pool lifecycle gossip.
   * Required for 'pool_announce' type announcements.
   * Contains pool metadata (block count, size, encryption status) for discovery.
   *
   * @see Requirements 8.1, 8.2, 8.4
   */
  poolAnnouncement?: PoolAnnouncementMetadata;

  /**
   * Optional BrightTrust proposal metadata for BrightTrust proposal gossip.
   * Required for 'brightTrust_proposal' type announcements.
   * Contains the full proposal details for BrightTrust voting.
   *
   * @see Requirements 5.2, 5.3
   */
  brightTrustProposal?: BrightTrustProposalMetadata;

  /**
   * Optional BrightTrust vote metadata for BrightTrust vote gossip.
   * Required for 'brightTrust_vote' type announcements.
   * Contains the vote decision and optional encrypted share.
   *
   * @see Requirements 7.1, 7.2
   */
  brightTrustVote?: BrightTrustVoteMetadata;

  /**
   * Optional pool join request metadata.
   * Required for 'pool_join_request' type announcements.
   *
   * @see Member Pool Security spec, Phase 2
   */
  poolJoinRequest?: PoolJoinRequestMetadata;

  /**
   * Optional pool join approval metadata.
   * Required for 'pool_join_approved' type announcements.
   *
   * @see Member Pool Security spec, Phase 2
   */
  poolJoinApproval?: PoolJoinApprovalMetadata;

  /**
   * Optional pool join denial metadata.
   * Required for 'pool_join_denied' type announcements.
   *
   * @see Member Pool Security spec, Phase 2
   */
  poolJoinDenial?: PoolJoinDenialMetadata;

  /**
   * Optional ledger entry metadata for audit ledger synchronization.
   * Required for 'ledger_entry' type announcements.
   *
   * @see Member Pool Security spec, Phase 6
   */
  ledgerEntry?: LedgerEntryMetadata;

  /**
   * Optional write proof for head_update announcements in Restricted_Mode.
   * Contains the original writer's signature for cross-node verification.
   * When propagating head updates for collections with Write ACLs, the
   * originating node includes the writer's proof so receiving nodes can
   * verify authorization before applying the head update.
   *
   * @see Write ACL Requirements 7.1, 7.2
   */
  writeProof?: {
    signerPublicKey: string; // hex-encoded
    signature: string; // hex-encoded
    dbName: string;
    collectionName: string;
    blockId: string;
    nonce: number;
  };
}

/**
 * Configuration for priority-based gossip propagation.
 * Defines fanout and TTL values for a specific priority level.
 *
 * @see Requirements 10.1
 */
export interface PriorityGossipConfig {
  /** Number of peers to forward announcements to */
  fanout: number;

  /** Time-to-live: number of hops for announcements */
  ttl: number;
}

/**
 * Configuration for the gossip protocol.
 *
 * @see Requirements 6.3, 6.4, 6.6, 10.1
 */
export interface GossipConfig {
  /**
   * Number of peers to forward announcements to (fanout).
   * Higher values increase propagation speed but also network traffic.
   * This is the default fanout for block-level announcements.
   *
   * @see Requirements 6.3
   */
  fanout: number;

  /**
   * Initial TTL for new announcements.
   * Controls how far announcements propagate through the network.
   * This is the default TTL for block-level announcements.
   *
   * @see Requirements 6.4
   */
  defaultTtl: number;

  /**
   * Interval in milliseconds between batch flushes.
   * Announcements are batched within this interval to reduce network overhead.
   *
   * @see Requirements 6.6
   */
  batchIntervalMs: number;

  /**
   * Maximum number of announcements per batch.
   * Prevents batches from growing too large.
   *
   * @see Requirements 6.6
   */
  maxBatchSize: number;

  /**
   * Priority-based overrides for message delivery.
   * Defines fanout and TTL values for normal and high priority messages.
   *
   * @see Requirements 10.1
   */
  messagePriority: {
    normal: PriorityGossipConfig;
    high: PriorityGossipConfig;
  };
}

/**
 * Default gossip configuration values.
 *
 * @see Requirements 10.1
 */
export const DEFAULT_GOSSIP_CONFIG: GossipConfig = {
  fanout: 3,
  defaultTtl: 3,
  batchIntervalMs: 1000,
  maxBatchSize: 100,
  messagePriority: {
    normal: { fanout: 5, ttl: 5 },
    high: { fanout: 7, ttl: 7 },
  },
};

/**
 * Handler function type for announcement events.
 */
export type AnnouncementHandler = (announcement: BlockAnnouncement) => void;

/**
 * Gossip Service Interface
 *
 * Handles gossip-based block announcements across the network.
 * Supports announcing new blocks and removals, handling incoming announcements,
 * and batching announcements for efficient network usage.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export interface IGossipService {
  /**
   * Announce a new block to the network.
   * The announcement will be batched and sent to a random subset of peers.
   *
   * @param blockId - The block ID to announce
   * @param poolId - Optional pool the block belongs to
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 6.1, 1.1, 6.3
   */
  announceBlock(blockId: BlockId, poolId?: PoolId): Promise<void>;

  /**
   * Announce block removal to the network.
   * The announcement will be batched and sent to a random subset of peers.
   *
   * @param blockId - The block ID being removed
   * @param poolId - Optional pool the block belonged to
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 6.5, 2.2
   */
  announceRemoval(blockId: BlockId, poolId?: PoolId): Promise<void>;

  /**
   * Announce that a pool has been deleted.
   * Creates a pool_deleted announcement propagated as a tombstone.
   *
   * @param poolId - The pool that was deleted
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 2.2, 6.3
   */
  announcePoolDeletion(poolId: PoolId): Promise<void>;

  /**
   * Announce a new or updated CBL index entry to peers in the same pool.
   * Creates a cbl_index_update announcement scoped to the entry's pool.
   *
   * @param entry - The CBL index entry being announced
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 8.1
   */
  announceCBLIndexUpdate(entry: ICBLIndexEntry): Promise<void>;

  /**
   * Announce a soft-deleted CBL index entry to peers in the same pool.
   * Creates a cbl_index_delete announcement so peers also mark the entry as deleted.
   *
   * @param entry - The CBL index entry that was soft-deleted (with deletedAt set)
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 8.6
   */
  announceCBLIndexDelete(entry: ICBLIndexEntry): Promise<void>;

  /**
   * Announce a HeadRegistry head pointer update to peer nodes.
   * Creates a head_update announcement with the database name, collection name,
   * and new head block ID.
   *
   * @param dbName - The database name containing the collection
   * @param collectionName - The collection whose head pointer was updated
   * @param blockId - The new head block ID
   * @param writeProof - Optional write proof to include for cross-node verification in Restricted_Mode
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 2.1, 7.1, 7.2
   */
  announceHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: BlockId,
    writeProof?: {
      signerPublicKey: string;
      signature: string;
    },
  ): Promise<void>;

  /**
   * Announce an approved ACL update to peers in the same pool.
   * Creates an acl_update announcement with the pool ID and the block ID
   * of the signed ACL document stored in the block store.
   *
   * @param poolId - The pool whose ACL was updated
   * @param aclBlockId - The block ID of the approved ACL document
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 13.4
   */
  announceACLUpdate(poolId: string, aclBlockId: BlockId): Promise<void>;

  /**
   * Handle an incoming block announcement from a peer.
   * Updates local location metadata and optionally forwards the announcement.
   *
   * @param announcement - The received announcement
   * @returns Promise that resolves when the announcement is processed
   * @see Requirements 6.2, 6.4
   */
  handleAnnouncement(announcement: BlockAnnouncement): Promise<void>;

  /**
   * Subscribe to announcement events.
   * The handler will be called for each announcement received from peers.
   *
   * @param handler - Function to call when an announcement is received
   * @see Requirements 6.2
   */
  onAnnouncement(handler: AnnouncementHandler): void;

  /**
   * Remove an announcement handler.
   *
   * @param handler - The handler to remove
   */
  offAnnouncement(handler: AnnouncementHandler): void;

  /**
   * Get pending announcements that have not yet been sent.
   * Useful for inspection and testing.
   *
   * @returns Array of pending announcements
   * @see Requirements 6.6
   */
  getPendingAnnouncements(): BlockAnnouncement[];

  /**
   * Immediately flush all pending announcements.
   * Sends batched announcements to peers without waiting for the batch interval.
   *
   * @returns Promise that resolves when all announcements are sent
   * @see Requirements 6.6
   */
  flushAnnouncements(): Promise<void>;

  /**
   * Start the gossip service (begins batch timer).
   */
  start(): void;

  /**
   * Stop the gossip service (stops batch timer and flushes pending).
   */
  stop(): Promise<void>;

  /**
   * Get the current configuration.
   *
   * @returns The gossip configuration
   */
  getConfig(): GossipConfig;

  /**
   * Announce message blocks to the network with message delivery metadata.
   * Creates BlockAnnouncements with messageDelivery metadata, applies
   * priority-based fanout/TTL from config, and queues for batch sending.
   *
   * @param blockIds - The block IDs containing the message content
   * @param metadata - Message delivery metadata including recipients, priority, and CBL block ID
   * @returns Promise that resolves when the announcements are queued
   * @see Requirements 3.1 (message-aware gossip delivery)
   */
  announceMessage(
    blockIds: BlockId[],
    metadata: MessageDeliveryMetadata,
  ): Promise<void>;

  /**
   * Send a delivery acknowledgment back through the gossip network.
   * Creates a BlockAnnouncement of type 'ack' with deliveryAck metadata
   * and queues it for propagation.
   *
   * @param ack - Delivery acknowledgment metadata including messageId, recipientId, status, and originalSenderNode
   * @returns Promise that resolves when the ack announcement is queued
   * @see Requirements 4.1 (delivery acknowledgment via gossip)
   */
  sendDeliveryAck(ack: DeliveryAckMetadata): Promise<void>;

  /**
   * Register a handler for message delivery events.
   * The handler is called when a BlockAnnouncement with messageDelivery
   * metadata is received and the recipientIds match local users.
   *
   * @param handler - Function to call when a message delivery announcement is received
   * @see Requirements 3.4, 3.5 (message receipt handling)
   */
  onMessageDelivery(handler: (announcement: BlockAnnouncement) => void): void;

  /**
   * Remove a message delivery event handler.
   *
   * @param handler - The handler to remove
   * @see Requirements 3.4, 3.5 (message receipt handling)
   */
  offMessageDelivery(handler: (announcement: BlockAnnouncement) => void): void;

  /**
   * Register a handler for delivery acknowledgment events.
   * The handler is called when a BlockAnnouncement of type 'ack' with
   * deliveryAck metadata is received at the original sender node.
   *
   * @param handler - Function to call when a delivery ack announcement is received
   * @see Requirements 4.1 (delivery acknowledgment via gossip)
   */
  onDeliveryAck(handler: (announcement: BlockAnnouncement) => void): void;

  /**
   * Remove a delivery acknowledgment event handler.
   *
   * @param handler - The handler to remove
   * @see Requirements 4.1 (delivery acknowledgment via gossip)
   */
  offDeliveryAck(handler: (announcement: BlockAnnouncement) => void): void;

  /**
   * Announce a BrightTrust proposal to the network via priority gossip.
   * Creates a BlockAnnouncement of type 'brightTrust_proposal' with the proposal metadata
   * and queues it for propagation using high-priority fanout/TTL.
   *
   * @param metadata - The BrightTrust proposal metadata to announce
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 5.2, 5.3
   */
  announceBrightTrustProposal(
    metadata: BrightTrustProposalMetadata,
  ): Promise<void>;

  /**
   * Announce a BrightTrust vote to the network via priority gossip.
   * Creates a BlockAnnouncement of type 'brightTrust_vote' with the vote metadata
   * and queues it for propagation using high-priority fanout/TTL.
   *
   * @param metadata - The BrightTrust vote metadata to announce
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 7.1, 7.2
   */
  announceBrightTrustVote(metadata: BrightTrustVoteMetadata): Promise<void>;

  /**
   * Register a handler for BrightTrust proposal events.
   * The handler is called when a BlockAnnouncement of type 'brightTrust_proposal'
   * with brightTrustProposal metadata is received.
   *
   * @param handler - Function to call when a BrightTrust proposal announcement is received
   * @see Requirements 5.5
   */
  onBrightTrustProposal(
    handler: (announcement: BlockAnnouncement) => void,
  ): void;

  /**
   * Remove a BrightTrust proposal event handler.
   *
   * @param handler - The handler to remove
   */
  offBrightTrustProposal(
    handler: (announcement: BlockAnnouncement) => void,
  ): void;

  /**
   * Register a handler for BrightTrust vote events.
   * The handler is called when a BlockAnnouncement of type 'brightTrust_vote'
   * with brightTrustVote metadata is received.
   *
   * @param handler - Function to call when a BrightTrust vote announcement is received
   * @see Requirements 7.3
   */
  onBrightTrustVote(handler: (announcement: BlockAnnouncement) => void): void;

  /**
   * Remove a BrightTrust vote event handler.
   *
   * @param handler - The handler to remove
   */
  offBrightTrustVote(handler: (announcement: BlockAnnouncement) => void): void;
}

/**
 * Valid announcement types.
 */
const VALID_ANNOUNCEMENT_TYPES = [
  'add',
  'remove',
  'ack',
  'pool_deleted',
  'cbl_index_update',
  'cbl_index_delete',
  'head_update',
  'acl_update',
  'pool_announce',
  'pool_remove',
  'brightTrust_proposal',
  'brightTrust_vote',
  'pool_join_request',
  'pool_join_approved',
  'pool_join_denied',
  'ledger_entry',
] as const;

/**
 * Valid delivery ack statuses.
 */
const VALID_ACK_STATUSES = ['delivered', 'read', 'failed', 'bounced'] as const;

/**
 * Valid message delivery priorities.
 */
const VALID_PRIORITIES = ['normal', 'high'] as const;

/**
 * Validates a BlockAnnouncement, enforcing field-type constraints.
 *
 * Validation rules:
 * - messageDelivery is only allowed on 'add' type announcements (Req 1.5)
 * - deliveryAck is only allowed on 'ack' type announcements (Req 1.6)
 * - When messageDelivery is present, all fields must be complete and valid
 * - When deliveryAck is present, all fields must be complete and valid
 *
 * @param announcement - The BlockAnnouncement to validate
 * @returns true if the announcement is valid, false otherwise
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.5, 1.6
 */
export function validateBlockAnnouncement(
  announcement: BlockAnnouncement,
): boolean {
  // Validate type field
  if (
    !VALID_ANNOUNCEMENT_TYPES.includes(
      announcement.type as (typeof VALID_ANNOUNCEMENT_TYPES)[number],
    )
  ) {
    return false;
  }

  // pool_deleted requires valid poolId, must not have messageDelivery or deliveryAck
  if (announcement.type === 'pool_deleted') {
    if (!announcement.poolId || !isValidPoolId(announcement.poolId)) {
      return false;
    }
    if (announcement.messageDelivery || announcement.deliveryAck) {
      return false;
    }
    return true;
  }

  // cbl_index_update and cbl_index_delete require valid poolId and cblIndexEntry,
  // must not have messageDelivery or deliveryAck (Req 8.1, 8.6)
  if (
    announcement.type === 'cbl_index_update' ||
    announcement.type === 'cbl_index_delete'
  ) {
    if (!announcement.poolId || !isValidPoolId(announcement.poolId)) {
      return false;
    }
    if (!announcement.cblIndexEntry) {
      return false;
    }
    if (
      !announcement.cblIndexEntry.magnetUrl ||
      typeof announcement.cblIndexEntry.magnetUrl !== 'string'
    ) {
      return false;
    }
    if (
      !announcement.cblIndexEntry.blockId1 ||
      typeof announcement.cblIndexEntry.blockId1 !== 'string'
    ) {
      return false;
    }
    if (
      !announcement.cblIndexEntry.blockId2 ||
      typeof announcement.cblIndexEntry.blockId2 !== 'string'
    ) {
      return false;
    }
    if (announcement.messageDelivery || announcement.deliveryAck) {
      return false;
    }
    return true;
  }

  // head_update requires non-empty blockId and headUpdate with non-empty dbName and collectionName,
  // must not have messageDelivery, deliveryAck, or cblIndexEntry (Req 2.1)
  if (announcement.type === 'head_update') {
    if (!announcement.blockId || typeof announcement.blockId !== 'string') {
      return false;
    }
    if (!announcement.headUpdate) {
      return false;
    }
    if (
      !announcement.headUpdate.dbName ||
      typeof announcement.headUpdate.dbName !== 'string'
    ) {
      return false;
    }
    if (
      !announcement.headUpdate.collectionName ||
      typeof announcement.headUpdate.collectionName !== 'string'
    ) {
      return false;
    }
    if (
      announcement.messageDelivery ||
      announcement.deliveryAck ||
      announcement.cblIndexEntry
    ) {
      return false;
    }
    return true;
  }

  // acl_update requires valid poolId and non-empty aclBlockId,
  // must not have messageDelivery, deliveryAck, or cblIndexEntry (Req 13.4)
  if (announcement.type === 'acl_update') {
    if (!announcement.poolId || !isValidPoolId(announcement.poolId)) {
      return false;
    }
    if (
      !announcement.aclBlockId ||
      typeof announcement.aclBlockId !== 'string'
    ) {
      return false;
    }
    if (
      announcement.messageDelivery ||
      announcement.deliveryAck ||
      announcement.cblIndexEntry
    ) {
      return false;
    }
    return true;
  }

  // pool_announce requires valid poolId and poolAnnouncement metadata,
  // must not have messageDelivery, deliveryAck, or cblIndexEntry (Req 8.1, 8.2)
  if (announcement.type === 'pool_announce') {
    if (!announcement.poolId || !isValidPoolId(announcement.poolId)) {
      return false;
    }
    if (!announcement.poolAnnouncement) {
      return false;
    }
    if (typeof announcement.poolAnnouncement.blockCount !== 'number') {
      return false;
    }
    if (typeof announcement.poolAnnouncement.totalSize !== 'number') {
      return false;
    }
    if (typeof announcement.poolAnnouncement.encrypted !== 'boolean') {
      return false;
    }
    if (
      announcement.messageDelivery ||
      announcement.deliveryAck ||
      announcement.cblIndexEntry
    ) {
      return false;
    }
    return true;
  }

  // pool_remove requires valid poolId,
  // must not have messageDelivery, deliveryAck, or cblIndexEntry (Req 8.4)
  if (announcement.type === 'pool_remove') {
    if (!announcement.poolId || !isValidPoolId(announcement.poolId)) {
      return false;
    }
    if (
      announcement.messageDelivery ||
      announcement.deliveryAck ||
      announcement.cblIndexEntry
    ) {
      return false;
    }
    return true;
  }

  // brightTrust_proposal requires brightTrustProposal metadata,
  // must not have messageDelivery, deliveryAck, or cblIndexEntry (Req 5.2, 5.3)
  if (announcement.type === 'brightTrust_proposal') {
    if (!announcement.brightTrustProposal) {
      return false;
    }
    if (
      !announcement.brightTrustProposal.proposalId ||
      typeof announcement.brightTrustProposal.proposalId !== 'string'
    ) {
      return false;
    }
    if (
      !announcement.brightTrustProposal.description ||
      typeof announcement.brightTrustProposal.description !== 'string' ||
      announcement.brightTrustProposal.description.length > 4096
    ) {
      return false;
    }
    if (
      !announcement.brightTrustProposal.proposerMemberId ||
      typeof announcement.brightTrustProposal.proposerMemberId !== 'string'
    ) {
      return false;
    }
    if (
      typeof announcement.brightTrustProposal.requiredThreshold !== 'number' ||
      announcement.brightTrustProposal.requiredThreshold < 1
    ) {
      return false;
    }
    if (
      announcement.messageDelivery ||
      announcement.deliveryAck ||
      announcement.cblIndexEntry
    ) {
      return false;
    }
    return true;
  }

  // brightTrust_vote requires brightTrustVote metadata,
  // must not have messageDelivery, deliveryAck, or cblIndexEntry (Req 7.1, 7.2)
  if (announcement.type === 'brightTrust_vote') {
    if (!announcement.brightTrustVote) {
      return false;
    }
    if (
      !announcement.brightTrustVote.proposalId ||
      typeof announcement.brightTrustVote.proposalId !== 'string'
    ) {
      return false;
    }
    if (
      !announcement.brightTrustVote.voterMemberId ||
      typeof announcement.brightTrustVote.voterMemberId !== 'string'
    ) {
      return false;
    }
    if (
      announcement.brightTrustVote.decision !== 'approve' &&
      announcement.brightTrustVote.decision !== 'reject'
    ) {
      return false;
    }
    if (
      announcement.brightTrustVote.comment !== undefined &&
      (typeof announcement.brightTrustVote.comment !== 'string' ||
        announcement.brightTrustVote.comment.length > 1024)
    ) {
      return false;
    }
    if (
      announcement.messageDelivery ||
      announcement.deliveryAck ||
      announcement.cblIndexEntry
    ) {
      return false;
    }
    return true;
  }

  // Validate poolId format if present on any other type
  if (
    announcement.poolId !== undefined &&
    !isValidPoolId(announcement.poolId)
  ) {
    return false;
  }

  // Req 1.5: messageDelivery only allowed on 'add' type
  if (announcement.messageDelivery && announcement.type !== 'add') {
    return false;
  }

  // Req 1.6: deliveryAck only allowed on 'ack' type
  if (announcement.deliveryAck && announcement.type !== 'ack') {
    return false;
  }

  // Validate messageDelivery fields when present (Req 1.2)
  if (announcement.messageDelivery) {
    const md = announcement.messageDelivery;

    if (!md.messageId || typeof md.messageId !== 'string') {
      return false;
    }

    if (
      !Array.isArray(md.recipientIds) ||
      md.recipientIds.length === 0 ||
      md.recipientIds.some((id) => !id || typeof id !== 'string')
    ) {
      return false;
    }

    if (
      !VALID_PRIORITIES.includes(
        md.priority as (typeof VALID_PRIORITIES)[number],
      )
    ) {
      return false;
    }

    if (
      !Array.isArray(md.blockIds) ||
      md.blockIds.length === 0 ||
      md.blockIds.some((id) => !id || typeof id !== 'string')
    ) {
      return false;
    }

    if (!md.cblBlockId || typeof md.cblBlockId !== 'string') {
      return false;
    }

    if (typeof md.ackRequired !== 'boolean') {
      return false;
    }
  }

  // Validate deliveryAck fields when present (Req 1.3)
  if (announcement.deliveryAck) {
    const ack = announcement.deliveryAck;

    if (!ack.messageId || typeof ack.messageId !== 'string') {
      return false;
    }

    if (!ack.recipientId || typeof ack.recipientId !== 'string') {
      return false;
    }

    if (
      !VALID_ACK_STATUSES.includes(
        ack.status as (typeof VALID_ACK_STATUSES)[number],
      )
    ) {
      return false;
    }

    if (!ack.originalSenderNode || typeof ack.originalSenderNode !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Validates a GossipConfig, ensuring all fanout and TTL values are positive integers.
 *
 * Validation rules:
 * - config.fanout must be a positive integer (Req 10.3)
 * - config.defaultTtl must be a positive integer (Req 10.4)
 * - config.messagePriority.normal.fanout must be a positive integer (Req 10.3)
 * - config.messagePriority.normal.ttl must be a positive integer (Req 10.4)
 * - config.messagePriority.high.fanout must be a positive integer (Req 10.3)
 * - config.messagePriority.high.ttl must be a positive integer (Req 10.4)
 *
 * @param config - The GossipConfig to validate
 * @returns true if all values are valid, false otherwise
 *
 * @see Requirements 10.3, 10.4
 */
export function validateGossipConfig(config: GossipConfig): boolean {
  // Validate base fanout is a positive integer
  if (!Number.isInteger(config.fanout) || config.fanout < 1) {
    return false;
  }

  // Validate base defaultTtl is a positive integer
  if (!Number.isInteger(config.defaultTtl) || config.defaultTtl < 1) {
    return false;
  }

  // Validate messagePriority.normal.fanout is a positive integer
  if (
    !Number.isInteger(config.messagePriority.normal.fanout) ||
    config.messagePriority.normal.fanout < 1
  ) {
    return false;
  }

  // Validate messagePriority.normal.ttl is a positive integer
  if (
    !Number.isInteger(config.messagePriority.normal.ttl) ||
    config.messagePriority.normal.ttl < 1
  ) {
    return false;
  }

  // Validate messagePriority.high.fanout is a positive integer
  if (
    !Number.isInteger(config.messagePriority.high.fanout) ||
    config.messagePriority.high.fanout < 1
  ) {
    return false;
  }

  // Validate messagePriority.high.ttl is a positive integer
  if (
    !Number.isInteger(config.messagePriority.high.ttl) ||
    config.messagePriority.high.ttl < 1
  ) {
    return false;
  }

  return true;
}
