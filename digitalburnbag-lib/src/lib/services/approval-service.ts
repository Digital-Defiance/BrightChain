import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ApprovalOperationType } from '../enumerations/approval-operation-type';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import {
  ApprovalAlreadyResolvedError,
  ApprovalRequestNotFoundError,
} from '../errors';
import type { IApprovalRequestBase } from '../interfaces/bases/approval-request';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type { IApprovalRepository } from '../interfaces/services/approval-repository';
import type {
  IApprovalRequestInput,
  IApprovalService,
  IApprovalStatus,
} from '../interfaces/services/approval-service';

/**
 * Dependencies injected into ApprovalService that come from other services.
 */
export interface IApprovalServiceDeps<TID extends PlatformID> {
  /** Notify eligible approvers about a pending request */
  notifyApprovers: (
    approverIds: TID[],
    request: IApprovalRequestBase<TID>,
  ) => Promise<void>;
  /** Execute the approved operation (e.g., destruction, share) */
  executeOperation: (request: IApprovalRequestBase<TID>) => Promise<void>;
  /** Record approval event on ledger */
  recordOnLedger: (metadata: Record<string, unknown>) => Promise<Uint8Array>;
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
}

/**
 * Manages approval-governed operations: multi-party approval workflows for
 * sensitive file operations such as destruction, external sharing, bulk
 * deletion, and ACL changes.
 *
 * Delegates persistence to an `IApprovalRepository`, which is implemented
 * in `digitalburnbag-api-lib` backed by BrightDB.
 */
export class ApprovalService<TID extends PlatformID>
  implements IApprovalService<TID>
{
  constructor(
    private readonly repository: IApprovalRepository<TID>,
    private readonly deps: IApprovalServiceDeps<TID>,
    private readonly generateId: () => TID,
  ) {}

  /**
   * Check if a target requires approval for the given operation.
   */
  async requiresApproval(
    targetId: TID,
    _operationType: ApprovalOperationType,
  ): Promise<boolean> {
    return this.repository.isApprovalGoverned(targetId);
  }

  /**
   * Create a new approval request.
   * Fetches the approval policy, creates a pending request, notifies
   * eligible approvers, and logs an audit entry.
   */
  async requestApproval(
    params: IApprovalRequestInput<TID>,
  ): Promise<IApprovalRequestBase<TID>> {
    const policy = await this.repository.getApprovalPolicy(
      params.targetId,
      params.operationType,
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const request: IApprovalRequestBase<TID> = {
      id: this.generateId(),
      operationType: params.operationType,
      targetId: params.targetId,
      targetType: params.targetType,
      requesterId: params.requesterId,
      requiredApprovals: policy?.requiredApprovals ?? 1,
      approvals: [],
      rejections: [],
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    };

    await this.repository.createApprovalRequest(request);

    if (policy) {
      await this.deps.notifyApprovers(policy.eligibleApproverIds, request);
    }

    await this.deps.recordOnLedger({
      operation: 'quorum_requested',
      requestId: String(request.id),
      operationType: params.operationType,
      targetId: String(params.targetId),
      requesterId: String(params.requesterId),
    });

    await this.deps.onAuditLog?.({
      operationType: FileAuditOperationType.ApprovalRequested,
      actorId: params.requesterId,
      targetId: params.targetId,
      targetType: params.targetType,
      metadata: {
        requestId: String(request.id),
        operationType: params.operationType,
        requiredApprovals: request.requiredApprovals,
      },
    });

    return request;
  }

  /**
   * Cast an approval vote on an approval request.
   * If the approval threshold is met, the request is marked as approved
   * and the operation is executed.
   */
  async approve(
    requestId: TID,
    approverId: TID,
    signature: Uint8Array,
  ): Promise<IApprovalStatus> {
    const request = await this.repository.getApprovalRequest(requestId);
    if (!request) {
      throw new ApprovalRequestNotFoundError(String(requestId));
    }
    if (request.status !== 'pending') {
      throw new ApprovalAlreadyResolvedError(String(requestId), request.status);
    }

    request.approvals.push({
      voterId: approverId,
      signature,
      votedAt: new Date().toISOString(),
    });

    const approvalMet = request.approvals.length >= request.requiredApprovals;

    if (approvalMet) {
      request.status = 'approved';
      request.resolvedAt = new Date().toISOString();
    }

    await this.repository.updateApprovalRequest(requestId, {
      approvals: request.approvals,
      status: request.status,
      resolvedAt: request.resolvedAt,
    });

    if (approvalMet) {
      await this.executeApproved(requestId);
    }

    await this.deps.recordOnLedger({
      operation: 'quorum_approved',
      requestId: String(requestId),
      approverId: String(approverId),
      approvalsReceived: request.approvals.length,
      approvalMet,
    });

    await this.deps.onAuditLog?.({
      operationType: FileAuditOperationType.ApprovalApproved,
      actorId: approverId,
      targetId: request.targetId,
      targetType: request.targetType,
      metadata: {
        requestId: String(requestId),
        approvalsReceived: request.approvals.length,
        approvalsRequired: request.requiredApprovals,
        approvalMet,
      },
    });

    return {
      requestId: String(requestId),
      status: request.status,
      approvalsReceived: request.approvals.length,
      approvalsRequired: request.requiredApprovals,
    };
  }

  /**
   * Reject an approval request.
   */
  async reject(
    requestId: TID,
    approverId: TID,
    reason: string,
  ): Promise<IApprovalStatus> {
    const request = await this.repository.getApprovalRequest(requestId);
    if (!request) {
      throw new ApprovalRequestNotFoundError(String(requestId));
    }
    if (request.status !== 'pending') {
      throw new ApprovalAlreadyResolvedError(String(requestId), request.status);
    }

    request.rejections.push({
      voterId: approverId,
      signature: new Uint8Array(0),
      reason,
      votedAt: new Date().toISOString(),
    });

    request.status = 'rejected';
    request.resolvedAt = new Date().toISOString();

    await this.repository.updateApprovalRequest(requestId, {
      rejections: request.rejections,
      status: request.status,
      resolvedAt: request.resolvedAt,
    });

    await this.deps.recordOnLedger({
      operation: 'quorum_rejected',
      requestId: String(requestId),
      approverId: String(approverId),
      reason,
    });

    await this.deps.onAuditLog?.({
      operationType: FileAuditOperationType.ApprovalRejected,
      actorId: approverId,
      targetId: request.targetId,
      targetType: request.targetType,
      metadata: {
        requestId: String(requestId),
        reason,
      },
    });

    return {
      requestId: String(requestId),
      status: request.status,
      approvalsReceived: request.approvals.length,
      approvalsRequired: request.requiredApprovals,
    };
  }

  /**
   * Check if an operation is rubber-stamped (auto-approved) for a target.
   */
  async isRubberStamped(
    operationType: ApprovalOperationType,
    targetId: TID,
  ): Promise<boolean> {
    return this.repository.getRubberStampConfig(operationType, targetId);
  }

  /**
   * Execute an approved approval request.
   * Verifies the request is in 'approved' status, then delegates to
   * the injected executeOperation dependency.
   */
  async executeApproved(requestId: TID): Promise<void> {
    const request = await this.repository.getApprovalRequest(requestId);
    if (!request) {
      throw new ApprovalRequestNotFoundError(String(requestId));
    }
    if (request.status !== 'approved') {
      throw new ApprovalAlreadyResolvedError(String(requestId), request.status);
    }

    await this.deps.executeOperation(request);

    await this.deps.recordOnLedger({
      operation: 'quorum_executed',
      requestId: String(requestId),
      operationType: request.operationType,
      targetId: String(request.targetId),
    });

    await this.deps.onAuditLog?.({
      operationType: FileAuditOperationType.ApprovalApproved,
      actorId: request.requesterId,
      targetId: request.targetId,
      targetType: request.targetType,
      metadata: {
        requestId: String(requestId),
        executed: true,
      },
    });
  }

  /**
   * Expire stale approval requests whose expiration date has passed.
   * Returns the number of requests expired.
   */
  async expireStaleRequests(): Promise<number> {
    const now = new Date();
    const expired = await this.repository.getExpiredRequests(now);

    for (const request of expired) {
      await this.repository.updateApprovalRequest(request.id, {
        status: 'expired',
        resolvedAt: now.toISOString(),
      });

      await this.deps.recordOnLedger({
        operation: 'quorum_expired',
        requestId: String(request.id),
        operationType: request.operationType,
        targetId: String(request.targetId),
      });

      await this.deps.onAuditLog?.({
        operationType: FileAuditOperationType.ApprovalExpired,
        actorId: request.requesterId,
        targetId: request.targetId,
        targetType: request.targetType,
        metadata: {
          requestId: String(request.id),
        },
      });
    }

    return expired.length;
  }
}
