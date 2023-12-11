/**
 * @fileoverview Ban Enforcement Service
 *
 * Enforces bans at the pool ACL level and network layer:
 * - Removes banned nodes from the member pool ACL
 * - Signs and gossips the updated ACL
 * - Provides ban checking for gossip, connections, and reconciliation
 *
 * @see .kiro/specs/member-pool-security/design.md — Phase 3
 */

import type {
  BlockAnnouncement,
  IAclDocument,
  IBanListCache,
  IBanRecord,
  IGossipService,
  INodeAuthenticator,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { removeNodeFromAcl, savePoolSecurity } from './poolSecurityService';

/**
 * Ban Enforcement Service
 *
 * Coordinates ban enforcement across the pool ACL and network layers.
 */
export class BanEnforcementService {
  constructor(
    private readonly banListCache: IBanListCache<Uint8Array>,
    private readonly authenticator: INodeAuthenticator,
    private readonly gossipService: IGossipService,
    private readonly poolName: string,
    private readonly localNodeId: string,
  ) {}

  /**
   * Enforce a ban by removing the banned node from the pool ACL.
   * Signs the updated ACL and gossips it to all pool members.
   *
   * @param banRecord - The enacted ban record
   * @param currentAcl - The current pool ACL
   * @param adminPrivateKey - The admin's private key for signing
   * @param db - BrightDb for persisting the ACL
   * @returns The updated ACL, or null if the banned node wasn't in the ACL
   */
  async enforceBan(
    banRecord: IBanRecord<Uint8Array>,
    currentAcl: IAclDocument,
    adminPrivateKey: Uint8Array,
    db: BrightDb,
  ): Promise<IAclDocument | null> {
    // Add to local ban list cache
    this.banListCache.addBan(banRecord);

    // Check if the banned node is in the ACL
    const bannedKeyHex = Buffer.from(banRecord.memberId).toString('hex');
    const isInAcl = currentAcl.authorizedWriters.some(
      (w) => Buffer.from(w).toString('hex') === bannedKeyHex,
    );

    if (!isInAcl) {
      return null; // Not in ACL — nothing to remove
    }

    // Remove from ACL
    const updatedAcl = await removeNodeFromAcl(
      currentAcl,
      banRecord.memberId,
      adminPrivateKey,
      this.authenticator,
    );

    // Persist
    await savePoolSecurity(db, updatedAcl, this.localNodeId);

    return updatedAcl;
  }

  /**
   * Check if a node ID is banned.
   * Used by gossip handlers, connection acceptance, and reconciliation.
   *
   * @param nodePublicKey - The node's public key (Uint8Array)
   * @returns true if the node is banned
   */
  isNodeBanned(nodePublicKey: Uint8Array): boolean {
    return this.banListCache.isBanned(nodePublicKey);
  }

  /**
   * Create a gossip announcement filter that drops messages from banned nodes.
   * Register this with the gossip service to enforce bans at the gossip layer.
   *
   * @param nodeIdToPublicKey - Function to resolve a node ID to its public key
   * @returns A filter function that returns true if the announcement should be processed
   */
  createGossipFilter(
    nodeIdToPublicKey: (nodeId: string) => Uint8Array | null,
  ): (announcement: BlockAnnouncement) => boolean {
    return (announcement: BlockAnnouncement): boolean => {
      const publicKey = nodeIdToPublicKey(announcement.nodeId);
      if (!publicKey) {
        return true; // Unknown node — allow (can't verify ban status)
      }
      return !this.banListCache.isBanned(publicKey);
    };
  }

  /**
   * Filter a list of peer IDs to exclude banned peers.
   * Use this before calling ReconciliationService.reconcile(peerIds).
   *
   * @param peerIds - Array of peer IDs to filter
   * @param peerIdToPublicKey - Function to resolve a peer ID to its public key
   * @returns Filtered array with banned peers removed
   */
  filterBannedPeers(
    peerIds: string[],
    peerIdToPublicKey: (peerId: string) => Uint8Array | null,
  ): string[] {
    return peerIds.filter((peerId) => {
      const publicKey = peerIdToPublicKey(peerId);
      if (!publicKey) {
        return true; // Unknown peer — allow (can't verify ban status)
      }
      return !this.banListCache.isBanned(publicKey);
    });
  }

  /**
   * Check if a peer connection should be refused based on the ban list.
   * Use this in WebSocket connection acceptance handlers.
   *
   * @param peerPublicKey - The connecting peer's public key
   * @returns true if the connection should be refused (peer is banned)
   */
  shouldRefuseConnection(peerPublicKey: Uint8Array): boolean {
    return this.banListCache.isBanned(peerPublicKey);
  }
}

/**
 * Verify a sample of blocks claimed by a peer during reconciliation.
 * Returns the fraction of blocks that verified successfully.
 *
 * @param claimedBlockIds - Block IDs the peer claims to have
 * @param blockStore - The local block store to verify against
 * @param sampleRate - Fraction of blocks to verify (0.0 to 1.0, default 0.1 = 10%)
 * @returns Verification result with success rate
 */
export async function verifyReconciliationBlocks(
  claimedBlockIds: string[],
  blockStore: { has(key: string): Promise<boolean> },
  sampleRate = 0.1,
): Promise<{
  totalClaimed: number;
  sampled: number;
  verified: number;
  successRate: number;
}> {
  const sampleSize = Math.max(
    1,
    Math.ceil(claimedBlockIds.length * sampleRate),
  );

  // Random sample without replacement
  const shuffled = [...claimedBlockIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const sample = shuffled.slice(0, sampleSize);

  let verified = 0;
  for (const blockId of sample) {
    try {
      const exists = await blockStore.has(blockId);
      if (exists) verified++;
    } catch {
      // Block verification failed — count as not verified
    }
  }

  return {
    totalClaimed: claimedBlockIds.length,
    sampled: sample.length,
    verified,
    successRate: sample.length > 0 ? verified / sample.length : 0,
  };
}
