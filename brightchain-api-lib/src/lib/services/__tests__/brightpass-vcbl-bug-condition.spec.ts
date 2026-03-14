/**
 * Bug Condition Tests — vcblBlockId Behavior With and Without Injected Services
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**
 *
 * Property 1: Documents the graceful degradation behavior — when BrightPassService
 * is constructed without services (no VCBLService, no Member), createVault()
 * returns the all-zeroes placeholder vcblBlockId. This path is no longer hit
 * in production after the controller fix (tasks 3.1–3.3).
 *
 * Root cause verification: Confirms that when services ARE properly injected,
 * createVault() produces a valid non-zero vcblBlockId and stores the VCBL block.
 */
import {
  BlockService,
  BlockSize,
  CBLService,
  ChecksumService,
  CONSTANTS,
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  VCBLService,
} from '@brightchain/brightchain-lib';
import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import type { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib/src/types/guid-versions';
import fc from 'fast-check';
import { BrightPassService } from '../brightpass';

// The placeholder in createVault() is a 64-char all-zeroes string
const ALL_ZEROES_BLOCK_ID_64 =
  '0000000000000000000000000000000000000000000000000000000000000000';

// SHA3-512 produces 64 bytes = 128 hex characters; valid checksums are this length
const CHECKSUM_HEX_LENGTH = CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH * 2; // 128

// Set a longer timeout for property-based tests
jest.setTimeout(120000);

describe('Bug Condition Exploration: All-Zeroes vcblBlockId', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceProvider.getInstance<GuidV4Buffer>();
  });

  afterAll(() => {
    ServiceProvider.resetInstance();
  });

  /**
   * Property 1: Bug Condition Documentation — No-Args Construction Produces All-Zeroes
   *
   * **Validates: Requirements 1.1, 1.2, 1.3**
   *
   * Documents the known degraded behavior: when BrightPassService is constructed
   * without injected services (no VCBLService, no Member), createVault() skips
   * VCBL block creation and returns the all-zeroes placeholder vcblBlockId.
   *
   * This is the bug that was fixed in the controller (tasks 3.1–3.3). The
   * controller now injects proper services, so this path is no longer hit
   * in production. This test documents the graceful degradation behavior.
   */
  describe('Property 1: Bug Condition - no-args construction produces all-zeroes vcblBlockId', () => {
    const vaultNameArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);
    const masterPasswordArb = fc.string({ minLength: 1, maxLength: 100 });

    it('createVault() without injected services returns all-zeroes vcblBlockId (graceful degradation)', async () => {
      await fc.assert(
        fc.asyncProperty(
          vaultNameArb,
          masterPasswordArb,
          async (vaultName, masterPassword) => {
            // Construct BrightPassService with NO args — the degraded path
            const service = new BrightPassService();

            const memberId = 'member1';
            const metadata = await service.createVault(
              memberId,
              vaultName,
              masterPassword,
            );

            // Without services, vcblBlockId is the all-zeroes placeholder
            expect(metadata.vcblBlockId).toBe(ALL_ZEROES_BLOCK_ID_64);
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  /**
   * Verification: properly injected services DO produce valid vcblBlockId.
   * This confirms the root cause — the bug is in the construction path, not
   * in createVault() logic itself.
   */
  describe('Root cause verification: injected services produce valid vcblBlockId', () => {
    it('createVault() with VCBLService, BlockService, and Member returns valid vcblBlockId', async () => {
      const serviceProvider = ServiceProvider.getInstance<GuidV4Buffer>();
      ServiceLocator.setServiceProvider(serviceProvider);

      const checksumService = new ChecksumService();
      const cblService = new CBLService<GuidV4Buffer>(
        checksumService,
        serviceProvider.eciesService,
        serviceProvider.idProvider,
      );
      const vcblService = new VCBLService<GuidV4Buffer>(
        cblService,
        checksumService,
      );
      const blockService = new BlockService<GuidV4Buffer>();
      const blockStore = new MemoryBlockStore(BlockSize.Small);

      const { member: testMember } = Member.newMember<GuidV4Buffer>(
        serviceProvider.eciesService,
        MemberType.User,
        'TestUser',
        new EmailString('testuser@example.com'),
      );

      const service = new BrightPassService<GuidV4Buffer>(
        blockStore,
        vcblService,
        blockService,
        testMember,
      );

      const metadata = await service.createVault(
        'member1',
        'TestVault',
        'password123',
      );

      // With proper services, vcblBlockId is a valid SHA3-512 checksum
      expect(metadata.vcblBlockId).toMatch(
        new RegExp(`^[0-9a-f]{${CHECKSUM_HEX_LENGTH}}$`),
      );
      expect(metadata.vcblBlockId).not.toBe(ALL_ZEROES_BLOCK_ID_64);
      expect(metadata.vcblBlockId).not.toMatch(/^0+$/);

      // The VCBL block is stored in the block store
      const exists = await blockStore.has(metadata.vcblBlockId);
      expect(exists).toBe(true);
    });
  });
});
