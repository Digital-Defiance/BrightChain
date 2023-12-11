/**
 * BrightChainBackupCodeService – Property-Based Tests.
 *
 * Feature: upstream-backup-codes
 *
 * Uses fast-check to validate backup-code-related properties for the
 * BrightChainBackupCodeService. This file covers Properties 1–6.
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
  BackupCode,
  KeyWrappingService,
} from '@digitaldefiance/node-express-suite';
import * as fc from 'fast-check';
import { BrightChainBackupCodeService } from '../../lib/services/brightChainBackupCodeService';

const usernameArb: fc.Arbitrary<string> =
  fc.stringMatching(/^[a-z0-9_-]{3,20}$/);

const emailArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{3,12}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
  )
  .map(([local, domain]) => `${local}@${domain}.com`);

const TEST_CONSTANTS: IBackupCodeConstants = {
  Count: 10,
  NormalizedHexRegex: /^[a-z0-9]{32}$/,
  DisplayRegex: /^([a-z0-9]{4}-){7}[a-z0-9]{4}$/,
};

async function setup(username: string, email: string) {
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
  const { member: sysUser } = Member.newMember(
    ecies,
    MemberType.System,
    'system-user',
    new EmailString('sys@bc.org'),
  );
  service.setSystemUser(sysUser);
  const { reference } = await memberStore.createMember({
    type: MemberType.User,
    name: username,
    contactEmail: new EmailString(email),
  });
  const memberId = reference.id as Uint8Array;
  const { member: testMember, mnemonic: testMnemonic } = Member.newMember(
    ecies,
    MemberType.User,
    username,
    new EmailString(email),
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
    const idHex = Buffer.from(sp.idProvider.toBytes(id as Uint8Array)).toString(
      'hex',
    );
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
    throw new Error('Unexpected getMember call for id: ' + idHex);
  });
  return { service, memberStore, memberId };
}

describe('BrightChainBackupCodeService Property-Based Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property 1: Generation invariant
   */
  describe('Property 1: Generation invariant', () => {
    it('generateCodes returns Count distinct codes matching DisplayRegex, getCodeCount returns Count', async () => {
      await fc.assert(
        fc.asyncProperty(usernameArb, emailArb, async (username, email) => {
          const { service, memberId } = await setup(username, email);
          const codes = await service.generateCodes(memberId);
          expect(codes.length).toBe(TEST_CONSTANTS.Count);
          expect(new Set(codes).size).toBe(codes.length);
          for (const code of codes) {
            expect(code).toMatch(TEST_CONSTANTS.DisplayRegex);
          }
          expect(await service.getCodeCount(memberId)).toBe(
            TEST_CONSTANTS.Count,
          );
        }),
        { numRuns: 20 },
      );
    }, 600_000);
  });

  /**
   * Property 2: Encrypt-then-validate round-trip
   */
  describe('Property 2: Encrypt-then-validate round-trip', () => {
    it('each generated plaintext validates against stored codes; random strings do not', async () => {
      const randomNonCodeArb = fc.stringMatching(/^[A-Z]{40}$/);
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          randomNonCodeArb,
          async (username, email, randomStr) => {
            const { service, memberStore, memberId } = await setup(
              username,
              email,
            );
            const plaintextCodes = await service.generateCodes(memberId);
            const profile = await memberStore.getMemberProfile(memberId);
            const storedCodes = profile.privateProfile!.backupCodes;
            for (const code of plaintextCodes) {
              expect(BackupCode.validateBackupCode(storedCodes, code)).toBe(
                true,
              );
            }
            if (!plaintextCodes.includes(randomStr)) {
              expect(
                BackupCode.validateBackupCode(storedCodes, randomStr),
              ).toBe(false);
            }
          },
        ),
        { numRuns: 20 },
      );
    }, 600_000);
  });

  /**
   * Property 3: Consumption removes exactly one code
   */
  describe('Property 3: Consumption removes exactly one code', () => {
    it('useBackupCode removes exactly the matched code, leaving N-1', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          fc.nat({ max: TEST_CONSTANTS.Count - 1 }),
          async (username, email, codeIndex) => {
            const { service, memberStore, memberId } = await setup(
              username,
              email,
            );
            const plaintextCodes = await service.generateCodes(memberId);
            const N = plaintextCodes.length;
            const profile = await memberStore.getMemberProfile(memberId);
            const storedCodes = profile.privateProfile!.backupCodes;
            const chosenCode = plaintextCodes[codeIndex];
            const { newCodesArray, code: consumedCode } = service.useBackupCode(
              storedCodes,
              chosenCode,
            );
            expect(newCodesArray.length).toBe(N - 1);
            const remainingChecksums = newCodesArray.map((c) => c.checksum);
            expect(remainingChecksums).not.toContain(consumedCode.checksum);
            const originalChecksums = storedCodes.map((c) => c.checksum);
            const expectedRemaining = originalChecksums.filter(
              (cs) => cs !== consumedCode.checksum,
            );
            expect(remainingChecksums.sort()).toEqual(expectedRemaining.sort());
          },
        ),
        { numRuns: 20 },
      );
    }, 600_000);
  });

  /**
   * Property 4: Encrypt-then-recover round-trip
   */
  describe('Property 4: Encrypt-then-recover round-trip', () => {
    it('recovering with any valid code yields the original public key', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          fc.nat({ max: TEST_CONSTANTS.Count - 1 }),
          async (username, email, codeIndex) => {
            const { service, memberStore, memberId } = await setup(
              username,
              email,
            );
            const originalMember = await memberStore.getMember(memberId);
            const originalPubKeyHex = Buffer.from(
              originalMember.publicKey,
            ).toString('hex');
            const plaintextCodes = await service.generateCodes(memberId);
            const chosenCode = plaintextCodes[codeIndex];
            const { user: recoveredUser, codeCount } =
              await service.recoverKeyWithBackupCode(memberId, chosenCode);
            const recoveredPubKeyHex = Buffer.from(
              recoveredUser.publicKey,
            ).toString('hex');
            expect(recoveredPubKeyHex).toBe(originalPubKeyHex);
            expect(codeCount).toBe(TEST_CONSTANTS.Count - 1);
          },
        ),
        { numRuns: 20 },
      );
    }, 600_000);
  });

  /**
   * Property 5: Regeneration invalidates old codes
   */
  describe('Property 5: Regeneration invalidates old codes', () => {
    it('regenerateCodes returns Count new codes; old codes fail validation', async () => {
      await fc.assert(
        fc.asyncProperty(usernameArb, emailArb, async (username, email) => {
          const { service, memberStore, memberId } = await setup(
            username,
            email,
          );
          const oldCodes = await service.generateCodes(memberId);
          expect(oldCodes.length).toBe(TEST_CONSTANTS.Count);
          const newCodes = await service.regenerateCodes(memberId);
          expect(newCodes.length).toBe(TEST_CONSTANTS.Count);
          expect(new Set(newCodes).size).toBe(newCodes.length);
          for (const code of newCodes) {
            expect(code).toMatch(TEST_CONSTANTS.DisplayRegex);
          }
          const profile = await memberStore.getMemberProfile(memberId);
          const storedCodes = profile.privateProfile!.backupCodes;
          for (const oldCode of oldCodes) {
            expect(BackupCode.validateBackupCode(storedCodes, oldCode)).toBe(
              false,
            );
          }
          for (const newCode of newCodes) {
            expect(BackupCode.validateBackupCode(storedCodes, newCode)).toBe(
              true,
            );
          }
        }),
        { numRuns: 20 },
      );
    }, 600_000);
  });

  /**
   * Property 6: Key rotation preserves recoverability
   */
  describe('Property 6: Key rotation preserves recoverability', () => {
    it('after rewrap, codes still validate and recover the original key', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArb,
          emailArb,
          fc.nat({ max: TEST_CONSTANTS.Count - 1 }),
          async (username, email, codeIndex) => {
            const { service, memberStore, memberId } = await setup(
              username,
              email,
            );
            const originalMember = await memberStore.getMember(memberId);
            const originalPubKeyHex = Buffer.from(
              originalMember.publicKey,
            ).toString('hex');
            const plaintextCodes = await service.generateCodes(memberId);
            const ecies = ServiceProvider.getInstance()
              .eciesService as unknown as ECIESService;
            const { member: newSysUser } = Member.newMember(
              ecies,
              MemberType.System,
              'new-system-user',
              new EmailString('newsys@bc.org'),
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const oldSysUser = (service as any).systemUser;
            const rewrapped = await service.rewrapAllUsersBackupCodes(
              oldSysUser,
              newSysUser,
            );
            expect(rewrapped).toBeGreaterThanOrEqual(1);
            service.setSystemUser(newSysUser);
            const profile = await memberStore.getMemberProfile(memberId);
            const storedCodes = profile.privateProfile!.backupCodes;
            for (const code of plaintextCodes) {
              expect(BackupCode.validateBackupCode(storedCodes, code)).toBe(
                true,
              );
            }
            const chosenCode = plaintextCodes[codeIndex];
            const { user: recoveredUser, codeCount } =
              await service.recoverKeyWithBackupCode(memberId, chosenCode);
            const recoveredPubKeyHex = Buffer.from(
              recoveredUser.publicKey,
            ).toString('hex');
            expect(recoveredPubKeyHex).toBe(originalPubKeyHex);
            expect(codeCount).toBe(TEST_CONSTANTS.Count - 1);
          },
        ),
        { numRuns: 20 },
      );
    }, 600_000);
  });
});
