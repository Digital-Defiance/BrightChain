/**
 * @fileoverview Integration tests for BrightChainMemberInitService.
 *
 * Tests the full initialize() flow end-to-end against both:
 *  - An in-memory block store (fast, no I/O)
 *  - A disk-backed block store (real filesystem, cleaned up after each test)
 *
 * These tests exercise the real BrightDB, real schema validation, and
 * real transaction semantics — no mocks of the storage layer.
 */

import {
  IBrightChainBaseInitResult,
  IBrightChainMemberInitInput,
  IMemberIndexDocument,
  initializeBrightChain,
  MemberStatusType,
  resetInitialization,
} from '@brightchain/brightchain-lib';
import { BrightDb } from '@brightchain/db';
import { MemberType } from '@digitaldefiance/ecies-lib';
import { GuidV4Buffer, GuidV4Provider } from '@digitaldefiance/node-ecies-lib';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MemberIndexSchemaValidationError } from '../errors/memberIndexSchemaValidationError';
import {
  BrightChainMemberInitService,
  IBrightChainMemberInitConfig,
} from './brightchain-member-init.service';

// ─── Test fixtures ────────────────────────────────────────────────────────────

/** Valid v4 GUID short hex IDs (version nibble = 4) */
const SYSTEM_ID = '15e070c81ab3446e8caa787d30d1d1d6';
const ADMIN_ID = '6aba638bb9b6432b9c79a339e3776d69';
const MEMBER_ID = '586fab6e1d9b4710be7b95dda1e051a1';

const VALID_POOL = 'IntegrationPool';

const guidProvider = new GuidV4Provider();

/**
 * Convert a short hex string to a GuidV4Buffer.
 * For empty strings, returns a zero-length buffer cast to GuidV4Buffer
 * so that toString('hex') produces '' and triggers schema validation failure.
 */
function hexToGuidBuffer(hex: string): GuidV4Buffer {
  if (hex === '') {
    return Buffer.alloc(0) as unknown as GuidV4Buffer;
  }
  return guidProvider.idFromString(hex);
}

function makeInput(
  systemId = SYSTEM_ID,
  adminId = ADMIN_ID,
  memberId = MEMBER_ID,
): IBrightChainMemberInitInput<GuidV4Buffer> {
  return {
    systemUser: { id: hexToGuidBuffer(systemId), type: MemberType.System },
    adminUser: { id: hexToGuidBuffer(adminId), type: MemberType.Admin },
    memberUser: { id: hexToGuidBuffer(memberId), type: MemberType.User },
  };
}

function makeMemoryConfig(
  overrides: Partial<IBrightChainMemberInitConfig> = {},
): IBrightChainMemberInitConfig {
  return {
    memberPoolName: VALID_POOL,
    useMemoryStore: true,
    ...overrides,
  };
}

function makeDiskConfig(
  blockStorePath: string,
  overrides: Partial<IBrightChainMemberInitConfig> = {},
): IBrightChainMemberInitConfig {
  return {
    memberPoolName: VALID_POOL,
    blockStorePath,
    useMemoryStore: false,
    ...overrides,
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('BrightChainMemberInitService — integration', () => {
  beforeAll(() => {
    initializeBrightChain();
  });

  afterAll(() => {
    resetInitialization();
  });

  // ── In-memory store ─────────────────────────────────────────────────────────

  describe('in-memory block store', () => {
    it('inserts system, admin, and member users on first call', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const config = makeMemoryConfig();
      const input = makeInput();

      const result: IBrightChainBaseInitResult<BrightDb, GuidV4Buffer> =
        await service.initialize(config, input);

      expect(result.alreadyInitialized).toBe(false);
      expect(result.insertedCount).toBe(3);
      expect(result.skippedCount).toBe(0);
      expect(result.db).toBeInstanceOf(BrightDb);
      expect(result.db.isConnected()).toBe(true);
    });

    it('stores documents with correct field values', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const config = makeMemoryConfig();
      const input = makeInput();

      await service.initialize(config, input);

      const collection =
        service.db.collection<IMemberIndexDocument>('member_index');
      const docs = await collection.find({}).toArray();

      expect(docs).toHaveLength(3);

      const ids = docs.map((d) => d.id);
      expect(ids).toContain(SYSTEM_ID);
      expect(ids).toContain(ADMIN_ID);
      expect(ids).toContain(MEMBER_ID);

      for (const doc of docs) {
        expect(doc.poolId).toBe(VALID_POOL);
        expect(doc.status).toBe(MemberStatusType.Active);
        expect(doc.reputation).toBe(0);
        // Zero-filled CBL sentinels (128 hex chars = 64 bytes for SHA3-512)
        expect(doc.publicCBL).toBe('0'.repeat(128));
        expect(doc.privateCBL).toBe('0'.repeat(128));
        expect(typeof doc.lastUpdate).toBe('string');
        expect(() => new Date(doc.lastUpdate)).not.toThrow();
      }
    });

    it('system user gets MemberType.System', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      await service.initialize(makeMemoryConfig(), makeInput());

      const collection =
        service.db.collection<IMemberIndexDocument>('member_index');
      const systemDoc = await collection.findOne({ id: SYSTEM_ID });

      expect(systemDoc).not.toBeNull();
      expect(systemDoc?.type).toBe(MemberType.System);
    });

    it('is idempotent — second call returns alreadyInitialized:true with no new inserts', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const config = makeMemoryConfig();
      const input = makeInput();

      const first = await service.initialize(config, input);
      expect(first.insertedCount).toBe(3);

      const second = await service.initialize(config, input);
      expect(second.alreadyInitialized).toBe(true);
      expect(second.insertedCount).toBe(0);
      expect(second.skippedCount).toBe(3);

      // Collection still has exactly 3 documents
      const collection =
        service.db.collection<IMemberIndexDocument>('member_index');
      expect(await collection.countDocuments({})).toBe(3);
    });

    it('partial idempotency — only missing members are inserted', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const config = makeMemoryConfig();
      const input = makeInput();

      // First call — inserts all 3
      await service.initialize(config, input);

      // Remove one entry to simulate a partial state
      const collection =
        service.db.collection<IMemberIndexDocument>('member_index');
      await collection.deleteOne({ id: MEMBER_ID });
      expect(await collection.countDocuments({})).toBe(2);

      // Second call — should insert only the missing member
      const second = await service.initialize(config, input);
      expect(second.alreadyInitialized).toBe(false);
      expect(second.insertedCount).toBe(1);
      expect(second.skippedCount).toBe(2);
      expect(await collection.countDocuments({})).toBe(3);
    });

    it('rejects invalid user id and throws MemberIndexSchemaValidationError', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const config = makeMemoryConfig();

      // Empty string fails ShortHexGuidPrimitive validation
      const input = makeInput('', ADMIN_ID, MEMBER_ID);

      await expect(service.initialize(config, input)).rejects.toThrow(
        MemberIndexSchemaValidationError,
      );
    });

    it('leaves collection empty when schema validation fails', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const config = makeMemoryConfig();
      const input = makeInput('', ADMIN_ID, MEMBER_ID);

      await expect(service.initialize(config, input)).rejects.toThrow(
        MemberIndexSchemaValidationError,
      );

      // db was connected before validation — collection should be empty
      const collection =
        service.db.collection<IMemberIndexDocument>('member_index');
      expect(await collection.countDocuments({})).toBe(0);
    });

    it('exposes memberCblIndex after initialize()', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      await service.initialize(makeMemoryConfig(), makeInput());

      expect(service.memberCblIndex).toBeDefined();
    });
  });

  // ── Disk block store ────────────────────────────────────────────────────────

  describe('disk block store', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'brightchain-member-init-test-'));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('inserts 3 members using a real disk store', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const config = makeDiskConfig(tmpDir);

      const result = await service.initialize(config, makeInput());

      expect(result.alreadyInitialized).toBe(false);
      expect(result.insertedCount).toBe(3);
      expect(result.db.isConnected()).toBe(true);
    });

    it('second service instance on same disk path sees documents from first instance (PersistentHeadRegistry)', async () => {
      const config = makeDiskConfig(tmpDir);
      const input = makeInput();

      const service1 = new BrightChainMemberInitService<GuidV4Buffer>();
      const first = await service1.initialize(config, input);
      expect(first.insertedCount).toBe(3);

      // A second instance with the same disk path shares the persistent head registry
      // file — it loads the existing heads and finds all 3 documents already present.
      const service2 = new BrightChainMemberInitService<GuidV4Buffer>();
      const second = await service2.initialize(config, input);
      expect(second.alreadyInitialized).toBe(true);
      expect(second.insertedCount).toBe(0);
      expect(second.skippedCount).toBe(3);
    });

    it('stores correct field values on disk', async () => {
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const config = makeDiskConfig(tmpDir);

      await service.initialize(config, makeInput());

      const collection =
        service.db.collection<IMemberIndexDocument>('member_index');
      const docs = await collection.find({}).toArray();

      expect(docs).toHaveLength(3);
      const ids = docs.map((d) => d.id);
      expect(ids).toContain(SYSTEM_ID);
      expect(ids).toContain(ADMIN_ID);
      expect(ids).toContain(MEMBER_ID);

      for (const doc of docs) {
        expect(doc.poolId).toBe(VALID_POOL);
        expect(doc.status).toBe(MemberStatusType.Active);
        expect(doc.publicCBL).toBe('0'.repeat(128));
        expect(doc.privateCBL).toBe('0'.repeat(128));
      }
    });
  });
});
