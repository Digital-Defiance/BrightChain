import {
  ClientEventAccessTier,
  ClientEventType,
  IClientEvent,
  ISubscriptionMessage,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import { randomUUID } from 'crypto';
import { IncomingMessage, Server } from 'http';
import * as jwt from 'jsonwebtoken';
import { URL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { ITokenPayload } from '../interfaces/token-payload';
import { EventNotificationSystem } from './eventNotificationSystem';

/**
 * Member context for an authenticated WebSocket session.
 * Mirrors the IMemberContext from authentication middleware.
 */
export interface IWsMemberContext {
  memberId: string;
  username: string;
  type: MemberType;
  iat: number;
  exp: number;
}

/**
 * Tracks a single authenticated client WebSocket session.
 */
interface IClientSession {
  ws: WebSocket;
  memberContext: IWsMemberContext;
  subscribedEvents: Set<ClientEventType>;
  lastPong: number;
}

/** Default idle timeout before sending a ping (ms). */
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

/** Grace period after TokenExpiring event before closing (ms). */
const DEFAULT_TOKEN_GRACE_MS = 30_000;

/** How often to check for token expiration (ms). */
const DEFAULT_TOKEN_CHECK_INTERVAL_MS = 10_000;

/** How far before actual expiry to send the TokenExpiring warning (ms). */
const DEFAULT_TOKEN_WARNING_BEFORE_MS = 60_000;

/**
 * Determine whether a client event should be delivered to a given member.
 *
 * Access tier rules:
 * - public: all authenticated members
 * - admin: only Admin or System members
 * - pool-scoped: only members subscribed AND who have pool read permission
 *   (pool ACL checking is the caller's responsibility; here we check MemberType
 *    and targetMemberId where applicable)
 * - member-scoped: only the specific target member
 *
 * @see Requirements 9.4, 9.7
 */
export function shouldDeliverEvent(
  event: IClientEvent<string>,
  memberContext: IWsMemberContext,
): boolean {
  switch (event.accessTier) {
    case ClientEventAccessTier.Public:
      return true;

    case ClientEventAccessTier.Admin:
      return (
        memberContext.type === MemberType.Admin ||
        memberContext.type === MemberType.System
      );

    case ClientEventAccessTier.MemberScoped:
      return event.targetMemberId === memberContext.memberId;

    case ClientEventAccessTier.PoolScoped:
      // Pool-scoped events are delivered to Admin/System unconditionally.
      // For regular users, the caller (broadcastEvent) should pre-filter
      // based on pool ACL. At the WebSocket layer we allow delivery to
      // Admin/System and trust that the event was already ACL-checked for
      // regular users when it was emitted.
      return (
        memberContext.type === MemberType.Admin ||
        memberContext.type === MemberType.System
      );

    default:
      return false;
  }
}

/**
 * JWT-authenticated WebSocket server for Lumen client connections.
 *
 * Listens on `/ws/client`, separate from the ECIES-authenticated
 * `/ws/node/:nodeId` path used by `WebSocketMessageServer`.
 *
 * Responsibilities:
 * - Authenticate connections via JWT (query param `token` or first message)
 * - Manage per-session event subscriptions
 * - Broadcast `IClientEvent` envelopes filtered by access tier
 * - Monitor token expiration and send `TokenExpiring` before closing
 * - Ping/pong idle timeout
 *
 * @see Requirements 9.1–9.7, 11.3, 11.4
 */
export class ClientWebSocketServer {
  private wss: WebSocketServer;
  private sessions: Map<WebSocket, IClientSession> = new Map();
  private jwtSecret: string;
  private eventNotificationSystem: EventNotificationSystem;
  private idleTimeoutMs: number;
  private tokenGraceMs: number;
  private tokenWarningBeforeMs: number;

  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private tokenCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    server: Server,
    jwtSecret: string,
    eventNotificationSystem: EventNotificationSystem,
    options?: {
      idleTimeoutMs?: number;
      tokenGraceMs?: number;
      tokenCheckIntervalMs?: number;
      tokenWarningBeforeMs?: number;
    },
  ) {
    this.jwtSecret = jwtSecret;
    this.eventNotificationSystem = eventNotificationSystem;
    this.idleTimeoutMs = options?.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    this.tokenGraceMs = options?.tokenGraceMs ?? DEFAULT_TOKEN_GRACE_MS;
    this.tokenWarningBeforeMs =
      options?.tokenWarningBeforeMs ?? DEFAULT_TOKEN_WARNING_BEFORE_MS;

    this.wss = new WebSocketServer({
      server,
      path: '/ws/client',
    });

    this.setupConnectionHandler();
    this.startPingPongMonitor();
    this.startTokenExpirationMonitor(
      options?.tokenCheckIntervalMs ?? DEFAULT_TOKEN_CHECK_INTERVAL_MS,
    );
  }

  // ── Authentication ──────────────────────────────────────────────────

  /**
   * Attempt to authenticate an incoming WebSocket upgrade request.
   * Looks for a JWT in the `token` query parameter.
   *
   * @returns The decoded member context, or `null` if authentication fails.
   * @see Requirements 9.1, 9.2
   */
  private authenticateConnection(
    req: IncomingMessage,
  ): IWsMemberContext | null {
    try {
      const token = this.extractTokenFromRequest(req);
      if (!token) return null;

      const decoded = jwt.verify(token, this.jwtSecret) as ITokenPayload;
      return {
        memberId: decoded.memberId,
        username: decoded.username,
        type: decoded.type,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract JWT from the `token` query parameter of the upgrade request URL.
   */
  private extractTokenFromRequest(req: IncomingMessage): string | null {
    if (!req.url) return null;
    try {
      // req.url is a relative path; construct a full URL for parsing
      const url = new URL(req.url, 'http://localhost');
      return url.searchParams.get('token');
    } catch {
      return null;
    }
  }

  /**
   * Attempt to authenticate via the first message (for clients that cannot
   * set query params). Expects `{ type: 'auth', token: '<jwt>' }`.
   */
  private authenticateFromMessage(
    data: Buffer | string,
  ): IWsMemberContext | null {
    try {
      const message = JSON.parse(
        typeof data === 'string' ? data : data.toString(),
      );
      if (message.type !== 'auth' || typeof message.token !== 'string') {
        return null;
      }
      const decoded = jwt.verify(
        message.token,
        this.jwtSecret,
      ) as ITokenPayload;
      return {
        memberId: decoded.memberId,
        username: decoded.username,
        type: decoded.type,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch {
      return null;
    }
  }

  // ── Connection handling ─────────────────────────────────────────────

  /**
   * Set up the WebSocket connection handler.
   * Authenticates via query param on upgrade; falls back to first-message auth.
   */
  private setupConnectionHandler(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const memberContext = this.authenticateConnection(req);

      if (memberContext) {
        // Authenticated via query param — register session immediately
        this.registerSession(ws, memberContext);
      } else {
        // Wait for the first message to carry the auth token
        const authTimeout = setTimeout(() => {
          // No auth message received in time
          ws.close(4001, 'Authentication timeout');
        }, 5_000);

        const onFirstMessage = (data: Buffer | ArrayBuffer | Buffer[]) => {
          clearTimeout(authTimeout);
          ws.removeListener('message', onFirstMessage);

          const buf = Array.isArray(data)
            ? Buffer.concat(data)
            : Buffer.from(data as ArrayBuffer);
          const ctx = this.authenticateFromMessage(buf);
          if (ctx) {
            this.registerSession(ws, ctx);
            ws.send(JSON.stringify({ type: 'auth_success' }));
          } else {
            ws.close(4001, 'Authentication failed');
          }
        };

        ws.on('message', onFirstMessage);

        ws.on('close', () => {
          clearTimeout(authTimeout);
          ws.removeListener('message', onFirstMessage);
        });
      }
    });
  }

  /**
   * Register an authenticated session and wire up message/close handlers.
   */
  private registerSession(
    ws: WebSocket,
    memberContext: IWsMemberContext,
  ): void {
    const session: IClientSession = {
      ws,
      memberContext,
      subscribedEvents: new Set(),
      lastPong: Date.now(),
    };
    this.sessions.set(ws, session);

    ws.on('pong', () => {
      session.lastPong = Date.now();
    });

    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      const buf = Array.isArray(data)
        ? Buffer.concat(data)
        : Buffer.from(data as ArrayBuffer);
      this.handleMessage(ws, session, buf);
    });

    ws.on('close', () => {
      this.sessions.delete(ws);
    });

    ws.on('error', () => {
      this.sessions.delete(ws);
      try {
        ws.close();
      } catch {
        // already closed
      }
    });
  }

  // ── Message handling ────────────────────────────────────────────────

  /**
   * Handle an incoming message from an authenticated session.
   * Currently supports subscription management messages.
   */
  private handleMessage(
    ws: WebSocket,
    session: IClientSession,
    data: Buffer,
  ): void {
    try {
      const message = JSON.parse(data.toString());
      if (message.action === 'subscribe' || message.action === 'unsubscribe') {
        this.handleSubscription(ws, session, message as ISubscriptionMessage);
      } else {
        ws.send(
          JSON.stringify({
            type: 'error',
            code: 'invalid_message',
            message: 'Unknown message type',
          }),
        );
      }
    } catch {
      ws.send(
        JSON.stringify({
          type: 'error',
          code: 'invalid_message',
          message: 'Invalid JSON',
        }),
      );
    }
  }

  // ── Subscription management ─────────────────────────────────────────

  /**
   * Process a subscribe/unsubscribe message from a client.
   *
   * @see Requirements 9.3
   */
  private handleSubscription(
    ws: WebSocket,
    session: IClientSession,
    message: ISubscriptionMessage,
  ): void {
    if (!Array.isArray(message.eventTypes) || message.eventTypes.length === 0) {
      ws.send(
        JSON.stringify({
          type: 'error',
          code: 'invalid_subscription',
          message: 'eventTypes must be a non-empty array',
        }),
      );
      return;
    }

    // Validate that all event types are known
    const validTypes = new Set(Object.values(ClientEventType));
    const invalid = message.eventTypes.filter((t) => !validTypes.has(t));
    if (invalid.length > 0) {
      ws.send(
        JSON.stringify({
          type: 'error',
          code: 'invalid_subscription',
          message: `Unknown event types: ${invalid.join(', ')}`,
        }),
      );
      return;
    }

    if (message.action === 'subscribe') {
      for (const eventType of message.eventTypes) {
        session.subscribedEvents.add(eventType);
      }
    } else {
      for (const eventType of message.eventTypes) {
        session.subscribedEvents.delete(eventType);
      }
    }

    ws.send(
      JSON.stringify({
        type: 'subscription_update',
        action: message.action,
        eventTypes: message.eventTypes,
        currentSubscriptions: Array.from(session.subscribedEvents),
      }),
    );
  }

  // ── Event broadcasting ──────────────────────────────────────────────

  /**
   * Broadcast a client event to all subscribed sessions that pass
   * the access tier filter.
   *
   * @see Requirements 9.4, 9.7
   */
  broadcastEvent(event: IClientEvent<string>): void {
    const payload = JSON.stringify(event);

    for (const session of this.sessions.values()) {
      if (session.ws.readyState !== WebSocket.OPEN) continue;
      if (!session.subscribedEvents.has(event.eventType)) continue;
      if (!shouldDeliverEvent(event, session.memberContext)) continue;

      try {
        session.ws.send(payload);
      } catch {
        // Send failed — connection will be cleaned up on close/error
      }
    }
  }

  // ── Token expiration monitoring ─────────────────────────────────────

  /**
   * Periodically check all sessions for approaching token expiration.
   * Sends a `TokenExpiring` event before closing the connection.
   *
   * @see Requirements 11.4
   */
  private startTokenExpirationMonitor(checkIntervalMs: number): void {
    this.tokenCheckInterval = setInterval(() => {
      const now = Date.now();

      for (const [ws, session] of this.sessions.entries()) {
        const expiresAtMs = session.memberContext.exp * 1000;
        const timeUntilExpiry = expiresAtMs - now;

        if (timeUntilExpiry <= 0) {
          // Token already expired — close immediately
          this.sendTokenExpiringEvent(ws);
          ws.close(4002, 'Token expired');
          this.sessions.delete(ws);
        } else if (timeUntilExpiry <= this.tokenWarningBeforeMs) {
          // Token expiring soon — send warning, then schedule close
          this.sendTokenExpiringEvent(ws);
          this.sessions.delete(ws);

          setTimeout(
            () => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.close(4002, 'Token expired');
              }
            },
            Math.min(timeUntilExpiry, this.tokenGraceMs),
          );
        }
      }
    }, checkIntervalMs);
  }

  /**
   * Send a TokenExpiring client event to a specific WebSocket.
   */
  private sendTokenExpiringEvent(ws: WebSocket): void {
    if (ws.readyState !== WebSocket.OPEN) return;

    const event: IClientEvent<string> = {
      eventType: ClientEventType.TokenExpiring,
      accessTier: ClientEventAccessTier.Public,
      payload: { message: 'Your authentication token is expiring soon' },
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
    };

    try {
      ws.send(JSON.stringify(event));
    } catch {
      // Connection may already be closing
    }
  }

  // ── Ping/pong idle timeout ──────────────────────────────────────────

  /**
   * Periodically ping all connected clients and close those that
   * haven't responded within the idle timeout.
   *
   * @see Requirements 9.5
   */
  private startPingPongMonitor(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();

      for (const [ws, session] of this.sessions.entries()) {
        if (now - session.lastPong > this.idleTimeoutMs) {
          // No pong received within timeout — terminate
          ws.terminate();
          this.sessions.delete(ws);
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }, this.idleTimeoutMs / 2);
  }

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Get the number of currently connected and authenticated client sessions.
   */
  getConnectedClientCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all active sessions (for testing / introspection).
   */
  getSessions(): ReadonlyMap<WebSocket, Readonly<IClientSession>> {
    return this.sessions;
  }

  /**
   * Close all client connections and shut down the server.
   */
  close(callback?: () => void): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }

    for (const [ws] of this.sessions) {
      try {
        ws.close(1001, 'Server shutting down');
      } catch {
        // already closed
      }
    }
    this.sessions.clear();

    if (callback) {
      this.wss.close(callback);
    } else {
      this.wss.close();
    }
  }
}
