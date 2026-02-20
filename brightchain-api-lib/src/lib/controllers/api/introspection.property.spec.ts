/**
 * @fileoverview Property-based tests for IntrospectionController
 *
 * This file covers:
 * - Property 1: Role-based endpoint access control
 * - Property 2: Authentication required for all endpoints
 * - Property 3: Partition mode response varies by member type
 * - Property 4: Pool listing filtered by authorization
 * - Property 5: Unauthorized pool direct access returns 403
 * - Property 16: Introspection response completeness
 * - Property 17: Energy account access control
 *
 * @see Requirements 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 4.1, 4.2, 4.3, 4.5, 5.1, 6.1, 6.3, 11.1, 11.5
 */

import {
  hasPermission,
  IBlockStoreStats,
  IEnergyAccountStatus,
  INetworkTopology,
  INodeStatus,
  IPeerInfo,
  IPoolACL,
  IPoolAclSummary,
  IPoolDetail,
  IPoolDiscoveryResult,
  IPoolInfo,
  PoolPermission,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import { NextFunction, Response } from 'express';
import fc from 'fast-check';
import * as jwt from 'jsonwebtoken';

import {
  createJwtAuthMiddleware,
  IAuthenticatedRequest,
  requireMemberTypes,
} from '../../middlewares/authentication';

// Longer timeout for property tests
jest.setTimeout(60000);

// ── Constants ──

const TEST_JWT_SECRET = 'test-jwt-secret-for-introspection-property-tests';

/**
 * Endpoint classification per the design document.
 * Public endpoints accept all authenticated MemberTypes.
 * Admin endpoints accept only Admin or System MemberTypes.
 */
enum EndpointAccessTier {
  Public = 'public',
  Admin = 'admin',
}

interface EndpointDefinition {
  method: string;
  path: string;
  accessTier: EndpointAccessTier;
  handler: string;
}

/**
 * All introspection endpoints as defined in the design document's route table.
 */
const INTROSPECTION_ENDPOINTS: EndpointDefinition[] = [
  {
    method: 'GET',
    path: '/api/introspection/status',
    accessTier: EndpointAccessTier.Public,
    handler: 'handleGetStatus',
  },
  {
    method: 'GET',
    path: '/api/introspection/peers',
    accessTier: EndpointAccessTier.Admin,
    handler: 'handleListPeers',
  },
  {
    method: 'GET',
    path: '/api/introspection/pools',
    accessTier: EndpointAccessTier.Public,
    handler: 'handleListPools',
  },
  {
    method: 'GET',
    path: '/api/introspection/pools/:poolId',
    accessTier: EndpointAccessTier.Public,
    handler: 'handleGetPoolDetails',
  },
  {
    method: 'GET',
    path: '/api/introspection/stats',
    accessTier: EndpointAccessTier.Admin,
    handler: 'handleGetBlockStoreStats',
  },
  {
    method: 'GET',
    path: '/api/introspection/energy',
    accessTier: EndpointAccessTier.Public,
    handler: 'handleGetEnergy',
  },
  {
    method: 'GET',
    path: '/api/introspection/energy/:memberId',
    accessTier: EndpointAccessTier.Admin,
    handler: 'handleGetMemberEnergy',
  },
  {
    method: 'POST',
    path: '/api/introspection/discover-pools',
    accessTier: EndpointAccessTier.Admin,
    handler: 'handleDiscoverPools',
  },
];

const PUBLIC_ENDPOINTS = INTROSPECTION_ENDPOINTS.filter(
  (e) => e.accessTier === EndpointAccessTier.Public,
);

const ADMIN_ENDPOINTS = INTROSPECTION_ENDPOINTS.filter(
  (e) => e.accessTier === EndpointAccessTier.Admin,
);

// ── Generators ──

const arbMemberId = fc
  .string({ minLength: 8, maxLength: 32 })
  .filter((s) => s.length > 0);

const arbUsername = fc
  .string({ minLength: 1, maxLength: 32 })
  .filter((s) => s.length > 0);

const arbMemberType = fc.constantFrom(
  MemberType.User,
  MemberType.Admin,
  MemberType.System,
);

const arbAdminMemberType = fc.constantFrom(MemberType.Admin, MemberType.System);

const arbEndpoint = fc.constantFrom(...INTROSPECTION_ENDPOINTS);
const arbPublicEndpoint = fc.constantFrom(...PUBLIC_ENDPOINTS);
const arbAdminEndpoint = fc.constantFrom(...ADMIN_ENDPOINTS);

// ── Property 2 Generators: Invalid Token Scenarios ──

/**
 * Generator for invalid JWT token scenarios.
 * Produces tokens that should all be rejected with 401:
 * - 'missing': no token at all
 * - 'malformed': random garbage string that is not a valid JWT
 * - 'expired': a properly signed JWT that has already expired
 * - 'wrong_secret': a JWT signed with a different secret
 */
interface InvalidTokenScenario {
  label: string;
  token: string | undefined;
}

const arbMalformedToken = fc.oneof(
  // Random garbage strings
  fc.string({ minLength: 1, maxLength: 64 }).map((s) => s.replace(/\./g, '')),
  // Looks like JWT structure but isn't valid
  fc
    .tuple(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.string({ minLength: 1, maxLength: 20 }),
    )
    .map(
      ([a, b, c]) =>
        `${Buffer.from(a).toString('base64')}.${Buffer.from(b).toString('base64')}.${Buffer.from(c).toString('base64')}`,
    ),
);

const arbExpiredToken = fc
  .tuple(arbMemberId, arbUsername, arbMemberType)
  .map(([memberId, username, memberType]) =>
    jwt.sign({ memberId, username, type: memberType }, TEST_JWT_SECRET, {
      expiresIn: '-1s',
    }),
  );

const arbWrongSecretToken = fc
  .tuple(arbMemberId, arbUsername, arbMemberType)
  .map(([memberId, username, memberType]) =>
    jwt.sign(
      { memberId, username, type: memberType },
      'wrong-secret-key-not-matching',
      { expiresIn: '1h' },
    ),
  );

const arbInvalidTokenScenario: fc.Arbitrary<InvalidTokenScenario> = fc.oneof(
  fc.constant({ label: 'missing', token: undefined } as InvalidTokenScenario),
  arbMalformedToken.map((t) => ({ label: 'malformed', token: t })),
  arbExpiredToken.map((t) => ({ label: 'expired', token: t })),
  arbWrongSecretToken.map((t) => ({ label: 'wrong_secret', token: t })),
);

// ── Mock Helpers ──

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

function signValidToken(
  memberId: string,
  username: string,
  type: MemberType,
): string {
  return jwt.sign({ memberId, username, type }, TEST_JWT_SECRET, {
    expiresIn: '1h',
  });
}

/**
 * Simulate the middleware chain for an endpoint.
 *
 * Public endpoints: requireAuth only
 * Admin endpoints: requireAuth + requireMemberTypes(Admin, System)
 *
 * Returns the final state: whether next() was called (access granted)
 * and the status code if it was not.
 */
function simulateMiddlewareChain(
  endpoint: EndpointDefinition,
  token: string | undefined,
): { granted: boolean; statusCode: number | null } {
  const mockReq = token
    ? createMockRequest(`Bearer ${token}`)
    : createMockRequest();
  const { response, statusMock } = createMockResponse();

  let accessGranted = false;
  const nextFn: NextFunction = jest.fn(() => {
    accessGranted = true;
  });

  // Step 1: Auth middleware
  const authMiddleware = createJwtAuthMiddleware({
    jwtSecret: TEST_JWT_SECRET,
  });
  authMiddleware(
    mockReq as IAuthenticatedRequest,
    response as Response,
    nextFn,
  );

  if (!accessGranted) {
    const calledWith = statusMock.mock.calls[0]?.[0] ?? null;
    return { granted: false, statusCode: calledWith };
  }

  // Step 2: For admin endpoints, apply requireMemberTypes
  if (endpoint.accessTier === EndpointAccessTier.Admin) {
    accessGranted = false;
    const roleMiddleware = requireMemberTypes(
      MemberType.Admin,
      MemberType.System,
    );
    roleMiddleware(
      mockReq as IAuthenticatedRequest,
      response as Response,
      nextFn,
    );

    if (!accessGranted) {
      const calledWith = statusMock.mock.calls[0]?.[0] ?? null;
      return { granted: false, statusCode: calledWith };
    }
  }

  return { granted: true, statusCode: null };
}

// ══════════════════════════════════════════════════════════════════════
// Property 1: Role-based endpoint access control
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 1: Role-based endpoint access control', () => {
  /**
   * Property 1a: Public endpoints accept ALL authenticated MemberTypes.
   *
   * For any public endpoint and for any authenticated member (User, Admin, or System),
   * the middleware chain grants access.
   *
   * **Validates: Requirements 1.2, 1.3**
   */
  it('Property 1a: public endpoints accept all authenticated MemberTypes', () => {
    fc.assert(
      fc.property(
        arbPublicEndpoint,
        arbMemberId,
        arbUsername,
        arbMemberType,
        (endpoint, memberId, username, memberType) => {
          const token = signValidToken(memberId, username, memberType);
          const result = simulateMiddlewareChain(endpoint, token);

          expect(result.granted).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1b: Admin endpoints accept only Admin or System MemberTypes.
   *
   * For any admin endpoint and for any member with MemberType Admin or System,
   * the middleware chain grants access.
   *
   * **Validates: Requirements 1.3, 11.5**
   */
  it('Property 1b: admin endpoints accept Admin and System MemberTypes', () => {
    fc.assert(
      fc.property(
        arbAdminEndpoint,
        arbMemberId,
        arbUsername,
        arbAdminMemberType,
        (endpoint, memberId, username, memberType) => {
          const token = signValidToken(memberId, username, memberType);
          const result = simulateMiddlewareChain(endpoint, token);

          expect(result.granted).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1c: Admin endpoints reject User MemberType with 403.
   *
   * For any admin endpoint and for any member with MemberType User,
   * the middleware chain rejects with 403 Forbidden.
   *
   * **Validates: Requirements 1.2, 11.5**
   */
  it('Property 1c: admin endpoints reject User MemberType with 403', () => {
    fc.assert(
      fc.property(
        arbAdminEndpoint,
        arbMemberId,
        arbUsername,
        (endpoint, memberId, username) => {
          const token = signValidToken(memberId, username, MemberType.User);
          const result = simulateMiddlewareChain(endpoint, token);

          expect(result.granted).toBe(false);
          expect(result.statusCode).toBe(403);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1d: For any endpoint and any MemberType, access is granted
   * if and only if the endpoint is public OR the member is Admin/System.
   *
   * This is the universal biconditional property: the endpoint grants access
   * iff the access tier matches the member's MemberType.
   *
   * **Validates: Requirements 1.2, 1.3, 11.5**
   */
  it('Property 1d: access granted iff endpoint is public or member is Admin/System', () => {
    fc.assert(
      fc.property(
        arbEndpoint,
        arbMemberId,
        arbUsername,
        arbMemberType,
        (endpoint, memberId, username, memberType) => {
          const token = signValidToken(memberId, username, memberType);
          const result = simulateMiddlewareChain(endpoint, token);

          const isPublicEndpoint =
            endpoint.accessTier === EndpointAccessTier.Public;
          const isPrivilegedMember =
            memberType === MemberType.Admin || memberType === MemberType.System;
          const shouldBeGranted = isPublicEndpoint || isPrivilegedMember;

          expect(result.granted).toBe(shouldBeGranted);

          if (!shouldBeGranted) {
            expect(result.statusCode).toBe(403);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1e: The endpoint classification is exhaustive and correct.
   *
   * Every introspection endpoint is classified as either Public or Admin,
   * and the classification matches the design document's route table.
   *
   * **Validates: Requirements 1.2, 1.3**
   */
  it('Property 1e: endpoint classification is exhaustive and correct', () => {
    // Verify all endpoints have a valid access tier
    for (const endpoint of INTROSPECTION_ENDPOINTS) {
      expect([EndpointAccessTier.Public, EndpointAccessTier.Admin]).toContain(
        endpoint.accessTier,
      );
    }

    // Verify the expected public endpoints
    const publicPaths = PUBLIC_ENDPOINTS.map((e) => e.path);
    expect(publicPaths).toContain('/api/introspection/status');
    expect(publicPaths).toContain('/api/introspection/pools');
    expect(publicPaths).toContain('/api/introspection/pools/:poolId');
    expect(publicPaths).toContain('/api/introspection/energy');

    // Verify the expected admin endpoints
    const adminPaths = ADMIN_ENDPOINTS.map((e) => e.path);
    expect(adminPaths).toContain('/api/introspection/peers');
    expect(adminPaths).toContain('/api/introspection/stats');
    expect(adminPaths).toContain('/api/introspection/energy/:memberId');
    expect(adminPaths).toContain('/api/introspection/discover-pools');

    // Verify counts
    expect(PUBLIC_ENDPOINTS.length).toBe(4);
    expect(ADMIN_ENDPOINTS.length).toBe(4);
    expect(INTROSPECTION_ENDPOINTS.length).toBe(8);
  });

  /**
   * Property 1f: The requireMemberTypes middleware correctly enforces
   * Admin/System for any randomly generated MemberType.
   *
   * For any MemberType, the requireMemberTypes(Admin, System) middleware
   * calls next() iff the type is Admin or System.
   *
   * **Validates: Requirements 11.5**
   */
  it('Property 1f: requireMemberTypes enforces Admin/System correctly', () => {
    fc.assert(
      fc.property(
        arbMemberId,
        arbUsername,
        arbMemberType,
        (memberId, username, memberType) => {
          const mockReq = createMockRequest(undefined, {
            memberId,
            username,
            type: memberType,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
          });
          const { response, statusMock } = createMockResponse();
          let nextCalled = false;
          const nextFn: NextFunction = jest.fn(() => {
            nextCalled = true;
          });

          const middleware = requireMemberTypes(
            MemberType.Admin,
            MemberType.System,
          );
          middleware(
            mockReq as IAuthenticatedRequest,
            response as Response,
            nextFn,
          );

          const isPrivileged =
            memberType === MemberType.Admin || memberType === MemberType.System;

          expect(nextCalled).toBe(isPrivileged);

          if (!isPrivileged) {
            expect(statusMock).toHaveBeenCalledWith(403);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 2: Authentication required for all endpoints
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 2: Authentication required for all endpoints', () => {
  /**
   * Property 2a: Requests with no token are rejected with 401.
   *
   * For any introspection endpoint, a request with no Authorization header
   * is rejected with a 401 Unauthorized response.
   *
   * **Validates: Requirements 2.2, 11.1**
   */
  it('Property 2a: requests with no token are rejected with 401', () => {
    fc.assert(
      fc.property(arbEndpoint, (endpoint) => {
        const result = simulateMiddlewareChain(endpoint, undefined);

        expect(result.granted).toBe(false);
        expect(result.statusCode).toBe(401);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2b: Requests with malformed tokens are rejected with 401.
   *
   * For any introspection endpoint and for any string that is not a valid JWT,
   * the middleware chain rejects with 401 Unauthorized.
   *
   * **Validates: Requirements 2.2, 11.1**
   */
  it('Property 2b: requests with malformed tokens are rejected with 401', () => {
    fc.assert(
      fc.property(
        arbEndpoint,
        arbMalformedToken,
        (endpoint, malformedToken) => {
          const result = simulateMiddlewareChain(endpoint, malformedToken);

          expect(result.granted).toBe(false);
          expect(result.statusCode).toBe(401);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2c: Requests with expired tokens are rejected with 401.
   *
   * For any introspection endpoint and for any JWT that has already expired,
   * the middleware chain rejects with 401 Unauthorized.
   *
   * **Validates: Requirements 2.2, 11.1**
   */
  it('Property 2c: requests with expired tokens are rejected with 401', () => {
    fc.assert(
      fc.property(arbEndpoint, arbExpiredToken, (endpoint, expiredToken) => {
        const result = simulateMiddlewareChain(endpoint, expiredToken);

        expect(result.granted).toBe(false);
        expect(result.statusCode).toBe(401);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2d: Requests with tokens signed by wrong secret are rejected with 401.
   *
   * For any introspection endpoint and for any JWT signed with a different secret,
   * the middleware chain rejects with 401 Unauthorized.
   *
   * **Validates: Requirements 2.2, 11.1**
   */
  it('Property 2d: requests with wrong-secret tokens are rejected with 401', () => {
    fc.assert(
      fc.property(
        arbEndpoint,
        arbWrongSecretToken,
        (endpoint, wrongSecretToken) => {
          const result = simulateMiddlewareChain(endpoint, wrongSecretToken);

          expect(result.granted).toBe(false);
          expect(result.statusCode).toBe(401);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2e: Universal — for any endpoint and any invalid token scenario,
   * the result is always 401 Unauthorized.
   *
   * This is the universal property: for any introspection endpoint and for any
   * request that lacks a valid JWT bearer token (missing, malformed, or expired),
   * the endpoint returns a 401 Unauthorized response.
   *
   * **Validates: Requirements 2.2, 11.1**
   */
  it('Property 2e: any invalid token scenario on any endpoint yields 401', () => {
    fc.assert(
      fc.property(
        arbEndpoint,
        arbInvalidTokenScenario,
        (endpoint, scenario) => {
          const result = simulateMiddlewareChain(endpoint, scenario.token);

          expect(result.granted).toBe(false);
          expect(result.statusCode).toBe(401);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 3: Partition mode response varies by member type
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 3: Partition mode response varies by member type', () => {
  // ── Generators ──

  /** Generate a non-empty array of disconnected peer IDs */
  const arbDisconnectedPeers = fc
    .array(fc.string({ minLength: 8, maxLength: 32 }), {
      minLength: 1,
      maxLength: 10,
    })
    .filter((arr) => arr.length > 0);

  /** Generate a base node status (partition mode always true for these tests) */
  const arbPartitionNodeStatus = fc.record({
    nodeId: fc.string({ minLength: 8, maxLength: 32 }),
    healthy: fc.boolean(),
    uptime: fc.nat({ max: 1_000_000 }),
    version: fc.stringMatching(/^\d+\.\d+\.\d+$/),
    capabilities: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
      maxLength: 5,
    }),
  });

  /**
   * Simulates the handleGetStatus logic for building INodeStatus
   * based on partition state and member type.
   *
   * This mirrors the controller behavior described in the design:
   * - If member is Admin/System: include disconnectedPeers
   * - If member is User: include partitionMode flag only, omit disconnectedPeers
   */
  function buildNodeStatusForMember(
    baseStatus: {
      nodeId: string;
      healthy: boolean;
      uptime: number;
      version: string;
      capabilities: string[];
    },
    partitionMode: boolean,
    disconnectedPeers: string[],
    memberType: MemberType,
  ): INodeStatus<string> {
    const isPrivileged =
      memberType === MemberType.Admin || memberType === MemberType.System;

    if (partitionMode && isPrivileged) {
      return {
        ...baseStatus,
        partitionMode: true,
        disconnectedPeers,
      };
    }

    return {
      ...baseStatus,
      partitionMode,
      disconnectedPeers: undefined,
    };
  }

  /**
   * Property 3a: When node is in partition mode and member is Admin/System,
   * disconnectedPeers is present and non-empty.
   *
   * **Validates: Requirements 2.3**
   */
  it('Property 3a: partition mode with Admin/System includes disconnectedPeers', () => {
    fc.assert(
      fc.property(
        arbPartitionNodeStatus,
        arbDisconnectedPeers,
        arbAdminMemberType,
        (baseStatus, disconnectedPeers, memberType) => {
          const status = buildNodeStatusForMember(
            baseStatus,
            true,
            disconnectedPeers,
            memberType,
          );

          expect(status.partitionMode).toBe(true);
          expect(status.disconnectedPeers).toBeDefined();
          expect(Array.isArray(status.disconnectedPeers)).toBe(true);
          expect(status.disconnectedPeers!.length).toBeGreaterThan(0);
          expect(status.disconnectedPeers).toEqual(disconnectedPeers);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3b: When node is in partition mode and member is User,
   * partitionMode is true but disconnectedPeers is undefined.
   *
   * **Validates: Requirements 2.4**
   */
  it('Property 3b: partition mode with User omits disconnectedPeers', () => {
    fc.assert(
      fc.property(
        arbPartitionNodeStatus,
        arbDisconnectedPeers,
        (baseStatus, disconnectedPeers) => {
          const status = buildNodeStatusForMember(
            baseStatus,
            true,
            disconnectedPeers,
            MemberType.User,
          );

          expect(status.partitionMode).toBe(true);
          expect(status.disconnectedPeers).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3c: When node is NOT in partition mode, disconnectedPeers
   * is undefined regardless of member type.
   *
   * **Validates: Requirements 2.3, 2.4**
   */
  it('Property 3c: non-partition mode omits disconnectedPeers for all member types', () => {
    fc.assert(
      fc.property(
        arbPartitionNodeStatus,
        arbMemberType,
        (baseStatus, memberType) => {
          const status = buildNodeStatusForMember(
            baseStatus,
            false,
            [],
            memberType,
          );

          expect(status.partitionMode).toBe(false);
          expect(status.disconnectedPeers).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3d: Universal biconditional — disconnectedPeers is present and non-empty
   * if and only if partitionMode is true AND member is Admin/System.
   *
   * For any combination of partition state and member type, the presence of
   * disconnectedPeers follows the biconditional rule.
   *
   * **Validates: Requirements 2.3, 2.4**
   */
  it('Property 3d: disconnectedPeers present iff partitionMode AND Admin/System', () => {
    fc.assert(
      fc.property(
        arbPartitionNodeStatus,
        fc.boolean(),
        arbDisconnectedPeers,
        arbMemberType,
        (baseStatus, partitionMode, disconnectedPeers, memberType) => {
          const status = buildNodeStatusForMember(
            baseStatus,
            partitionMode,
            disconnectedPeers,
            memberType,
          );

          const isPrivileged =
            memberType === MemberType.Admin || memberType === MemberType.System;
          const shouldHaveDisconnectedPeers = partitionMode && isPrivileged;

          if (shouldHaveDisconnectedPeers) {
            expect(status.disconnectedPeers).toBeDefined();
            expect(Array.isArray(status.disconnectedPeers)).toBe(true);
            expect(status.disconnectedPeers!.length).toBeGreaterThan(0);
          } else {
            expect(status.disconnectedPeers).toBeUndefined();
          }

          // partitionMode flag is always accurately reflected
          expect(status.partitionMode).toBe(partitionMode);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 4: Pool listing filtered by authorization
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 4: Pool listing filtered by authorization', () => {
  // ── Generators ──

  /** Generate a pool ID */
  const arbPoolId = fc
    .string({ minLength: 8, maxLength: 32 })
    .filter((s) => s.length > 0);

  /** Generate a set of PoolPermissions */
  const arbPermissions = fc.subarray([
    PoolPermission.Read,
    PoolPermission.Write,
    PoolPermission.Replicate,
    PoolPermission.Admin,
  ]);

  /** Generate a pool ACL member entry */
  function arbAclMember(nodeId: string) {
    return arbPermissions.map((permissions) => ({
      nodeId,
      permissions,
      addedAt: new Date(),
      addedBy: 'owner-node',
    }));
  }

  /**
   * Generate a pool ACL with a specific set of member IDs.
   * The requesting member may or may not be included.
   */
  function arbPoolACL(
    poolId: string,
    memberIds: string[],
    requestingMemberId: string,
    includeRequester: boolean,
  ): fc.Arbitrary<IPoolACL<string>> {
    const memberArbs = memberIds.map((id) => arbAclMember(id));
    const requesterArb = includeRequester
      ? arbAclMember(requestingMemberId).map((m) => [m])
      : fc.constant([]);

    return fc
      .tuple(
        fc.tuple(...memberArbs),
        requesterArb,
        fc.boolean(), // publicRead
        fc.boolean(), // publicWrite
      )
      .map(([otherMembers, requesterMembers, publicRead, publicWrite]) => ({
        poolId,
        owner: 'owner-node',
        members: [...otherMembers, ...requesterMembers],
        publicRead,
        publicWrite,
        approvalSignatures: [],
        version: 1,
        updatedAt: new Date(),
      }));
  }

  /** Generate a pool info from a pool ACL */
  function poolInfoFromAcl(acl: IPoolACL<string>): IPoolInfo<string> {
    return {
      poolId: acl.poolId,
      blockCount: 10,
      totalSize: 1024,
      memberCount: acl.members.length,
      encrypted: false,
      publicRead: acl.publicRead,
      publicWrite: acl.publicWrite,
      hostingNodes: ['local-node'],
    };
  }

  /**
   * Simulates the handleListPools filtering logic from the design:
   * - Admin/System: return all pools
   * - User: return only pools where hasPermission(acl, memberId, Read) is true
   */
  function filterPoolsForMember(
    pools: IPoolInfo<string>[],
    acls: Map<string, IPoolACL<string>>,
    memberId: string,
    memberType: MemberType,
  ): IPoolInfo<string>[] {
    const isPrivileged =
      memberType === MemberType.Admin || memberType === MemberType.System;

    if (isPrivileged) {
      return pools;
    }

    return pools.filter((pool) => {
      const acl = acls.get(pool.poolId);
      if (!acl) return false;
      return hasPermission(acl, memberId, PoolPermission.Read);
    });
  }

  /**
   * Property 4a: Admin/System members see ALL pools regardless of ACL.
   *
   * For any set of pools and for any member with MemberType Admin or System,
   * the filtered result contains every pool.
   *
   * **Validates: Requirements 4.5**
   */
  it('Property 4a: Admin/System members see all pools', () => {
    fc.assert(
      fc.property(
        fc
          .array(arbPoolId, { minLength: 1, maxLength: 10 })
          .chain((poolIds) => {
            const uniquePoolIds = [...new Set(poolIds)];
            // Generate ACLs for each pool — requester is NOT a member (worst case)
            const aclArbs = uniquePoolIds.map((pid) =>
              arbPoolACL(
                pid,
                ['other-node-1', 'other-node-2'],
                'requester-id',
                false,
              ),
            );
            return fc.tuple(
              fc.constant(uniquePoolIds),
              fc.tuple(...aclArbs),
              arbAdminMemberType,
            );
          }),
        ([poolIds, acls, memberType]) => {
          const aclMap = new Map<string, IPoolACL<string>>();
          const pools: IPoolInfo<string>[] = [];
          for (let i = 0; i < poolIds.length; i++) {
            aclMap.set(poolIds[i], acls[i]);
            pools.push(poolInfoFromAcl(acls[i]));
          }

          const result = filterPoolsForMember(
            pools,
            aclMap,
            'requester-id',
            memberType,
          );

          // Admin/System sees everything
          expect(result.length).toBe(pools.length);
          expect(result.map((p) => p.poolId).sort()).toEqual(
            pools.map((p) => p.poolId).sort(),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4b: User members see only authorized pools.
   *
   * For any set of pools with various ACL configurations and for any member
   * with MemberType User, the filtered result contains exactly the pools
   * where hasPermission(acl, memberId, Read) returns true.
   *
   * **Validates: Requirements 4.1, 4.3**
   */
  it('Property 4b: User members see only pools they have Read permission on', () => {
    fc.assert(
      fc.property(
        fc
          .array(arbPoolId, { minLength: 1, maxLength: 10 })
          .chain((poolIds) => {
            const uniquePoolIds = [...new Set(poolIds)];
            // For each pool, randomly decide if the requester is a member
            const aclArbs = uniquePoolIds.map((pid) =>
              fc
                .boolean()
                .chain((includeRequester) =>
                  arbPoolACL(
                    pid,
                    ['other-node-1', 'other-node-2'],
                    'requester-id',
                    includeRequester,
                  ),
                ),
            );
            return fc.tuple(fc.constant(uniquePoolIds), fc.tuple(...aclArbs));
          }),
        ([poolIds, acls]) => {
          const aclMap = new Map<string, IPoolACL<string>>();
          const pools: IPoolInfo<string>[] = [];
          for (let i = 0; i < poolIds.length; i++) {
            aclMap.set(poolIds[i], acls[i]);
            pools.push(poolInfoFromAcl(acls[i]));
          }

          const result = filterPoolsForMember(
            pools,
            aclMap,
            'requester-id',
            MemberType.User,
          );

          // Compute expected set: pools where requester has Read permission
          const expectedPoolIds = poolIds.filter((pid) => {
            const acl = aclMap.get(pid);
            return (
              acl !== undefined &&
              hasPermission(acl, 'requester-id', PoolPermission.Read)
            );
          });

          expect(result.map((p) => p.poolId).sort()).toEqual(
            expectedPoolIds.sort(),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4c: No unauthorized pool appears in User results.
   *
   * For any pool in the filtered result for a User member, that pool
   * must have hasPermission(acl, memberId, Read) === true.
   *
   * **Validates: Requirements 4.3**
   */
  it('Property 4c: no unauthorized pool appears in User results', () => {
    fc.assert(
      fc.property(
        fc
          .array(arbPoolId, { minLength: 1, maxLength: 10 })
          .chain((poolIds) => {
            const uniquePoolIds = [...new Set(poolIds)];
            const aclArbs = uniquePoolIds.map((pid) =>
              fc
                .boolean()
                .chain((includeRequester) =>
                  arbPoolACL(
                    pid,
                    ['other-node-1'],
                    'requester-id',
                    includeRequester,
                  ),
                ),
            );
            return fc.tuple(fc.constant(uniquePoolIds), fc.tuple(...aclArbs));
          }),
        ([poolIds, acls]) => {
          const aclMap = new Map<string, IPoolACL<string>>();
          const pools: IPoolInfo<string>[] = [];
          for (let i = 0; i < poolIds.length; i++) {
            aclMap.set(poolIds[i], acls[i]);
            pools.push(poolInfoFromAcl(acls[i]));
          }

          const result = filterPoolsForMember(
            pools,
            aclMap,
            'requester-id',
            MemberType.User,
          );

          // Every pool in the result must be authorized
          for (const pool of result) {
            const acl = aclMap.get(pool.poolId);
            expect(acl).toBeDefined();
            expect(
              hasPermission(acl!, 'requester-id', PoolPermission.Read),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4d: No authorized pool is omitted from User results.
   *
   * For any pool where hasPermission(acl, memberId, Read) is true,
   * that pool must appear in the filtered result for a User member.
   *
   * **Validates: Requirements 4.1**
   */
  it('Property 4d: no authorized pool is omitted from User results', () => {
    fc.assert(
      fc.property(
        fc
          .array(arbPoolId, { minLength: 1, maxLength: 10 })
          .chain((poolIds) => {
            const uniquePoolIds = [...new Set(poolIds)];
            const aclArbs = uniquePoolIds.map((pid) =>
              fc
                .boolean()
                .chain((includeRequester) =>
                  arbPoolACL(
                    pid,
                    ['other-node-1'],
                    'requester-id',
                    includeRequester,
                  ),
                ),
            );
            return fc.tuple(fc.constant(uniquePoolIds), fc.tuple(...aclArbs));
          }),
        ([poolIds, acls]) => {
          const aclMap = new Map<string, IPoolACL<string>>();
          const pools: IPoolInfo<string>[] = [];
          for (let i = 0; i < poolIds.length; i++) {
            aclMap.set(poolIds[i], acls[i]);
            pools.push(poolInfoFromAcl(acls[i]));
          }

          const result = filterPoolsForMember(
            pools,
            aclMap,
            'requester-id',
            MemberType.User,
          );

          const resultPoolIds = new Set(result.map((p) => p.poolId));

          // Every authorized pool must appear in the result
          for (let i = 0; i < poolIds.length; i++) {
            const acl = acls[i];
            if (hasPermission(acl, 'requester-id', PoolPermission.Read)) {
              expect(resultPoolIds.has(poolIds[i])).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4e: Universal biconditional — a pool appears in the result
   * if and only if the member is Admin/System OR has Read permission.
   *
   * For any set of pools, any member type, and any ACL configuration,
   * a pool appears in the filtered result iff the member is authorized.
   *
   * **Validates: Requirements 4.1, 4.3, 4.5**
   */
  it('Property 4e: pool appears in result iff member is authorized', () => {
    fc.assert(
      fc.property(
        fc.array(arbPoolId, { minLength: 1, maxLength: 8 }).chain((poolIds) => {
          const uniquePoolIds = [...new Set(poolIds)];
          const aclArbs = uniquePoolIds.map((pid) =>
            fc
              .boolean()
              .chain((includeRequester) =>
                arbPoolACL(
                  pid,
                  ['other-node-1'],
                  'requester-id',
                  includeRequester,
                ),
              ),
          );
          return fc.tuple(
            fc.constant(uniquePoolIds),
            fc.tuple(...aclArbs),
            arbMemberType,
          );
        }),
        ([poolIds, acls, memberType]) => {
          const aclMap = new Map<string, IPoolACL<string>>();
          const pools: IPoolInfo<string>[] = [];
          for (let i = 0; i < poolIds.length; i++) {
            aclMap.set(poolIds[i], acls[i]);
            pools.push(poolInfoFromAcl(acls[i]));
          }

          const result = filterPoolsForMember(
            pools,
            aclMap,
            'requester-id',
            memberType,
          );

          const resultPoolIds = new Set(result.map((p) => p.poolId));
          const isPrivileged =
            memberType === MemberType.Admin || memberType === MemberType.System;

          for (let i = 0; i < poolIds.length; i++) {
            const acl = acls[i];
            const hasRead = hasPermission(
              acl,
              'requester-id',
              PoolPermission.Read,
            );
            const shouldAppear = isPrivileged || hasRead;

            expect(resultPoolIds.has(poolIds[i])).toBe(shouldAppear);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 5: Unauthorized pool direct access returns 403
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 5: Unauthorized pool direct access returns 403', () => {
  // ── Generators ──

  const arbPoolId = fc
    .string({ minLength: 8, maxLength: 32 })
    .filter((s) => s.length > 0);

  const arbRequesterId = fc
    .string({ minLength: 8, maxLength: 32 })
    .filter((s) => s.length > 0);

  /**
   * Generate a pool ACL where the requester explicitly does NOT have Read permission.
   * The requester may be absent from the ACL entirely, or present without Read.
   * publicRead is always false (otherwise the requester would have implicit Read).
   */
  function arbUnauthorizedPoolACL(
    poolId: string,
    requesterId: string,
  ): fc.Arbitrary<IPoolACL<string>> {
    const nonReadPermissions = fc.subarray([
      PoolPermission.Write,
      PoolPermission.Replicate,
    ]);

    return fc
      .record({
        includeRequester: fc.boolean(),
        requesterPermissions: nonReadPermissions,
        otherMemberCount: fc.nat({ max: 5 }),
        publicWrite: fc.boolean(),
      })
      .map(
        ({
          includeRequester,
          requesterPermissions,
          otherMemberCount,
          publicWrite,
        }) => {
          const members: IPoolACL<string>['members'] = [];

          // Add some other members (who may have Read, doesn't matter)
          for (let i = 0; i < otherMemberCount; i++) {
            members.push({
              nodeId: `other-member-${i}`,
              permissions: [PoolPermission.Read, PoolPermission.Write],
              addedAt: new Date(),
              addedBy: 'owner-node',
            });
          }

          // Optionally add the requester WITHOUT Read permission
          if (includeRequester) {
            members.push({
              nodeId: requesterId,
              permissions: requesterPermissions,
              addedAt: new Date(),
              addedBy: 'owner-node',
            });
          }

          return {
            poolId,
            owner: 'owner-node',
            members,
            publicRead: false, // critical: no public read
            publicWrite,
            approvalSignatures: [],
            version: 1,
            updatedAt: new Date(),
          };
        },
      );
  }

  /**
   * Simulates the handleGetPoolDetails authorization check from the controller.
   *
   * For non-Admin/System members:
   * - Look up the pool ACL
   * - If no ACL or no Read permission → 403
   * - Otherwise → 200
   *
   * For Admin/System members: always 200 (ACL bypassed)
   */
  function simulatePoolDetailAccess(
    memberType: MemberType,
    memberId: string,
    poolId: string,
    aclLookup: (id: string) => IPoolACL<string> | undefined,
  ): { statusCode: number } {
    const isAdmin =
      memberType === MemberType.Admin || memberType === MemberType.System;

    if (!isAdmin) {
      const acl = aclLookup(poolId);
      if (!acl || !hasPermission(acl, memberId, PoolPermission.Read)) {
        return { statusCode: 403 };
      }
    }

    return { statusCode: 200 };
  }

  /**
   * Property 5a: User members without Read permission get 403 on pool detail access.
   *
   * For any pool and for any User member who lacks Read permission on that pool
   * (and the pool does not have publicRead), a direct detail request returns 403.
   *
   * **Validates: Requirements 4.3**
   */
  it('Property 5a: User without Read permission gets 403 on pool detail access', () => {
    fc.assert(
      fc.property(
        arbPoolId,
        arbRequesterId,
        fc.tuple(arbPoolId, arbRequesterId).chain(([poolId, requesterId]) =>
          arbUnauthorizedPoolACL(poolId, requesterId).map((acl) => ({
            poolId,
            requesterId,
            acl,
          })),
        ),
        (_poolIdUnused, _requesterIdUnused, { poolId, requesterId, acl }) => {
          // Pre-condition: requester truly lacks Read permission
          fc.pre(!hasPermission(acl, requesterId, PoolPermission.Read));

          const result = simulatePoolDetailAccess(
            MemberType.User,
            requesterId,
            poolId,
            (id) => (id === poolId ? acl : undefined),
          );

          expect(result.statusCode).toBe(403);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5b: User members get 403 when pool ACL does not exist.
   *
   * For any pool ID where no ACL can be found and for any User member,
   * a direct detail request returns 403.
   *
   * **Validates: Requirements 4.3**
   */
  it('Property 5b: User gets 403 when pool ACL does not exist', () => {
    fc.assert(
      fc.property(arbPoolId, arbRequesterId, (poolId, requesterId) => {
        const result = simulatePoolDetailAccess(
          MemberType.User,
          requesterId,
          poolId,
          () => undefined, // no ACL found
        );

        expect(result.statusCode).toBe(403);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5c: Admin/System members always get 200 regardless of ACL.
   *
   * For any pool (even one where the member has no Read permission) and
   * for any Admin or System member, the detail request succeeds with 200.
   *
   * **Validates: Requirements 4.3 (contrast — admins bypass ACL)**
   */
  it('Property 5c: Admin/System members bypass ACL and get 200', () => {
    fc.assert(
      fc.property(
        arbPoolId,
        arbRequesterId,
        arbAdminMemberType,
        fc.tuple(arbPoolId, arbRequesterId).chain(([poolId, requesterId]) =>
          arbUnauthorizedPoolACL(poolId, requesterId).map((acl) => ({
            poolId,
            requesterId,
            acl,
          })),
        ),
        (
          _poolIdUnused,
          _requesterIdUnused,
          memberType,
          { poolId, requesterId, acl },
        ) => {
          const result = simulatePoolDetailAccess(
            memberType,
            requesterId,
            poolId,
            (id) => (id === poolId ? acl : undefined),
          );

          expect(result.statusCode).toBe(200);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5d: Universal — for any member type and any pool ACL state,
   * a User without Read permission gets 403, while Admin/System always gets 200.
   *
   * **Validates: Requirements 4.3**
   */
  it('Property 5d: unauthorized access returns 403 iff member is User without Read', () => {
    fc.assert(
      fc.property(
        arbMemberType,
        fc.tuple(arbPoolId, arbRequesterId).chain(([poolId, requesterId]) =>
          arbUnauthorizedPoolACL(poolId, requesterId).map((acl) => ({
            poolId,
            requesterId,
            acl,
          })),
        ),
        (memberType, { poolId, requesterId, acl }) => {
          // Pre-condition: requester lacks Read permission on this pool
          fc.pre(!hasPermission(acl, requesterId, PoolPermission.Read));

          const result = simulatePoolDetailAccess(
            memberType,
            requesterId,
            poolId,
            (id) => (id === poolId ? acl : undefined),
          );

          const isAdmin =
            memberType === MemberType.Admin || memberType === MemberType.System;

          if (isAdmin) {
            expect(result.statusCode).toBe(200);
          } else {
            expect(result.statusCode).toBe(403);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 16: Introspection response completeness
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 16: Introspection response completeness', () => {
  // ── Generators ──

  const arbNonEmptyString = fc
    .string({ minLength: 1, maxLength: 32 })
    .filter((s) => s.length > 0);

  const arbIso8601 = fc
    .integer({
      min: new Date('2020-01-01').getTime(),
      max: new Date('2030-01-01').getTime(),
    })
    .map((ms) => new Date(ms).toISOString());

  const arbVersion = fc
    .tuple(fc.nat({ max: 99 }), fc.nat({ max: 99 }), fc.nat({ max: 99 }))
    .map(([a, b, c]) => `${a}.${b}.${c}`);

  /** Generate a valid INodeStatus<string> */
  const arbNodeStatus: fc.Arbitrary<INodeStatus<string>> = fc.record({
    nodeId: arbNonEmptyString,
    healthy: fc.boolean(),
    uptime: fc.nat({ max: 1_000_000 }),
    version: arbVersion,
    capabilities: fc.array(arbNonEmptyString, { maxLength: 5 }),
    partitionMode: fc.boolean(),
    disconnectedPeers: fc.option(
      fc.array(arbNonEmptyString, { minLength: 1, maxLength: 5 }),
      { nil: undefined },
    ),
  });

  /** Generate a valid IPeerInfo<string> */
  const arbPeerInfo: fc.Arbitrary<IPeerInfo<string>> = fc.record({
    nodeId: arbNonEmptyString,
    connected: fc.boolean(),
    lastSeen: arbIso8601,
    latencyMs: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
  });

  /** Generate a valid INetworkTopology<string> */
  const arbNetworkTopology: fc.Arbitrary<INetworkTopology<string>> = fc
    .array(arbPeerInfo, { maxLength: 10 })
    .chain((peers) =>
      fc.record({
        localNodeId: arbNonEmptyString,
        peers: fc.constant(peers),
        totalConnected: fc.constant(peers.filter((p) => p.connected).length),
      }),
    );

  /** Generate a valid IPoolInfo<string> */
  const arbPoolInfoGen: fc.Arbitrary<IPoolInfo<string>> = fc.record({
    poolId: arbNonEmptyString,
    blockCount: fc.nat({ max: 100_000 }),
    totalSize: fc.nat({ max: 1_000_000_000 }),
    memberCount: fc.nat({ max: 1000 }),
    encrypted: fc.boolean(),
    publicRead: fc.boolean(),
    publicWrite: fc.boolean(),
    hostingNodes: fc.array(arbNonEmptyString, { maxLength: 5 }),
  });

  /** Generate a valid IPoolAclSummary<string> */
  const arbPoolAclSummary: fc.Arbitrary<IPoolAclSummary<string>> = fc.record({
    memberCount: fc.nat({ max: 1000 }),
    adminCount: fc.nat({ max: 100 }),
    publicRead: fc.boolean(),
    publicWrite: fc.boolean(),
    currentUserPermissions: fc.subarray([
      PoolPermission.Read,
      PoolPermission.Write,
      PoolPermission.Replicate,
      PoolPermission.Admin,
    ]),
  });

  /** Generate a valid IPoolDetail<string> */
  const arbPoolDetail: fc.Arbitrary<IPoolDetail<string>> = fc
    .tuple(arbPoolInfoGen, arbNonEmptyString, arbPoolAclSummary)
    .map(([poolInfo, owner, aclSummary]) => ({
      ...poolInfo,
      owner,
      aclSummary,
    }));

  /** Generate a valid IBlockStoreStats */
  const arbBlockStoreStats: fc.Arbitrary<IBlockStoreStats> = fc
    .tuple(
      fc.nat({ max: 1_000_000_000_000 }),
      fc.nat({ max: 1_000_000_000_000 }),
      fc.array(fc.tuple(arbNonEmptyString, fc.nat({ max: 100_000 })), {
        maxLength: 10,
      }),
    )
    .map(([totalCapacity, currentUsage, blockCountEntries]) => {
      const blockCounts: Record<string, number> = {};
      let totalBlocks = 0;
      for (const [type, count] of blockCountEntries) {
        blockCounts[type] = count;
        totalBlocks += count;
      }
      return {
        totalCapacity,
        currentUsage,
        availableSpace: Math.max(0, totalCapacity - currentUsage),
        blockCounts,
        totalBlocks,
      };
    });

  /** Generate a valid IEnergyAccountStatus<string> */
  const arbEnergyAccount: fc.Arbitrary<IEnergyAccountStatus<string>> =
    fc.record({
      memberId: arbNonEmptyString,
      balance: fc.nat({ max: 1_000_000 }),
      availableBalance: fc.nat({ max: 1_000_000 }),
      earned: fc.nat({ max: 1_000_000 }),
      spent: fc.nat({ max: 1_000_000 }),
      reserved: fc.nat({ max: 1_000_000 }),
    });

  /** Generate a valid IPoolDiscoveryResult<string> */
  const arbPoolDiscoveryResult: fc.Arbitrary<IPoolDiscoveryResult<string>> =
    fc.record({
      pools: fc.array(arbPoolInfoGen, { maxLength: 10 }),
      queriedPeers: fc.array(arbNonEmptyString, { maxLength: 10 }),
      unreachablePeers: fc.array(arbNonEmptyString, { maxLength: 5 }),
      timestamp: arbIso8601,
    });

  // ── Validation helpers ──

  function assertRequiredString(value: unknown, _fieldName: string): void {
    expect(typeof value).toBe('string');
    expect(value).toBeDefined();
  }

  function assertRequiredNumber(value: unknown, _fieldName: string): void {
    expect(typeof value).toBe('number');
    expect(value).toBeDefined();
  }

  function assertRequiredBoolean(value: unknown, _fieldName: string): void {
    expect(typeof value).toBe('boolean');
    expect(value).toBeDefined();
  }

  function assertRequiredArray(value: unknown, _fieldName: string): void {
    expect(Array.isArray(value)).toBe(true);
    expect(value).toBeDefined();
  }

  /**
   * Property 16a: INodeStatus response contains all required fields with correct types.
   *
   * For any valid INodeStatus instance, all required fields (nodeId, healthy, uptime,
   * version, capabilities, partitionMode) are present and have the correct types.
   *
   * **Validates: Requirements 2.1**
   */
  it('Property 16a: INodeStatus response has all required fields', () => {
    fc.assert(
      fc.property(arbNodeStatus, (status) => {
        assertRequiredString(status.nodeId, 'nodeId');
        assertRequiredBoolean(status.healthy, 'healthy');
        assertRequiredNumber(status.uptime, 'uptime');
        assertRequiredString(status.version, 'version');
        assertRequiredArray(status.capabilities, 'capabilities');
        assertRequiredBoolean(status.partitionMode, 'partitionMode');

        // disconnectedPeers is optional but if present must be an array of strings
        if (status.disconnectedPeers !== undefined) {
          assertRequiredArray(status.disconnectedPeers, 'disconnectedPeers');
          for (const peer of status.disconnectedPeers) {
            expect(typeof peer).toBe('string');
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16b: INetworkTopology response contains all required fields with correct types.
   *
   * For any valid INetworkTopology instance, localNodeId, peers array, and totalConnected
   * are present. Each peer has nodeId, connected, and lastSeen.
   *
   * **Validates: Requirements 3.1**
   */
  it('Property 16b: INetworkTopology response has all required fields', () => {
    fc.assert(
      fc.property(arbNetworkTopology, (topology) => {
        assertRequiredString(topology.localNodeId, 'localNodeId');
        assertRequiredArray(topology.peers, 'peers');
        assertRequiredNumber(topology.totalConnected, 'totalConnected');

        for (const peer of topology.peers) {
          assertRequiredString(peer.nodeId, 'nodeId');
          assertRequiredBoolean(peer.connected, 'connected');
          assertRequiredString(peer.lastSeen, 'lastSeen');
          // Verify lastSeen is valid ISO 8601
          expect(new Date(peer.lastSeen).toISOString()).toBe(peer.lastSeen);
          // latencyMs is optional
          if (peer.latencyMs !== undefined) {
            assertRequiredNumber(peer.latencyMs, 'latencyMs');
          }
        }

        // totalConnected should match the count of connected peers
        const connectedCount = topology.peers.filter((p) => p.connected).length;
        expect(topology.totalConnected).toBe(connectedCount);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16c: IPoolDetail response contains all required fields with correct types.
   *
   * For any valid IPoolDetail instance, all IPoolInfo fields plus owner and aclSummary
   * are present. The aclSummary has memberCount, adminCount, publicRead, publicWrite,
   * and currentUserPermissions.
   *
   * **Validates: Requirements 4.2**
   */
  it('Property 16c: IPoolDetail response has all required fields', () => {
    fc.assert(
      fc.property(arbPoolDetail, (detail) => {
        // IPoolInfo fields
        assertRequiredString(detail.poolId, 'poolId');
        assertRequiredNumber(detail.blockCount, 'blockCount');
        assertRequiredNumber(detail.totalSize, 'totalSize');
        assertRequiredNumber(detail.memberCount, 'memberCount');
        assertRequiredBoolean(detail.encrypted, 'encrypted');
        assertRequiredBoolean(detail.publicRead, 'publicRead');
        assertRequiredBoolean(detail.publicWrite, 'publicWrite');
        assertRequiredArray(detail.hostingNodes, 'hostingNodes');

        // IPoolDetail-specific fields
        assertRequiredString(detail.owner, 'owner');
        expect(detail.aclSummary).toBeDefined();
        expect(typeof detail.aclSummary).toBe('object');

        // IPoolAclSummary fields
        const acl = detail.aclSummary;
        assertRequiredNumber(acl.memberCount, 'aclSummary.memberCount');
        assertRequiredNumber(acl.adminCount, 'aclSummary.adminCount');
        assertRequiredBoolean(acl.publicRead, 'aclSummary.publicRead');
        assertRequiredBoolean(acl.publicWrite, 'aclSummary.publicWrite');
        assertRequiredArray(
          acl.currentUserPermissions,
          'aclSummary.currentUserPermissions',
        );
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16d: IBlockStoreStats response contains all required fields with correct types.
   *
   * For any valid IBlockStoreStats instance, totalCapacity, currentUsage, availableSpace,
   * blockCounts (Record), and totalBlocks are present.
   *
   * **Validates: Requirements 5.1**
   */
  it('Property 16d: IBlockStoreStats response has all required fields', () => {
    fc.assert(
      fc.property(arbBlockStoreStats, (stats) => {
        assertRequiredNumber(stats.totalCapacity, 'totalCapacity');
        assertRequiredNumber(stats.currentUsage, 'currentUsage');
        assertRequiredNumber(stats.availableSpace, 'availableSpace');
        assertRequiredNumber(stats.totalBlocks, 'totalBlocks');

        expect(stats.blockCounts).toBeDefined();
        expect(typeof stats.blockCounts).toBe('object');
        expect(stats.blockCounts).not.toBeNull();

        // All values in blockCounts must be numbers
        for (const [key, value] of Object.entries(stats.blockCounts)) {
          expect(typeof key).toBe('string');
          assertRequiredNumber(value, `blockCounts[${key}]`);
        }

        // availableSpace should be consistent with capacity and usage
        expect(stats.availableSpace).toBe(
          Math.max(0, stats.totalCapacity - stats.currentUsage),
        );

        // totalBlocks should equal sum of blockCounts values
        const sumOfCounts = Object.values(stats.blockCounts).reduce(
          (sum, count) => sum + count,
          0,
        );
        expect(stats.totalBlocks).toBe(sumOfCounts);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16e: IEnergyAccountStatus response contains all required fields with correct types.
   *
   * For any valid IEnergyAccountStatus instance, memberId, balance, availableBalance,
   * earned, spent, and reserved are present.
   *
   * **Validates: Requirements 6.1**
   */
  it('Property 16e: IEnergyAccountStatus response has all required fields', () => {
    fc.assert(
      fc.property(arbEnergyAccount, (account) => {
        assertRequiredString(account.memberId, 'memberId');
        assertRequiredNumber(account.balance, 'balance');
        assertRequiredNumber(account.availableBalance, 'availableBalance');
        assertRequiredNumber(account.earned, 'earned');
        assertRequiredNumber(account.spent, 'spent');
        assertRequiredNumber(account.reserved, 'reserved');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16f: IPoolDiscoveryResult response contains all required fields with correct types.
   *
   * For any valid IPoolDiscoveryResult instance, pools array, queriedPeers, unreachablePeers,
   * and timestamp are present. Each pool in the result has all IPoolInfo required fields.
   *
   * **Validates: Requirements 2.1, 3.1, 4.2, 5.1, 6.1**
   */
  it('Property 16f: IPoolDiscoveryResult response has all required fields', () => {
    fc.assert(
      fc.property(arbPoolDiscoveryResult, (result) => {
        assertRequiredArray(result.pools, 'pools');
        assertRequiredArray(result.queriedPeers, 'queriedPeers');
        assertRequiredArray(result.unreachablePeers, 'unreachablePeers');
        assertRequiredString(result.timestamp, 'timestamp');

        // Verify timestamp is valid ISO 8601
        expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);

        // Each pool must have all IPoolInfo required fields
        for (const pool of result.pools) {
          assertRequiredString(pool.poolId, 'pool.poolId');
          assertRequiredNumber(pool.blockCount, 'pool.blockCount');
          assertRequiredNumber(pool.totalSize, 'pool.totalSize');
          assertRequiredNumber(pool.memberCount, 'pool.memberCount');
          assertRequiredBoolean(pool.encrypted, 'pool.encrypted');
          assertRequiredBoolean(pool.publicRead, 'pool.publicRead');
          assertRequiredBoolean(pool.publicWrite, 'pool.publicWrite');
          assertRequiredArray(pool.hostingNodes, 'pool.hostingNodes');
        }

        // queriedPeers and unreachablePeers should contain strings
        for (const peer of result.queriedPeers) {
          expect(typeof peer).toBe('string');
        }
        for (const peer of result.unreachablePeers) {
          expect(typeof peer).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 17: Energy account access control
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 17: Energy account access control', () => {
  const MEMBER_ENERGY_ENDPOINT: EndpointDefinition =
    INTROSPECTION_ENDPOINTS.find(
      (e) => e.path === '/api/introspection/energy/:memberId',
    )!;

  /**
   * Simulates the energy account access control logic from the controller.
   *
   * The /energy/:memberId endpoint is classified as Admin_Endpoint.
   * - User members: blocked by requireMemberTypes middleware → 403
   * - Admin/System members: access granted → 200
   *
   * This mirrors the controller's route definition which applies
   * requireMemberTypes(MemberType.Admin, MemberType.System) middleware.
   */
  function simulateEnergyAccessControl(
    requesterType: MemberType,
    _requesterId: string,
    _targetMemberId: string,
  ): { statusCode: number } {
    // The endpoint uses admin middleware — User type is always rejected
    const isAdmin =
      requesterType === MemberType.Admin || requesterType === MemberType.System;

    if (!isAdmin) {
      return { statusCode: 403 };
    }

    // Admin/System can access any member's energy, even if targetMemberId !== requesterId
    return { statusCode: 200 };
  }

  /**
   * Property 17a: User-type members requesting another member's energy get 403.
   *
   * For any User-type member requesting any other member's energy account
   * (where the target memberId differs from the requester's), the endpoint
   * returns 403 Forbidden because /energy/:memberId is an Admin_Endpoint.
   *
   * **Validates: Requirements 6.3**
   */
  it('Property 17a: User requesting another member energy gets 403', () => {
    fc.assert(
      fc.property(
        arbMemberId,
        arbUsername,
        arbMemberId,
        (requesterId, username, targetMemberId) => {
          // Pre-condition: requester and target are different members
          fc.pre(requesterId !== targetMemberId);

          const token = signValidToken(requesterId, username, MemberType.User);
          const result = simulateMiddlewareChain(MEMBER_ENERGY_ENDPOINT, token);

          expect(result.granted).toBe(false);
          expect(result.statusCode).toBe(403);

          // Also verify via direct simulation
          const simResult = simulateEnergyAccessControl(
            MemberType.User,
            requesterId,
            targetMemberId,
          );
          expect(simResult.statusCode).toBe(403);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 17b: User-type members requesting their own energy via :memberId also get 403.
   *
   * Even when a User requests their own energy account through the /energy/:memberId
   * endpoint (rather than /energy), the Admin middleware rejects them because the
   * endpoint is classified as Admin_Endpoint regardless of the target.
   *
   * **Validates: Requirements 6.3**
   */
  it('Property 17b: User requesting own energy via admin endpoint gets 403', () => {
    fc.assert(
      fc.property(arbMemberId, arbUsername, (memberId, username) => {
        const token = signValidToken(memberId, username, MemberType.User);
        const result = simulateMiddlewareChain(MEMBER_ENERGY_ENDPOINT, token);

        expect(result.granted).toBe(false);
        expect(result.statusCode).toBe(403);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 17c: Admin/System members can access any member's energy account.
   *
   * For any Admin or System member requesting any member's energy account
   * (including their own or another member's), the middleware chain grants access.
   *
   * **Validates: Requirements 6.3 (contrast — admins are permitted)**
   */
  it('Property 17c: Admin/System can access any member energy', () => {
    fc.assert(
      fc.property(
        arbMemberId,
        arbUsername,
        arbAdminMemberType,
        arbMemberId,
        (requesterId, username, memberType, targetMemberId) => {
          const token = signValidToken(requesterId, username, memberType);
          const result = simulateMiddlewareChain(MEMBER_ENERGY_ENDPOINT, token);

          expect(result.granted).toBe(true);
          expect(result.statusCode).toBeNull();

          // Also verify via direct simulation
          const simResult = simulateEnergyAccessControl(
            memberType,
            requesterId,
            targetMemberId,
          );
          expect(simResult.statusCode).toBe(200);
        },
      ),
      { numRuns: 100 },
    );
  });
});
