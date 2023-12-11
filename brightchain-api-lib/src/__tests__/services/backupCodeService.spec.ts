/**
 * BrightChainBackupCodeService – Unit Tests for edge cases and error conditions.
 *
 * Feature: upstream-backup-codes
 */

import {
  BlockSize,
  EmailString,
  IBackupCodeConstants,
  initializeBrightChain,
  MemberStore,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import { ECIESService, Member } from '@digitaldefiance/node-ecies-lib';
import {
  InvalidBackupCodeError,
  KeyWrappingService,
} from '@digitaldefiance/node-express-suite';
import { BrightChainBackupCodeService } from '../../lib/services/brightChainBackupCodeService';

const TEST_CONSTANTS: IBackupCodeConstants = {
  Count: 10,
  NormalizedHexRegex: /^[a-z0-9]{32}$/,
  DisplayRegex: /^([a-z0-9]{4}-){7}[a-z0-9]{4}$/,
};

function createService() {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  const blockStore = new MemoryBlockStore(BlockSize.Medium);
  const memberStore = new MemberStore(blockStore);
  const ecies = ServiceProvider.getInstance()
    .eciesService as unknown as ECIESService;
  const service = new BrightChainBackupCodeService(
    memberStore,
    ecies,
    new KeyWrappingService(),
    TEST_CONSTANTS,
  );
  return { service, memberStore, ecies };
}

describe('BrightChainBackupCodeService Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getSystemUser throws before setSystemUser is called', async () => {
    const { service } = createService();
    // generateCodes internally calls getSystemUser()
    await expect(
      service.generateCodes(new Uint8Array(12) as unknown as Uint8Array),
    ).rejects.toThrow('System user not available');
  });

  it('getCodeCount returns 0 when no backup codes exist', async () => {
    const { service, memberStore, ecies } = createService();
    const { member: sysUser } = Member.newMember(
      ecies,
      MemberType.System,
      'sys',
      new EmailString('sys@bc.org'),
    );
    service.setSystemUser(sysUser);

    const { reference } = await memberStore.createMember({
      type: MemberType.User,
      name: 'nobackup',
      contactEmail: new EmailString('nobackup@test.com'),
    });

    const count = await service.getCodeCount(reference.id);
    expect(count).toBe(0);
  });

  it('useBackupCode throws InvalidBackupCodeError for invalid code', async () => {
    const { service, memberStore, ecies } = createService();
    const { member: sysUser } = Member.newMember(
      ecies,
      MemberType.System,
      'sys',
      new EmailString('sys@bc.org'),
    );
    service.setSystemUser(sysUser);

    const { reference } = await memberStore.createMember({
      type: MemberType.User,
      name: 'testuser',
      contactEmail: new EmailString('test@test.com'),
    });
    const memberId = reference.id as Uint8Array;

    // Create a test member with private key for getMember mock
    const { member: testMember, mnemonic: testMnemonic } = Member.newMember(
      ecies,
      MemberType.User,
      'testuser',
      new EmailString('test@test.com'),
    );

    // Encrypt the mnemonic with the system user so generateCodes can decrypt it
    const mnemonicRecovery = (
      await sysUser.encryptData(Buffer.from(testMnemonic.value ?? '', 'utf-8'))
    ).toString('hex');
    await memberStore.updateMember(memberId, {
      id: memberId,
      privateChanges: { mnemonicRecovery },
    });

    const sp = ServiceProvider.getInstance();
    jest.spyOn(memberStore, 'getMember').mockImplementation(async (id) => {
      const idHex = Buffer.from(
        sp.idProvider.toBytes(id as Uint8Array),
      ).toString('hex');
      const mHex = Buffer.from(sp.idProvider.toBytes(memberId)).toString('hex');
      if (idHex === mHex) {
        const proxy = Object.create(testMember);
        Object.defineProperty(proxy, 'id', {
          get: () => memberId,
          configurable: true,
        });
        Object.defineProperty(proxy, 'idBytes', {
          get: () => sp.idProvider.toBytes(memberId),
          configurable: true,
        });
        return proxy;
      }
      throw new Error('Unexpected getMember call');
    });

    const codes = await service.generateCodes(memberId);
    const profile = await memberStore.getMemberProfile(memberId);
    const storedCodes = profile.privateProfile!.backupCodes;

    // A completely bogus code should throw
    expect(() => service.useBackupCode(storedCodes, 'not-a-real-code')).toThrow(
      InvalidBackupCodeError,
    );

    // Verify a valid code still works
    const { newCodesArray } = service.useBackupCode(storedCodes, codes[0]);
    expect(newCodesArray.length).toBe(TEST_CONSTANTS.Count - 1);
  }, 120_000);

  it('double consumption of the same code fails on second attempt', async () => {
    const { service, memberStore, ecies } = createService();
    const { member: sysUser } = Member.newMember(
      ecies,
      MemberType.System,
      'sys',
      new EmailString('sys@bc.org'),
    );
    service.setSystemUser(sysUser);

    const { reference } = await memberStore.createMember({
      type: MemberType.User,
      name: 'testuser2',
      contactEmail: new EmailString('test2@test.com'),
    });
    const memberId = reference.id as Uint8Array;

    const { member: testMember, mnemonic: testMnemonic2 } = Member.newMember(
      ecies,
      MemberType.User,
      'testuser2',
      new EmailString('test2@test.com'),
    );

    // Encrypt the mnemonic with the system user so generateCodes can decrypt it
    const mnemonicRecovery2 = (
      await sysUser.encryptData(Buffer.from(testMnemonic2.value ?? '', 'utf-8'))
    ).toString('hex');
    await memberStore.updateMember(memberId, {
      id: memberId,
      privateChanges: { mnemonicRecovery: mnemonicRecovery2 },
    });

    const sp = ServiceProvider.getInstance();
    jest.spyOn(memberStore, 'getMember').mockImplementation(async (id) => {
      const idHex = Buffer.from(
        sp.idProvider.toBytes(id as Uint8Array),
      ).toString('hex');
      const mHex = Buffer.from(sp.idProvider.toBytes(memberId)).toString('hex');
      if (idHex === mHex) {
        const proxy = Object.create(testMember);
        Object.defineProperty(proxy, 'id', {
          get: () => memberId,
          configurable: true,
        });
        Object.defineProperty(proxy, 'idBytes', {
          get: () => sp.idProvider.toBytes(memberId),
          configurable: true,
        });
        return proxy;
      }
      throw new Error('Unexpected getMember call');
    });

    const codes = await service.generateCodes(memberId);
    const profile = await memberStore.getMemberProfile(memberId);
    const storedCodes = profile.privateProfile!.backupCodes;

    // First consumption succeeds
    const { newCodesArray } = service.useBackupCode(storedCodes, codes[0]);
    expect(newCodesArray.length).toBe(TEST_CONSTANTS.Count - 1);

    // Second consumption of the same code against the reduced array fails
    expect(() => service.useBackupCode(newCodesArray, codes[0])).toThrow(
      InvalidBackupCodeError,
    );
  }, 120_000);

  it('useBackupCode throws on empty codes array', () => {
    const { service } = createService();
    expect(() => service.useBackupCode([], 'any-code')).toThrow(
      InvalidBackupCodeError,
    );
  });
});
