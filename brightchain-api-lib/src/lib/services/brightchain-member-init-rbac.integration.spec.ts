/**
 * @fileoverview Integration tests for BrightChainMemberInitService.initializeWithRbac().
 *
 * Verifies that the full RBAC init flow:
 *  1. Creates member_index entries (same as initialize())
 *  2. Creates role documents in the 'roles' collection
 *  3. Creates user documents in the 'users' collection
 *  4. Creates user-role junction documents in the 'user-roles' collection
 *  5. Creates mnemonic documents in the 'mnemonics' collection
 *  6. All documents can be queried back by _id and by field values
 *  7. Idempotency — second call does not duplicate documents
 */

import {
  type IBrightChainRbacInitInput,
  type IBrightChainUserInitEntry,
  type IPasswordWrappedPrivateKey,
  initializeBrightChain,
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
import { KeyWrappingService } from '@digitaldefiance/node-express-suite';
import type { IBackupCode } from '@digitaldefiance/suite-core-lib';
import { createHmac } from 'crypto';
import { MNEMONICS_COLLECTION } from '../interfaces/storage/mnemonicSchema';
import { ROLES_COLLECTION } from '../interfaces/storage/roleSchema';
import { USER_ROLES_COLLECTION } from '../interfaces/storage/userRoleSchema';
import { USERS_COLLECTION } from '../interfaces/storage/userSchema';
import {
  BrightChainMemberInitService,
  type IBrightChainMemberInitConfig,
} from './brightchain-member-init.service';

// ─── Test fixtures ────────────────────────────────────────────────────────────

/** Valid v4 GUID short hex IDs (version nibble = 4) */
const SYSTEM_ID = '15e070c81ab3446e8caa787d30d1d1d6';
const ADMIN_ID = '6aba638bb9b6432b9c79a339e3776d69';
const MEMBER_ID = '586fab6e1d9b4710be7b95dda1e051a1';

const SYSTEM_FULL_ID = 'b40c689a-4819-4a2c-b303-085bc0d49954';
const ADMIN_FULL_ID = '56bdd544-91d4-4f8c-90a8-d4a4bda3e9f9';
const MEMBER_FULL_ID = '83aa5069-9d38-4920-938d-5f23c51da297';

const SYSTEM_ROLE_ID = '22e235f1-1364-4723-b532-51bd4f540200';
const ADMIN_ROLE_ID = 'fe76ff84-8355-4ef3-bc36-e61be02daf81';
const MEMBER_ROLE_ID = '8ee7c136-b01f-41e9-a444-825f84fe59f9';

const SYSTEM_USER_ROLE_ID = '43f3f97d-6b10-4065-a0c9-aa826ed04f9f';
const ADMIN_USER_ROLE_ID = 'f6602523-f9b3-4d9d-8bcc-fe2cc6003a58';
const MEMBER_USER_ROLE_ID = 'cefa30ae-8f17-47b0-8319-2395b26b6a23';

const SYSTEM_MNEMONIC_DOC_ID = 'bd4e724f-743e-40a4-8770-6b04598cd156';
const ADMIN_MNEMONIC_DOC_ID = '3b4dfdc6-1699-40ca-b29d-9d7203f15fa7';
const MEMBER_MNEMONIC_DOC_ID = 'a01197d6-82fa-4053-a030-1ab1b6f7b1fc';

const VALID_POOL = 'RbacIntegrationPool';
const HMAC_SECRET = Buffer.from('a'.repeat(64), 'hex');

let eciesService: ECIESService;
let keyWrappingService: KeyWrappingService;
const guidProvider = new GuidV4Provider();

function makeMemoryConfig(): IBrightChainMemberInitConfig {
  return { memberPoolName: VALID_POOL, useMemoryStore: true };
}

/**
 * Build a full IBrightChainUserInitEntry with real ECIES key pairs.
 */
function buildEntry(
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
): { entry: IBrightChainUserInitEntry<GuidV4Buffer>; mnemonic: SecureString } {
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

  // Use empty backup codes for test simplicity — schema allows any array
  const backupCodes: IBackupCode[] = [];

  member.dispose();

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
      backupCodes,
      roleId: guidProvider.idFromString(roleId),
      userRoleId: guidProvider.idFromString(userRoleId),
      mnemonicDocId: guidProvider.idFromString(mnemonicDocId),
      roleName,
      roleAdmin,
      roleMember,
      roleSystem,
    },
    mnemonic,
  };
}

function makeRbacInput(): IBrightChainRbacInitInput<GuidV4Buffer> {
  const system = buildEntry(
    SYSTEM_ID,
    SYSTEM_FULL_ID,
    MemberType.System,
    'system',
    'system@test.local',
    SYSTEM_ROLE_ID,
    SYSTEM_USER_ROLE_ID,
    SYSTEM_MNEMONIC_DOC_ID,
    'System',
    true,
    true,
    true,
  );
  const admin = buildEntry(
    ADMIN_ID,
    ADMIN_FULL_ID,
    MemberType.User,
    'admin',
    'admin@test.local',
    ADMIN_ROLE_ID,
    ADMIN_USER_ROLE_ID,
    ADMIN_MNEMONIC_DOC_ID,
    'Admin',
    true,
    true,
    false,
  );
  const member = buildEntry(
    MEMBER_ID,
    MEMBER_FULL_ID,
    MemberType.User,
    'member',
    'member@test.local',
    MEMBER_ROLE_ID,
    MEMBER_USER_ROLE_ID,
    MEMBER_MNEMONIC_DOC_ID,
    'Member',
    false,
    true,
    false,
  );
  return {
    systemUser: system.entry,
    adminUser: admin.entry,
    memberUser: member.entry,
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

jest.setTimeout(30000);

describe('BrightChainMemberInitService.initializeWithRbac — integration', () => {
  beforeAll(() => {
    initializeBrightChain();
    const config: IECIESConfig = {
      curveName: 'secp256k1',
      primaryKeyDerivationPath: "m/44'/60'/0'/0/0",
      mnemonicStrength: 256,
      symmetricAlgorithm: 'aes-256-gcm',
      symmetricKeyBits: 256,
      symmetricKeyMode: 'gcm',
    };
    eciesService = new ECIESService(config);
    keyWrappingService = new KeyWrappingService();
  });

  afterAll(() => {
    resetInitialization();
  });

  it('creates all four RBAC collections plus member_index', async () => {
    const service = new BrightChainMemberInitService();
    const result = await service.initializeWithRbac(
      makeMemoryConfig(),
      makeRbacInput(),
    );

    expect(result.alreadyInitialized).toBe(false);
    // 3 member_index + 3 roles + 3 users + 3 user-roles + 3 mnemonics = 15
    expect(result.insertedCount).toBe(15);
    expect(result.db).toBeInstanceOf(BrightChainDb);
  });

  // ── Roles collection ──────────────────────────────────────────────────

  describe('roles collection', () => {
    let service: BrightChainMemberInitService;

    beforeAll(async () => {
      service = new BrightChainMemberInitService();
      await service.initializeWithRbac(makeMemoryConfig(), makeRbacInput());
    });

    it('contains exactly 3 role documents', async () => {
      const roles =
        service.db.collection<Record<string, unknown>>(ROLES_COLLECTION);
      const docs = await roles.find({}).toArray();
      expect(docs).toHaveLength(3);
    });

    it('System role has admin=true, member=true, system=true', async () => {
      const roles =
        service.db.collection<Record<string, unknown>>(ROLES_COLLECTION);
      const systemRole = await roles.findOne({ _id: SYSTEM_ROLE_ID });
      expect(systemRole).not.toBeNull();
      expect(systemRole?.['name']).toBe('System');
      expect(systemRole?.['admin']).toBe(true);
      expect(systemRole?.['member']).toBe(true);
      expect(systemRole?.['system']).toBe(true);
      expect(systemRole?.['child']).toBe(false);
    });

    it('Admin role has admin=true, member=true, system=false', async () => {
      const roles =
        service.db.collection<Record<string, unknown>>(ROLES_COLLECTION);
      const adminRole = await roles.findOne({ _id: ADMIN_ROLE_ID });
      expect(adminRole).not.toBeNull();
      expect(adminRole?.['name']).toBe('Admin');
      expect(adminRole?.['admin']).toBe(true);
      expect(adminRole?.['member']).toBe(true);
      expect(adminRole?.['system']).toBe(false);
    });

    it('Member role has admin=false, member=true, system=false', async () => {
      const roles =
        service.db.collection<Record<string, unknown>>(ROLES_COLLECTION);
      const memberRole = await roles.findOne({ _id: MEMBER_ROLE_ID });
      expect(memberRole).not.toBeNull();
      expect(memberRole?.['name']).toBe('Member');
      expect(memberRole?.['admin']).toBe(false);
      expect(memberRole?.['member']).toBe(true);
      expect(memberRole?.['system']).toBe(false);
    });

    it('all roles have timestamps and createdBy=systemUserId', async () => {
      const roles =
        service.db.collection<Record<string, unknown>>(ROLES_COLLECTION);
      const docs = await roles.find({}).toArray();
      for (const doc of docs) {
        expect(doc['createdBy']).toBe(SYSTEM_FULL_ID);
        expect(doc['updatedBy']).toBe(SYSTEM_FULL_ID);
        expect(typeof doc['createdAt']).toBe('string');
        expect(typeof doc['updatedAt']).toBe('string');
      }
    });
  });

  // ── Users collection ──────────────────────────────────────────────────

  describe('users collection', () => {
    let service: BrightChainMemberInitService;

    beforeAll(async () => {
      service = new BrightChainMemberInitService();
      await service.initializeWithRbac(makeMemoryConfig(), makeRbacInput());
    });

    it('contains exactly 3 user documents', async () => {
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);
      const docs = await users.find({}).toArray();
      expect(docs).toHaveLength(3);
    });

    it('system user has correct username and email', async () => {
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);
      const systemUser = await users.findOne({ _id: SYSTEM_FULL_ID });
      expect(systemUser).not.toBeNull();
      expect(systemUser?.['username']).toBe('system');
      expect(systemUser?.['email']).toBe('system@test.local');
      expect(systemUser?.['accountStatus']).toBe('Active');
      expect(systemUser?.['emailVerified']).toBe(true);
      expect(systemUser?.['directChallenge']).toBe(true);
    });

    it('admin user has correct username and email', async () => {
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);
      const adminUser = await users.findOne({ _id: ADMIN_FULL_ID });
      expect(adminUser).not.toBeNull();
      expect(adminUser?.['username']).toBe('admin');
      expect(adminUser?.['email']).toBe('admin@test.local');
    });

    it('member user has correct username and email', async () => {
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);
      const memberUser = await users.findOne({ _id: MEMBER_FULL_ID });
      expect(memberUser).not.toBeNull();
      expect(memberUser?.['username']).toBe('member');
      expect(memberUser?.['email']).toBe('member@test.local');
    });

    it('all users have publicKey, mnemonicRecovery, and timestamps', async () => {
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);
      const docs = await users.find({}).toArray();
      for (const doc of docs) {
        expect(typeof doc['publicKey']).toBe('string');
        expect((doc['publicKey'] as string).length).toBeGreaterThan(0);
        expect(typeof doc['mnemonicRecovery']).toBe('string');
        expect((doc['mnemonicRecovery'] as string).length).toBeGreaterThan(0);
        expect(doc['createdBy']).toBe(SYSTEM_FULL_ID);
        expect(typeof doc['createdAt']).toBe('string');
      }
    });

    it('system user has passwordWrappedPrivateKey with expected fields', async () => {
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);
      const systemUser = await users.findOne({ _id: SYSTEM_FULL_ID });
      const wrapped = systemUser?.['passwordWrappedPrivateKey'] as Record<
        string,
        unknown
      > | null;
      expect(wrapped).not.toBeNull();
      if (wrapped) {
        expect(typeof wrapped['salt']).toBe('string');
        expect(typeof wrapped['iv']).toBe('string');
        expect(typeof wrapped['authTag']).toBe('string');
        expect(typeof wrapped['ciphertext']).toBe('string');
        expect(typeof wrapped['iterations']).toBe('number');
      }
    });
  });

  // ── User-roles collection ─────────────────────────────────────────────

  describe('user-roles collection', () => {
    let service: BrightChainMemberInitService;

    beforeAll(async () => {
      service = new BrightChainMemberInitService();
      await service.initializeWithRbac(makeMemoryConfig(), makeRbacInput());
    });

    it('contains exactly 3 user-role junction documents', async () => {
      const userRoles = service.db.collection<Record<string, unknown>>(
        USER_ROLES_COLLECTION,
      );
      const docs = await userRoles.find({}).toArray();
      expect(docs).toHaveLength(3);
    });

    it('system user-role links system user to system role', async () => {
      const userRoles = service.db.collection<Record<string, unknown>>(
        USER_ROLES_COLLECTION,
      );
      const doc = await userRoles.findOne({ _id: SYSTEM_USER_ROLE_ID });
      expect(doc).not.toBeNull();
      expect(doc?.['userId']).toBe(SYSTEM_FULL_ID);
      expect(doc?.['roleId']).toBe(SYSTEM_ROLE_ID);
    });

    it('admin user-role links admin user to admin role', async () => {
      const userRoles = service.db.collection<Record<string, unknown>>(
        USER_ROLES_COLLECTION,
      );
      const doc = await userRoles.findOne({ _id: ADMIN_USER_ROLE_ID });
      expect(doc).not.toBeNull();
      expect(doc?.['userId']).toBe(ADMIN_FULL_ID);
      expect(doc?.['roleId']).toBe(ADMIN_ROLE_ID);
    });

    it('member user-role links member user to member role', async () => {
      const userRoles = service.db.collection<Record<string, unknown>>(
        USER_ROLES_COLLECTION,
      );
      const doc = await userRoles.findOne({ _id: MEMBER_USER_ROLE_ID });
      expect(doc).not.toBeNull();
      expect(doc?.['userId']).toBe(MEMBER_FULL_ID);
      expect(doc?.['roleId']).toBe(MEMBER_ROLE_ID);
    });
  });

  // ── Mnemonics collection ──────────────────────────────────────────────

  describe('mnemonics collection', () => {
    let service: BrightChainMemberInitService;

    beforeAll(async () => {
      service = new BrightChainMemberInitService();
      await service.initializeWithRbac(makeMemoryConfig(), makeRbacInput());
    });

    it('contains exactly 3 mnemonic documents', async () => {
      const mnemonics =
        service.db.collection<Record<string, unknown>>(MNEMONICS_COLLECTION);
      const docs = await mnemonics.find({}).toArray();
      expect(docs).toHaveLength(3);
    });

    it('each mnemonic document has a non-empty hmac field', async () => {
      const mnemonics =
        service.db.collection<Record<string, unknown>>(MNEMONICS_COLLECTION);
      const docs = await mnemonics.find({}).toArray();
      for (const doc of docs) {
        expect(typeof doc['hmac']).toBe('string');
        expect((doc['hmac'] as string).length).toBe(64); // SHA-256 hex
      }
    });

    it('mnemonic documents are queryable by _id', async () => {
      const mnemonics =
        service.db.collection<Record<string, unknown>>(MNEMONICS_COLLECTION);
      const systemMnemonic = await mnemonics.findOne({
        _id: SYSTEM_MNEMONIC_DOC_ID,
      });
      const adminMnemonic = await mnemonics.findOne({
        _id: ADMIN_MNEMONIC_DOC_ID,
      });
      const memberMnemonic = await mnemonics.findOne({
        _id: MEMBER_MNEMONIC_DOC_ID,
      });
      expect(systemMnemonic).not.toBeNull();
      expect(adminMnemonic).not.toBeNull();
      expect(memberMnemonic).not.toBeNull();
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────

  describe('idempotency', () => {
    it('second call does not duplicate any documents', async () => {
      const service = new BrightChainMemberInitService();
      const config = makeMemoryConfig();
      const input = makeRbacInput();

      const first = await service.initializeWithRbac(config, input);
      expect(first.insertedCount).toBe(15);

      const second = await service.initializeWithRbac(config, input);
      expect(second.alreadyInitialized).toBe(true);
      expect(second.insertedCount).toBe(0);

      // Verify counts haven't changed
      const roles =
        service.db.collection<Record<string, unknown>>(ROLES_COLLECTION);
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);
      const userRoles = service.db.collection<Record<string, unknown>>(
        USER_ROLES_COLLECTION,
      );
      const mnemonics =
        service.db.collection<Record<string, unknown>>(MNEMONICS_COLLECTION);

      expect(await roles.countDocuments({})).toBe(3);
      expect(await users.countDocuments({})).toBe(3);
      expect(await userRoles.countDocuments({})).toBe(3);
      expect(await mnemonics.countDocuments({})).toBe(3);
    });
  });

  // ── Cross-collection queries (simulating controller lookups) ──────────

  describe('cross-collection queries', () => {
    let service: BrightChainMemberInitService;

    beforeAll(async () => {
      service = new BrightChainMemberInitService();
      await service.initializeWithRbac(makeMemoryConfig(), makeRbacInput());
    });

    it('can find a user by username and resolve their role', async () => {
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);
      const userRoles = service.db.collection<Record<string, unknown>>(
        USER_ROLES_COLLECTION,
      );
      const roles =
        service.db.collection<Record<string, unknown>>(ROLES_COLLECTION);

      // Step 1: Find user by username
      const adminUser = await users.findOne({ username: 'admin' });
      expect(adminUser).not.toBeNull();

      // Step 2: Find user-role junction by userId
      const adminUserRole = await userRoles.findOne({
        userId: adminUser?.['_id'],
      });
      expect(adminUserRole).not.toBeNull();

      // Step 3: Find role by roleId
      const adminRole = await roles.findOne({ _id: adminUserRole?.['roleId'] });
      expect(adminRole).not.toBeNull();
      expect(adminRole?.['name']).toBe('Admin');
      expect(adminRole?.['admin']).toBe(true);
    });

    it('can find all users with a specific role name', async () => {
      const roles =
        service.db.collection<Record<string, unknown>>(ROLES_COLLECTION);
      const userRoles = service.db.collection<Record<string, unknown>>(
        USER_ROLES_COLLECTION,
      );
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);

      // Find the Member role
      const memberRole = await roles.findOne({ name: 'Member' });
      expect(memberRole).not.toBeNull();

      // Find all user-role junctions for this role
      const junctions = await userRoles
        .find({ roleId: memberRole?.['_id'] })
        .toArray();
      expect(junctions).toHaveLength(1);

      // Resolve the user
      const user = await users.findOne({ _id: junctions[0]['userId'] });
      expect(user).not.toBeNull();
      expect(user?.['username']).toBe('member');
    });

    it('can look up a user mnemonic document from the user record', async () => {
      const users =
        service.db.collection<Record<string, unknown>>(USERS_COLLECTION);
      const mnemonics =
        service.db.collection<Record<string, unknown>>(MNEMONICS_COLLECTION);

      const systemUser = await users.findOne({ username: 'system' });
      expect(systemUser).not.toBeNull();

      const mnemonicDoc = await mnemonics.findOne({
        _id: systemUser?.['mnemonicId'],
      });
      expect(mnemonicDoc).not.toBeNull();
      expect(typeof mnemonicDoc?.['hmac']).toBe('string');
    });
  });
});
