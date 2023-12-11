/**
 * @fileoverview Node Admission Service
 *
 * Manages the pool join request/approval/denial flow for the BrightChain
 * member pool. Handles:
 * - Sending join requests via gossip
 * - Receiving and queuing join requests from other nodes
 * - Approving/denying requests (admin action)
 * - Updating the pool ACL and gossiping the update
 *
 * @see .kiro/specs/member-pool-security/design.md — Phase 2
 */

import type {
  BlockAnnouncement,
  BlockId,
  IAclDocument,
  IGossipService,
  INodeAuthenticator,
  PoolJoinApprovalMetadata,
  PoolJoinDenialMetadata,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { sha256 } from '@noble/hashes/sha256';
import { addNodeToAcl, savePoolSecurity } from './poolSecurityService';

/**
 * Compute the approval payload hash for cryptographic verification.
 *
 * The payload is SHA-256(approvedNodeId:poolId:approverPublicKey).
 * This binds the approval to a specific node, pool, and approver,
 * preventing replay or substitution attacks.
 *
 * @param approvedNodeId - The node being approved
 * @param poolId - The pool being granted access to
 * @param approverPublicKeyHex - The approving admin's public key (hex)
 * @returns SHA-256 hash as Uint8Array
 */
export function computeApprovalPayload(
  approvedNodeId: string,
  poolId: string,
  approverPublicKeyHex: string,
): Uint8Array {
  const message = `${approvedNodeId}:${poolId}:${approverPublicKeyHex}`;
  return sha256(new TextEncoder().encode(message));
}

/**
 * A pending join request from a remote node.
 */
export interface IPendingJoinRequest {
  /** The pool ID being requested */
  poolId: string;
  /** The requesting node's system user ID */
  requestingNodeId: string;
  /** The requesting node's ECDSA public key (hex-encoded) */
  requestingPublicKey: string;
  /** Optional message from the operator */
  message?: string;
  /** When the request was received */
  receivedAt: Date;
}

/**
 * Result of approving a join request.
 */
export interface IApprovalResult {
  success: boolean;
  updatedAcl?: IAclDocument;
  error?: string;
}

/**
 * Node Admission Service
 *
 * Coordinates the pool join request/approval/denial flow.
 * Maintains a queue of pending requests and provides methods
 * for admins to approve or deny them.
 */
export class NodeAdmissionService {
  /** Pending join requests indexed by requesting node ID */
  private pendingRequests = new Map<string, IPendingJoinRequest>();

  /** Handlers called when a new join request is received */
  private joinRequestHandlers: Array<(request: IPendingJoinRequest) => void> =
    [];

  constructor(
    private readonly gossipService: IGossipService,
    private readonly authenticator: INodeAuthenticator,
    private readonly poolName: string,
    private readonly localNodeId: string,
    private readonly localPublicKeyHex: string,
  ) {}

  /**
   * Request to join a pool. Sends a pool_join_request via gossip.
   * Called by a new node that wants write access to the member pool.
   */
  async requestPoolJoin(message?: string): Promise<void> {
    const announcement: BlockAnnouncement = {
      type: 'pool_join_request',
      blockId: '' as BlockId,
      nodeId: this.localNodeId,
      timestamp: new Date(),
      ttl: 7, // High TTL — needs to reach admin nodes
      poolJoinRequest: {
        poolId: this.poolName,
        requestingNodeId: this.localNodeId,
        requestingPublicKey: this.localPublicKeyHex,
        message,
      },
    };

    await this.gossipService.handleAnnouncement(announcement);
  }

  /**
   * Handle an incoming pool_join_request announcement.
   * Queues the request for admin review.
   */
  handleJoinRequest(announcement: BlockAnnouncement): void {
    if (
      announcement.type !== 'pool_join_request' ||
      !announcement.poolJoinRequest
    ) {
      return;
    }

    const req = announcement.poolJoinRequest;
    if (req.poolId !== this.poolName) {
      return; // Not for our pool
    }

    // Don't queue duplicate requests from the same node
    if (this.pendingRequests.has(req.requestingNodeId)) {
      return;
    }

    const pending: IPendingJoinRequest = {
      poolId: req.poolId,
      requestingNodeId: req.requestingNodeId,
      requestingPublicKey: req.requestingPublicKey,
      message: req.message,
      receivedAt: new Date(),
    };

    this.pendingRequests.set(req.requestingNodeId, pending);

    // Notify handlers
    for (const handler of this.joinRequestHandlers) {
      try {
        handler(pending);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /**
   * Get all pending join requests.
   */
  getPendingRequests(): IPendingJoinRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Get a specific pending request by node ID.
   */
  getPendingRequest(nodeId: string): IPendingJoinRequest | undefined {
    return this.pendingRequests.get(nodeId);
  }

  /**
   * Approve a pending join request.
   * Adds the node to the pool ACL, signs the update, saves it,
   * and gossips the approval.
   *
   * @param nodeId - The requesting node's ID
   * @param currentAcl - The current pool ACL document
   * @param adminPrivateKey - The admin's private key for signing
   * @param db - The BrightDb instance for persisting the ACL
   * @returns The approval result with the updated ACL
   */
  async approveJoinRequest(
    nodeId: string,
    currentAcl: IAclDocument,
    adminPrivateKey: Uint8Array,
    db: BrightDb,
  ): Promise<IApprovalResult> {
    const request = this.pendingRequests.get(nodeId);
    if (!request) {
      return {
        success: false,
        error: `No pending request from node ${nodeId}`,
      };
    }

    try {
      // Add the node to the ACL
      const nodePublicKey = new Uint8Array(
        Buffer.from(request.requestingPublicKey, 'hex'),
      );
      const updatedAcl = await addNodeToAcl(
        currentAcl,
        nodePublicKey,
        adminPrivateKey,
        this.authenticator,
      );

      // Persist the updated ACL
      await savePoolSecurity(db, updatedAcl, this.localNodeId);

      // Gossip the approval
      const approvalPayload = computeApprovalPayload(
        request.requestingNodeId,
        this.poolName,
        this.localPublicKeyHex,
      );
      const approvalSig = await this.authenticator.signChallenge(
        approvalPayload,
        adminPrivateKey,
      );

      const approvalMetadata: PoolJoinApprovalMetadata = {
        poolId: this.poolName,
        approvedNodeId: request.requestingNodeId,
        approvedPublicKey: request.requestingPublicKey,
        approverPublicKey: this.localPublicKeyHex,
        aclSignature: Buffer.from(approvalSig).toString('hex'),
        aclVersion: updatedAcl.version,
      };

      const approvalAnnouncement: BlockAnnouncement = {
        type: 'pool_join_approved',
        blockId: '' as BlockId,
        nodeId: this.localNodeId,
        timestamp: new Date(),
        ttl: 7,
        poolJoinApproval: approvalMetadata,
      };

      await this.gossipService.handleAnnouncement(approvalAnnouncement);

      // Remove from pending
      this.pendingRequests.delete(nodeId);

      return { success: true, updatedAcl };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Deny a pending join request.
   * Gossips the denial and removes the request from the queue.
   *
   * @param nodeId - The requesting node's ID
   * @param reason - Optional reason for denial
   */
  async denyJoinRequest(nodeId: string, reason?: string): Promise<void> {
    const request = this.pendingRequests.get(nodeId);
    if (!request) {
      return;
    }

    const denialMetadata: PoolJoinDenialMetadata = {
      poolId: this.poolName,
      deniedNodeId: request.requestingNodeId,
      reason,
    };

    const denialAnnouncement: BlockAnnouncement = {
      type: 'pool_join_denied',
      blockId: '' as BlockId,
      nodeId: this.localNodeId,
      timestamp: new Date(),
      ttl: 7,
      poolJoinDenial: denialMetadata,
    };

    await this.gossipService.handleAnnouncement(denialAnnouncement);

    // Remove from pending
    this.pendingRequests.delete(nodeId);
  }

  /**
   * Register a handler for new join requests.
   */
  onJoinRequest(handler: (request: IPendingJoinRequest) => void): void {
    this.joinRequestHandlers.push(handler);
  }

  /**
   * Remove a join request handler.
   */
  offJoinRequest(handler: (request: IPendingJoinRequest) => void): void {
    const idx = this.joinRequestHandlers.indexOf(handler);
    if (idx >= 0) {
      this.joinRequestHandlers.splice(idx, 1);
    }
  }

  /**
   * Register this service as a gossip handler for pool join announcements.
   * Call this during node startup to wire the service into the gossip layer.
   */
  registerGossipHandlers(): void {
    this.gossipService.onAnnouncement((announcement) => {
      if (announcement.type === 'pool_join_request') {
        this.handleJoinRequest(announcement);
      }
      // pool_join_approved and pool_join_denied are handled by the
      // requesting node — not by the admin service. Those handlers
      // would be on the requesting node's side.
    });
  }

  /**
   * Verify a pool_join_approved announcement's signature.
   * Returns true if the approval is signed by a valid admin and the
   * signature cryptographically verifies against the approval payload.
   *
   * SECURITY: Receiving nodes must call this before accepting an approval
   * and updating their local ACL. A forged approval without a valid admin
   * signature must be rejected.
   *
   * The approval payload is SHA-256(approvedNodeId:poolId:approverPublicKey).
   * The signature is verified against the approver's public key using ECDSA.
   *
   * @param announcement - The pool_join_approved announcement
   * @param currentAcl - The current pool ACL (to check if approver is an admin)
   * @returns true if the approval signature is valid and the approver is an admin
   */
  async verifyApproval(
    announcement: BlockAnnouncement,
    currentAcl: IAclDocument,
  ): Promise<boolean> {
    if (
      announcement.type !== 'pool_join_approved' ||
      !announcement.poolJoinApproval
    ) {
      return false;
    }

    const approval = announcement.poolJoinApproval;

    // Check that the approver is in the current ACL's admin list
    const approverKey = new Uint8Array(
      Buffer.from(approval.approverPublicKey, 'hex'),
    );
    const isAdmin = currentAcl.aclAdministrators.some(
      (admin) =>
        admin.length === approverKey.length &&
        admin.every((byte, i) => byte === approverKey[i]),
    );

    if (!isAdmin) {
      return false;
    }

    // Cryptographically verify the approval signature against the payload
    const payload = computeApprovalPayload(
      approval.approvedNodeId,
      approval.poolId,
      approval.approverPublicKey,
    );
    const signature = new Uint8Array(Buffer.from(approval.aclSignature, 'hex'));

    return this.authenticator.verifySignature(payload, signature, approverKey);
  }

  // ── Persistence ──────────────────────────────────────────────────

  /** Collection name for persisted pending requests */
  private static readonly PENDING_COLLECTION = '__pending_join_requests__';

  /**
   * Persist pending requests to BrightDB.
   * Call this periodically or after each new request.
   */
  async persistPendingRequests(db: BrightDb): Promise<void> {
    const collection = db.collection(NodeAdmissionService.PENDING_COLLECTION);
    const requests = this.getPendingRequests();

    for (const req of requests) {
      const existing = await collection.findOne({
        _id: req.requestingNodeId,
      });
      if (!existing) {
        await collection.insertOne({
          _id: req.requestingNodeId,
          poolId: req.poolId,
          requestingPublicKey: req.requestingPublicKey,
          message: req.message ?? '',
          receivedAt: req.receivedAt.toISOString(),
        });
      }
    }
  }

  /**
   * Load persisted pending requests from BrightDB.
   * Call this on startup to restore state.
   */
  async loadPendingRequests(db: BrightDb): Promise<void> {
    const collection = db.collection(NodeAdmissionService.PENDING_COLLECTION);
    const docs = await collection.find({}).toArray();

    for (const doc of docs) {
      const record = doc as Record<string, unknown>;
      const nodeId = record['_id'] as string;
      if (!this.pendingRequests.has(nodeId)) {
        this.pendingRequests.set(nodeId, {
          poolId: (record['poolId'] as string) ?? this.poolName,
          requestingNodeId: nodeId,
          requestingPublicKey: record['requestingPublicKey'] as string,
          message: (record['message'] as string) || undefined,
          receivedAt: new Date(record['receivedAt'] as string),
        });
      }
    }
  }

  /**
   * Remove a persisted pending request after approval or denial.
   */
  private async removePersisted(nodeId: string, db?: BrightDb): Promise<void> {
    if (!db) return;
    try {
      const collection = db.collection(NodeAdmissionService.PENDING_COLLECTION);
      await collection.deleteOne({ _id: nodeId });
    } catch {
      // Best effort — don't fail the approval/denial
    }
  }
}
