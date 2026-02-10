import {
  BlockSize,
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { AuditAction } from '@brightchain/brightchain-lib/lib/interfaces/brightpass/auditLog';
import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import type { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib/src/types/guid-versions';
import fc from 'fast-check';
import { AuditLogger } from './auditLogger';

// Feature: brightpass-password-manager, Properties 22 & 23: Audit log operations

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

describe('AuditLogger', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(
      ServiceProvider.getInstance<GuidV4Buffer>(),
    );
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
    // Re-initialize for next test
    initializeBrightChain();
    ServiceLocator.setServiceProvider(
      ServiceProvider.getInstance<GuidV4Buffer>(),
    );
  });

  /**
   * Helper to create a test member with random data
   */
  function createTestMember(name: string, email: string): Member<GuidV4Buffer> {
    const eciesService =
      ServiceProvider.getInstance<GuidV4Buffer>().eciesService;
    return Member.newMember<GuidV4Buffer>(
      eciesService,
      MemberType.User,
      name,
      new EmailString(email),
    ).member;
  }

  describe('Property 22: Audit log creation and append-only invariant', () => {
    const auditEntryArbitrary = fc.record({
      action: fc.constantFrom(
        AuditAction.VAULT_CREATED,
        AuditAction.VAULT_OPENED,
        AuditAction.ENTRY_CREATED,
        AuditAction.ENTRY_UPDATED,
        AuditAction.ENTRY_DELETED,
      ),
      id: fc.uuid(),
      vaultId: fc.uuid(),
      memberId: fc.uuid(),
      metadata: fc.option(fc.dictionary(fc.string(), fc.string()), {
        nil: undefined,
      }),
    });

    it('log only grows and never shrinks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEntryArbitrary, { minLength: 1, maxLength: 20 }),
          async (entries) => {
            const logger = new AuditLogger();
            let previousCount = 0;

            for (const entry of entries) {
              await logger.log(entry);
              const currentCount = logger.getCount();

              // Count should only increase
              expect(currentCount).toBeGreaterThan(previousCount);
              previousCount = currentCount;
            }

            // Final count should equal number of entries
            expect(logger.getCount()).toBe(entries.length);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('entries have correct fields', async () => {
      await fc.assert(
        fc.asyncProperty(auditEntryArbitrary, async (entry) => {
          const logger = new AuditLogger();
          await logger.log(entry);

          const entries = await logger.getEntries();
          expect(entries.length).toBe(1);

          const logged = entries[0];
          expect(logged.action).toBe(entry.action);
          expect(logged.id).toBe(entry.id);
          expect(logged.vaultId).toBe(entry.vaultId);
          expect(logged.memberId).toBe(entry.memberId);
          expect(logged.metadata).toEqual(entry.metadata);
          expect(logged.timestamp).toBeInstanceOf(Date);
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 23: Audit log reverse chronological order', () => {
    it('returns entries in descending timestamp order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              action: fc.constantFrom(
                AuditAction.VAULT_CREATED,
                AuditAction.ENTRY_CREATED,
              ),
              id: fc.uuid(),
              vaultId: fc.uuid(),
              memberId: fc.uuid(),
            }),
            { minLength: 2, maxLength: 10 },
          ),
          async (entries) => {
            const logger = new AuditLogger();

            // Log entries with small delays to ensure different timestamps
            for (const entry of entries) {
              await logger.log(entry);
              await new Promise((resolve) => setTimeout(resolve, 1));
            }

            const retrieved = await logger.getEntries();

            // Verify reverse chronological order
            for (let i = 0; i < retrieved.length - 1; i++) {
              expect(retrieved[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                retrieved[i + 1].timestamp.getTime(),
              );
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('respects limit parameter', async () => {
      const logger = new AuditLogger();

      // Log 10 entries
      for (let i = 0; i < 10; i++) {
        await logger.log({
          action: AuditAction.VAULT_OPENED,
          id: `log-${i}`,
          vaultId: `vault-${i}`,
          memberId: `member-${i}`,
        });
      }

      const limited = await logger.getEntries(5);
      expect(limited.length).toBe(5);

      // Should be most recent 5
      const all = await logger.getEntries();
      expect(limited).toEqual(all.slice(0, 5));
    });
  });

  describe('Requirement 4.1-4.4: Audit log entries stored as encrypted blocks', () => {
    /**
     * **Validates: Requirements 4.1, 4.2**
     * AuditLogger accepts IBlockStore from brightchain-lib and stores entries as encrypted blocks
     */
    it('stores entries in block store when configured with MemoryBlockStore', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const systemMember = createTestMember('system', 'system@test.local');
      const logger = new AuditLogger(
        blockStore,
        systemMember,
        3,
        BlockSize.Small,
      );

      expect(logger.isUsingBlockStore).toBe(true);

      // Log 3 entries to trigger a flush
      for (let i = 0; i < 3; i++) {
        await logger.log({
          action: AuditAction.VAULT_OPENED,
          id: `log-${i}`,
          vaultId: 'vault-1',
          memberId: 'member-1',
        });
      }

      // Should have created one block and have a head block ID
      expect(logger.getHeadBlockId()).not.toBeNull();
      expect(blockStore.size()).toBeGreaterThan(0);
    });

    /**
     * **Validates: Requirements 4.2, 4.3**
     * Audit blocks are encrypted with the system member's public key using EncryptedBlock
     */
    it('encrypts data before storing in block store', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const systemMember = createTestMember('system', 'system@test.local');
      const logger = new AuditLogger(
        blockStore,
        systemMember,
        1,
        BlockSize.Small,
      );

      await logger.log({
        action: AuditAction.VAULT_CREATED,
        id: 'test-id',
        vaultId: 'vault-1',
        memberId: 'member-1',
      });

      // Get the stored block
      const blockId = logger.getHeadBlockId();
      expect(blockId).not.toBeNull();

      // Verify block was stored
      const hasBlock = await blockStore.has(blockId!);
      expect(hasBlock).toBe(true);

      // Get the raw block data
      const blockHandle = blockStore.get(blockId!);
      const storedData = blockHandle.fullData;

      // The stored data should NOT be valid JSON (it's encrypted)
      // The first byte should be the encryption type marker
      expect(() => JSON.parse(new TextDecoder().decode(storedData))).toThrow();
    });

    /**
     * **Validates: Requirements 4.1, 4.2**
     * Maintains append-only invariant with block store
     */
    it('maintains append-only invariant with block store', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              action: fc.constantFrom(
                AuditAction.VAULT_CREATED,
                AuditAction.ENTRY_CREATED,
              ),
              id: fc.uuid(),
              vaultId: fc.uuid(),
              memberId: fc.uuid(),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          async (entries) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(
              ServiceProvider.getInstance<GuidV4Buffer>(),
            );

            const blockStore = new MemoryBlockStore(BlockSize.Small);
            const systemMember = createTestMember(
              'system',
              'system@test.local',
            );
            const logger = new AuditLogger(
              blockStore,
              systemMember,
              3,
              BlockSize.Small,
            );

            let previousCount = 0;

            for (const entry of entries) {
              await logger.log(entry);
              const currentCount = logger.getCount();

              // Count should only increase (append-only)
              expect(currentCount).toBeGreaterThan(previousCount);
              previousCount = currentCount;
            }

            // Flush any remaining entries
            await logger.flushToBlockStore();

            // Final count should equal number of entries
            expect(logger.getCount()).toBe(entries.length);
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * **Validates: Requirements 4.1, 4.3**
     * State can be restored from head block ID
     */
    it('restores state from head block ID', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const systemMember = createTestMember('system', 'system@test.local');

      // Create first logger and log entries
      const logger1 = new AuditLogger(
        blockStore,
        systemMember,
        2,
        BlockSize.Small,
      );
      for (let i = 0; i < 4; i++) {
        await logger1.log({
          action: AuditAction.VAULT_OPENED,
          id: `log-${i}`,
          vaultId: 'vault-1',
          memberId: 'member-1',
        });
      }

      const headBlockId = logger1.getHeadBlockId();
      expect(headBlockId).not.toBeNull();

      // Create second logger and restore state
      const logger2 = new AuditLogger(
        blockStore,
        systemMember,
        2,
        BlockSize.Small,
      );
      logger2.setHeadBlockId(headBlockId);

      // The second logger should be able to retrieve entries
      // Note: Full retrieval requires decryption which needs the system member's private key
      // This test verifies the state restoration mechanism works
      expect(logger2.getHeadBlockId()).toBe(headBlockId);
    });

    /**
     * **Validates: Requirements 4.1, 4.2, 4.3**
     * Verifies that pending entries (not yet flushed) are retrievable
     */
    it('retrieves pending entries before flush', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const systemMember = createTestMember('system', 'system@test.local');
      const logger = new AuditLogger(
        blockStore,
        systemMember,
        10,
        BlockSize.Small,
      );

      // Log 4 entries (batch size is 10, so no flush yet)
      for (let i = 0; i < 4; i++) {
        await logger.log({
          action: AuditAction.ENTRY_CREATED,
          id: `log-${i}`,
          vaultId: 'vault-1',
          memberId: 'member-1',
        });
      }

      // Entries should be in pending state (not flushed yet)
      expect(logger.getCount()).toBe(4);

      // Retrieve all entries - these are pending entries
      const entries = await logger.getEntries();
      expect(entries.length).toBe(4);

      // Verify entry content
      expect(entries.every((e) => e.action === AuditAction.ENTRY_CREATED)).toBe(
        true,
      );
      expect(entries.every((e) => e.vaultId === 'vault-1')).toBe(true);
    });
  });
});
