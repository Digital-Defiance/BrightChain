/**
 * Approval gates wiring — checks whether an operation on an approval-governed
 * item requires approval before proceeding.
 */
import { PlatformID } from '@digitaldefiance/ecies-lib';

export interface IApprovalGateDeps<TID extends PlatformID> {
  requiresApproval: (targetId: TID, operationType: string) => Promise<boolean>;
  requestApproval: (params: {
    targetId: TID;
    operationType: string;
    requesterId: TID;
  }) => Promise<{ requestId: TID; status: string }>;
}

export interface IApprovalGateResult<TID extends PlatformID> {
  allowed: boolean;
  pendingRequestId?: TID;
  reason?: string;
}

/**
 * Gate a destruction operation behind approval if required.
 */
export async function gateDestruction<TID extends PlatformID>(
  fileId: TID,
  requesterId: TID,
  deps: IApprovalGateDeps<TID>,
): Promise<IApprovalGateResult<TID>> {
  const needs = await deps.requiresApproval(fileId, 'Destruction');
  if (!needs) return { allowed: true };

  const { requestId } = await deps.requestApproval({
    targetId: fileId,
    operationType: 'Destruction',
    requesterId,
  });
  return {
    allowed: false,
    pendingRequestId: requestId,
    reason: 'Approval required for destruction',
  };
}

/**
 * Gate an external (anonymous) share link creation behind approval.
 */
export async function gateExternalShare<TID extends PlatformID>(
  targetId: TID,
  requesterId: TID,
  deps: IApprovalGateDeps<TID>,
): Promise<IApprovalGateResult<TID>> {
  const needs = await deps.requiresApproval(targetId, 'ExternalShare');
  if (!needs) return { allowed: true };

  const { requestId } = await deps.requestApproval({
    targetId,
    operationType: 'ExternalShare',
    requesterId,
  });
  return {
    allowed: false,
    pendingRequestId: requestId,
    reason: 'Approval required for external sharing',
  };
}

/**
 * Gate a bulk delete operation behind approval for governed items.
 */
export async function gateBulkDelete<TID extends PlatformID>(
  itemIds: TID[],
  requesterId: TID,
  deps: IApprovalGateDeps<TID>,
): Promise<{
  allowed: TID[];
  pendingApproval: Array<{ itemId: TID; requestId: TID }>;
}> {
  const allowed: TID[] = [];
  const pendingApproval: Array<{ itemId: TID; requestId: TID }> = [];

  for (const itemId of itemIds) {
    const needs = await deps.requiresApproval(itemId, 'BulkDelete');
    if (!needs) {
      allowed.push(itemId);
    } else {
      const { requestId } = await deps.requestApproval({
        targetId: itemId,
        operationType: 'BulkDelete',
        requesterId,
      });
      pendingApproval.push({ itemId, requestId });
    }
  }

  return { allowed, pendingApproval };
}
