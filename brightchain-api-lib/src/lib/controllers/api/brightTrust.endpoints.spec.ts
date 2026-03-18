/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Unit tests for BrightTrust API endpoints (Task 22).
 *
 * Tests request validation, success responses, error responses, and
 * service unavailability for the new BrightTrust bootstrap redesign endpoints:
 * - POST /api/brightTrust/proposals
 * - GET /api/brightTrust/proposals/:proposalId
 * - GET /api/brightTrust/metrics
 * - GET /api/brightTrust/epochs/:number
 * - GET /api/brightTrust/status
 * - GET /api/brightTrust/audit/verify
 * - GET /api/brightTrust/aliases/:name
 *
 * @see Requirements 1, 5, 7, 10, 12, 13, 15
 */

import {
  BrightTrustError,
  BrightTrustErrorType,
  BrightTrustOperationalMode,
  ProposalActionType,
  ProposalStatus,
} from '@brightchain/brightchain-lib';
import { BrightTrustController } from './brightTrust';

// === Mock Factories ===

function createMockStateMachine() {
  return {
    submitProposal: jest.fn(),
    getProposal: jest.fn(),
    getMetrics: jest.fn(),
    getEpoch: jest.fn(),
    getCurrentEpoch: jest.fn(),
    getMode: jest.fn(),
  };
}

function createMockAuditLogService() {
  return {
    verifyChain: jest.fn(),
    appendEntry: jest.fn(),
  };
}

function createMockApplication() {
  const mockSession = {
    withTransaction: jest.fn(async (cb: (s: unknown) => Promise<unknown>) =>
      cb(undefined),
    ),
    endSession: jest.fn(),
  } as any;

  return {
    services: { get: jest.fn(() => null) },
    db: { connection: { startSession: jest.fn(async () => mockSession) } },
    environment: {
      mongo: { useTransactions: false },
      blockStorePath: 'tmp/test-blockstore',
    },
    constants: {},
    getController: jest.fn(),
    setController: jest.fn(),
  };
}

// === Test Suite ===

describe('BrightTrustController - Bootstrap Redesign Endpoints', () => {
  let controller: BrightTrustController<any>;
  let mockStateMachine: ReturnType<typeof createMockStateMachine>;
  let mockAuditLogService: ReturnType<typeof createMockAuditLogService>;

  beforeEach(() => {
    mockStateMachine = createMockStateMachine();
    mockAuditLogService = createMockAuditLogService();
    controller = new BrightTrustController(createMockApplication() as any);
    controller.setBrightTrustStateMachine(mockStateMachine as any);
    controller.setAuditLogService(mockAuditLogService as any);
  });

  // === POST /api/brightTrust/proposals ===

  describe('handleSubmitProposal', () => {
    const validBody = {
      description: 'Add a new member to the BrightTrust',
      actionType: ProposalActionType.ADD_MEMBER,
      actionPayload: { memberId: 'abc123' },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    it('should return 201 with proposal data on success', async () => {
      const mockProposal = {
        id: 'proposal-1',
        ...validBody,
        proposerMemberId: 'member-1',
        status: ProposalStatus.Pending,
        requiredThreshold: 2,
        expiresAt: new Date(validBody.expiresAt),
        createdAt: new Date(),
        epochNumber: 1,
      };
      mockStateMachine.submitProposal.mockResolvedValue(mockProposal);

      const result = await (controller as any).handleSubmitProposal({
        body: validBody,
      });

      expect(result.statusCode).toBe(201);
      expect(result.response.proposal.id).toBe('proposal-1');
      expect(result.response.proposal.status).toBe(ProposalStatus.Pending);
      expect(mockStateMachine.submitProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          description: validBody.description,
          actionType: validBody.actionType,
        }),
      );
    });

    it('should return 400 when description is missing', async () => {
      const result = await (controller as any).handleSubmitProposal({
        body: { ...validBody, description: '' },
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when description exceeds 4096 chars', async () => {
      const result = await (controller as any).handleSubmitProposal({
        body: { ...validBody, description: 'x'.repeat(4097) },
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when actionType is invalid', async () => {
      const result = await (controller as any).handleSubmitProposal({
        body: { ...validBody, actionType: 'INVALID_TYPE' },
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when actionPayload is missing', async () => {
      const result = await (controller as any).handleSubmitProposal({
        body: { ...validBody, actionPayload: undefined },
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when expiresAt is missing', async () => {
      const result = await (controller as any).handleSubmitProposal({
        body: { ...validBody, expiresAt: undefined },
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when expiresAt is not a valid date', async () => {
      const result = await (controller as any).handleSubmitProposal({
        body: { ...validBody, expiresAt: 'not-a-date' },
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 503 when state machine is not set', async () => {
      const noSmController = new BrightTrustController(
        createMockApplication() as any,
      );
      const result = await (noSmController as any).handleSubmitProposal({
        body: validBody,
      });
      expect(result.statusCode).toBe(503);
    });

    it('should handle BrightTrustError from state machine', async () => {
      mockStateMachine.submitProposal.mockRejectedValue(
        new BrightTrustError(BrightTrustErrorType.MissingAttachment),
      );
      const result = await (controller as any).handleSubmitProposal({
        body: validBody,
      });
      // mapBrightTrustError returns an error response
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // === GET /api/brightTrust/proposals/:proposalId ===

  describe('handleGetProposal', () => {
    it('should return 200 with proposal and votes on success', async () => {
      const mockProposal = {
        id: 'proposal-1',
        description: 'Test proposal',
        actionType: ProposalActionType.ADD_MEMBER,
        actionPayload: {},
        proposerMemberId: 'member-1',
        status: ProposalStatus.Pending,
        requiredThreshold: 2,
        expiresAt: new Date(),
        createdAt: new Date(),
        epochNumber: 1,
      };
      mockStateMachine.getProposal.mockResolvedValue(mockProposal);

      const result = await (controller as any).handleGetProposal({
        params: { proposalId: 'proposal-1' },
      });

      expect(result.statusCode).toBe(200);
      expect(result.response.proposal.id).toBe('proposal-1');
      expect(result.response.votes).toEqual([]);
    });

    it('should return 404 when proposal not found', async () => {
      mockStateMachine.getProposal.mockResolvedValue(null);

      const result = await (controller as any).handleGetProposal({
        params: { proposalId: 'nonexistent' },
      });

      expect(result.statusCode).toBe(404);
    });

    it('should return 400 when proposalId is missing', async () => {
      const result = await (controller as any).handleGetProposal({
        params: {},
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 503 when state machine is not set', async () => {
      const noSmController = new BrightTrustController(
        createMockApplication() as any,
      );
      const result = await (noSmController as any).handleGetProposal({
        params: { proposalId: 'proposal-1' },
      });
      expect(result.statusCode).toBe(503);
    });
  });

  // === GET /api/brightTrust/metrics ===

  describe('handleGetMetrics', () => {
    it('should return 200 with metrics data', async () => {
      const mockMetrics = {
        proposals: { total: 10, pending: 3 },
        votes: { latency_ms: 150 },
        redistribution: { progress: -1, failures: 0 },
        members: { active: 5 },
        epoch: { current: 3 },
        expiration: { last_run: null, deleted_total: 0 },
      };
      mockStateMachine.getMetrics.mockResolvedValue(mockMetrics);

      const result = await (controller as any).handleGetMetrics({});

      expect(result.statusCode).toBe(200);
      expect(result.response.metrics).toEqual(mockMetrics);
    });

    it('should return 503 when state machine is not set', async () => {
      const noSmController = new BrightTrustController(
        createMockApplication() as any,
      );
      const result = await (noSmController as any).handleGetMetrics({});
      expect(result.statusCode).toBe(503);
    });
  });

  // === GET /api/brightTrust/epochs/:number ===

  describe('handleGetEpoch', () => {
    it('should return 200 with epoch data', async () => {
      const mockEpoch = {
        epochNumber: 2,
        memberIds: ['m1', 'm2', 'm3'],
        threshold: 2,
        mode: BrightTrustOperationalMode.BrightTrust,
        createdAt: new Date(),
        previousEpochNumber: 1,
      };
      mockStateMachine.getEpoch.mockResolvedValue(mockEpoch);

      const result = await (controller as any).handleGetEpoch({
        params: { number: '2' },
      });

      expect(result.statusCode).toBe(200);
      expect(result.response.epoch.epochNumber).toBe(2);
      expect(result.response.epoch.memberIds).toEqual(['m1', 'm2', 'm3']);
      expect(result.response.epoch.threshold).toBe(2);
    });

    it('should return 404 when epoch not found', async () => {
      mockStateMachine.getEpoch.mockResolvedValue(null);

      const result = await (controller as any).handleGetEpoch({
        params: { number: '999' },
      });

      expect(result.statusCode).toBe(404);
    });

    it('should return 400 when epoch number is not a positive integer', async () => {
      const result = await (controller as any).handleGetEpoch({
        params: { number: 'abc' },
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when epoch number is zero', async () => {
      const result = await (controller as any).handleGetEpoch({
        params: { number: '0' },
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when epoch number is negative', async () => {
      const result = await (controller as any).handleGetEpoch({
        params: { number: '-1' },
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 503 when state machine is not set', async () => {
      const noSmController = new BrightTrustController(
        createMockApplication() as any,
      );
      const result = await (noSmController as any).handleGetEpoch({
        params: { number: '1' },
      });
      expect(result.statusCode).toBe(503);
    });
  });

  // === GET /api/brightTrust/status ===

  describe('handleGetStatus', () => {
    it('should return 200 with status data', async () => {
      mockStateMachine.getMode.mockResolvedValue(
        BrightTrustOperationalMode.BrightTrust,
      );
      mockStateMachine.getCurrentEpoch.mockResolvedValue({
        epochNumber: 3,
        memberIds: ['m1', 'm2', 'm3', 'm4'],
        threshold: 3,
        mode: BrightTrustOperationalMode.BrightTrust,
        createdAt: new Date(),
      });

      const result = await (controller as any).handleGetStatus({});

      expect(result.statusCode).toBe(200);
      expect(result.response.status.mode).toBe(
        BrightTrustOperationalMode.BrightTrust,
      );
      expect(result.response.status.epochNumber).toBe(3);
      expect(result.response.status.memberCount).toBe(4);
      expect(result.response.status.threshold).toBe(3);
    });

    it('should return bootstrap mode when in bootstrap', async () => {
      mockStateMachine.getMode.mockResolvedValue(
        BrightTrustOperationalMode.Bootstrap,
      );
      mockStateMachine.getCurrentEpoch.mockResolvedValue({
        epochNumber: 1,
        memberIds: ['m1'],
        threshold: 1,
        mode: BrightTrustOperationalMode.Bootstrap,
        createdAt: new Date(),
      });

      const result = await (controller as any).handleGetStatus({});

      expect(result.statusCode).toBe(200);
      expect(result.response.status.mode).toBe(
        BrightTrustOperationalMode.Bootstrap,
      );
      expect(result.response.status.memberCount).toBe(1);
    });

    it('should return 503 when state machine is not set', async () => {
      const noSmController = new BrightTrustController(
        createMockApplication() as any,
      );
      const result = await (noSmController as any).handleGetStatus({});
      expect(result.statusCode).toBe(503);
    });
  });

  // === GET /api/brightTrust/audit/verify ===

  describe('handleAuditVerify', () => {
    it('should return 200 with verification result', async () => {
      const result = await (controller as any).handleAuditVerify({});

      expect(result.statusCode).toBe(200);
      expect(result.response.verification).toBeDefined();
      expect(result.response.verification.valid).toBe(true);
    });

    it('should return 503 when audit log service is not set', async () => {
      const noAuditController = new BrightTrustController(
        createMockApplication() as any,
      );
      noAuditController.setBrightTrustStateMachine(mockStateMachine as any);
      // Do NOT set audit log service

      const result = await (noAuditController as any).handleAuditVerify({});
      expect(result.statusCode).toBe(503);
    });
  });

  // === GET /api/brightTrust/aliases/:name ===

  describe('handleGetAlias', () => {
    it('should return 200 with alias availability', async () => {
      const result = await (controller as any).handleGetAlias({
        params: { name: 'test-alias' },
      });

      expect(result.statusCode).toBe(200);
      expect(result.response.alias.aliasName).toBe('test-alias');
      expect(typeof result.response.alias.available).toBe('boolean');
    });

    it('should return 400 when alias name is missing', async () => {
      const result = await (controller as any).handleGetAlias({
        params: {},
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 503 when state machine is not set', async () => {
      const noSmController = new BrightTrustController(
        createMockApplication() as any,
      );
      const result = await (noSmController as any).handleGetAlias({
        params: { name: 'test-alias' },
      });
      expect(result.statusCode).toBe(503);
    });
  });
});
