/**
 * @fileoverview Head update sync handler with write proof verification.
 *
 * Bridges the gossip service's head_update announcements to the head registry,
 * converting hex-encoded write proofs from BlockAnnouncements into IWriteProof
 * objects and passing them through to the AuthorizedHeadRegistry for verification.
 *
 * In Restricted_Mode, the AuthorizedHeadRegistry will verify the write proof
 * before applying the head update. In Open_Mode, the proof is ignored.
 *
 * @see Write ACL Requirements 7.1, 7.2, 7.3, 5.3, 5.4
 */

import type {
  BlockAnnouncement,
  IHeadRegistry,
  IWriteAclAuditLogger,
  IWriteProof,
} from '@brightchain/brightchain-lib';

/**
 * Convert a BlockAnnouncement's hex-encoded writeProof to an IWriteProof<Uint8Array>.
 * Returns undefined if the announcement has no writeProof.
 */
export function extractWriteProofFromAnnouncement(
  announcement: BlockAnnouncement,
): IWriteProof | undefined {
  if (!announcement.writeProof) {
    return undefined;
  }

  const { signerPublicKey, signature, dbName, collectionName, blockId } =
    announcement.writeProof;

  return {
    signerPublicKey: Uint8Array.from(Buffer.from(signerPublicKey, 'hex')),
    signature: Uint8Array.from(Buffer.from(signature, 'hex')),
    dbName,
    collectionName,
    blockId,
  };
}

/**
 * Create a gossip announcement handler that applies head_update announcements
 * to the given head registry, passing through write proofs for verification.
 *
 * The returned handler can be registered with `gossipService.onAnnouncement(handler)`.
 *
 * @param headRegistry - The head registry to apply updates to (typically an AuthorizedHeadRegistry)
 * @param auditLogger - Optional audit logger for security events
 * @returns An announcement handler function
 *
 * @see Write ACL Requirements 7.3, 5.3, 5.4
 */
export function createHeadUpdateSyncHandler(
  headRegistry: IHeadRegistry,
  auditLogger?: IWriteAclAuditLogger,
): (announcement: BlockAnnouncement) => void {
  return (announcement: BlockAnnouncement) => {
    if (announcement.type !== 'head_update') return;
    if (!announcement.headUpdate || !announcement.blockId) return;

    const { dbName, collectionName } = announcement.headUpdate;
    const writeProof = extractWriteProofFromAnnouncement(announcement);

    // mergeHeadUpdate is async — fire and handle errors
    headRegistry
      .mergeHeadUpdate(
        dbName,
        collectionName,
        announcement.blockId,
        announcement.timestamp,
        writeProof,
      )
      .then((applied) => {
        if (!applied) {
          // Update rejected by last-writer-wins — not a security event
          return;
        }
      })
      .catch((error: Error) => {
        // Write authorization failure — log security event
        if (auditLogger) {
          auditLogger.logSecurityEvent('sync_head_update_rejected', {
            dbName,
            collectionName,
            blockId: announcement.blockId,
            sourceNodeId: announcement.nodeId,
            reason: error.message,
            writeProofPresent: !!writeProof,
          });
        }
      });
  };
}
