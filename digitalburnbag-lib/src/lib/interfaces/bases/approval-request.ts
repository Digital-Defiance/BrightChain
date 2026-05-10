import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * A single vote in an approval process.
 */
export interface IApprovalVoteBase<TID extends PlatformID> {
  voterId: TID;
  signature: Uint8Array;
  reason?: string;
  votedAt: Date | string;
}

/**
 * A pending approval request for a sensitive file operation.
 */
export interface IApprovalRequestBase<TID extends PlatformID> {
  id: TID;
  operationType: string;
  targetId: TID;
  targetType: 'file' | 'folder' | 'vault_container';
  requesterId: TID;
  /** Required approval count per approval policy */
  requiredApprovals: number;
  approvals: IApprovalVoteBase<TID>[];
  rejections: IApprovalVoteBase<TID>[];
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'rubber_stamped';
  expiresAt: Date | string;
  createdAt: Date | string;
  resolvedAt?: Date | string;
}
