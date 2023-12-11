/**
 * @fileoverview ACL document replication handler for cross-node sync.
 *
 * Handles incoming `acl_update` announcements from the gossip service.
 * When an ACL document block is received from a sync peer, this handler:
 * 1. Loads the ACL document from the block store (via AclDocumentStore)
 * 2. Verifies the signature (done by AclDocumentStore.loadAclDocument)
 * 3. Validates the version is newer than the current local version
 * 4. Applies the ACL to the WriteAclManager cache
 *
 * @see Write ACL Requirements 7.3, 7.4, 7.5
 */

import type {
  BlockAnnouncement,
  IAclDocument,
  IWriteAclAuditLogger,
} from '@brightchain/brightchain-lib';
import type { AclDocumentStore } from '../auth/aclDocumentStore';

/**
 * Minimal interface for the ACL manager operations needed by the sync handler.
 * Avoids a direct dependency on @brightchain/db from api-lib.
 */
export interface IAclDocumentSyncTarget {
  getAclDocument(
    dbName: string,
    collectionName?: string,
  ): IAclDocument | undefined;
  setCachedAcl(acl: IAclDocument): void;
}

/**
 * Create a gossip announcement handler that replicates ACL documents
 * received from sync peers.
 *
 * The handler processes `acl_update` type announcements by loading the
 * ACL document block, verifying its signature, checking the version,
 * and applying it to the local WriteAclManager.
 *
 * @param aclDocumentStore - Store for loading and verifying ACL document blocks
 * @param writeAclManager - Manager to apply verified ACL documents to
 * @param auditLogger - Optional audit logger for security events
 * @returns An announcement handler function
 *
 * @see Write ACL Requirements 7.3, 7.4, 7.5
 */
export function createAclDocumentSyncHandler(
  aclDocumentStore: AclDocumentStore,
  writeAclManager: IAclDocumentSyncTarget,
  auditLogger?: IWriteAclAuditLogger,
): (announcement: BlockAnnouncement) => void {
  return (announcement: BlockAnnouncement) => {
    if (announcement.type !== 'acl_update') return;
    if (!announcement.aclBlockId) return;

    const aclBlockId = announcement.aclBlockId;

    // Load, verify signature, and apply — async fire-and-forget
    (async () => {
      try {
        // loadAclDocument verifies the signature before returning
        // @see Requirements 7.3 (verify signature before applying)
        const aclDoc = await aclDocumentStore.loadAclDocument(aclBlockId);

        // Check version against current local ACL
        // @see Requirements 7.4 (reject lower or equal version)
        const currentAcl = writeAclManager.getAclDocument(
          aclDoc.scope.dbName,
          aclDoc.scope.collectionName,
        );

        if (currentAcl && aclDoc.version <= currentAcl.version) {
          // Reject — local version is same or newer
          if (auditLogger) {
            auditLogger.logSecurityEvent('acl_sync_version_rejected', {
              aclBlockId,
              incomingVersion: aclDoc.version,
              currentVersion: currentAcl.version,
              dbName: aclDoc.scope.dbName,
              collectionName: aclDoc.scope.collectionName,
              sourceNodeId: announcement.nodeId,
            });
          }
          return;
        }

        // Apply the verified ACL document to the local cache
        // @see Requirements 7.5 (replicate through block store sync)
        writeAclManager.setCachedAcl(aclDoc);

        if (auditLogger) {
          auditLogger.logAclModification(
            Buffer.from(aclDoc.creatorPublicKey).toString('hex'),
            'sync_replication',
            'acl_document',
            aclDoc.scope.dbName,
            aclDoc.scope.collectionName,
          );
        }
      } catch (error: unknown) {
        // Signature verification failure or block not found — log security event
        if (auditLogger) {
          auditLogger.logSecurityEvent('acl_sync_verification_failed', {
            aclBlockId,
            sourceNodeId: announcement.nodeId,
            reason: (error as Error).message,
          });
        }
      }
    })();
  };
}
