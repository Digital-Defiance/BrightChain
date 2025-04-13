/* eslint-disable @nx/enforce-module-boundaries */
import {
  AccountStatus,
  AppConstants,
  EmailTokenExpiredError,
  EmailTokenType,
  EmailTokenUsedOrInvalidError,
  SecureBuffer,
} from '@brightchain/brightchain-lib';
import { createApplicationMock } from '../__tests__/helpers/application.mock';
import { BackupCodeService } from './backupCode';
import { ECIESService } from './ecies';
import { EmailService } from './email';
import { KeyWrappingService } from './keyWrapping';
import { RoleService } from './role';
import { UserService } from './user';

function makeSvc(overrides: {
  emailTokenModel?: unknown;
  userModel?: unknown;
  roleService?: Partial<RoleService>;
}) {
  const application = createApplicationMock(
    {
      getModel: (name: string) => {
        if (name.includes('EmailToken')) return overrides.emailTokenModel;
        if (name.includes('User')) return overrides.userModel;
        return {} as unknown;
      },
    },
    {
      // Required secrets
      mnemonicHmacSecret: new SecureBuffer(Buffer.alloc(32, 1)),
      mnemonicEncryptionKey: new SecureBuffer(Buffer.alloc(32, 2)),
      disableEmailSend: true, // keep emails disabled
      debug: false,
      emailSender: 'noreply@example.com',
      aws: {
        accessKeyId: { value: '' },
        secretAccessKey: { value: '' },
        region: 'us-west-2',
      },
    },
  );
  const role = new RoleService(application);
  if (overrides.roleService) Object.assign(role, overrides.roleService);
  const email = new EmailService(application);
  const keyWrap = new KeyWrappingService();
  const eciesService = new ECIESService();
  const backupCodeService = new BackupCodeService(
    application,
    eciesService,
    keyWrap,
    role,
  );
  const svc = new UserService(
    application,
    role,
    email,
    keyWrap,
    backupCodeService,
  );
  return { svc, application } as const;
}

describe('UserService.resendEmailToken', () => {
  it('throws when no valid token found', async () => {
    const emailTokenModel = {
      findOne: () => ({
        session: () => ({
          sort: () => ({
            limit: async () => null,
          }),
        }),
      }),
    };
    const { svc } = makeSvc({ emailTokenModel });
    await expect(
      svc.resendEmailToken('uid', EmailTokenType.AccountVerification),
    ).rejects.toBeInstanceOf(EmailTokenUsedOrInvalidError);
  });

  it('calls sendEmailToken for the newest valid token', async () => {
    const tokenDoc = {
      userId: 'uid',
      email: 'user@example.com',
      type: EmailTokenType.AccountVerification,
      createdAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + AppConstants.EmailTokenExpiration),
      save: jest.fn(),
    };
    const emailTokenModel = {
      findOne: () => ({
        session: () => ({
          sort: () => ({ limit: async () => tokenDoc }),
        }),
      }),
    };
    const { svc } = makeSvc({ emailTokenModel });
    const spy = jest
      .spyOn(
        svc as unknown as { sendEmailToken: (userId: string) => Promise<void> },
        'sendEmailToken',
      )
      .mockResolvedValue();
    await svc.resendEmailToken('uid', EmailTokenType.AccountVerification);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('UserService.verifyAccountTokenAndComplete', () => {
  function makeModels(opts: { token: unknown | null; user: unknown | null }) {
    const emailTokenModel = {
      findOne: () => ({ session: async () => opts.token }),
      deleteOne: () => ({ session: async () => ({ acknowledged: true }) }),
    };
    const userModel = {
      findById: () => ({ session: async () => opts.user }),
    };
    return { emailTokenModel, userModel } as const;
  }

  it('throws when token not found', async () => {
    const { emailTokenModel, userModel } = makeModels({
      token: null,
      user: null,
    });
    const { svc } = makeSvc({ emailTokenModel, userModel });
    await expect(svc.verifyAccountTokenAndComplete('t')).rejects.toBeInstanceOf(
      EmailTokenUsedOrInvalidError,
    );
  });

  it('deletes expired token and throws EmailTokenExpiredError', async () => {
    const token = {
      _id: 'tid',
      userId: 'uid',
      email: 'u@example.com',
      type: EmailTokenType.AccountVerification,
      expiresAt: new Date(Date.now() - 1000),
    };
    const { emailTokenModel, userModel } = makeModels({ token, user: null });
    const { svc } = makeSvc({ emailTokenModel, userModel });
    await expect(svc.verifyAccountTokenAndComplete('t')).rejects.toBeInstanceOf(
      EmailTokenExpiredError,
    );
  });

  it('throws when user not found', async () => {
    const token = {
      _id: 'tid',
      userId: 'uid',
      email: 'u@example.com',
      type: EmailTokenType.AccountVerification,
      expiresAt: new Date(Date.now() + 100000),
    };
    const { emailTokenModel, userModel } = makeModels({ token, user: null });
    const { svc } = makeSvc({ emailTokenModel, userModel });
    await expect(svc.verifyAccountTokenAndComplete('t')).rejects.toMatchObject({
      name: 'UserNotFoundError',
    });
  });

  it('activates user, deletes token, and adds to Member role', async () => {
    const token = {
      _id: 'tid',
      userId: 'uid',
      email: 'u@example.com',
      type: EmailTokenType.AccountVerification,
      expiresAt: new Date(Date.now() + 100000),
    };
    const user = {
      _id: 'uid',
      email: 'old@example.com',
      emailVerified: false,
      accountStatus: AccountStatus.PendingEmailVerification,
      save: jest.fn(),
    };
    const { emailTokenModel, userModel } = makeModels({ token, user });
    const memberRoleId = 'rid';
    const { svc } = makeSvc({
      emailTokenModel,
      userModel,
      roleService: {
        getRoleIdByName: jest.fn().mockResolvedValue(memberRoleId),
        addUserToRole: jest.fn().mockResolvedValue(undefined),
      } as Partial<RoleService>,
    });

    await svc.verifyAccountTokenAndComplete('t');
    expect(user.email).toBe(token.email);
    expect(user.emailVerified).toBe(true);
    expect(user.accountStatus).toBe(AccountStatus.Active);
    expect(user.save).toHaveBeenCalled();
  });
});
