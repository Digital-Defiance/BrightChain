/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any */
import {
  AppConstants,
  IApiChallengeResponse,
  IApiLoginResponse,
  IRequestUserDTO,
  IRoleDTO,
  ITokenRole,
  MemberType,
  StringLanguage,
} from '@brightchain/brightchain-lib';
import { Member } from '@digitaldefiance/ecies-lib';
import { ObjectId as MongoDbObjectId } from 'bson';
import { Request, Response } from 'express';
import { MockBackendBrightchainMember } from '../__tests__/fixtures/mock-backend-brightchain-member';
import { makeMockDocument } from '../__tests__/fixtures/mocked-model';
import { IUserDocument } from '../documents/user';
import { IApplication } from '../interfaces/application';
import { IEnvironment } from '../interfaces/environment';
import { IMongoEnvironment } from '../interfaces/environment-mongo';
import { IJwtSignResponse } from '../interfaces/jwt-sign-response';
import { BackupCodeService } from '../services/backupCode';
import { ECIESService } from '../services/ecies/service';
import { JwtService } from '../services/jwt';
import { RoleService } from '../services/role';
import { SystemUserService } from '../services/system-user';
import { UserService } from '../services/user';
import { DefaultBackendIdType } from '../shared-types';
import { UserController } from './user';

// This is now the ONLY source for InvalidCredentialsError
const { InvalidCredentialsError, InvalidPasswordError } = jest.requireActual(
  '@brightchain/brightchain-lib',
);

// Mock the service modules
jest.mock('../services/user');
jest.mock('../services/jwt');
jest.mock('../documents/user');
jest.mock('../backend-burnbag-member');
jest.mock('../services/system-user');

// Mock SystemUserService
jest.mock('../services/system-user', () => ({
  SystemUserService: {
    getSystemUser: jest.fn(),
    setSystemUser: jest.fn(),
  },
}));

// Create typed mock variables for the classes
const MockedUserService = UserService as jest.MockedClass<typeof UserService>;
const MockedJwtService = JwtService as jest.MockedClass<typeof JwtService>;

describe('UserController', () => {
  let userController: UserController;
  let mockApplication: IApplication;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let userServiceInstance: jest.Mocked<UserService>;
  let jwtServiceInstance: jest.Mocked<JwtService>;
  const testSecret = 'test-secret';

  beforeEach(() => {
    // Clear any previous mock data
    MockedUserService.mockClear();
    MockedJwtService.mockClear();

    // Reset SystemUserService mock
    SystemUserService.getSystemUser.mockClear();
    SystemUserService.getSystemUser.mockReturnValue(
      new MockBackendBrightchainMember({
        type: MemberType.System,
        name: AppConstants.SystemUser,
      }),
    );

    const mockEnvironment: Partial<IEnvironment> = {
      jwtSecret: testSecret,
      mongo: {
        useTransactions: false,
      } as Partial<IMongoEnvironment> as IMongoEnvironment,
    };

    mockApplication = {
      environment: mockEnvironment as IEnvironment,
      db: {
        connection: {},
      },
    } as IApplication;

    // Instantiate the controller, which will use the mocked service constructors
    userController = new UserController(
      mockApplication,
      new (JwtService as any)(),
      new (UserService as any)(),
      new (BackupCodeService as any)(),
      new (RoleService as any)(),
      new (ECIESService as any)(),
    );

    // Get the specific instances of the mocks that were created
    userServiceInstance = MockedUserService.mock
      .instances[0] as jest.Mocked<UserService>;
    jwtServiceInstance = MockedJwtService.mock
      .instances[0] as jest.Mocked<JwtService>;

    // Add mock for updateLastLogin method
    userServiceInstance.updateLastLogin = jest
      .fn()
      .mockResolvedValue(undefined);

    // Add mock for generateDirectLoginChallenge method
    userServiceInstance.generateDirectLoginChallenge = jest
      .fn()
      .mockReturnValue('challenge-string');

    // Add mock for verifyDirectLoginChallenge method
    userServiceInstance.verifyDirectLoginChallenge = jest
      .fn()
      .mockResolvedValue({
        userDoc: {} as IUserDocument,
        userMember: {} as any,
      });

    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('login', () => {
    it('should return a 200 status and a token on successful password login', async () => {
      // Test the request direct login flow
      const challengeResult = await userController.requestDirectLogin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(challengeResult.statusCode).toBe(200);
      expect(
        (challengeResult.response as IApiChallengeResponse).challenge,
      ).toBe('challenge-string');

      // Now test the direct login challenge with proper validation data
      const challengeBody = {
        username: 'testuser',
        challenge: 'a'.repeat(208), // (UINT64_SIZE + 32 + SIGNATURE_SIZE) * 2 = 208 hex chars
        signature: 'b'.repeat(128), // SIGNATURE_SIZE * 2 = 128 hex chars
      };
      mockRequest.body = challengeBody;
      mockRequest.validatedBody = challengeBody;

      const mockUser = makeMockDocument({
        _id: 'some-id',
        username: 'testuser',
        roles: [],
      });

      const mockTokenResponse: IJwtSignResponse = {
        token: 'test-token',
        tokenUser: {
          userId: 'some-id',
          roles: [
            {
              _id: new MongoDbObjectId().toHexString(),
              admin: false,
              member: true,
              child: false,
              system: false,
              name: 'Member',
              translatedName: 'Member',
              createdAt: new Date().toISOString(),
              createdBy: new MongoDbObjectId().toHexString(),
              updatedAt: new Date().toISOString(),
              updatedBy: new MongoDbObjectId().toHexString(),
            },
          ],
        },
        roleNames: ['Member'],
        roleTranslatedNames: ['Member'],
        roleDTOs: [
          {
            _id: new MongoDbObjectId().toHexString(),
            name: 'Member',
            translatedName: 'Member',
            member: true,
            admin: false,
            child: false,
            system: false,
            createdAt: new Date().toISOString(),
            createdBy: new MongoDbObjectId().toHexString(),
            updatedAt: new Date().toISOString(),
            updatedBy: new MongoDbObjectId().toHexString(),
          } as IRoleDTO,
        ],
        roles: [
          {
            _id: new MongoDbObjectId(),
            name: AppConstants.MemberRole,
            translatedName: AppConstants.MemberRole,
            member: true,
            admin: false,
            child: false,
            system: false,
            createdAt: new Date(),
            createdBy: new MongoDbObjectId(),
            updatedAt: new Date(),
            updatedBy: new MongoDbObjectId(),
          } as ITokenRole<DefaultBackendIdType>,
        ] as ITokenRole<DefaultBackendIdType>[],
      };

      const userMember = new MockBackendBrightchainMember({
        type: MemberType.User,
      }) as unknown as Member;

      userServiceInstance.verifyDirectLoginChallenge.mockResolvedValue({
        userDoc: mockUser as unknown as IUserDocument,
        userMember: userMember,
      });
      jwtServiceInstance.signToken.mockResolvedValue(mockTokenResponse);

      const loginResult = await userController.directLoginChallenge(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(loginResult.statusCode).toBe(200);
      expect((loginResult.response as IApiLoginResponse).token).toBe(
        'test-token',
      );

      expect(
        userServiceInstance.verifyDirectLoginChallenge,
      ).toHaveBeenCalledWith(
        'a'.repeat(208),
        'b'.repeat(128),
        'testuser',
        undefined,
        undefined,
      );
      expect(jwtServiceInstance.signToken).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'some-id',
          roles: expect.any(Array),
          username: 'testuser',
        }),
        testSecret,
        StringLanguage.EnglishUS,
      );
    });

    it('should return a 200 status and a token on successful mnemonic login', async () => {
      const body = {
        username: 'testuser',
        challenge: '0'.repeat(208), // (UINT64_SIZE + 32 + SIGNATURE_SIZE) * 2 = 208 hex chars
        signature: '0'.repeat(128), // SIGNATURE_SIZE * 2 = 128 hex chars
      };
      mockRequest.body = body;
      mockRequest.validatedBody = body;

      const mockUser = makeMockDocument({
        _id: 'some-id',
        username: 'testuser',
        roles: [],
      });

      const mockTokenResponse: IJwtSignResponse = {
        token: 'test-token-mnemonic',
        tokenUser: {
          userId: 'some-id',
          roles: [],
        },
        roleNames: [],
        roleTranslatedNames: [],
        roleDTOs: [],
        roles: [],
      };

      const userMember = new MockBackendBrightchainMember({
        type: MemberType.User,
      }) as unknown as Member;

      userServiceInstance.verifyDirectLoginChallenge.mockResolvedValue({
        userDoc: mockUser as unknown as IUserDocument,
        userMember: userMember,
      });
      jwtServiceInstance.signToken.mockResolvedValue(mockTokenResponse);

      const result = await userController.directLoginChallenge(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(result.statusCode).toBe(200);
      expect((result.response as IApiLoginResponse).token).toBe(
        'test-token-mnemonic',
      );
      expect(
        userServiceInstance.verifyDirectLoginChallenge,
      ).toHaveBeenCalledWith(
        '0'.repeat(208),
        '0'.repeat(128),
        'testuser',
        undefined,
        undefined,
      );
      expect(jwtServiceInstance.signToken).toHaveBeenCalled();
    });

    it('should return a 401 status for invalid credentials', async () => {
      const body = {
        username: 'testuser',
        challenge: '1'.repeat(208), // Valid length but different content
        signature: '1'.repeat(128), // Valid length but different content
      };
      mockRequest.body = body;
      mockRequest.validatedBody = body;

      // Reject with the specific, handleable error type
      userServiceInstance.verifyDirectLoginChallenge.mockRejectedValue(
        new InvalidCredentialsError(),
      );

      await expect(
        userController.directLoginChallenge(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(InvalidCredentialsError);
      expect(jwtServiceInstance.signToken).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should return a 200 status on successful password change', async () => {
      const body = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      mockRequest.validatedBody = body;
      mockRequest.user = {
        id: 'some-user-id',
        username: 'test-user',
        email: 'test@example.com',
        timezone: 'UTC',
        siteLanguage: StringLanguage.EnglishUS,
        emailVerified: true,
        roles: [],
      } as IRequestUserDTO;

      userServiceInstance.changePassword.mockResolvedValue(undefined);

      const result = await userController.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(result.statusCode).toBe(200);
      expect(result.response.message).toBe('Password changed successfully');
      expect(userServiceInstance.changePassword).toHaveBeenCalledWith(
        'some-user-id',
        'old-password',
        'new-password',
        undefined,
      );
    });

    it('should throw an error if no user is on the request', async () => {
      const body = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      mockRequest.validatedBody = body;
      mockRequest.user = undefined;

      await expect(
        userController.changePassword(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow();
    });

    it('should propagate errors from the user service for incorrect password', async () => {
      const body = {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      };
      mockRequest.validatedBody = body;
      mockRequest.user = {
        id: 'some-user-id',
        username: 'test-user',
        email: 'test@example.com',
        timezone: 'UTC',
        siteLanguage: StringLanguage.EnglishUS,
        emailVerified: true,
        roles: [],
      } as IRequestUserDTO;

      const error = new InvalidCredentialsError();
      userServiceInstance.changePassword.mockRejectedValue(error);

      await expect(
        userController.changePassword(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(userServiceInstance.changePassword).toHaveBeenCalledWith(
        'some-user-id',
        'wrong-password',
        'new-password',
        undefined,
      );
    });

    it('should propagate InvalidPasswordError from user service for invalid new password', async () => {
      const body = {
        currentPassword: 'old-password',
        newPassword: 'invalid',
      };
      mockRequest.validatedBody = body;
      mockRequest.user = {
        id: 'some-user-id',
        username: 'test-user',
        email: 'test@example.com',
        timezone: 'UTC',
        siteLanguage: StringLanguage.EnglishUS,
        emailVerified: true,
        roles: [],
      } as IRequestUserDTO;

      const error = new InvalidPasswordError();
      userServiceInstance.changePassword.mockRejectedValue(error);

      await expect(
        userController.changePassword(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        ),
      ).rejects.toThrow(InvalidPasswordError);

      expect(userServiceInstance.changePassword).toHaveBeenCalledWith(
        'some-user-id',
        'old-password',
        'invalid',
        undefined,
      );
    });
  });
  // Append-only tests focusing on backupCodes shape regressions after BackupCodeService upgrade
  describe('UserService.backupCodes regression tests (real UserService)', () => {
    const { UserService: RealUserService } =
      jest.requireActual('../services/user');
    const { StringLanguage, AccountStatus } = jest.requireActual(
      '@brightchain/brightchain-lib',
    );

    type IBackupCode = {
      encrypted: string;
      checksum: string;
      checksumSalt: string;
      version: number;
    };

    const makeValidBackupCode = (
      overrides: Partial<IBackupCode> = {},
    ): IBackupCode => ({
      encrypted: Buffer.from('ciphertext').toString('hex'),
      checksum: Buffer.from('checksum').toString('hex'),
      checksumSalt: Buffer.from('salt').toString('hex'),
      version: 1,
      ...overrides,
    });

    const makeApplication = (overrides: Partial<any> = {}) => ({
      environment: {
        mnemonicHmacSecret: 'test-hmac',
        serverUrl: 'http://localhost',
        disableEmailSend: true,
        transactionTimeout: 1000,
        useTransactions: false,
        jwtSecret: 'test-secret',
        ...overrides['environment'],
      },
      getModel: (name: string) => {
        const models: Record<string, any> = {
          Mnemonic: {},
          User: class {
            // Mimic a Mongoose-like document with validateSync()
            private doc: any;
            constructor(data: any) {
              this.doc = data;
            }
            validateSync() {
              // Minimal validation that mimics required subdocument fields on backupCodes
              const codes = this.doc?.backupCodes;
              if (!Array.isArray(codes) || codes.length === 0) {
                const err: any = new Error(
                  'ValidationError: backupCodes required',
                );
                err.name = 'ValidationError';
                return err;
              }
              const first = codes[0];
              const missing: string[] = [];
              if (!first || typeof first !== 'object') {
                const err: any = new Error(
                  'ValidationError: backupCodes.0 is not an object',
                );
                err.name = 'ValidationError';
                return err;
              }
              if (!first.encrypted) missing.push('backupCodes.0.encrypted');
              if (!first.checksum) missing.push('backupCodes.0.checksum');
              if (!first.checksumSalt)
                missing.push('backupCodes.0.checksumSalt');
              if (typeof first.version !== 'number')
                missing.push('backupCodes.0.version');
              if (missing.length) {
                const err: any = new Error(
                  `ValidationError: missing ${missing.join(', ')}`,
                );
                err.name = 'ValidationError';
                return err;
              }
              return undefined;
            }
          },
        };
        return models[name];
      },
      db: { connection: {} },
      ...overrides,
    });

    const makeService = (app: any) =>
      new RealUserService(
        app,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      ) as InstanceType<typeof RealUserService>;

    it('fillUserDefaults passes backupCodes through unchanged (demonstrates why invalid shapes reach validation)', () => {
      const app = makeApplication();
      const svc = makeService(app);

      const invalidCodes = ['PLAIN-TEXT-CODE']; // Simulates upgraded service returning strings instead of IBackupCode
      const result = svc.fillUserDefaults(
        {
          username: 'TestUser_01',
          email: 'USER@EXAMPLE.COM',
          timezone: 'UTC',
        },
        '000000000000000000000000',
        invalidCodes as unknown as IBackupCode[],
        Buffer.from('enc-mnemonic').toString('hex'),
      );

      // fillUserDefaults lowercases email but does not transform backupCodes
      expect(result.email).toBe('user@example.com');
      expect(result.backupCodes).toBe(invalidCodes as any);
    });

    it('makeUserDoc throws when backupCodes are strings (reproduces missing path errors)', async () => {
      const app = makeApplication();
      const svc = makeService(app);

      const newUser = svc.fillUserDefaults(
        {
          username: 'TestUser_02',
          email: 'u2@example.com',
          timezone: 'UTC',
        },
        '000000000000000000000000',
        ['CODE-STRING'] as unknown as IBackupCode[],
        Buffer.from('enc-mnemonic').toString('hex'),
      );

      await expect(svc.makeUserDoc(newUser as any)).rejects.toBeTruthy();
    });

    it('makeUserDoc succeeds when backupCodes match required schema', async () => {
      const app = makeApplication();
      const svc = makeService(app);

      const codes: IBackupCode[] = [makeValidBackupCode()];
      const newUser = svc.fillUserDefaults(
        {
          username: 'TestUser_03',
          email: 'u3@example.com',
          timezone: 'UTC',
        },
        '000000000000000000000000',
        codes,
        Buffer.from('enc-mnemonic').toString('hex'),
      );

      const doc = await svc.makeUserDoc(newUser as any);
      expect(doc).toBeTruthy();
    });

    it('register-time defaults: ensures accountStatus and language are set while preserving backupCodes', () => {
      const app = makeApplication();
      const svc = makeService(app);

      const codes = [makeValidBackupCode()];
      const user = svc.fillUserDefaults(
        {
          username: 'TestUser_04',
          email: 'u4@example.com',
          timezone: 'UTC',
        },
        '000000000000000000000000',
        codes,
        Buffer.from('enc-mnemonic').toString('hex'),
      );

      expect(user.accountStatus).toBe(AccountStatus.PendingEmailVerification);
      expect(user.siteLanguage).toBe(StringLanguage.EnglishUS);
      expect(user.backupCodes).toEqual(codes);
    });

    it('getEncryptedUserBackupCodes returns codes exactly as stored (no shape conversion)', async () => {
      const app = makeApplication();
      const svc = makeService(app);

      const storedCodes = [makeValidBackupCode()];
      // Spy on findUserById used by getEncryptedUserBackupCodes
      const spy = jest.spyOn(svc as any, 'findUserById').mockResolvedValue({
        backupCodes: storedCodes,
      });

      const res = await svc.getEncryptedUserBackupCodes(
        '000000000000000000000000' as any,
        undefined,
      );
      expect(res).toBe(storedCodes);
      expect(spy).toHaveBeenCalledWith(
        '000000000000000000000000',
        true,
        undefined,
        { backupCodes: 1 },
      );
    });

    it('projection helper: ensureRequiredFieldsInProjection preserves inclusion of required fields', () => {
      const app = makeApplication();
      const svc = makeService(app) as any;

      // Pretend these fields are required; we want to ensure helper adds/keeps them
      const required = ['accountStatus', 'deletedAt'];

      // Inclusion string projection
      const selectStr = 'username email';
      const adjustedStr = svc.ensureRequiredFieldsInProjection(
        selectStr,
        required,
      );
      expect(typeof adjustedStr).toBe('string');
      expect((adjustedStr as string).split(/\s+/)).toEqual(
        expect.arrayContaining([
          'username',
          'email',
          'accountStatus',
          'deletedAt',
        ]),
      );

      // Inclusion object projection
      const selectObj = { username: 1 };
      const adjustedObj = svc.ensureRequiredFieldsInProjection(
        selectObj,
        required,
      );
      expect(adjustedObj).toMatchObject({
        username: 1,
        accountStatus: 1,
        deletedAt: 1,
      });

      // Exclusion object projection (required must not be excluded)
      const excludeObj = { password: 0, accountStatus: 0, deletedAt: 0 };
      const adjustedExclude = svc.ensureRequiredFieldsInProjection(
        excludeObj,
        required,
      );
      expect(adjustedExclude).toMatchObject({ password: 0 }); // required fields removed from exclusion
    });

    // Guidance: If BackupCodeService now returns an array of strings (human codes) and a separate array of encrypted records,
    // ensure that the encrypted record array (IBackupCode[]) is what gets passed into fillUserDefaults/newUser,
    // not the human-readable strings. The tests above will fail loudly if strings are used.
  });

  // Smoke test to ensure Password Regex unchanged by upgrade (sanity for controller validation)
  describe('Password regex sanity check', () => {
    const { AppConstants } = jest.requireActual('@brightchain/brightchain-lib');

    it('accepts a strong password and rejects a weak one', () => {
      const strong = 'S0mething-Valid_123';
      const weak = 'short';
      expect(AppConstants.PasswordRegex.test(strong)).toBe(true);
      expect(AppConstants.PasswordRegex.test(weak)).toBe(false);
    });
  });
});
