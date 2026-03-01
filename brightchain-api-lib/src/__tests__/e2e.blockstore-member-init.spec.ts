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
 * 5. initializeWithRbac() creates roles, users, user-roles, and mnemonics
 *    collections with round-trip queryable documents on both store types
 *
 * **Validates: Requirements 1.1, 1.2, 1.5**
 */

import {
  BlockSize,
  type IBrightChainBaseInitResult,
  type IBrightChainMemberInitInput,
  type IBrightChainRbacInitInput,
  type IBrightChainUserInitEntry,
  type IMemberIndexDocument,
  initializeBrightChain,
  type IPasswordWrappedPrivateKey,
  MemberStatusType,
  resetInitialization,
} from '@brightchain/brightchain-lib';
import { BrightChainDb } from '@brightchain/db';
import {
  EmailString,
  type IECIESConfig,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  GuidV4Buffer,
  GuidV4Provider,
  Member,
} from '@digitaldefiance/node-ecies-lib';
import {
  BackupCode,
  KeyWrappingService,
} from '@digitaldefiance/node-express-suite';
import { createHash, createHmac } from 'crypto';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MNEMONICS_COLLECTION } from '../lib/interfaces/storage/mnemonicSchema';
import { ROLES_COLLECTION } from '../lib/interfaces/storage/roleSchema';
import { USER_ROLES_COLLECTION } from '../lib/interfaces/storage/userRoleSchema';
import { USERS_COLLECTION } from '../lib/interfaces/storage/userSchema';
import {
  BrightChainMemberInitService,
  type IBrightChainMemberInitConfig,
} from '../lib/services/brightchain-member-init.service';
// Register disk store factory
import '../lib/factories/blockStoreFactory';

const MEMBER_INDEX_COLLECTION = 'member_index';

const guidProvider = new GuidV4Provider();
let eciesService: ECIESService;
let keyWrappingService: KeyWrappingService;

const HMAC_SECRET = Buffer.from('a'.repeat(64), 'hex');

/**
 * Deterministic test users.
 * IDs must be valid v4 GUIDs (version nibble = 4).
 */
const TEST_INPUT: IBrightChainMemberInitInput<GuidV4Buffer> = {
  systemUser: {
    id: guidProvider.idFromString('e51295516af341419d60870ecfd01922'),
    type: MemberType.System,
  },
  adminUser: {
    id: guidProvider.idFromString('877f629f6cd34b62b48475cca3ae88c8'),
    type: MemberType.User,
  },
  memberUser: {
    id: guidProvider.idFromString('2479c6cc6fad465eae61cfcf2b9c7a1c'),
    type: MemberType.User,
  },
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

// ─── RBAC test fixtures ───────────────────────────────────────────────────────

const RBAC_SYSTEM_ID = '15e070c81ab3446e8caa787d30d1d1d6';
const RBAC_ADMIN_ID = '6aba638bb9b6432b9c79a339e3776d69';
const RBAC_MEMBER_ID = '586fab6e1d9b4710be7b95dda1e051a1';

// Short hex (32-char, no dashes) — matches the stored format produced by serializeForStorage
const RBAC_SYSTEM_FULL_ID = 'b40c689a48194a2cb303085bc0d49954';
const RBAC_ADMIN_FULL_ID = '56bdd54491d44f8c90a8d4a4bda3e9f9';
const RBAC_MEMBER_FULL_ID = '83aa50699d384920938d5f23c51da297';

const RBAC_SYSTEM_ROLE_ID = '22e235f113644723b53251bd4f540200';
const RBAC_ADMIN_ROLE_ID = 'fe76ff8483554ef3bc36e61be02daf81';
const RBAC_MEMBER_ROLE_ID = '8ee7c136b01f41e9a444825f84fe59f9';

const RBAC_SYSTEM_USER_ROLE_ID = '43f3f97d6b104065a0c9aa826ed04f9f';
const RBAC_ADMIN_USER_ROLE_ID = 'f6602523f9b34d9d8bccfe2cc6003a58';
const RBAC_MEMBER_USER_ROLE_ID = 'cefa30ae8f1747b083192395b26b6a23';

const RBAC_SYSTEM_MNEMONIC_DOC_ID = 'bd4e724f743e40a487706b04598cd156';
const RBAC_ADMIN_MNEMONIC_DOC_ID = '3b4dfdc6169940cab29d9d7203f15fa7';
const RBAC_MEMBER_MNEMONIC_DOC_ID = 'a01197d682fa4053a0301ab1b6f7b1fc';

/**
 * Build a full IBrightChainUserInitEntry with real ECIES key pairs.
 * Returns the Member so backup codes can be encrypted before disposal.
 */
function buildRbacEntry(
  shortId: string,
  fullId: string,
  memberType: MemberType,
  username: string,
  email: string,
  roleId: string,
  userRoleId: string,
  mnemonicDocId: string,
  roleName: string,
  roleAdmin: boolean,
  roleMember: boolean,
  roleSystem: boolean,
): {
  entry: IBrightChainUserInitEntry<GuidV4Buffer>;
  mnemonic: SecureString;
  member: Member<Buffer>;
} {
  const { member, mnemonic } = Member.newMember(
    eciesService,
    memberType,
    username,
    new EmailString(email),
  );

  const password = new SecureString('TestPassword123!');

  let wrappedKey: IPasswordWrappedPrivateKey | undefined;
  if (member.privateKey) {
    const wrapped = keyWrappingService.wrapSecret(member.privateKey, password);
    wrappedKey = {
      salt: wrapped.salt,
      iv: wrapped.iv,
      authTag: wrapped.authTag,
      ciphertext: wrapped.ciphertext,
      iterations: wrapped.iterations,
    };
  }

  const mnemonicRecovery = member
    .encryptData(Buffer.from(mnemonic.value ?? '', 'utf-8'))
    .toString('hex');

  const mnemonicHmac = createHmac('sha256', HMAC_SECRET)
    .update(Buffer.from(mnemonic.value ?? '', 'utf-8'))
    .digest('hex');

  const publicKeyHex = member.publicKey.toString('hex');

  return {
    entry: {
      id: guidProvider.idFromString(shortId),
      type: memberType,
      fullId: guidProvider.idFromString(fullId),
      username,
      email,
      publicKeyHex,
      passwordWrappedPrivateKey: wrappedKey,
      mnemonicRecovery,
      mnemonicHmac,
      backupCodes: [], // filled in after async encryption
      roleId: guidProvider.idFromString(roleId),
      userRoleId: guidProvider.idFromString(userRoleId),
      mnemonicDocId: guidProvider.idFromString(mnemonicDocId),
      roleName,
      roleAdmin,
      roleMember,
      roleSystem,
    },
    mnemonic,
    member,
  };
}

/**
 * Build RBAC input with real encrypted backup codes — mirrors what
 * brightchain-inituserdb/src/main.ts does in production.
 */
async function makeRbacInput(): Promise<
  IBrightChainRbacInitInput<GuidV4Buffer>
> {
  const system = buildRbacEntry(
    RBAC_SYSTEM_ID,
    RBAC_SYSTEM_FULL_ID,
    MemberType.System,
    'system',
    'system@test.local',
    RBAC_SYSTEM_ROLE_ID,
    RBAC_SYSTEM_USER_ROLE_ID,
    RBAC_SYSTEM_MNEMONIC_DOC_ID,
    'System',
    true,
    true,
    true,
  );
  const admin = buildRbacEntry(
    RBAC_ADMIN_ID,
    RBAC_ADMIN_FULL_ID,
    MemberType.User,
    'admin',
    'admin@test.local',
    RBAC_ADMIN_ROLE_ID,
    RBAC_ADMIN_USER_ROLE_ID,
    RBAC_ADMIN_MNEMONIC_DOC_ID,
    'Admin',
    true,
    true,
    false,
  );
  const member = buildRbacEntry(
    RBAC_MEMBER_ID,
    RBAC_MEMBER_FULL_ID,
    MemberType.User,
    'member',
    'member@test.local',
    RBAC_MEMBER_ROLE_ID,
    RBAC_MEMBER_USER_ROLE_ID,
    RBAC_MEMBER_MNEMONIC_DOC_ID,
    'Member',
    false,
    true,
    false,
  );

  // Generate and encrypt backup codes just like main.ts does
  const generateCodes = (): BackupCode[] =>
    Array.from(
      { length: 10 },
      () => new BackupCode(BackupCode.generateBackupCode()),
    );

  const [encSystemCodes, encAdminCodes, encMemberCodes] = await Promise.all([
    BackupCode.encryptBackupCodes(
      system.member,
      system.member,
      generateCodes(),
    ),
    BackupCode.encryptBackupCodes(admin.member, system.member, generateCodes()),
    BackupCode.encryptBackupCodes(
      member.member,
      system.member,
      generateCodes(),
    ),
  ]);

  system.entry.backupCodes = encSystemCodes;
  admin.entry.backupCodes = encAdminCodes;
  member.entry.backupCodes = encMemberCodes;

  system.member.dispose();
  admin.member.dispose();
  member.member.dispose();

  return {
    systemUser: system.entry,
    adminUser: admin.entry,
    memberUser: member.entry,
  };
}

/**
 * Run initializeWithRbac and verify all RBAC collections have correct
 * round-trip queryable documents.
 */
async function runRbacInitAndVerify(
  config: IBrightChainMemberInitConfig,
): Promise<{ service: BrightChainMemberInitService<GuidV4Buffer> }> {
  const service = new BrightChainMemberInitService<GuidV4Buffer>();
  const input = await makeRbacInput();
  const result = await service.initializeWithRbac(config, input);

  expect(result.alreadyInitialized).toBe(false);
  // 3 member_index + 3 roles + 3 users + 3 user-roles + 3 mnemonics = 15
  expect(result.insertedCount).toBe(15);
  expect(result.db).toBeInstanceOf(BrightChainDb);

  const db = service.db;

  // ── Roles round-trip ──
  const roles = db.collection<Record<string, unknown>>(ROLES_COLLECTION);
  const allRoles = await roles.find({}).toArray();
  expect(allRoles).toHaveLength(3);

  const systemRole = await roles.findOne({ _id: RBAC_SYSTEM_ROLE_ID });
  expect(systemRole).not.toBeNull();
  expect(systemRole?.['name']).toBe('System');
  expect(systemRole?.['admin']).toBe(true);
  expect(systemRole?.['system']).toBe(true);

  const adminRole = await roles.findOne({ _id: RBAC_ADMIN_ROLE_ID });
  expect(adminRole).not.toBeNull();
  expect(adminRole?.['name']).toBe('Admin');
  expect(adminRole?.['admin']).toBe(true);
  expect(adminRole?.['system']).toBe(false);

  const memberRole = await roles.findOne({ _id: RBAC_MEMBER_ROLE_ID });
  expect(memberRole).not.toBeNull();
  expect(memberRole?.['name']).toBe('Member');
  expect(memberRole?.['admin']).toBe(false);

  // ── Users round-trip ──
  const users = db.collection<Record<string, unknown>>(USERS_COLLECTION);
  const allUsers = await users.find({}).toArray();
  expect(allUsers).toHaveLength(3);

  const systemUser = await users.findOne({ _id: RBAC_SYSTEM_FULL_ID });
  expect(systemUser).not.toBeNull();
  expect(systemUser?.['username']).toBe('system');
  expect(systemUser?.['email']).toBe('system@test.local');
  expect(typeof systemUser?.['publicKey']).toBe('string');
  expect((systemUser?.['publicKey'] as string).length).toBeGreaterThan(0);

  const adminUser = await users.findOne({ _id: RBAC_ADMIN_FULL_ID });
  expect(adminUser).not.toBeNull();
  expect(adminUser?.['username']).toBe('admin');

  const memberUser = await users.findOne({ _id: RBAC_MEMBER_FULL_ID });
  expect(memberUser).not.toBeNull();
  expect(memberUser?.['username']).toBe('member');

  // ── User-roles round-trip ──
  const userRoles = db.collection<Record<string, unknown>>(
    USER_ROLES_COLLECTION,
  );
  const allUserRoles = await userRoles.find({}).toArray();
  expect(allUserRoles).toHaveLength(3);

  const systemUserRole = await userRoles.findOne({
    _id: RBAC_SYSTEM_USER_ROLE_ID,
  });
  expect(systemUserRole).not.toBeNull();
  expect(systemUserRole?.['userId']).toBe(RBAC_SYSTEM_FULL_ID);
  expect(systemUserRole?.['roleId']).toBe(RBAC_SYSTEM_ROLE_ID);

  // ── Mnemonics round-trip ──
  const mnemonics =
    db.collection<Record<string, unknown>>(MNEMONICS_COLLECTION);
  const allMnemonics = await mnemonics.find({}).toArray();
  expect(allMnemonics).toHaveLength(3);

  for (const doc of allMnemonics) {
    expect(typeof doc['hmac']).toBe('string');
    expect((doc['hmac'] as string).length).toBe(64);
  }

  // ── Cross-collection join: user → user-role → role ──
  const resolvedUserRole = await userRoles.findOne({
    userId: RBAC_ADMIN_FULL_ID,
  });
  expect(resolvedUserRole).not.toBeNull();
  const resolvedRole = await roles.findOne({
    _id: resolvedUserRole?.['roleId'],
  });
  expect(resolvedRole).not.toBeNull();
  expect(resolvedRole?.['name']).toBe('Admin');

  return { service };
}

/**
 * Run the full init flow against a given config, then verify the
 * member_index collection and return the init result + hash.
 */
async function runInitAndVerify(config: IBrightChainMemberInitConfig): Promise<{
  result: IBrightChainBaseInitResult<BrightChainDb, GuidV4Buffer>;
  entries: IMemberIndexDocument[];
  hash: string;
}> {
  const service = new BrightChainMemberInitService<GuidV4Buffer>();
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

  const systemEntry = byId.get(TEST_INPUT.systemUser.id.toString('hex'));
  expect(systemEntry).toBeDefined();
  expect(systemEntry!.type).toBe(MemberType.System);
  expect(systemEntry!.status).toBe(MemberStatusType.Active);
  expect(systemEntry!.poolId).toBe(config.memberPoolName);

  const adminEntry = byId.get(TEST_INPUT.adminUser.id.toString('hex'));
  expect(adminEntry).toBeDefined();
  expect(adminEntry!.type).toBe(MemberType.User);
  expect(adminEntry!.status).toBe(MemberStatusType.Active);

  const memberEntry = byId.get(TEST_INPUT.memberUser.id.toString('hex'));
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
    const eciesConfig: IECIESConfig = {
      curveName: 'secp256k1',
      primaryKeyDerivationPath: "m/44'/60'/0'/0/0",
      mnemonicStrength: 256,
      symmetricAlgorithm: 'aes-256-gcm',
      symmetricKeyBits: 256,
      symmetricKeyMode: 'gcm',
    };
    eciesService = new ECIESService(eciesConfig);
    keyWrappingService = new KeyWrappingService();
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

      const service = new BrightChainMemberInitService<GuidV4Buffer>();

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

      const service = new BrightChainMemberInitService<GuidV4Buffer>();

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

  // ── RBAC initializeWithRbac() E2E ─────────────────────────────────────

  describe('initializeWithRbac – MemoryBlockStore', () => {
    it('should create all RBAC collections with round-trip queryable documents', async () => {
      const config: IBrightChainMemberInitConfig = {
        memberPoolName: 'RbacE2E-Memory',
        useMemoryStore: true,
      };
      await runRbacInitAndVerify(config);
    });

    it('should be idempotent on re-initialization', async () => {
      const config: IBrightChainMemberInitConfig = {
        memberPoolName: 'RbacE2E-Memory-Idempotent',
        useMemoryStore: true,
      };
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const input = await makeRbacInput();

      const first = await service.initializeWithRbac(config, input);
      expect(first.insertedCount).toBe(15);
      expect(first.alreadyInitialized).toBe(false);

      const second = await service.initializeWithRbac(config, input);
      expect(second.alreadyInitialized).toBe(true);
      expect(second.insertedCount).toBe(0);

      // Verify no duplicates
      const db = service.db;
      expect(await db.collection(ROLES_COLLECTION).countDocuments({})).toBe(3);
      expect(await db.collection(USERS_COLLECTION).countDocuments({})).toBe(3);
      expect(
        await db.collection(USER_ROLES_COLLECTION).countDocuments({}),
      ).toBe(3);
      expect(await db.collection(MNEMONICS_COLLECTION).countDocuments({})).toBe(
        3,
      );
    });
  });

  describe('initializeWithRbac – DiskBlockStore', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'bc-e2e-rbac-disk-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('should create all RBAC collections with round-trip queryable documents', async () => {
      const config: IBrightChainMemberInitConfig = {
        memberPoolName: 'RbacE2E-Disk',
        blockStorePath: tempDir,
        blockSize: BlockSize.Medium,
      };
      await runRbacInitAndVerify(config);
    });

    it('should be idempotent on re-initialization', async () => {
      const config: IBrightChainMemberInitConfig = {
        memberPoolName: 'RbacE2E-Disk-Idempotent',
        blockStorePath: tempDir,
        blockSize: BlockSize.Medium,
      };
      const service = new BrightChainMemberInitService<GuidV4Buffer>();
      const input = await makeRbacInput();

      const first = await service.initializeWithRbac(config, input);
      expect(first.insertedCount).toBe(15);

      const second = await service.initializeWithRbac(config, input);
      expect(second.alreadyInitialized).toBe(true);
      expect(second.insertedCount).toBe(0);
    });
  });
});
