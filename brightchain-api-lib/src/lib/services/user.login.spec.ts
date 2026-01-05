/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any */
import {
  AccountLockedError,
  AccountStatus,
  InvalidCredentialsError,
  MemberType,
  ModelName,
  SecureBuffer,
  SecureString,
} from '@brightchain/brightchain-lib';
import { Member } from '@digitaldefiance/ecies-lib';
import { createApplicationMock } from '../__tests__/helpers/application.mock';
import {
  makeRoleModel,
  makeUserModel,
  makeUserRoleModel,
} from '../__tests__/helpers/model-mocks.mock';
import { BackupCodeService } from './backupCode';
import { ECIESService } from './ecies';
import { EmailService } from './email';
import { KeyWrappingService } from './keyWrapping';
import { RoleService } from './role';
import { SystemUserService } from './system-user';
import { UserService } from './user';

function makeService(
  userDoc: unknown | null,
  userRoleDocs: unknown[] | null = [{ roleId: { name: MemberType.User } }],
  roleDoc: unknown | null = { name: MemberType.User },
) {
  const application = createApplicationMock(
    {
      getModel: (modelName: string) => {
        switch (modelName) {
          case ModelName.User:
            return makeUserModel(userDoc);
          case ModelName.UserRole:
            return makeUserRoleModel(userRoleDocs);
          case ModelName.Role:
            return makeRoleModel(roleDoc);
          default:
            return {
              find: jest.fn().mockReturnThis(),
              findOne: jest.fn().mockReturnThis(),
              populate: jest.fn().mockReturnThis(),
              lean: jest.fn().mockReturnThis(),
              exec: jest.fn().mockResolvedValue(null),
            };
        }
      },
    },
    {
      mnemonicHmacSecret: new SecureBuffer(Buffer.alloc(32, 1)),
      mnemonicEncryptionKey: new SecureBuffer(Buffer.alloc(32, 2)),
      mongo: { uri: 'mongodb://localhost:27017', transactionTimeout: 60000 },
    },
  );
  const roleService = new RoleService(application);
  const emailService = new EmailService(application);
  const keyWrap = new KeyWrappingService();
  const eciesService = new ECIESService();
  const backupCodeService = new BackupCodeService(
    application,
    eciesService,
    keyWrap,
    roleService,
  );
  const svc = new UserService(
    application,
    roleService,
    emailService,
    keyWrap,
    backupCodeService,
  );
  return svc;
}

describe('UserService.loginWithPassword', () => {
  const email = 'user@example.com';
  const pwd = 'A1!aaaaa';

  it('throws InvalidCredentialsError when user not found', async () => {
    const svc = makeService(null);
    await expect(svc.loginWithPassword(email, pwd)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError when user is deleted', async () => {
    const svc = makeService({ deletedAt: new Date() });
    await expect(svc.loginWithPassword(email, pwd)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('throws AccountLockedError when AdminLock', async () => {
    const svc = makeService({ accountStatus: AccountStatus.AdminLock });
    await expect(svc.loginWithPassword(email, pwd)).rejects.toBeInstanceOf(
      AccountLockedError,
    );
  });

  it('throws InvalidCredentialsError when passwordWrappedPrivateKey or mnemonicId missing', async () => {
    const svc = makeService({ accountStatus: AccountStatus.Active });
    await expect(svc.loginWithPassword(email, pwd)).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('throws when unwrap fails', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      email,
      username: 'user',
      accountStatus: AccountStatus.Active,
      passwordWrappedPrivateKey: {
        salt: '00',
        iv: '00',
        authTag: '00',
        ciphertext: '00',
        iterations: 1,
      },
      mnemonicId: '507f1f77bcf86cd799439012',
    };
    const svc = makeService(user);
    const unwrapSpy = jest

      .spyOn((svc as any).keyWrappingService, 'unwrapSecretAsync')
      .mockRejectedValueOnce(new Error('bad password'));
    await expect(svc.loginWithPassword(email, pwd)).rejects.toBeInstanceOf(
      Error,
    );
    unwrapSpy.mockRestore();
  });

  it('returns user info when password and unwrap succeed (challenge mocked)', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      email,
      username: 'user',
      accountStatus: AccountStatus.Active,
      publicKey: '00',
      passwordWrappedPrivateKey: {
        salt: '00',
        iv: '00',
        authTag: '00',
        ciphertext: '00',
        iterations: 1,
      },
      mnemonicId: '507f1f77bcf86cd799439012',
    };
    const svc = makeService(user);
    const loadWalletSpy = jest
      .spyOn(Member.prototype, 'loadWallet')
      .mockImplementation(() => {
        // do nothing, prevent mnemonic validation
      });
    const recoverMnemonicSpy = jest

      .spyOn(svc as any, 'recoverMnemonic')
      .mockReturnValue(new SecureString('mock mnemonic'));
    const unwrap = jest

      .spyOn((svc as any).keyWrappingService, 'unwrapSecretAsync')
      .mockResolvedValueOnce(new SecureBuffer(Buffer.alloc(32, 1)));
    const enc = jest
      .spyOn(Member.prototype as any, 'encryptData')
      .mockImplementation((...args: unknown[]) => args[0] as Buffer);
    const dec = jest
      .spyOn(Member.prototype as any, 'decryptData')
      .mockImplementation((...args: unknown[]) => args[0] as Buffer);
    const sys = jest

      .spyOn(SystemUserService as any, 'getSystemUser')
      .mockReturnValue({ sign: () => Buffer.alloc(64, 0), verify: () => true });

    const res = await svc.loginWithPassword(email, pwd);
    expect(res.userDoc).toBe(user);
    expect(res.userMember).toBeDefined();
    expect(res.adminMember).toBeDefined();
    loadWalletSpy.mockRestore();
    recoverMnemonicSpy.mockRestore();
    unwrap.mockRestore();
    enc.mockRestore();
    dec.mockRestore();
    sys.mockRestore();
  });
});

describe('UserService.loginWithMnemonic', () => {
  const mnemonic = new SecureString(
    'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu',
  );

  it('throws InvalidCredentialsError when user not found', async () => {
    const svc = makeService(null);
    await expect(
      svc.loginWithMnemonic('user', mnemonic),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('throws status error when PendingEmailVerification', async () => {
    const svc = makeService({
      accountStatus: AccountStatus.PendingEmailVerification,
    });
    await expect(svc.loginWithMnemonic('user', mnemonic)).rejects.toMatchObject(
      {
        name: expect.stringMatching(
          /PendingEmailVerificationError|AccountStatusError/,
        ),
      },
    );
  });

  it('returns user info when mnemonic flow succeeds (challenge mocked)', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      username: 'user',
      accountStatus: AccountStatus.Active,
      mnemonicId: '507f1f77bcf86cd799439012',
      publicKey: '00',
      deletedAt: undefined,
    };
    const svc = makeService(user);
    const challenge = jest

      .spyOn(svc as any, 'challengeUserWithMnemonic')
      .mockResolvedValueOnce({
        userMember: { id: 'u' },
        adminMember: { id: 'a' },
      });
    const res = await svc.loginWithMnemonic('user', mnemonic);
    expect(res.userDoc).toBe(user);
    expect(res.userMember).toEqual({ id: 'u' });
    expect(res.adminMember).toEqual({ id: 'a' });
    challenge.mockRestore();
  });
});
