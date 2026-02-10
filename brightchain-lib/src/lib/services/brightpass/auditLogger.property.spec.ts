/**
 * Property-based tests for Audit Logger
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the AuditLogger
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 14.1, 14.2**
 */

import fc from 'fast-check';
import { AuditAction, AuditLogEntry } from '../../interfaces/brightpass';
import { AuditLogger, IAuditLogStorage } from './auditLogger';

/**
 * In-memory implementation of IAuditLogStorage for property testing.
 */
class InMemoryAuditLogStorage implements IAuditLogStorage {
  private readonly entries: AuditLogEntry[] = [];

  async append(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async getByVaultId(
    vaultId: string,
    limit?: number,
  ): Promise<AuditLogEntry[]> {
    const filtered = this.entries
      .filter((e) => e.vaultId === vaultId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit !== undefined ? filtered.slice(0, limit) : filtered;
  }

  getAll(): AuditLogEntry[] {
    return [...this.entries];
  }
}

/**
 * All AuditAction enum values for use in arbitraries.
 */
const allAuditActions = Object.values(AuditAction);

/**
 * Arbitrary that produces a valid AuditAction.
 */
const auditActionArb: fc.Arbitrary<AuditAction> = fc.constantFrom(
  ...allAuditActions,
);

/**
 * Arbitrary for non-empty strings suitable for vault/member IDs.
 */
const idArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 64 });

/**
 * Arbitrary for optional metadata (Record<string, string>).
 * Produces either undefined or a small dictionary of string key-value pairs.
 */
const metadataArb: fc.Arbitrary<Record<string, string> | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.dictionary(
    fc.string({ minLength: 1, maxLength: 16 }),
    fc.string({ minLength: 0, maxLength: 64 }),
    { minKeys: 0, maxKeys: 5 },
  ),
);

/**
 * UUID v4 regex pattern for validation.
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Property 28: Audit Logger Entry Creation
 *
 * For any vault ID, member ID, action, and metadata, logging SHALL create an entry
 * with a generated ID, the provided values, and a recent timestamp.
 *
 * **Validates: Requirements 14.1, 14.2**
 */
describe('Feature: api-lib-to-lib-migration, Property 28: Audit Logger Entry Creation', () => {
  /**
   * Property 28a: Logged entry contains a valid UUID v4 as its id.
   */
  it('Property 28a: Logged entry contains a valid UUID v4 as its id', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        auditActionArb,
        metadataArb,
        async (vaultId, memberId, action, metadata) => {
          const storage = new InMemoryAuditLogStorage();
          const logger = new AuditLogger(storage);

          const entry = await logger.log(vaultId, memberId, action, metadata);

          expect(entry.id).toMatch(UUID_V4_REGEX);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 28b: Logged entry preserves the provided vaultId, memberId, and action.
   */
  it('Property 28b: Logged entry preserves the provided vaultId, memberId, and action', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        auditActionArb,
        metadataArb,
        async (vaultId, memberId, action, metadata) => {
          const storage = new InMemoryAuditLogStorage();
          const logger = new AuditLogger(storage);

          const entry = await logger.log(vaultId, memberId, action, metadata);

          expect(entry.vaultId).toBe(vaultId);
          expect(entry.memberId).toBe(memberId);
          expect(entry.action).toBe(action);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 28c: Logged entry has a timestamp within a reasonable window of "now".
   */
  it('Property 28c: Logged entry has a timestamp within a reasonable window of now', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        auditActionArb,
        async (vaultId, memberId, action) => {
          const storage = new InMemoryAuditLogStorage();
          const logger = new AuditLogger(storage);

          const before = Date.now();
          const entry = await logger.log(vaultId, memberId, action);
          const after = Date.now();

          expect(entry.timestamp).toBeInstanceOf(Date);
          expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(before);
          expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 28d: Logged entry includes metadata when provided, omits it when undefined.
   */
  it('Property 28d: Logged entry includes metadata when provided, omits it when undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        auditActionArb,
        metadataArb,
        async (vaultId, memberId, action, metadata) => {
          const storage = new InMemoryAuditLogStorage();
          const logger = new AuditLogger(storage);

          const entry = await logger.log(vaultId, memberId, action, metadata);

          if (metadata !== undefined) {
            expect(entry.metadata).toEqual(metadata);
          } else {
            expect(
              Object.prototype.hasOwnProperty.call(entry, 'metadata'),
            ).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 28e: Each logged entry is persisted to storage.
   */
  it('Property 28e: Each logged entry is persisted to storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        auditActionArb,
        metadataArb,
        async (vaultId, memberId, action, metadata) => {
          const storage = new InMemoryAuditLogStorage();
          const logger = new AuditLogger(storage);

          const entry = await logger.log(vaultId, memberId, action, metadata);
          const stored = storage.getAll();

          expect(stored).toHaveLength(1);
          expect(stored[0]).toEqual(entry);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 28f: Successive log calls produce entries with unique IDs.
   */
  it('Property 28f: Successive log calls produce entries with unique IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(idArb, idArb, auditActionArb), {
          minLength: 2,
          maxLength: 10,
        }),
        async (calls) => {
          const storage = new InMemoryAuditLogStorage();
          const logger = new AuditLogger(storage);

          const entries: AuditLogEntry[] = [];
          for (const [vaultId, memberId, action] of calls) {
            entries.push(await logger.log(vaultId, memberId, action));
          }

          const ids = entries.map((e) => e.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
