/**
 * BrightChainSessionAdapter – Property-Based Tests.
 *
 * Feature: brightchain-user-management
 *
 * Uses fast-check to validate session-adapter-related properties.
 * This file covers Properties 11, 12, 13, 14.
 */

import {
  BlockSize,
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { BrightDb, InMemoryHeadRegistry } from '@brightchain/db';
import { createHash } from 'crypto';
import * as fc from 'fast-check';
import {
  BrightChainSessionAdapter,
  ISessionDocument,
} from '../../lib/services/sessionAdapter';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create a fresh in-memory BrightDb for test isolation. */
function createTestDb(): BrightDb {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

  const store = new MemoryBlockStore(BlockSize.Small);
  const registry = InMemoryHeadRegistry.createIsolated();
  return new BrightDb(store, {
    name: 'session-test-db',
    headRegistry: registry,
    poolId: 'session-test',
  });
}

/** Compute SHA-256 hex digest of a string (mirrors the adapter's internal hashing). */
function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary: hex-encoded member ID (32 hex chars = 16 bytes). */
const memberIdArb: fc.Arbitrary<string> = fc.stringMatching(/^[0-9a-f]{32}$/);

/** Arbitrary: JWT-like token string (header.payload.signature style). */
const tokenArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[A-Za-z0-9_-]{10,30}$/),
    fc.stringMatching(/^[A-Za-z0-9_-]{10,60}$/),
    fc.stringMatching(/^[A-Za-z0-9_-]{10,40}$/),
  )
  .map(([header, payload, sig]) => `${header}.${payload}.${sig}`);

/** Arbitrary: TTL in milliseconds — between 1 second and 1 hour. */
const ttlArb: fc.Arbitrary<number> = fc.integer({ min: 1_000, max: 3_600_000 });

// Feature: brightchain-user-management, Property 11: Session create-validate round-trip
describe('BrightChainSessionAdapter Property-Based Tests', () => {
  /**
   * Property 11: Session create-validate round-trip
   *
   * For any member ID and JWT token string, calling `createSession(memberId, token, ttl)`
   * then `validateToken(token)` (before expiration) should return a session document with
   * the correct `memberId`, a `tokenHash` matching `SHA256(token)`, and
   * `createdAt` ≤ now ≤ `expiresAt`.
   *
   * **Validates: Requirements 4.2, 4.3**
   */
  describe('Property 11: Session create-validate round-trip', () => {
    it('after createSession, validateToken returns correct session with matching memberId and tokenHash', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          tokenArb,
          ttlArb,
          async (memberId, token, ttl) => {
            const db = createTestDb();
            const adapter = new BrightChainSessionAdapter(db);

            const timeBefore = Date.now();

            // Create a session
            const sessionId = await adapter.createSession(memberId, token, ttl);
            expect(typeof sessionId).toBe('string');
            expect(sessionId.length).toBeGreaterThan(0);

            // Validate the token — should find the session
            const session: ISessionDocument | null =
              await adapter.validateToken(token);
            expect(session).not.toBeNull();

            const doc = session!;

            // memberId must match
            expect(doc.memberId).toBe(memberId);

            // tokenHash must match SHA-256 of the original token
            expect(doc.tokenHash).toBe(sha256Hex(token));

            // sessionId must match the one returned by createSession
            expect(doc.sessionId).toBe(sessionId);

            // Timing: createdAt ≤ now ≤ expiresAt
            const timeAfter = Date.now();
            expect(doc.createdAt).toBeGreaterThanOrEqual(timeBefore);
            expect(doc.createdAt).toBeLessThanOrEqual(timeAfter);
            expect(doc.expiresAt).toBeGreaterThanOrEqual(doc.createdAt + ttl);
            expect(doc.expiresAt).toBeLessThanOrEqual(timeAfter + ttl);
          },
        ),
        { numRuns: 100 },
      );
    }, 300_000);
  });

  // Feature: brightchain-user-management, Property 12: Expired or missing token returns null
  /**
   * Property 12: Expired or missing token returns null
   *
   * For any session that has been created with a TTL that has elapsed (expired),
   * or any random token string that was never used to create a session,
   * calling `validateToken(token)` should return `null`.
   *
   * **Validates: Requirements 4.4**
   */
  describe('Property 12: Expired or missing token returns null', () => {
    it('expired sessions return null from validateToken', async () => {
      await fc.assert(
        fc.asyncProperty(memberIdArb, tokenArb, async (memberId, token) => {
          const db = createTestDb();
          const adapter = new BrightChainSessionAdapter(db);

          // Create a session with a TTL of 1ms so it expires almost immediately
          await adapter.createSession(memberId, token, 1);

          // Small delay to ensure the session has expired
          await new Promise((resolve) => setTimeout(resolve, 15));

          // validateToken should return null for the expired session
          const result = await adapter.validateToken(token);
          expect(result).toBeNull();
        }),
        { numRuns: 100 },
      );
    }, 300_000);

    it('unknown tokens return null from validateToken', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, async (token) => {
          const db = createTestDb();
          const adapter = new BrightChainSessionAdapter(db);

          // Never create any session — the token is completely unknown
          const result = await adapter.validateToken(token);
          expect(result).toBeNull();
        }),
        { numRuns: 100 },
      );
    }, 300_000);
  });

  // Feature: brightchain-user-management, Property 13: Session deletion invalidates token
  /**
   * Property 13: Session deletion invalidates token
   *
   * For any active session, calling `deleteSession(sessionId)` then
   * `validateToken(originalToken)` should return `null`.
   *
   * **Validates: Requirements 4.5**
   */
  describe('Property 13: Session deletion invalidates token', () => {
    it('after deleteSession, validateToken returns null for the deleted session token', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          tokenArb,
          ttlArb,
          async (memberId, token, ttl) => {
            const db = createTestDb();
            const adapter = new BrightChainSessionAdapter(db);

            // Create a session
            const sessionId = await adapter.createSession(memberId, token, ttl);

            // Verify the session is active before deletion
            const beforeDelete = await adapter.validateToken(token);
            expect(beforeDelete).not.toBeNull();
            expect(beforeDelete!.sessionId).toBe(sessionId);

            // Delete the session
            await adapter.deleteSession(sessionId);

            // validateToken should now return null
            const afterDelete = await adapter.validateToken(token);
            expect(afterDelete).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    }, 300_000);
  });

  // Feature: brightchain-user-management, Property 14: cleanExpired removes only expired sessions
  /**
   * Property 14: cleanExpired removes only expired sessions
   *
   * For any set of sessions with mixed expiration timestamps (some in the past,
   * some in the future), calling `cleanExpired()` should remove exactly those
   * sessions whose `expiresAt` is in the past, and all non-expired sessions
   * should remain retrievable via `validateToken`.
   *
   * **Validates: Requirements 4.6**
   */
  describe('Property 14: cleanExpired removes only expired sessions', () => {
    /** Arbitrary: a non-empty array of { memberId, token, willExpire } entries with unique tokens. */
    const sessionMixArb = fc
      .tuple(
        // At least 1 expired session
        fc.array(
          fc.tuple(memberIdArb, tokenArb).map(([mid, tok]) => ({
            memberId: mid,
            token: `expired-${tok}`,
            willExpire: true as const,
          })),
          { minLength: 1, maxLength: 5 },
        ),
        // At least 1 non-expired session
        fc.array(
          fc.tuple(memberIdArb, tokenArb).map(([mid, tok]) => ({
            memberId: mid,
            token: `valid-${tok}`,
            willExpire: false as const,
          })),
          { minLength: 1, maxLength: 5 },
        ),
      )
      .map(([expired, valid]) => [...expired, ...valid]);

    it('removes only expired sessions; non-expired sessions remain valid', async () => {
      await fc.assert(
        fc.asyncProperty(sessionMixArb, async (sessions) => {
          const db = createTestDb();
          const adapter = new BrightChainSessionAdapter(db);

          const expiredTokens: string[] = [];
          const validTokens: string[] = [];

          // Create all sessions
          for (const s of sessions) {
            if (s.willExpire) {
              // Very short TTL — will expire almost immediately
              await adapter.createSession(s.memberId, s.token, 1);
              expiredTokens.push(s.token);
            } else {
              // Long TTL — 1 hour, won't expire during the test
              await adapter.createSession(s.memberId, s.token, 3_600_000);
              validTokens.push(s.token);
            }
          }

          // Wait for short-TTL sessions to expire
          await new Promise((resolve) => setTimeout(resolve, 20));

          // Clean expired sessions
          const removedCount = await adapter.cleanExpired();

          // The number removed should equal the number of expired sessions
          expect(removedCount).toBe(expiredTokens.length);

          // All expired tokens should now return null
          for (const token of expiredTokens) {
            const result = await adapter.validateToken(token);
            expect(result).toBeNull();
          }

          // All non-expired tokens should still be valid
          for (const token of validTokens) {
            const result = await adapter.validateToken(token);
            expect(result).not.toBeNull();
          }
        }),
        { numRuns: 100 },
      );
    }, 300_000);
  });
});
