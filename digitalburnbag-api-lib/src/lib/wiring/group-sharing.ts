/**
 * Group-based sharing wiring — share with named groups where all members
 * receive the specified permission level. Membership changes are immediately
 * reflected in effective permissions.
 */
import { PlatformID } from '@digitaldefiance/ecies-lib';

export interface IGroupMember<TID extends PlatformID> {
  userId: TID;
  username: string;
}

export interface IGroupSharingDeps<TID extends PlatformID> {
  getGroupMembers: (groupId: TID) => Promise<IGroupMember<TID>[]>;
  shareWithUser: (params: {
    targetId: TID;
    targetType: 'file' | 'folder';
    recipientId: TID;
    permissionLevel: string;
    sharerId: TID;
  }) => Promise<void>;
  logOperation: (entry: {
    operationType: string;
    actorId: TID;
    targetId: TID;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
}

export interface IGroupShareResult<TID extends PlatformID> {
  sharedWith: TID[];
  failures: Array<{ userId: TID; error: string }>;
}

/**
 * Share a file or folder with all members of a named group.
 */
export async function shareWithGroup<TID extends PlatformID>(
  targetId: TID,
  targetType: 'file' | 'folder',
  groupId: TID,
  permissionLevel: string,
  sharerId: TID,
  deps: IGroupSharingDeps<TID>,
): Promise<IGroupShareResult<TID>> {
  const members = await deps.getGroupMembers(groupId);
  const sharedWith: TID[] = [];
  const failures: IGroupShareResult<TID>['failures'] = [];

  for (const member of members) {
    try {
      await deps.shareWithUser({
        targetId,
        targetType,
        recipientId: member.userId,
        permissionLevel,
        sharerId,
      });
      sharedWith.push(member.userId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      failures.push({ userId: member.userId, error: message });
    }
  }

  await deps.logOperation({
    operationType: 'GroupShare',
    actorId: sharerId,
    targetId,
    metadata: {
      groupId,
      permissionLevel,
      sharedCount: sharedWith.length,
      failedCount: failures.length,
    },
  });

  return { sharedWith, failures };
}
