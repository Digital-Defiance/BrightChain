/**
 * Permission delegation enforcement utilities.
 *
 * Enforces:
 * - can_reshare flag across all share paths
 * - new share ≤ sharer's permission level
 * - block_download flag on download and magnet URL endpoints
 */
import { PlatformID } from '@digitaldefiance/ecies-lib';

export interface IPermissionDelegationDeps<TID extends PlatformID> {
  getShareLink: (shareLinkId: TID) => Promise<{
    blockDownload?: boolean;
    canReshare?: boolean;
    permissionLevel: string;
  } | null>;
  getEffectivePermissionLevel: (
    targetId: TID,
    targetType: 'file' | 'folder',
    principalId: TID,
  ) => Promise<string | null>;
}

const LEVEL_RANK: Record<string, number> = {
  Viewer: 0,
  Commenter: 1,
  Editor: 2,
  Owner: 3,
};

/**
 * Check if a reshare is allowed given the sharer's current permission
 * and the share link's can_reshare flag.
 */
export function canReshare(
  sharerLevel: string,
  requestedLevel: string,
  canReshareFlag: boolean,
): { allowed: boolean; reason?: string } {
  if (!canReshareFlag) {
    return {
      allowed: false,
      reason: 'Resharing is not permitted on this share',
    };
  }
  const sharerRank = LEVEL_RANK[sharerLevel] ?? -1;
  const requestedRank = LEVEL_RANK[requestedLevel] ?? -1;
  if (requestedRank > sharerRank) {
    return {
      allowed: false,
      reason: `Cannot grant ${requestedLevel} — your level is ${sharerLevel}`,
    };
  }
  return { allowed: true };
}

/**
 * Check if download is blocked for a share link.
 */
export async function isDownloadBlocked<TID extends PlatformID>(
  shareLinkId: TID,
  deps: IPermissionDelegationDeps<TID>,
): Promise<boolean> {
  const link = await deps.getShareLink(shareLinkId);
  return link?.blockDownload === true;
}
