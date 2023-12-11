/**
 * FriendsController — Express Router factory for the Friends system.
 *
 * Creates a standalone Express Router with all friend-related routes.
 * Routes are mounted at `/friends` by the consuming application.
 *
 * Maps FriendsServiceError codes to HTTP status codes:
 *   SELF_REQUEST_NOT_ALLOWED → 400
 *   ALREADY_FRIENDS          → 409
 *   REQUEST_ALREADY_EXISTS   → 409
 *   REQUEST_NOT_FOUND        → 404
 *   NOT_FRIENDS              → 404
 *   USER_BLOCKED             → 403
 *   UNAUTHORIZED             → 403
 *
 * @see Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  BrightChainStrings,
  FriendsErrorCode,
  FriendsServiceError,
  type IFriendsService,
} from '@brightchain/brightchain-lib';
import { translate } from '@brightchain/brightchain-lib';

// ── Error code → HTTP status mapping ───────────────────────────────────

const errorCodeToHttpStatus: Record<FriendsErrorCode, number> = {
  [FriendsErrorCode.SelfRequestNotAllowed]: 400,
  [FriendsErrorCode.AlreadyFriends]: 409,
  [FriendsErrorCode.RequestAlreadyExists]: 409,
  [FriendsErrorCode.RequestNotFound]: 404,
  [FriendsErrorCode.NotFriends]: 404,
  [FriendsErrorCode.UserBlocked]: 403,
  [FriendsErrorCode.Unauthorized]: 403,
};

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Extract the authenticated user ID from the request.
 * Expects JWT middleware to have populated `req.user.id`.
 */
function getUserId(req: Request): string | undefined {
  return (req as any).user?.id as string | undefined;
}

/**
 * Middleware that rejects unauthenticated requests with 401.
 */
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!getUserId(req)) {
    res.status(401).json({
      success: false,
      message: translate(BrightChainStrings.Friends_Unauthenticated),
    });
    return;
  }
  next();
}

/**
 * Handle express-validator validation errors.
 */
function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
}

/**
 * Catch FriendsServiceError and map to the appropriate HTTP status.
 */
function handleFriendsError(err: unknown, res: Response): void {
  if (err instanceof FriendsServiceError) {
    const status = errorCodeToHttpStatus[err.code] ?? 500;
    res.status(status).json({
      success: false,
      message: err.message,
    });
    return;
  }
  // Unexpected error — let Express error middleware handle it
  throw err;
}

// ── Router factory ─────────────────────────────────────────────────────

export function createFriendsRouter(friendsService: IFriendsService): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireAuth);

  // ── POST /requests — send friend request ─────────────────────────
  router.post(
    '/requests',
    [body('recipientId').isString().notEmpty()],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        const { recipientId, message } = req.body;
        const result = await friendsService.sendFriendRequest(
          userId,
          recipientId,
          message,
        );
        const response: any = {
          success: true,
          message: translate(BrightChainStrings.Friends_RequestSent),
          friendRequest: result.friendRequest,
        };
        if (result.autoAccepted && result.friendship) {
          response.friendship = result.friendship;
          response.message = translate(
            BrightChainStrings.Friends_RequestAccepted,
          );
        }
        res.status(201).json(response);
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  // ── POST /requests/:requestId/accept ─────────────────────────────
  router.post(
    '/requests/:requestId/accept',
    [param('requestId').isString().notEmpty()],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        await friendsService.acceptFriendRequest(userId, req.params['requestId'] as string);
        res.status(200).json({
          success: true,
          message: translate(BrightChainStrings.Friends_RequestAccepted),
        });
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  // ── POST /requests/:requestId/reject ─────────────────────────────
  router.post(
    '/requests/:requestId/reject',
    [param('requestId').isString().notEmpty()],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        await friendsService.rejectFriendRequest(userId, req.params['requestId'] as string);
        res.status(200).json({
          success: true,
          message: translate(BrightChainStrings.Friends_RequestRejected),
        });
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  // ── POST /requests/:requestId/cancel ─────────────────────────────
  router.post(
    '/requests/:requestId/cancel',
    [param('requestId').isString().notEmpty()],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        await friendsService.cancelFriendRequest(userId, req.params['requestId'] as string);
        res.status(200).json({
          success: true,
          message: translate(BrightChainStrings.Friends_RequestCancelled),
        });
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  // ── DELETE /:friendId — remove friend ────────────────────────────
  router.delete(
    '/:friendId',
    [param('friendId').isString().notEmpty()],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        await friendsService.removeFriend(userId, req.params['friendId'] as string);
        res.status(200).json({
          success: true,
          message: translate(BrightChainStrings.Friends_Removed),
        });
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  // ── GET / — list friends ─────────────────────────────────────────
  router.get(
    '/',
    [query('limit').optional().isInt({ min: 1, max: 100 })],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        const limitStr = req.query['limit'] as string | undefined;
        const limit = limitStr ? parseInt(limitStr, 10) : undefined;
        const cursor = req.query['cursor'] as string | undefined;
        const result = await friendsService.getFriends(userId, {
          limit,
          cursor,
        });
        res.status(200).json({
          success: true,
          message: translate(BrightChainStrings.Friends_ListRetrieved),
          items: result.items,
          hasMore: result.hasMore,
          totalCount: result.totalCount,
          cursor: undefined,
        });
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  // ── GET /requests/received — received requests ───────────────────
  router.get(
    '/requests/received',
    [query('limit').optional().isInt({ min: 1, max: 100 })],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        const limitStr = req.query['limit'] as string | undefined;
        const limit = limitStr ? parseInt(limitStr, 10) : undefined;
        const cursor = req.query['cursor'] as string | undefined;
        const result = await friendsService.getReceivedFriendRequests(userId, {
          limit,
          cursor,
        });
        res.status(200).json({
          success: true,
          message: translate(
            BrightChainStrings.Friends_ReceivedRequestsRetrieved,
          ),
          items: result.items,
          hasMore: result.hasMore,
        });
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  // ── GET /requests/sent — sent requests ───────────────────────────
  router.get(
    '/requests/sent',
    [query('limit').optional().isInt({ min: 1, max: 100 })],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        const limitStr = req.query['limit'] as string | undefined;
        const limit = limitStr ? parseInt(limitStr, 10) : undefined;
        const cursor = req.query['cursor'] as string | undefined;
        const result = await friendsService.getSentFriendRequests(userId, {
          limit,
          cursor,
        });
        res.status(200).json({
          success: true,
          message: translate(
            BrightChainStrings.Friends_SentRequestsRetrieved,
          ),
          items: result.items,
          hasMore: result.hasMore,
        });
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  // ── GET /status/:userId — friendship status ──────────────────────
  router.get(
    '/status/:userId',
    [param('userId').isString().notEmpty()],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        const status = await friendsService.getFriendshipStatus(
          userId,
          req.params['userId'] as string,
        );
        res.status(200).json({
          success: true,
          message: translate(BrightChainStrings.Friends_StatusRetrieved),
          status,
        });
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  // ── GET /mutual/:userId — mutual friends ─────────────────────────
  router.get(
    '/mutual/:userId',
    [
      param('userId').isString().notEmpty(),
      query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    handleValidationErrors,
    async (req: Request, res: Response) => {
      try {
        const userId = getUserId(req)!;
        const limitStr = req.query['limit'] as string | undefined;
        const limit = limitStr ? parseInt(limitStr, 10) : undefined;
        const cursor = req.query['cursor'] as string | undefined;
        const result = await friendsService.getMutualFriends(
          userId,
          req.params['userId'] as string,
          { limit, cursor },
        );
        res.status(200).json({
          success: true,
          message: translate(BrightChainStrings.Friends_MutualRetrieved),
          items: result.items,
          hasMore: result.hasMore,
          totalCount: result.totalCount,
          cursor: undefined,
        });
      } catch (err) {
        handleFriendsError(err, res);
      }
    },
  );

  return router;
}
