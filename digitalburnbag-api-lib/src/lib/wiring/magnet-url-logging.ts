/**
 * Magnet URL disclosure logging — ensures all paths that expose magnet URLs
 * log the disclosure to AuditService with recipient identity and a hash of
 * the URL (never the URL itself).
 */
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { createHash } from 'crypto';

export interface IMagnetUrlLoggingDeps<TID extends PlatformID> {
  logOperation: (entry: {
    operationType: string;
    actorId: TID;
    targetId: TID;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
}

/**
 * Hash a magnet URL for safe audit logging (never store the URL itself).
 */
export function hashMagnetUrl(magnetUrl: string): string {
  return createHash('sha256').update(magnetUrl).digest('hex');
}

/**
 * Log a magnet URL disclosure event to the audit trail.
 */
export async function logMagnetUrlDisclosure<TID extends PlatformID>(
  fileId: TID,
  recipientId: TID,
  magnetUrl: string,
  deps: IMagnetUrlLoggingDeps<TID>,
): Promise<void> {
  await deps.logOperation({
    operationType: 'MagnetUrlDisclosure',
    actorId: recipientId,
    targetId: fileId,
    metadata: {
      magnetUrlHash: hashMagnetUrl(magnetUrl),
      disclosedAt: new Date().toISOString(),
    },
  });
}
