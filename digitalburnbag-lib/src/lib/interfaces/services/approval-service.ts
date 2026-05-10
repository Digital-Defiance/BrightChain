import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ApprovalOperationType } from '../../enumerations/approval-operation-type';
import type { IApprovalRequestBase } from '../bases/approval-request';

/**
 * Parameters for requesting approval on a sensitive operation.
 */
export interface IApprovalRequestInput<TID extends PlatformID> {
  operationType: ApprovalOperationType;
  targetId: TID;
  targetType: 'file' | 'folder' | 'vault_container';
  requesterId: TID;
}

/**
 * Status snapshot of an approval request.
 */
export interface IApprovalStatus {
  requestId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'rubber_stamped';
  approvalsReceived: number;
  approvalsRequired: number;
}

/**
 * Service interface for approval-governed operations.
 * Manages multi-party approval workflows for sensitive file operations
 * such as destruction, external sharing, bulk deletion, and ACL changes.
 */
export interface IApprovalService<TID extends PlatformID> {
  /** Check if a target requires approval for the given operation */
  requiresApproval(
    targetId: TID,
    operationType: ApprovalOperationType,
  ): Promise<boolean>;

  /** Create a new approval request */
  requestApproval(
    params: IApprovalRequestInput<TID>,
  ): Promise<IApprovalRequestBase<TID>>;

  /** Cast an approval vote on an approval request */
  approve(
    requestId: TID,
    approverId: TID,
    signature: Uint8Array,
  ): Promise<IApprovalStatus>;

  /** Reject an approval request */
  reject(
    requestId: TID,
    approverId: TID,
    reason: string,
  ): Promise<IApprovalStatus>;

  /** Check if an operation is rubber-stamped (auto-approved) */
  isRubberStamped(
    operationType: ApprovalOperationType,
    targetId: TID,
  ): Promise<boolean>;

  /** Execute an approved request */
  executeApproved(requestId: TID): Promise<void>;

  /** Expire stale approval requests, returning the count expired */
  expireStaleRequests(): Promise<number>;
}
