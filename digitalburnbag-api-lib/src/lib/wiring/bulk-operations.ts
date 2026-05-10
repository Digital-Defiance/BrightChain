/**
 * Bulk operations wiring — processes multiple items with individual
 * permission checks, returning a summary of successes and failures.
 */
import { PlatformID } from '@digitaldefiance/ecies-lib';

export interface IBulkOperationResult<TID extends PlatformID> {
  successes: Array<{ itemId: TID }>;
  failures: Array<{ itemId: TID; error: string }>;
}

export interface IBulkOperationsDeps<TID extends PlatformID> {
  checkPermissionFlag: (
    targetId: TID,
    targetType: 'file' | 'folder',
    principalId: TID,
    requiredFlag: string,
  ) => Promise<boolean>;
  requiresApproval: (targetId: TID, operationType: string) => Promise<boolean>;
}

/**
 * Execute an operation on multiple items, checking permissions individually.
 * Failed items are skipped; remaining items continue processing.
 */
export async function executeBulkOperation<TID extends PlatformID>(
  itemIds: TID[],
  itemType: 'file' | 'folder',
  requiredFlag: string,
  requesterId: TID,
  deps: IBulkOperationsDeps<TID>,
  operation: (itemId: TID) => Promise<void>,
): Promise<IBulkOperationResult<TID>> {
  const successes: IBulkOperationResult<TID>['successes'] = [];
  const failures: IBulkOperationResult<TID>['failures'] = [];

  for (const itemId of itemIds) {
    try {
      const hasPermission = await deps.checkPermissionFlag(
        itemId,
        itemType,
        requesterId,
        requiredFlag,
      );
      if (!hasPermission) {
        failures.push({ itemId, error: 'Insufficient permissions' });
        continue;
      }

      const needsApproval = await deps.requiresApproval(itemId, 'BulkDelete');
      if (needsApproval) {
        failures.push({ itemId, error: 'Requires approval' });
        continue;
      }

      await operation(itemId);
      successes.push({ itemId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      failures.push({ itemId, error: message });
    }
  }

  return { successes, failures };
}
