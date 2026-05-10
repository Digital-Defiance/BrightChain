import { ApprovalOperationType } from '../enumerations/approval-operation-type';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import {
  ApprovalAlreadyResolvedError,
  ApprovalRequestNotFoundError,
} from '../errors';
import type { IApprovalRequestBase } from '../interfaces/bases/approval-request';
import type {
  IApprovalPolicy,
  IApprovalRepository,
} from '../interfaces/services/approval-repository';
import type { IApprovalRequest } from '../interfaces/services/approval-service';
import {
  ApprovalService,
  IApprovalServiceDeps,
} from '../services/approval-service';

// ── Helpers ─────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function makeMockRepository(): jest.Mocked<IApprovalRepository<string>> {
  return {
    getApprovalRequest: jest.fn(),
    createApprovalRequest: jest.fn(),
    updateApprovalRequest: jest.fn(),
    getApprovalPolicy: jest.fn(),
    getExpiredRequests: jest.fn(),
    isApprovalGoverned: jest.fn(),
    getRubberStampConfig: jest.fn(),
  };
}

function makeMockDeps(): jest.Mocked<IApprovalServiceDeps<string>> {
  return {
    notifyApprovers: jest.fn().mockResolvedValue(undefined),
    executeOperation: jest.fn().mockResolvedValue(undefined),
    recordOnLedger: jest.fn().mockResolvedValue(new Uint8Array([7, 8, 9])),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
  };
}

function makeApprovalRequest(
  overrides: Partial<IApprovalRequestBase<string>> = {},
): IApprovalRequestBase<string> {
  return {
    id: 'request-1',
    operationType: ApprovalOperationType.Destruction,
    targetId: 'file-1',
    targetType: 'file',
    requesterId: 'user-1',
    requiredApprovals: 2,
    approvals: [],
    rejections: [],
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeApprovalPolicy(
  overrides: Partial<IApprovalPolicy<string>> = {},
): IApprovalPolicy<string> {
  return {
    targetId: 'file-1',
    operationType: ApprovalOperationType.Destruction,
    policyType: 'threshold',
    requiredApprovals: 2,
    eligibleApproverIds: ['approver-1', 'approver-2', 'approver-3'],
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('ApprovalService', () => {
  let mockRepo: jest.Mocked<IApprovalRepository<string>>;
  let mockDeps: jest.Mocked<IApprovalServiceDeps<string>>;
  let service: ApprovalService<string>;

  beforeEach(() => {
    idCounter = 0;
    mockRepo = makeMockRepository();
    mockDeps = makeMockDeps();
    service = new ApprovalService(mockRepo, mockDeps, generateId);
  });

  // ── requiresApproval ──────────────────────────────────────────────

  describe('requiresApproval', () => {
    it('should return true when target is quorum-governed', async () => {
      mockRepo.isApprovalGoverned.mockResolvedValue(true);

      const result = await service.requiresApproval(
        'file-1',
        ApprovalOperationType.Destruction,
      );

      expect(result).toBe(true);
      expect(mockRepo.isApprovalGoverned).toHaveBeenCalledWith('file-1');
    });

    it('should return false when target is not quorum-governed', async () => {
      mockRepo.isApprovalGoverned.mockResolvedValue(false);

      const result = await service.requiresApproval(
        'file-2',
        ApprovalOperationType.Destruction,
      );

      expect(result).toBe(false);
      expect(mockRepo.isApprovalGoverned).toHaveBeenCalledWith('file-2');
    });
  });

  // ── requestApproval ─────────────────────────────────────────────

  describe('requestApproval', () => {
    const approvalParams: IApprovalRequest<string> = {
      operationType: ApprovalOperationType.Destruction,
      targetId: 'file-1',
      targetType: 'file',
      requesterId: 'user-1',
    };

    it('should create a pending quorum request', async () => {
      mockRepo.getApprovalPolicy.mockResolvedValue(makeApprovalPolicy());

      const request = await service.requestApproval(approvalParams);

      expect(request.id).toBe('id-1');
      expect(request.status).toBe('pending');
      expect(request.operationType).toBe(ApprovalOperationType.Destruction);
      expect(request.targetId).toBe('file-1');
      expect(request.requesterId).toBe('user-1');
      expect(request.requiredApprovals).toBe(2);
      expect(request.approvals).toEqual([]);
      expect(request.rejections).toEqual([]);
      expect(mockRepo.createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'id-1',
          status: 'pending',
        }),
      );
    });

    it('should notify eligible approvers', async () => {
      const policy = makeApprovalPolicy();
      mockRepo.getApprovalPolicy.mockResolvedValue(policy);

      await service.requestApproval(approvalParams);

      expect(mockDeps.notifyApprovers).toHaveBeenCalledWith(
        policy.eligibleApproverIds,
        expect.objectContaining({ id: 'id-1' }),
      );
    });

    it('should log audit entry', async () => {
      mockRepo.getApprovalPolicy.mockResolvedValue(makeApprovalPolicy());

      await service.requestApproval(approvalParams);

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.ApprovalRequested,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
          metadata: expect.objectContaining({
            requestId: 'id-1',
            operationType: ApprovalOperationType.Destruction,
            requiredApprovals: 2,
          }),
        }),
      );
    });

    it('should record on ledger', async () => {
      mockRepo.getApprovalPolicy.mockResolvedValue(makeApprovalPolicy());

      await service.requestApproval(approvalParams);

      expect(mockDeps.recordOnLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'quorum_requested',
          requestId: 'id-1',
          operationType: ApprovalOperationType.Destruction,
          targetId: 'file-1',
          requesterId: 'user-1',
        }),
      );
    });
  });

  // ── approve ─────────────────────────────────────────────────────

  describe('approve', () => {
    it('should add approval vote to request', async () => {
      const pendingRequest = makeApprovalRequest();
      mockRepo.getApprovalRequest.mockResolvedValue(pendingRequest);

      const signature = new Uint8Array([1, 2, 3]);
      await service.approve('request-1', 'approver-1', signature);

      expect(mockRepo.updateApprovalRequest).toHaveBeenCalledWith(
        'request-1',
        expect.objectContaining({
          approvals: expect.arrayContaining([
            expect.objectContaining({
              voterId: 'approver-1',
              signature,
            }),
          ]),
        }),
      );
    });

    it('should trigger operation execution when quorum is met', async () => {
      // Request already has 1 approval, needs 2 total
      const pendingRequest = makeApprovalRequest({
        approvals: [
          {
            voterId: 'approver-1',
            signature: new Uint8Array([1]),
            votedAt: new Date().toISOString(),
          },
        ],
      });
      mockRepo.getApprovalRequest
        // First call from approve()
        .mockResolvedValueOnce(pendingRequest)
        // Second call from executeApproved() — must return approved status
        .mockResolvedValueOnce({
          ...pendingRequest,
          status: 'approved',
          approvals: [
            ...pendingRequest.approvals,
            {
              voterId: 'approver-2',
              signature: new Uint8Array([2]),
              votedAt: expect.any(String),
            },
          ],
        });

      await service.approve('request-1', 'approver-2', new Uint8Array([2]));

      expect(mockDeps.executeOperation).toHaveBeenCalled();
    });

    it('should not execute when quorum is not yet met', async () => {
      // Needs 2 approvals, currently 0
      const pendingRequest = makeApprovalRequest({ requiredApprovals: 2 });
      mockRepo.getApprovalRequest.mockResolvedValue(pendingRequest);

      await service.approve('request-1', 'approver-1', new Uint8Array([1]));

      expect(mockDeps.executeOperation).not.toHaveBeenCalled();
    });

    it('should throw ApprovalRequestNotFoundError when request not found', async () => {
      mockRepo.getApprovalRequest.mockResolvedValue(null);

      await expect(
        service.approve('nonexistent', 'approver-1', new Uint8Array([1])),
      ).rejects.toThrow(ApprovalRequestNotFoundError);
    });

    it('should throw ApprovalAlreadyResolvedError when request already resolved', async () => {
      const resolvedRequest = makeApprovalRequest({ status: 'approved' });
      mockRepo.getApprovalRequest.mockResolvedValue(resolvedRequest);

      await expect(
        service.approve('request-1', 'approver-1', new Uint8Array([1])),
      ).rejects.toThrow(ApprovalAlreadyResolvedError);
    });
  });

  // ── reject ──────────────────────────────────────────────────────

  describe('reject', () => {
    it('should set request status to rejected', async () => {
      const pendingRequest = makeApprovalRequest();
      mockRepo.getApprovalRequest.mockResolvedValue(pendingRequest);

      const result = await service.reject(
        'request-1',
        'approver-1',
        'Not appropriate',
      );

      expect(result.status).toBe('rejected');
      expect(mockRepo.updateApprovalRequest).toHaveBeenCalledWith(
        'request-1',
        expect.objectContaining({
          status: 'rejected',
          rejections: expect.arrayContaining([
            expect.objectContaining({
              voterId: 'approver-1',
              reason: 'Not appropriate',
            }),
          ]),
        }),
      );
    });

    it('should throw ApprovalRequestNotFoundError when request not found', async () => {
      mockRepo.getApprovalRequest.mockResolvedValue(null);

      await expect(
        service.reject('nonexistent', 'approver-1', 'reason'),
      ).rejects.toThrow(ApprovalRequestNotFoundError);
    });

    it('should throw ApprovalAlreadyResolvedError when request already resolved', async () => {
      const resolvedRequest = makeApprovalRequest({ status: 'rejected' });
      mockRepo.getApprovalRequest.mockResolvedValue(resolvedRequest);

      await expect(
        service.reject('request-1', 'approver-1', 'reason'),
      ).rejects.toThrow(ApprovalAlreadyResolvedError);
    });
  });

  // ── isRubberStamped ─────────────────────────────────────────────

  describe('isRubberStamped', () => {
    it('should return true when rubber-stamp is configured', async () => {
      mockRepo.getRubberStampConfig.mockResolvedValue(true);

      const result = await service.isRubberStamped(
        ApprovalOperationType.ExternalShare,
        'file-1',
      );

      expect(result).toBe(true);
      expect(mockRepo.getRubberStampConfig).toHaveBeenCalledWith(
        ApprovalOperationType.ExternalShare,
        'file-1',
      );
    });

    it('should return false when rubber-stamp is not configured', async () => {
      mockRepo.getRubberStampConfig.mockResolvedValue(false);

      const result = await service.isRubberStamped(
        ApprovalOperationType.Destruction,
        'file-1',
      );

      expect(result).toBe(false);
    });
  });

  // ── executeApproved ─────────────────────────────────────────────

  describe('executeApproved', () => {
    it('should execute the approved operation', async () => {
      const approvedRequest = makeApprovalRequest({ status: 'approved' });
      mockRepo.getApprovalRequest.mockResolvedValue(approvedRequest);

      await service.executeApproved('request-1');

      expect(mockDeps.executeOperation).toHaveBeenCalledWith(approvedRequest);
      expect(mockDeps.recordOnLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'quorum_executed',
          requestId: 'request-1',
        }),
      );
      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.ApprovalApproved,
          metadata: expect.objectContaining({ executed: true }),
        }),
      );
    });

    it('should throw ApprovalRequestNotFoundError when request not found', async () => {
      mockRepo.getApprovalRequest.mockResolvedValue(null);

      await expect(service.executeApproved('nonexistent')).rejects.toThrow(
        ApprovalRequestNotFoundError,
      );
    });

    it('should throw ApprovalAlreadyResolvedError when request is not approved', async () => {
      const pendingRequest = makeApprovalRequest({ status: 'pending' });
      mockRepo.getApprovalRequest.mockResolvedValue(pendingRequest);

      await expect(service.executeApproved('request-1')).rejects.toThrow(
        ApprovalAlreadyResolvedError,
      );
    });
  });

  // ── expireStaleRequests ─────────────────────────────────────────

  describe('expireStaleRequests', () => {
    it('should expire pending requests past their expiration date', async () => {
      const expiredRequests = [
        makeApprovalRequest({
          id: 'expired-1',
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        }),
        makeApprovalRequest({
          id: 'expired-2',
          expiresAt: new Date(Date.now() - 2000).toISOString(),
        }),
      ];
      mockRepo.getExpiredRequests.mockResolvedValue(expiredRequests);

      await service.expireStaleRequests();

      expect(mockRepo.updateApprovalRequest).toHaveBeenCalledWith(
        'expired-1',
        expect.objectContaining({ status: 'expired' }),
      );
      expect(mockRepo.updateApprovalRequest).toHaveBeenCalledWith(
        'expired-2',
        expect.objectContaining({ status: 'expired' }),
      );
      expect(mockDeps.onAuditLog).toHaveBeenCalledTimes(2);
    });

    it('should return count of expired requests', async () => {
      const expiredRequests = [
        makeApprovalRequest({ id: 'expired-1' }),
        makeApprovalRequest({ id: 'expired-2' }),
        makeApprovalRequest({ id: 'expired-3' }),
      ];
      mockRepo.getExpiredRequests.mockResolvedValue(expiredRequests);

      const count = await service.expireStaleRequests();

      expect(count).toBe(3);
    });

    it('should return 0 when no expired requests', async () => {
      mockRepo.getExpiredRequests.mockResolvedValue([]);

      const count = await service.expireStaleRequests();

      expect(count).toBe(0);
      expect(mockRepo.updateApprovalRequest).not.toHaveBeenCalled();
    });
  });
});
