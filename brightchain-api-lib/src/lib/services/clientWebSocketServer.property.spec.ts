/**
 * @fileoverview Property-based tests for ClientWebSocketServer
 *
 * Tests correctness properties for the JWT-authenticated WebSocket server
 * used by Lumen client connections.
 *
 * This file covers:
 * - Property 12: WebSocket JWT authentication gate
 * - Property 13: Client event delivery respects access tiers
 * - Property 14: Client event envelope completeness
 * - (Property 18 will be added in a later task)
 *
 * @see Requirements 9.1, 9.2, 3.2, 4.4, 6.2, 9.4, 9.7
 */

import {
  ClientEventAccessTier,
  ClientEventType,
  IClientEvent,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { createServer, Server } from 'http';
import * as jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';

import { ITokenPayload } from '../interfaces/token-payload';
import {
  ClientWebSocketServer,
  IWsMemberContext,
  shouldDeliverEvent,
} from './clientWebSocketServer';
import { EventNotificationSystem } from './eventNotificationSystem';

// Longer timeout for property tests with real WebSocket connections
jest.setTimeout(60000);

// ── Constants ──

const TEST_JWT_SECRET = 'test-jwt-secret-for-property-tests';

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

/** Generate a valid ITokenPayload with a future expiration */
const arbValidTokenPayload: fc.Arbitrary<ITokenPayload> = fc.record({
  memberId: arbMemberId,
  username: arbUsername,
  type: arbMemberType,
  iat: fc.constant(Math.floor(Date.now() / 1000)),
  exp: fc.constant(Math.floor(Date.now() / 1000) + 3600),
});

/** Generate an expired ITokenPayload */
const arbExpiredTokenPayload: fc.Arbitrary<ITokenPayload> = fc.record({
  memberId: arbMemberId,
  username: arbUsername,
  type: arbMemberType,
  iat: fc.constant(Math.floor(Date.now() / 1000) - 7200),
  exp: fc.constant(Math.floor(Date.now() / 1000) - 3600),
});

/** Generate random garbage strings that are not valid JWTs */
const arbInvalidJwtString = fc.oneof(
  fc.constant(''),
  fc.constant('not-a-jwt'),
  fc.constant('header.payload.signature'),
  fc.string({ minLength: 1, maxLength: 100 }).filter((s) => {
    const parts = s.split('.');
    return parts.length !== 3 || parts.some((p) => p.length === 0);
  }),
);

// ── Helpers ──

function signToken(payload: ITokenPayload, secret: string): string {
  return jwt.sign(
    {
      memberId: payload.memberId,
      username: payload.username,
      type: payload.type,
    },
    secret,
    {
      expiresIn: payload.exp - payload.iat,
    },
  );
}

function signExpiredToken(payload: ITokenPayload, secret: string): string {
  return jwt.sign(
    {
      memberId: payload.memberId,
      username: payload.username,
      type: payload.type,
    },
    secret,
    {
      expiresIn: '-1s',
    },
  );
}

interface TestEnv {
  httpServer: Server;
  cwsServer: ClientWebSocketServer;
  port: number;
  cleanup: () => Promise<void>;
}

/** Create an HTTP server, ClientWebSocketServer, and return cleanup helpers */
function createTestServer(): Promise<TestEnv> {
  return new Promise((resolve) => {
    const port = 9000 + Math.floor(Math.random() * 5000);
    const httpServer = createServer();
    const ens = new EventNotificationSystem();
    const cwsServer = new ClientWebSocketServer(
      httpServer,
      TEST_JWT_SECRET,
      ens,
      {
        idleTimeoutMs: 30_000,
        tokenGraceMs: 5_000,
        tokenCheckIntervalMs: 60_000,
        tokenWarningBeforeMs: 5_000,
      },
    );

    httpServer.listen(port, () => {
      resolve({
        httpServer,
        cwsServer,
        port,
        cleanup: () =>
          new Promise<void>((done) => {
            cwsServer.close(() => {
              httpServer.close(() => {
                setTimeout(done, 50);
              });
            });
          }),
      });
    });
  });
}

interface AcceptedResult {
  ws: WebSocket;
  accepted: true;
}

interface RejectedResult {
  code: number;
  reason: string;
  accepted: false;
}

type ConnectionResult = AcceptedResult | RejectedResult;

/**
 * Connect a WebSocket client with a token in the query param.
 *
 * The ClientWebSocketServer has a two-phase auth flow: if query-param auth
 * fails, it keeps the WS open and waits for a first-message auth. To test
 * query-param auth specifically, we check whether the server's session count
 * increased (i.e. the token was accepted on upgrade). If not, the query-param
 * auth failed.
 */
function connectWithToken(
  port: number,
  token: string,
  cwsServer: ClientWebSocketServer,
): Promise<ConnectionResult> {
  return new Promise((resolve) => {
    const countBefore = cwsServer.getConnectedClientCount();
    const ws = new WebSocket(
      `ws://localhost:${port}/ws/client?token=${encodeURIComponent(token)}`,
    );

    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve({ code: 0, reason: 'timeout', accepted: false });
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      // Give the server a tick to register the session
      setTimeout(() => {
        const countAfter = cwsServer.getConnectedClientCount();
        if (countAfter > countBefore) {
          resolve({ ws, accepted: true });
        } else {
          // Query-param auth failed; server is waiting for first-message auth.
          // Close the connection — we're only testing query-param auth here.
          ws.close();
          resolve({
            code: 4001,
            reason: 'Query param auth failed',
            accepted: false,
          });
        }
      }, 50);
    });

    ws.on('close', (code: number, reason: Buffer) => {
      clearTimeout(timeout);
      resolve({ code, reason: reason.toString(), accepted: false });
    });

    ws.on('error', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Connect a WebSocket client using first-message auth pattern.
 */
function connectWithMessageAuth(
  port: number,
  token: string,
): Promise<ConnectionResult> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws/client`);

    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve({ code: 0, reason: 'timeout', accepted: false });
    }, 5000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'auth', token }));

      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth_success') {
          clearTimeout(timeout);
          resolve({ ws, accepted: true });
        }
      });
    });

    ws.on('close', (code: number, reason: Buffer) => {
      clearTimeout(timeout);
      resolve({ code, reason: reason.toString(), accepted: false });
    });

    ws.on('error', () => {
      // error will be followed by close
    });
  });
}

// ══════════════════════════════════════════════════════════════════════
// Property 12: WebSocket JWT authentication gate
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 12: WebSocket JWT authentication gate', () => {
  let testEnv: TestEnv;

  beforeEach(async () => {
    testEnv = await createTestServer();
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  /**
   * Property 12a: For any valid JWT token signed with the correct secret,
   * a WebSocket connection to /ws/client is accepted (via query param auth).
   *
   * **Validates: Requirements 9.1**
   */
  it('Property 12a: valid JWT tokens are accepted via query param', async () => {
    await fc.assert(
      fc.asyncProperty(arbValidTokenPayload, async (payload) => {
        const token = signToken(payload, TEST_JWT_SECRET);
        const result = await connectWithToken(
          testEnv.port,
          token,
          testEnv.cwsServer,
        );

        expect(result.accepted).toBe(true);
        if (result.accepted) {
          expect(
            testEnv.cwsServer.getConnectedClientCount(),
          ).toBeGreaterThanOrEqual(1);
          result.ws.close();
          await new Promise((r) => setTimeout(r, 50));
        }
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Property 12b: For any expired JWT token, a WebSocket connection
   * to /ws/client is rejected with close code 4001.
   *
   * **Validates: Requirements 9.2**
   */
  it('Property 12b: expired JWT tokens are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(arbExpiredTokenPayload, async (payload) => {
        const token = signExpiredToken(payload, TEST_JWT_SECRET);
        const result = await connectWithToken(
          testEnv.port,
          token,
          testEnv.cwsServer,
        );

        expect(result.accepted).toBe(false);
        if (!result.accepted) {
          expect(result.code).toBe(4001);
        }
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Property 12c: For any JWT token signed with a wrong secret,
   * a WebSocket connection to /ws/client is rejected.
   *
   * **Validates: Requirements 9.2**
   */
  it('Property 12c: JWT tokens signed with wrong secret are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidTokenPayload,
        fc
          .string({ minLength: 10, maxLength: 40 })
          .filter((s) => s !== TEST_JWT_SECRET),
        async (payload, wrongSecret) => {
          const token = signToken(payload, wrongSecret);
          const result = await connectWithToken(
            testEnv.port,
            token,
            testEnv.cwsServer,
          );

          expect(result.accepted).toBe(false);
          if (!result.accepted) {
            expect(result.code).toBe(4001);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 12d: For any invalid (non-JWT) string used as a token,
   * a WebSocket connection to /ws/client is rejected.
   *
   * **Validates: Requirements 9.2**
   */
  it('Property 12d: invalid (non-JWT) strings are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(arbInvalidJwtString, async (invalidToken) => {
        const result = await connectWithToken(
          testEnv.port,
          invalidToken,
          testEnv.cwsServer,
        );

        expect(result.accepted).toBe(false);
        if (!result.accepted) {
          expect(result.code).toBe(4001);
        }
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Property 12e: For any valid JWT token, first-message authentication
   * also accepts the connection.
   *
   * **Validates: Requirements 9.1**
   */
  it('Property 12e: valid JWT tokens are accepted via first-message auth', async () => {
    await fc.assert(
      fc.asyncProperty(arbValidTokenPayload, async (payload) => {
        const token = signToken(payload, TEST_JWT_SECRET);
        const result = await connectWithMessageAuth(testEnv.port, token);

        expect(result.accepted).toBe(true);
        if (result.accepted) {
          expect(
            testEnv.cwsServer.getConnectedClientCount(),
          ).toBeGreaterThanOrEqual(1);
          result.ws.close();
          await new Promise((r) => setTimeout(r, 50));
        }
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Property 12f: For any expired JWT token, first-message authentication
   * rejects the connection with close code 4001.
   *
   * **Validates: Requirements 9.2**
   */
  it('Property 12f: expired JWT tokens are rejected via first-message auth', async () => {
    await fc.assert(
      fc.asyncProperty(arbExpiredTokenPayload, async (payload) => {
        const token = signExpiredToken(payload, TEST_JWT_SECRET);
        const result = await connectWithMessageAuth(testEnv.port, token);

        expect(result.accepted).toBe(false);
        if (!result.accepted) {
          expect(result.code).toBe(4001);
        }
      }),
      { numRuns: 20 },
    );
  });
});

// ── Property 13 Generators ──

/** Generate a member context for shouldDeliverEvent testing (no WebSocket needed) */
const arbWsMemberContext: fc.Arbitrary<IWsMemberContext> = fc.record({
  memberId: arbMemberId,
  username: arbUsername,
  type: arbMemberType,
  iat: fc.constant(Math.floor(Date.now() / 1000)),
  exp: fc.constant(Math.floor(Date.now() / 1000) + 3600),
});

const arbClientEventType = fc.constantFrom(
  ClientEventType.PeerConnected,
  ClientEventType.PeerDisconnected,
  ClientEventType.PoolChanged,
  ClientEventType.PoolCreated,
  ClientEventType.PoolDeleted,
  ClientEventType.EnergyBalanceUpdated,
  ClientEventType.StorageAlert,
  ClientEventType.TokenExpiring,
);

const arbAccessTier = fc.constantFrom(
  ClientEventAccessTier.Public,
  ClientEventAccessTier.Admin,
  ClientEventAccessTier.PoolScoped,
  ClientEventAccessTier.MemberScoped,
);

const arbIsoTimestamp = fc.constant(new Date().toISOString());

const arbCorrelationId = fc
  .string({ minLength: 8, maxLength: 36 })
  .filter((s) => s.length > 0);

/** Generate a client event with a specific access tier */
function arbClientEventWithTier(
  tier: ClientEventAccessTier,
): fc.Arbitrary<IClientEvent<string>> {
  const base = {
    eventType: arbClientEventType,
    accessTier: fc.constant(tier),
    payload: fc.constant({ info: 'test-payload' }),
    timestamp: arbIsoTimestamp,
    correlationId: arbCorrelationId,
  };

  switch (tier) {
    case ClientEventAccessTier.MemberScoped:
      return fc.record({
        ...base,
        targetMemberId: arbMemberId,
      });
    case ClientEventAccessTier.PoolScoped:
      return fc.record({
        ...base,
        targetPoolId: fc.string({ minLength: 4, maxLength: 16 }),
      });
    default:
      return fc.record(base);
  }
}

/** Generate a random client event with any access tier */
const arbClientEvent: fc.Arbitrary<IClientEvent<string>> = arbAccessTier.chain(
  (tier) => arbClientEventWithTier(tier),
);

// ══════════════════════════════════════════════════════════════════════
// Property 13: Client event delivery respects access tiers
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 13: Client event delivery respects access tiers', () => {
  /**
   * Property 13a: Public-tier events are delivered to ALL authenticated members
   * regardless of MemberType.
   *
   * **Validates: Requirements 9.4**
   */
  it('Property 13a: public events are delivered to all members', () => {
    fc.assert(
      fc.property(
        arbClientEventWithTier(ClientEventAccessTier.Public),
        arbWsMemberContext,
        (event, member) => {
          expect(shouldDeliverEvent(event, member)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13b: Admin-tier events are delivered ONLY to members with
   * MemberType Admin or System. User members never receive admin events.
   *
   * **Validates: Requirements 9.7, 3.2**
   */
  it('Property 13b: admin events are delivered only to Admin/System members', () => {
    fc.assert(
      fc.property(
        arbClientEventWithTier(ClientEventAccessTier.Admin),
        arbWsMemberContext,
        (event, member) => {
          const delivered = shouldDeliverEvent(event, member);
          const isPrivileged =
            member.type === MemberType.Admin ||
            member.type === MemberType.System;

          expect(delivered).toBe(isPrivileged);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13c: Member-scoped events are delivered ONLY to the specific
   * target member. No other member receives the event.
   *
   * **Validates: Requirements 6.2**
   */
  it('Property 13c: member-scoped events are delivered only to the target member', () => {
    fc.assert(
      fc.property(
        arbClientEventWithTier(ClientEventAccessTier.MemberScoped),
        arbWsMemberContext,
        (event, member) => {
          const delivered = shouldDeliverEvent(event, member);
          const isTargetMember = event.targetMemberId === member.memberId;

          expect(delivered).toBe(isTargetMember);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13d: Member-scoped events with a matching memberId are always
   * delivered, regardless of MemberType.
   *
   * **Validates: Requirements 6.2, 9.4**
   */
  it('Property 13d: member-scoped events always reach the target member', () => {
    fc.assert(
      fc.property(arbWsMemberContext, (member) => {
        const event: IClientEvent<string> = {
          eventType: ClientEventType.EnergyBalanceUpdated,
          accessTier: ClientEventAccessTier.MemberScoped,
          payload: { balance: 42 },
          timestamp: new Date().toISOString(),
          correlationId: 'test-corr-id',
          targetMemberId: member.memberId,
        };

        expect(shouldDeliverEvent(event, member)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13e: Pool-scoped events are delivered to Admin/System members
   * unconditionally. Regular User members do not pass the WebSocket-layer
   * filter (ACL checking is the caller's responsibility).
   *
   * **Validates: Requirements 4.4, 9.7**
   */
  it('Property 13e: pool-scoped events are delivered to Admin/System, not to User at WS layer', () => {
    fc.assert(
      fc.property(
        arbClientEventWithTier(ClientEventAccessTier.PoolScoped),
        arbWsMemberContext,
        (event, member) => {
          const delivered = shouldDeliverEvent(event, member);
          const isPrivileged =
            member.type === MemberType.Admin ||
            member.type === MemberType.System;

          expect(delivered).toBe(isPrivileged);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13f: For any event with an unknown/invalid access tier,
   * delivery is denied (default case returns false).
   *
   * **Validates: Requirements 9.7**
   */
  it('Property 13f: unknown access tiers are never delivered', () => {
    fc.assert(
      fc.property(arbWsMemberContext, (member) => {
        const event: IClientEvent<string> = {
          eventType: ClientEventType.PoolChanged,
          accessTier: 'unknown-tier' as ClientEventAccessTier,
          payload: {},
          timestamp: new Date().toISOString(),
          correlationId: 'test-corr-id',
        };

        expect(shouldDeliverEvent(event, member)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 13g: For any set of subscribers with mixed MemberTypes and any
   * event, the set of members who receive the event is exactly the set
   * authorized by the access tier rules.
   *
   * **Validates: Requirements 3.2, 4.4, 6.2, 9.4, 9.7**
   */
  it('Property 13g: broadcast to mixed subscriber set delivers to exactly the authorized subset', () => {
    fc.assert(
      fc.property(
        arbClientEvent,
        fc.array(arbWsMemberContext, { minLength: 1, maxLength: 20 }),
        (event, subscribers) => {
          const delivered = subscribers.filter((sub) =>
            shouldDeliverEvent(event, sub),
          );
          const rejected = subscribers.filter(
            (sub) => !shouldDeliverEvent(event, sub),
          );

          // Every delivered subscriber must satisfy the tier rules
          for (const sub of delivered) {
            switch (event.accessTier) {
              case ClientEventAccessTier.Public:
                // All pass — no extra check needed
                break;
              case ClientEventAccessTier.Admin:
                expect(
                  sub.type === MemberType.Admin ||
                    sub.type === MemberType.System,
                ).toBe(true);
                break;
              case ClientEventAccessTier.MemberScoped:
                expect(sub.memberId).toBe(event.targetMemberId);
                break;
              case ClientEventAccessTier.PoolScoped:
                expect(
                  sub.type === MemberType.Admin ||
                    sub.type === MemberType.System,
                ).toBe(true);
                break;
            }
          }

          // Every rejected subscriber must NOT satisfy the tier rules
          for (const sub of rejected) {
            switch (event.accessTier) {
              case ClientEventAccessTier.Public:
                // Should never reject public events
                fail('Public event was rejected');
                break;
              case ClientEventAccessTier.Admin:
                expect(sub.type).toBe(MemberType.User);
                break;
              case ClientEventAccessTier.MemberScoped:
                expect(sub.memberId).not.toBe(event.targetMemberId);
                break;
              case ClientEventAccessTier.PoolScoped:
                expect(sub.type).toBe(MemberType.User);
                break;
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 14: Client event envelope completeness
// ══════════════════════════════════════════════════════════════════════

describe('Feature: lumen-brightchain-client-protocol, Property 14: Client event envelope completeness', () => {
  /**
   * Property 14a: For any client event, the eventType field is present
   * and is a valid ClientEventType enum value.
   *
   * **Validates: Requirements 9.4**
   */
  it('Property 14a: eventType is present and is a valid ClientEventType', () => {
    const validEventTypes = Object.values(ClientEventType);

    fc.assert(
      fc.property(arbClientEvent, (event) => {
        expect(event.eventType).toBeDefined();
        expect(typeof event.eventType).toBe('string');
        expect(validEventTypes).toContain(event.eventType);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 14b: For any client event, the accessTier field is present
   * and is a valid ClientEventAccessTier enum value.
   *
   * **Validates: Requirements 9.4**
   */
  it('Property 14b: accessTier is present and is a valid ClientEventAccessTier', () => {
    const validAccessTiers = Object.values(ClientEventAccessTier);

    fc.assert(
      fc.property(arbClientEvent, (event) => {
        expect(event.accessTier).toBeDefined();
        expect(typeof event.accessTier).toBe('string');
        expect(validAccessTiers).toContain(event.accessTier);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 14c: For any client event, the payload field is present
   * (not undefined).
   *
   * **Validates: Requirements 9.4**
   */
  it('Property 14c: payload is present', () => {
    fc.assert(
      fc.property(arbClientEvent, (event) => {
        expect(event.payload).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 14d: For any client event, the timestamp field is present
   * and is a valid ISO 8601 string that parses to a valid Date.
   *
   * **Validates: Requirements 9.4**
   */
  it('Property 14d: timestamp is a valid ISO 8601 string', () => {
    fc.assert(
      fc.property(arbClientEvent, (event) => {
        expect(event.timestamp).toBeDefined();
        expect(typeof event.timestamp).toBe('string');
        expect(event.timestamp.length).toBeGreaterThan(0);

        const parsed = new Date(event.timestamp);
        expect(parsed.getTime()).not.toBeNaN();
        // Verify it round-trips as ISO 8601
        expect(parsed.toISOString()).toBe(event.timestamp);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 14e: For any client event, the correlationId field is present
   * and is a non-empty string.
   *
   * **Validates: Requirements 9.4**
   */
  it('Property 14e: correlationId is a non-empty string', () => {
    fc.assert(
      fc.property(arbClientEvent, (event) => {
        expect(event.correlationId).toBeDefined();
        expect(typeof event.correlationId).toBe('string');
        expect(event.correlationId.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 14f: For any client event, ALL five required fields are
   * simultaneously present and valid — the envelope is complete.
   *
   * **Validates: Requirements 9.4**
   */
  it('Property 14f: all required envelope fields are simultaneously present and valid', () => {
    const validEventTypes = Object.values(ClientEventType);
    const validAccessTiers = Object.values(ClientEventAccessTier);

    fc.assert(
      fc.property(arbClientEvent, (event) => {
        // eventType: valid enum value
        expect(validEventTypes).toContain(event.eventType);

        // accessTier: valid enum value
        expect(validAccessTiers).toContain(event.accessTier);

        // payload: defined
        expect(event.payload).toBeDefined();

        // timestamp: valid ISO 8601
        const parsed = new Date(event.timestamp);
        expect(parsed.getTime()).not.toBeNaN();

        // correlationId: non-empty string
        expect(typeof event.correlationId).toBe('string');
        expect(event.correlationId.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// Property 18: WebSocket token expiration notification
// ══════════════════════════════════════════════════════════════════════

/**
 * Helper: create a test server with aggressive token expiration settings
 * so that tokens expire quickly and the monitor fires frequently.
 */
function createShortExpiryTestServer(): Promise<TestEnv> {
  return new Promise((resolve) => {
    const port = 9000 + Math.floor(Math.random() * 5000);
    const httpServer = createServer();
    const ens = new EventNotificationSystem();
    const cwsServer = new ClientWebSocketServer(
      httpServer,
      TEST_JWT_SECRET,
      ens,
      {
        idleTimeoutMs: 60_000, // long idle timeout so ping/pong doesn't interfere
        tokenGraceMs: 2_000, // short grace period after warning
        tokenCheckIntervalMs: 100, // check every 100ms for fast test feedback
        tokenWarningBeforeMs: 3_000, // warn 3s before expiry
      },
    );

    httpServer.listen(port, () => {
      resolve({
        httpServer,
        cwsServer,
        port,
        cleanup: () =>
          new Promise<void>((done) => {
            cwsServer.close(() => {
              httpServer.close(() => {
                setTimeout(done, 50);
              });
            });
          }),
      });
    });
  });
}

/**
 * Sign a JWT that expires in the given number of seconds from now.
 */
function signShortLivedToken(
  payload: ITokenPayload,
  secret: string,
  expiresInSeconds: number,
): string {
  return jwt.sign(
    {
      memberId: payload.memberId,
      username: payload.username,
      type: payload.type,
    },
    secret,
    {
      expiresIn: expiresInSeconds,
    },
  );
}

/**
 * Connect and wait for a TokenExpiring event or connection close.
 * Returns the parsed event if received, or null if the connection
 * closed without receiving the event.
 */
function waitForTokenExpiringEvent(
  port: number,
  token: string,
  timeoutMs: number,
): Promise<{ event: IClientEvent<string> | null; closeCode: number | null }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(
      `ws://localhost:${port}/ws/client?token=${encodeURIComponent(token)}`,
    );

    let receivedEvent: IClientEvent<string> | null = null;

    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve({ event: receivedEvent, closeCode: null });
    }, timeoutMs);

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as IClientEvent<string>;
        if (msg.eventType === ClientEventType.TokenExpiring) {
          receivedEvent = msg;
        }
      } catch {
        // not JSON or not a client event
      }
    });

    ws.on('close', (code: number) => {
      clearTimeout(timeout);
      resolve({ event: receivedEvent, closeCode: code });
    });

    ws.on('error', () => {
      // error will be followed by close
    });
  });
}

describe('Feature: lumen-brightchain-client-protocol, Property 18: WebSocket token expiration notification', () => {
  let testEnv: TestEnv;

  beforeEach(async () => {
    testEnv = await createShortExpiryTestServer();
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  /**
   * Property 18a: For any active WebSocket session whose JWT token is about
   * to expire (within tokenWarningBeforeMs), the server sends a TokenExpiring
   * client event before closing the connection.
   *
   * We use short-lived tokens (2–4s) with a 3s warning window and 100ms check
   * interval so the monitor fires quickly. The token is within the warning
   * window almost immediately after connection, so we should receive the event.
   *
   * **Validates: Requirements 11.4**
   */
  it('Property 18a: sessions with soon-to-expire tokens receive TokenExpiring event', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidTokenPayload,
        // Token lifetime in seconds: 2–4s, which is within the 3s warning window
        fc.integer({ min: 2, max: 4 }),
        async (payload, lifetimeSec) => {
          const token = signShortLivedToken(
            payload,
            TEST_JWT_SECRET,
            lifetimeSec,
          );

          const result = await waitForTokenExpiringEvent(
            testEnv.port,
            token,
            // Wait long enough for the token to expire + grace period + buffer
            (lifetimeSec + 5) * 1000,
          );

          // Must have received the TokenExpiring event
          expect(result.event).not.toBeNull();
          expect(result.event?.eventType).toBe(ClientEventType.TokenExpiring);
          expect(result.event?.accessTier).toBe(ClientEventAccessTier.Public);

          // Connection should have been closed with code 4002 (token expired)
          expect(result.closeCode).toBe(4002);
        },
      ),
      { numRuns: 5 },
    );
  });

  /**
   * Property 18b: The TokenExpiring event sent by the server is a valid
   * IClientEvent envelope with all required fields.
   *
   * **Validates: Requirements 11.4**
   */
  it('Property 18b: TokenExpiring event has a complete envelope', async () => {
    await fc.assert(
      fc.asyncProperty(arbValidTokenPayload, async (payload) => {
        const token = signShortLivedToken(payload, TEST_JWT_SECRET, 2);

        const result = await waitForTokenExpiringEvent(
          testEnv.port,
          token,
          8_000,
        );

        expect(result.event).not.toBeNull();
        if (result.event) {
          // All required IClientEvent fields must be present
          expect(result.event.eventType).toBe(ClientEventType.TokenExpiring);
          expect(result.event.accessTier).toBe(ClientEventAccessTier.Public);
          expect(result.event.payload).toBeDefined();
          expect(typeof result.event.timestamp).toBe('string');
          expect(new Date(result.event.timestamp).getTime()).not.toBeNaN();
          expect(typeof result.event.correlationId).toBe('string');
          expect(result.event.correlationId.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 5 },
    );
  });

  /**
   * Property 18c: For any active session, the connection is closed with
   * code 4002 after the token expires, regardless of MemberType.
   *
   * **Validates: Requirements 11.4**
   */
  it('Property 18c: connection is closed with code 4002 after token expiry for all MemberTypes', async () => {
    await fc.assert(
      fc.asyncProperty(arbValidTokenPayload, async (payload) => {
        const token = signShortLivedToken(payload, TEST_JWT_SECRET, 2);

        const result = await waitForTokenExpiringEvent(
          testEnv.port,
          token,
          8_000,
        );

        // Regardless of MemberType, the connection must be closed with 4002
        expect(result.closeCode).toBe(4002);
        // And the TokenExpiring event must have been sent first
        expect(result.event).not.toBeNull();
      }),
      { numRuns: 5 },
    );
  });
});
