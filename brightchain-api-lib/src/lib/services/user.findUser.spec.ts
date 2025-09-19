import {
  AccountLockedError,
  AccountStatus,
  AccountStatusError,
  InvalidEmailError,
  InvalidUsernameError,
  SecureBuffer,
  UsernameOrEmailRequiredError,
} from '@brightchain/brightchain-lib';
import { createApplicationMock } from '../__tests__/helpers/application.mock';
import { BackupCodeService } from './backupCode';
import { ECIESService } from './ecies';
import { EmailService } from './email';
import { KeyWrappingService } from './keyWrapping';
import { RoleService } from './role';
import { UserService } from './user';

function makeService(userDoc: unknown | null) {
  // Mock UserModel.findOne().collation().session() chaining
  const makeQuery = () => ({
    collation: () => ({
      session: async () => userDoc,
    }),
    session: async () => userDoc,
  });

  const mockUserModel = {
    findOne: () => makeQuery(),
  };

  const application = createApplicationMock(
    {
      getModel: () => mockUserModel,
    },
    {
      // Provide required secrets for MnemonicService constructed by UserService
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

describe('UserService.findUser', () => {
  it('throws when neither email nor username provided', async () => {
    const svc = makeService(null);
    await expect(svc.findUser(undefined, undefined)).rejects.toBeInstanceOf(
      UsernameOrEmailRequiredError,
    );
  });

  it('throws InvalidCredentialsError when user not found (email path)', async () => {
    const svc = makeService(null);
    await expect(svc.findUser('user@example.com')).rejects.toBeInstanceOf(
      InvalidEmailError,
    );
  });

  it('throws InvalidEmailError when user is deleted', async () => {
    const svc = makeService({ deletedAt: new Date() });
    await expect(svc.findUser('user@example.com')).rejects.toBeInstanceOf(
      InvalidEmailError,
    );
  });

  it('throws InvalidEmailError when user is deleted', async () => {
    const svc = makeService({ deletedAt: new Date() });
    await expect(svc.findUser(undefined, 'user')).rejects.toBeInstanceOf(
      InvalidUsernameError,
    );
  });

  it('returns doc when account is Active', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      username: 'user',
      email: 'user@example.com',
      accountStatus: AccountStatus.Active,
    };
    const svc = makeService(user);
    const res = await svc.findUser(undefined, 'user');
    expect(res).toBe(user);
  });

  it('throws AccountLockedError when AdminLock', async () => {
    const svc = makeService({ accountStatus: AccountStatus.AdminLock });
    await expect(svc.findUser('user@example.com')).rejects.toBeInstanceOf(
      AccountLockedError,
    );
  });

  it('throws a status error when PendingEmailVerification', async () => {
    const svc = makeService({
      accountStatus: AccountStatus.PendingEmailVerification,
    });
    await expect(svc.findUser('user@example.com')).rejects.toMatchObject({
      name: expect.stringMatching(
        /PendingEmailVerificationError|AccountStatusError/,
      ),
    });
  });

  it('throws AccountStatusError for unknown status', async () => {
    const svc = makeService({ accountStatus: 'Weird' });
    await expect(svc.findUser('user@example.com')).rejects.toBeInstanceOf(
      AccountStatusError,
    );
  });
});
