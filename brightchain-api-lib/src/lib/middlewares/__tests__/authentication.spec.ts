import { MemberType } from '@digitaldefiance/ecies-lib';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { ErrorCode } from '../../utils/errorResponse';
import {
  createJwtAuthMiddleware,
  createRoleMiddleware,
  extractToken,
  IAuthenticatedRequest,
  optionalAuth,
  requireAuth,
  requireMemberTypes,
  requireRoles,
} from '../authentication';

describe('Authentication Middleware', () => {
  const TEST_SECRET = 'test-jwt-secret-key-for-testing';
  let mockRequest: Partial<IAuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRequest = {
      headers: {},
      requestId: 'test-request-id',
    };
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    nextFunction = jest.fn();
  });

  describe('extractToken', () => {
    it('should extract token from Bearer authorization header', () => {
      const req = {
        headers: { authorization: 'Bearer test-token-123' },
      } as Request;
      expect(extractToken(req)).toBe('test-token-123');
    });

    it('should extract raw token from authorization header', () => {
      const req = {
        headers: { authorization: 'raw-token-456' },
      } as Request;
      expect(extractToken(req)).toBe('raw-token-456');
    });

    it('should return null when no authorization header', () => {
      const req = { headers: {} } as Request;
      expect(extractToken(req)).toBeNull();
    });
  });

  describe('createJwtAuthMiddleware', () => {
    it('should return 401 for missing token on protected endpoint', () => {
      const middleware = createJwtAuthMiddleware({ jwtSecret: TEST_SECRET });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.UNAUTHORIZED,
            message: 'Missing authentication token',
          }),
        }),
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 with expiration message for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { memberId: 'test-id', username: 'testuser', type: MemberType.User },
        TEST_SECRET,
        { expiresIn: '-1s' },
      );
      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

      const middleware = createJwtAuthMiddleware({ jwtSecret: TEST_SECRET });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.TOKEN_EXPIRED,
            message: expect.stringContaining('expired'),
          }),
        }),
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      const middleware = createJwtAuthMiddleware({ jwtSecret: TEST_SECRET });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.UNAUTHORIZED,
            message: 'Invalid authentication token',
          }),
        }),
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should attach member context for valid token', () => {
      const validToken = jwt.sign(
        { memberId: 'member-123', username: 'testuser', type: MemberType.User },
        TEST_SECRET,
        { expiresIn: '1h' },
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      const middleware = createJwtAuthMiddleware({ jwtSecret: TEST_SECRET });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.memberContext).toBeDefined();
      expect(mockRequest.memberContext?.memberId).toBe('member-123');
      expect(mockRequest.memberContext?.username).toBe('testuser');
      expect(mockRequest.memberContext?.type).toBe(MemberType.User);
    });

    it('should continue without member context when optional and no token', () => {
      const middleware = createJwtAuthMiddleware({
        jwtSecret: TEST_SECRET,
        optional: true,
      });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.memberContext).toBeUndefined();
    });
  });

  describe('createRoleMiddleware', () => {
    it('should return 401 when not authenticated', () => {
      const middleware = createRoleMiddleware({ requiredRoles: ['admin'] });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for insufficient permissions', () => {
      mockRequest.memberContext = {
        memberId: 'test-id',
        username: 'testuser',
        type: MemberType.User,
        roles: ['user'],
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      const middleware = createRoleMiddleware({ requiredRoles: ['admin'] });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.INSUFFICIENT_PERMISSIONS,
          }),
        }),
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow access when user has required role', () => {
      mockRequest.memberContext = {
        memberId: 'test-id',
        username: 'testuser',
        type: MemberType.User,
        roles: ['admin', 'user'],
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      const middleware = createRoleMiddleware({ requiredRoles: ['admin'] });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should check member type requirements', () => {
      mockRequest.memberContext = {
        memberId: 'test-id',
        username: 'testuser',
        type: MemberType.User,
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      const middleware = createRoleMiddleware({
        requiredTypes: [MemberType.Admin],
      });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow access when user has required member type', () => {
      mockRequest.memberContext = {
        memberId: 'test-id',
        username: 'testuser',
        type: MemberType.Admin,
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      const middleware = createRoleMiddleware({
        requiredTypes: [MemberType.Admin],
      });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should require all roles when requireAll is true', () => {
      mockRequest.memberContext = {
        memberId: 'test-id',
        username: 'testuser',
        type: MemberType.User,
        roles: ['admin'],
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      const middleware = createRoleMiddleware({
        requiredRoles: ['admin', 'superuser'],
        requireAll: true,
      });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow access when user has all required roles', () => {
      mockRequest.memberContext = {
        memberId: 'test-id',
        username: 'testuser',
        type: MemberType.User,
        roles: ['admin', 'superuser', 'user'],
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      const middleware = createRoleMiddleware({
        requiredRoles: ['admin', 'superuser'],
        requireAll: true,
      });

      middleware(
        mockRequest as IAuthenticatedRequest,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Convenience functions', () => {
    describe('requireAuth', () => {
      it('should create middleware that requires authentication', () => {
        const middleware = requireAuth(TEST_SECRET);

        middleware(
          mockRequest as IAuthenticatedRequest,
          mockResponse as Response,
          nextFunction,
        );

        expect(statusMock).toHaveBeenCalledWith(401);
      });
    });

    describe('optionalAuth', () => {
      it('should create middleware that allows unauthenticated requests', () => {
        const middleware = optionalAuth(TEST_SECRET);

        middleware(
          mockRequest as IAuthenticatedRequest,
          mockResponse as Response,
          nextFunction,
        );

        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('requireRoles', () => {
      it('should create middleware that checks roles', () => {
        mockRequest.memberContext = {
          memberId: 'test-id',
          username: 'testuser',
          type: MemberType.User,
          roles: ['user'],
          iat: Date.now(),
          exp: Date.now() + 3600000,
        };

        const middleware = requireRoles('admin');

        middleware(
          mockRequest as IAuthenticatedRequest,
          mockResponse as Response,
          nextFunction,
        );

        expect(statusMock).toHaveBeenCalledWith(403);
      });
    });

    describe('requireMemberTypes', () => {
      it('should create middleware that checks member types', () => {
        mockRequest.memberContext = {
          memberId: 'test-id',
          username: 'testuser',
          type: MemberType.User,
          iat: Date.now(),
          exp: Date.now() + 3600000,
        };

        const middleware = requireMemberTypes(MemberType.Admin);

        middleware(
          mockRequest as IAuthenticatedRequest,
          mockResponse as Response,
          nextFunction,
        );

        expect(statusMock).toHaveBeenCalledWith(403);
      });
    });
  });
});
