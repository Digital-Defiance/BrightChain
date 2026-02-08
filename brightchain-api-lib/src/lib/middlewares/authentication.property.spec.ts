/**
 * Property-Based Tests for Authentication Middleware
 *
 * Feature: api-server-operations
 * Property 17: Authentication Enforcement
 * Property 18: Role-Based Access Control
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 *
 * Property 17: For any protected endpoint, requests without a JWT token SHALL return 401,
 * requests with an expired token SHALL return 401 with expiration message,
 * and requests with a valid token SHALL have member information attached to the request context.
 *
 * Property 18: For any endpoint requiring specific permissions, only requests from members
 * with the required role SHALL succeed; others SHALL receive 403 Forbidden.
 */

import { MemberType } from '@digitaldefiance/ecies-lib';
import { NextFunction, Response } from 'express';
import * as fc from 'fast-check';
import * as jwt from 'jsonwebtoken';
import { ErrorCode } from '../utils/errorResponse';
import {
  createJwtAuthMiddleware,
  createRoleMiddleware,
  extractToken,
  IAuthenticatedRequest,
} from './authentication';

// Test JWT secret
const TEST_SECRET = 'test-jwt-secret-key-for-property-testing-12345';

// Arbitrary for generating valid member IDs
const memberIdArb = fc.uuid();

// Arbitrary for generating usernames
const usernameArb = fc
  .string({ minLength: 3, maxLength: 30 })
  .filter((s) => /^[a-zA-Z0-9_]+$/.test(s));

// Arbitrary for generating member types
const memberTypeArb = fc.constantFrom(
  MemberType.User,
  MemberType.Admin,
  MemberType.System,
);

// Arbitrary for generating role names
const roleNameArb = fc
  .string({ minLength: 2, maxLength: 20 })
  .filter((s) => /^[a-z_]+$/.test(s));

// Arbitrary for generating arrays of roles
const rolesArb = fc.array(roleNameArb, { minLength: 0, maxLength: 5 });

// Arbitrary for generating token expiration times (in seconds)
const validExpirationArb = fc.integer({ min: 60, max: 86400 }); // 1 minute to 1 day
const expiredExpirationArb = fc.integer({ min: -86400, max: -1 }); // Already expired

// Helper to create mock request
function createMockRequest(
  authHeader?: string,
  memberContext?: IAuthenticatedRequest['memberContext'],
): Partial<IAuthenticatedRequest> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    requestId: 'test-request-id',
    memberContext,
  };
}

// Helper to create mock response
function createMockResponse(): {
  response: Partial<Response>;
  statusMock: jest.Mock;
  jsonMock: jest.Mock;
} {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  return {
    response: { status: statusMock, json: jsonMock },
    statusMock,
    jsonMock,
  };
}

describe('Authentication Middleware Property Tests', () => {
  describe('Property 17: Authentication Enforcement', () => {
    /**
     * Property 17a: Requests without JWT token return 401
     *
     * For any protected endpoint, requests without a JWT token SHALL return 401 Unauthorized.
     */
    it('Property 17a: Requests without JWT token return 401 Unauthorized', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(undefined, '', 'Bearer ', 'Bearer'),
          async (invalidAuth) => {
            // Feature: api-server-operations, Property 17: Authentication Enforcement
            const mockRequest = createMockRequest(invalidAuth);
            const { response, statusMock, jsonMock } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createJwtAuthMiddleware({
              jwtSecret: TEST_SECRET,
            });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify 401 status code
            expect(statusMock).toHaveBeenCalledWith(401);

            // Verify error response contains UNAUTHORIZED code
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                error: expect.objectContaining({
                  code: ErrorCode.UNAUTHORIZED,
                }),
              }),
            );

            // Verify next() was NOT called
            expect(nextFunction).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property 17b: Requests with expired token return 401 with expiration message
     *
     * For any expired JWT token, the response SHALL be 401 with TOKEN_EXPIRED code
     * and a message indicating the token has expired.
     */
    it('Property 17b: Requests with expired token return 401 with expiration message', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          usernameArb,
          memberTypeArb,
          expiredExpirationArb,
          async (memberId, username, type, expiresIn) => {
            // Feature: api-server-operations, Property 17: Authentication Enforcement
            // Create an expired token
            const expiredToken = jwt.sign(
              { memberId, username, type },
              TEST_SECRET,
              { expiresIn: `${expiresIn}s` },
            );

            const mockRequest = createMockRequest(`Bearer ${expiredToken}`);
            const { response, statusMock, jsonMock } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createJwtAuthMiddleware({
              jwtSecret: TEST_SECRET,
            });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify 401 status code
            expect(statusMock).toHaveBeenCalledWith(401);

            // Verify error response contains TOKEN_EXPIRED code
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                error: expect.objectContaining({
                  code: ErrorCode.TOKEN_EXPIRED,
                  message: expect.stringContaining('expired'),
                }),
              }),
            );

            // Verify next() was NOT called
            expect(nextFunction).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 17c: Requests with valid token have member info attached to context
     *
     * For any valid JWT token, the member information SHALL be attached to the request context.
     */
    it('Property 17c: Requests with valid token have member info attached to context', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          usernameArb,
          memberTypeArb,
          validExpirationArb,
          async (memberId, username, type, expiresIn) => {
            // Feature: api-server-operations, Property 17: Authentication Enforcement
            // Create a valid token
            const validToken = jwt.sign(
              { memberId, username, type },
              TEST_SECRET,
              { expiresIn: `${expiresIn}s` },
            );

            const mockRequest = createMockRequest(`Bearer ${validToken}`);
            const { response } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createJwtAuthMiddleware({
              jwtSecret: TEST_SECRET,
            });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify next() was called
            expect(nextFunction).toHaveBeenCalled();

            // Verify member context is attached
            expect(mockRequest.memberContext).toBeDefined();
            expect(mockRequest.memberContext?.memberId).toBe(memberId);
            expect(mockRequest.memberContext?.username).toBe(username);
            expect(mockRequest.memberContext?.type).toBe(type);

            // Verify iat and exp are present
            expect(mockRequest.memberContext?.iat).toBeDefined();
            expect(mockRequest.memberContext?.exp).toBeDefined();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 17d: Invalid token signatures return 401
     *
     * For any token signed with a different secret, the response SHALL be 401 Unauthorized.
     */
    it('Property 17d: Invalid token signatures return 401 Unauthorized', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          usernameArb,
          memberTypeArb,
          fc.string({ minLength: 10, maxLength: 50 }),
          async (memberId, username, type, wrongSecret) => {
            // Feature: api-server-operations, Property 17: Authentication Enforcement
            // Create a token with a different secret
            const invalidToken = jwt.sign(
              { memberId, username, type },
              wrongSecret + '-different',
              { expiresIn: '1h' },
            );

            const mockRequest = createMockRequest(`Bearer ${invalidToken}`);
            const { response, statusMock, jsonMock } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createJwtAuthMiddleware({
              jwtSecret: TEST_SECRET,
            });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify 401 status code
            expect(statusMock).toHaveBeenCalledWith(401);

            // Verify error response contains UNAUTHORIZED code
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                error: expect.objectContaining({
                  code: ErrorCode.UNAUTHORIZED,
                }),
              }),
            );

            // Verify next() was NOT called
            expect(nextFunction).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 17e: Malformed tokens return 401
     *
     * For any malformed token string, the response SHALL be 401 Unauthorized.
     */
    it('Property 17e: Malformed tokens return 401 Unauthorized', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => !s.includes('.') || s.split('.').length !== 3),
          async (malformedToken) => {
            // Feature: api-server-operations, Property 17: Authentication Enforcement
            const mockRequest = createMockRequest(`Bearer ${malformedToken}`);
            const { response, statusMock, jsonMock } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createJwtAuthMiddleware({
              jwtSecret: TEST_SECRET,
            });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify 401 status code
            expect(statusMock).toHaveBeenCalledWith(401);

            // Verify error response contains UNAUTHORIZED code
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                error: expect.objectContaining({
                  code: ErrorCode.UNAUTHORIZED,
                }),
              }),
            );

            // Verify next() was NOT called
            expect(nextFunction).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 18: Role-Based Access Control', () => {
    /**
     * Property 18a: Unauthenticated requests to role-protected endpoints return 401
     *
     * For any endpoint requiring specific roles, unauthenticated requests SHALL return 401.
     */
    it('Property 18a: Unauthenticated requests to role-protected endpoints return 401', async () => {
      await fc.assert(
        fc.asyncProperty(
          rolesArb.filter((r) => r.length > 0),
          async (requiredRoles) => {
            // Feature: api-server-operations, Property 18: Role-Based Access Control
            const mockRequest = createMockRequest(); // No member context
            const { response, statusMock, jsonMock } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createRoleMiddleware({ requiredRoles });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify 401 status code
            expect(statusMock).toHaveBeenCalledWith(401);

            // Verify error response contains UNAUTHORIZED code
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                error: expect.objectContaining({
                  code: ErrorCode.UNAUTHORIZED,
                }),
              }),
            );

            // Verify next() was NOT called
            expect(nextFunction).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 18b: Users without required roles receive 403 Forbidden
     *
     * For any endpoint requiring specific roles, authenticated users without those roles
     * SHALL receive 403 Forbidden.
     */
    it('Property 18b: Users without required roles receive 403 Forbidden', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          usernameArb,
          memberTypeArb,
          rolesArb,
          rolesArb.filter((r) => r.length > 0),
          async (memberId, username, type, userRoles, requiredRoles) => {
            // Feature: api-server-operations, Property 18: Role-Based Access Control
            // Ensure user doesn't have any of the required roles
            const filteredUserRoles = userRoles.filter(
              (role) => !requiredRoles.includes(role),
            );

            const mockRequest = createMockRequest(undefined, {
              memberId,
              username,
              type,
              roles: filteredUserRoles,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
            });
            const { response, statusMock, jsonMock } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createRoleMiddleware({ requiredRoles });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify 403 status code
            expect(statusMock).toHaveBeenCalledWith(403);

            // Verify error response contains INSUFFICIENT_PERMISSIONS code
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                error: expect.objectContaining({
                  code: ErrorCode.INSUFFICIENT_PERMISSIONS,
                }),
              }),
            );

            // Verify next() was NOT called
            expect(nextFunction).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 18c: Users with at least one required role succeed (OR logic)
     *
     * For any endpoint requiring specific roles with OR logic, authenticated users
     * with at least one of those roles SHALL succeed.
     */
    it('Property 18c: Users with at least one required role succeed (OR logic)', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          usernameArb,
          memberTypeArb,
          rolesArb.filter((r) => r.length > 0),
          fc.integer({ min: 0, max: 10 }),
          async (memberId, username, type, requiredRoles, extraRoleCount) => {
            // Feature: api-server-operations, Property 18: Role-Based Access Control
            // Give user at least one of the required roles plus some extra
            const extraRoles = Array.from(
              { length: extraRoleCount },
              (_, i) => `extra_role_${i}`,
            );
            const userRoles = [requiredRoles[0], ...extraRoles];

            const mockRequest = createMockRequest(undefined, {
              memberId,
              username,
              type,
              roles: userRoles,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
            });
            const { response } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createRoleMiddleware({
              requiredRoles,
              requireAll: false,
            });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify next() was called (access granted)
            expect(nextFunction).toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 18d: Users must have ALL required roles when requireAll is true (AND logic)
     *
     * For any endpoint requiring specific roles with AND logic, authenticated users
     * must have ALL of those roles to succeed.
     */
    it('Property 18d: Users must have ALL required roles when requireAll is true (AND logic)', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          usernameArb,
          memberTypeArb,
          // Generate unique roles to avoid duplicates
          fc.set(roleNameArb, { minLength: 2, maxLength: 5 }),
          async (memberId, username, type, requiredRolesSet) => {
            // Feature: api-server-operations, Property 18: Role-Based Access Control
            const requiredRoles = [...requiredRolesSet];

            // Give user only some of the required roles (not all)
            // Take all but the last role to ensure we're missing at least one
            const partialRoles = requiredRoles.slice(
              0,
              requiredRoles.length - 1,
            );

            const mockRequest = createMockRequest(undefined, {
              memberId,
              username,
              type,
              roles: partialRoles,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
            });
            const { response, statusMock, jsonMock } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createRoleMiddleware({
              requiredRoles,
              requireAll: true,
            });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify 403 status code (missing some roles)
            expect(statusMock).toHaveBeenCalledWith(403);

            // Verify error response contains INSUFFICIENT_PERMISSIONS code
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                error: expect.objectContaining({
                  code: ErrorCode.INSUFFICIENT_PERMISSIONS,
                }),
              }),
            );

            // Verify next() was NOT called
            expect(nextFunction).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 18e: Users with ALL required roles succeed when requireAll is true
     *
     * For any endpoint requiring specific roles with AND logic, authenticated users
     * with ALL of those roles SHALL succeed.
     */
    it('Property 18e: Users with ALL required roles succeed when requireAll is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          usernameArb,
          memberTypeArb,
          rolesArb.filter((r) => r.length > 0),
          fc.integer({ min: 0, max: 5 }),
          async (memberId, username, type, requiredRoles, extraRoleCount) => {
            // Feature: api-server-operations, Property 18: Role-Based Access Control
            // Give user all required roles plus some extra
            const extraRoles = Array.from(
              { length: extraRoleCount },
              (_, i) => `extra_role_${i}`,
            );
            const userRoles = [...requiredRoles, ...extraRoles];

            const mockRequest = createMockRequest(undefined, {
              memberId,
              username,
              type,
              roles: userRoles,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
            });
            const { response } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createRoleMiddleware({
              requiredRoles,
              requireAll: true,
            });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            // Verify next() was called (access granted)
            expect(nextFunction).toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 18f: Member type requirements are enforced
     *
     * For any endpoint requiring specific member types, only users with those types
     * SHALL succeed; others SHALL receive 403 Forbidden.
     */
    it('Property 18f: Member type requirements are enforced', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          usernameArb,
          memberTypeArb,
          fc.array(memberTypeArb, { minLength: 1, maxLength: 3 }),
          async (memberId, username, userType, requiredTypes) => {
            // Feature: api-server-operations, Property 18: Role-Based Access Control
            const mockRequest = createMockRequest(undefined, {
              memberId,
              username,
              type: userType,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
            });
            const { response, statusMock } = createMockResponse();
            const nextFunction: NextFunction = jest.fn();

            const middleware = createRoleMiddleware({ requiredTypes });

            middleware(
              mockRequest as IAuthenticatedRequest,
              response as Response,
              nextFunction,
            );

            const hasRequiredType = requiredTypes.includes(userType);

            if (hasRequiredType) {
              // Verify next() was called (access granted)
              expect(nextFunction).toHaveBeenCalled();
            } else {
              // Verify 403 status code
              expect(statusMock).toHaveBeenCalledWith(403);
              expect(nextFunction).not.toHaveBeenCalled();
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Token Extraction', () => {
    /**
     * Property: extractToken correctly handles various authorization header formats
     */
    it('extractToken correctly handles various authorization header formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 500 }),
          async (tokenValue) => {
            // Feature: api-server-operations, Property 17: Authentication Enforcement
            // Test Bearer format
            const bearerReq = {
              headers: { authorization: `Bearer ${tokenValue}` },
              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            } as any;
            expect(extractToken(bearerReq)).toBe(tokenValue);

            // Test raw format
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            const rawReq = { headers: { authorization: tokenValue } } as any;
            expect(extractToken(rawReq)).toBe(tokenValue);

            // Test missing header
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            const noAuthReq = { headers: {} } as any;
            expect(extractToken(noAuthReq)).toBeNull();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
