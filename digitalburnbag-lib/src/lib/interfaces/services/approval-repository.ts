import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IApprovalRequestBase } from '../bases/approval-request';

/**
 * Approval policy defining approval requirements for a target/operation combo.
 */
export interface IApprovalPolicy<TID extends PlatformID> {
  targetId: TID;
  operationType: string;
  /** 'unanimous' | 'majority' | 'threshold' */
  policyType: string;
  requiredApprovals: number;
  eligibleApproverIds: TID[];
}

/**
 * Repository interface abstracting BrightDB access for approval operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IApprovalRepository<TID extends PlatformID> {
  /** Get an approval request by ID, or null if not found */
  getApprovalRequest(requestId: TID): Promise<IApprovalRequestBase<TID> | null>;

  /** Create a new approval request */
  createApprovalRequest(request: IApprovalRequestBase<TID>): Promise<void>;

  /** Update an existing approval request with partial updates */
  updateApprovalRequest(
    requestId: TID,
    updates: Partial<IApprovalRequestBase<TID>>,
  ): Promise<void>;

  /** Get the approval policy for a target/operation combo */
  getApprovalPolicy(
    targetId: TID,
    operationType: string,
  ): Promise<IApprovalPolicy<TID> | null>;

  /** Get all approval requests that have expired before the given date */
  getExpiredRequests(before: Date): Promise<IApprovalRequestBase<TID>[]>;

  /** Check if a file/folder has approval governance enabled */
  isApprovalGoverned(targetId: TID): Promise<boolean>;

  /** Check if auto-approve (rubber stamp) applies for an operation/target */
  getRubberStampConfig(operationType: string, targetId: TID): Promise<boolean>;
}
