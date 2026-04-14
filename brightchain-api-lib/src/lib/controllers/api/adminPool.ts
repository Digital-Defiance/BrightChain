/**
 * @fileoverview Admin Pool Controller
 *
 * REST endpoints for managing pool node admission:
 * - GET  /api/admin/pool/pending-nodes — list pending join requests
 * - POST /api/admin/pool/approve-node  — approve a pending request
 * - POST /api/admin/pool/deny-node     — deny a pending request
 *
 * @see .kiro/specs/member-pool-security/design.md — Phase 2
 */

import type { IAclDocument } from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import type { NextFunction, Request, Response, Router } from 'express';
import type {
  IPendingJoinRequest,
  NodeAdmissionService,
} from '../../services/nodeAdmissionService';

/**
 * Configuration for the AdminPoolController.
 */
export interface IAdminPoolControllerConfig {
  /** The node admission service instance */
  admissionService: NodeAdmissionService;
  /** The current pool ACL (updated after approvals) */
  getCurrentAcl: () => IAclDocument | null;
  /** The admin's private key for signing ACL updates */
  adminPrivateKey: Uint8Array;
  /** The BrightDb instance for persisting ACL changes */
  db: BrightDb;
  /** Check if the requesting user is an admin */
  isAdmin: (req: Request) => boolean;
}

/**
 * Register admin pool endpoints on an Express router or app.
 *
 * @param app - Express app or router to register routes on
 * @param config - Controller configuration
 */
export function registerAdminPoolRoutes(
  app: Router,
  config: IAdminPoolControllerConfig,
): void {
  const { admissionService, getCurrentAcl, adminPrivateKey, db, isAdmin } =
    config;

  /**
   * GET /api/admin/pool/pending-nodes
   * Returns the list of pending join requests.
   */
  app.get(
    '/api/admin/pool/pending-nodes',
    async (req: Request, res: Response, _next: NextFunction) => {
      if (!isAdmin(req)) {
        res.status(403).json({ message: 'Admin access required' });
        return;
      }

      const pending = admissionService.getPendingRequests();
      res.json({
        message: 'OK',
        pendingNodes: pending.map((p: IPendingJoinRequest) => ({
          nodeId: p.requestingNodeId,
          publicKey: p.requestingPublicKey,
          message: p.message,
          receivedAt: p.receivedAt.toISOString(),
        })),
        count: pending.length,
      });
    },
  );

  /**
   * POST /api/admin/pool/approve-node
   * Body: { nodeId: string }
   * Approves a pending join request.
   */
  app.post(
    '/api/admin/pool/approve-node',
    async (req: Request, res: Response, _next: NextFunction) => {
      if (!isAdmin(req)) {
        res.status(403).json({ message: 'Admin access required' });
        return;
      }

      const { nodeId } = req.body as { nodeId?: string };
      if (!nodeId) {
        res.status(400).json({ message: 'nodeId is required' });
        return;
      }

      const currentAcl = getCurrentAcl();
      if (!currentAcl) {
        res.status(503).json({ message: 'Pool security not initialized' });
        return;
      }

      const result = await admissionService.approveJoinRequest(
        nodeId,
        currentAcl,
        adminPrivateKey,
        db,
      );

      if (result.success) {
        res.json({
          message: 'Node approved',
          nodeId,
          aclVersion: result.updatedAcl?.version,
        });
      } else {
        res.status(400).json({
          message: result.error ?? 'Approval failed',
        });
      }
    },
  );

  /**
   * POST /api/admin/pool/deny-node
   * Body: { nodeId: string, reason?: string }
   * Denies a pending join request.
   */
  app.post(
    '/api/admin/pool/deny-node',
    async (req: Request, res: Response, _next: NextFunction) => {
      if (!isAdmin(req)) {
        res.status(403).json({ message: 'Admin access required' });
        return;
      }

      const { nodeId, reason } = req.body as {
        nodeId?: string;
        reason?: string;
      };
      if (!nodeId) {
        res.status(400).json({ message: 'nodeId is required' });
        return;
      }

      await admissionService.denyJoinRequest(nodeId, reason);
      res.json({ message: 'Node denied', nodeId });
    },
  );
}
