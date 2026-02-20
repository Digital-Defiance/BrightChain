/**
 * @fileoverview E2E tests for BrightChainMemberInitService with both
 * memory and disk block stores.
 *
 * Verifies that:
 * 1. BrightChainMemberInitService.initialize() creates admin, system, and
 *    member user entries in the member_index collection
 * 2. The initialization works with both MemoryBlockStore and DiskBlockStore
 * 3. The init result contains a deterministic hash derived from the persisted entries
 * 4. Re-initialization is idempotent (skips already-present entries)
 *
 * **Validates: Requirements 1.1, 1.2, 1.5**
 */

import {
  BlockSize,
  IBrightChainInitResult,
  IMemberIndexDocument,
  initializeBrightChain,
  MemberStatusType,
  resetInitialization,
} from '@brightchain/brightchain-lib';
import { BrightChainDb } from '@brightchain/db';
import { MemberType } from '@digitaldefiance/ecies-lib';
import { createHash } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  BrightChainMemberInitService,
  IBrightChainMemberInitConfig,
} from '../lib/services/brightchain-member-init.service';
// Register disk store factory
import '../lib/factories/blockStoreFactory';

const MEMBER_INDEX_COLLECTION = 'member_index';

/**
 * Deterministic test users.
 * IDs must be valid ShortHexGuid values: exactly 8 lowercase hex chars.
 */
const TEST_INPUT = {
  systemUser: { id: 'a0b1c2d3', type: MemberType.System },
  adminUser: { id: 'e4f5a6b7', type: MemberType.User },
  memberUser: { id: 'c8d9e0f1', type: MemberType.User },
};

/**
 * Compute a SHA-256 hex hash over the member_index entries.
 * Sorts by id for determinism.
 */
function computeInitResultHash(entries: IMemberIndexDocument[]): string {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const h = createHash('sha256');
  for (const entry of sorted) {
    h.update(entry.id);
    h.update(entry.type.toString());
    h.update(entry.status);
    h.update(entry.poolId);
  }
  return h.digest('hex');
}

/**
 * Run the full init flow against a given config, then verify the
 * member_index collection and return the init result + hash.
 */
async function runInitAndVerify(config: IBrightChainMemberInitConfig): Promise<{
  result: IBrightChainInitResult<BrightChainDb>;
  entries: IMemberIndexDocument[];
  hash: string;
}> {
  const service = new BrightChainMemberInitService();
  const result = await service.initialize(config, TEST_INPUT);

  expect(result.insertedCount).toBe(3);
  expect(result.skippedCount).toBe(0);
  expect(result.alreadyInitialized).toBe(false);
  expect(result.db).toBeDefined();

  // Read back the persisted entries
  const collection = result.db.collection<IMemberIndexDocument>(
    MEMBER_INDEX_COLLECTION,
  );
  const entries = await collection.find({}).toArray();

  expect(entries).toHaveLength(3);

  // Verify each user is present with correct type and status
  const byId = new Map(entries.map((e) => [e.id, e]));

  const systemEntry = byId.get(TEST_INPUT.systemUser.id);
  expect(systemEntry).toBeDefined();
  expect(systemEntry!.type).toBe(MemberType.System);
  expect(systemEntry!.status).toBe(MemberStatusType.Active);
  expect(systemEntry!.poolId).toBe(config.memberPoolName);

  const adminEntry = byId.get(TEST_INPUT.adminUser.id);
  expect(adminEntry).toBeDefined();
  expect(adminEntry!.type).toBe(MemberType.User);
  expect(adminEntry!.status).toBe(MemberStatusType.Active);

  const memberEntry = byId.get(TEST_INPUT.memberUser.id);
  expect(memberEntry).toBeDefined();
  expect(memberEntry!.type).toBe(MemberType.User);
  expect(memberEntry!.status).toBe(MemberStatusType.Active);

  const hash = computeInitResultHash(entries);
  expect(hash).toMatch(/^[a-f0-9]{64}$/);

  return { result, entries, hash };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

jest.setTimeout(30000);

describe('E2E: BrightChainMemberInitService – memory and disk block stores', () => {
  beforeAll(() => {
    initializeBrightChain();
  });

  afterAll(() => {
    resetInitialization();
  });

  describe('MemoryBlockStore', () => {
    it('should initialize admin, system, and member users and produce a result hash', async () => {
      const config: IBrightChainMemberInitConfig = {
        memberPoolName: 'TestPool-Memory',
        useMemoryStore: true,
        blockSize: BlockSize.Small,
      };

      const { hash } = await runInitAndVerify(config);
      expect(hash).toBeTruthy();
    });

    it('should be idempotent on re-initialization', async () => {
      const config: IBrightChainMemberInitConfig = {
        memberPoolName: 'TestPool-Memory-Idempotent',
        useMemoryStore: true,
        blockSize: BlockSize.Small,
      };

      const service = new BrightChainMemberInitService();

      // First init
      const first = await service.initialize(config, TEST_INPUT);
      expect(first.insertedCount).toBe(3);
      expect(first.alreadyInitialized).toBe(false);

      // Second init — same service instance, same input
      const second = await service.initialize(config, TEST_INPUT);
      expect(second.insertedCount).toBe(0);
      expect(second.skippedCount).toBe(3);
      expect(second.alreadyInitialized).toBe(true);
    });
  });

  describe('DiskBlockStore', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'bc-e2e-disk-init-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('should initialize admin, system, and member users and produce a result hash', async () => {
      const config: IBrightChainMemberInitConfig = {
        memberPoolName: 'TestPool-Disk',
        blockStorePath: tempDir,
        blockSize: BlockSize.Small,
      };

      const { hash } = await runInitAndVerify(config);
      expect(hash).toBeTruthy();
    });

    it('should be idempotent on re-initialization', async () => {
      const config: IBrightChainMemberInitConfig = {
        memberPoolName: 'TestPool-Disk-Idempotent',
        blockStorePath: tempDir,
        blockSize: BlockSize.Small,
      };

      const service = new BrightChainMemberInitService();

      const first = await service.initialize(config, TEST_INPUT);
      expect(first.insertedCount).toBe(3);
      expect(first.alreadyInitialized).toBe(false);

      const second = await service.initialize(config, TEST_INPUT);
      expect(second.insertedCount).toBe(0);
      expect(second.skippedCount).toBe(3);
      expect(second.alreadyInitialized).toBe(true);
    });
  });

  describe('Cross-store hash consistency', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'bc-e2e-hash-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('should produce the same init result hash for memory and disk stores given the same input', async () => {
      const memoryConfig: IBrightChainMemberInitConfig = {
        memberPoolName: 'HashTest',
        useMemoryStore: true,
        blockSize: BlockSize.Small,
      };

      const diskConfig: IBrightChainMemberInitConfig = {
        memberPoolName: 'HashTest',
        blockStorePath: tempDir,
        blockSize: BlockSize.Small,
      };

      const memoryResult = await runInitAndVerify(memoryConfig);
      const diskResult = await runInitAndVerify(diskConfig);

      expect(memoryResult.hash).toBe(diskResult.hash);
    });
  });
});
