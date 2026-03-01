import {
  EnergyAccountStore,
  IAuthResponse,
  ILoginRequest,
  IPasswordChangeRequest,
  IRecoveryRequest,
  IRegistrationRequest,
  IUserProfile,
  IUserProfileMetadata,
  MemberStore,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { SecureString } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode, HandleableError } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  Controller,
  DecoratorBaseController,
  Get,
  IApiChallengeResponse,
  IApiMessageResponse,
  IStatusCodeResponse,
  Post,
  Put,
  SystemUserService,
} from '@digitaldefiance/node-express-suite';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  IApiBackupCodesResponse,
  IApiCodeCountResponse,
  IApiPasswordChangeResponse,
  IApiRecoveryResponse,
} from '../../interfaces/responses';
import {
  IAuthApiResponse,
  IUserProfileApiResponse,
} from '../../interfaces/userApiResponse';
import {
  AuthService,
  BackupCodeService,
  BrightChainSessionAdapter,
} from '../../services';
import { DefaultBackendIdType } from '../../shared-types';
import {
  validateLogin,
  validatePasswordChange,
  validateRecovery,
  validateRegistration,
} from '../../validation/userValidation';

interface IUpdateProfileRequest {
  displayName?: string;
  settings?: {
    autoReplication?: boolean;
    minRedundancy?: number;
    preferredRegions?: string[];
  };
}

/**
 * Shape of req.user as set by the JWT auth middleware.
 * The middleware sets `memberId` (not `id`), so we accept both for
 * backward-compatibility with any callers that set `id` directly.
 */
interface IRequestUser {
  id?: string;
  memberId?: string;
  username: string;
}

/** Extract the member ID from req.user, preferring memberId over id. */
function getUserId(user: IRequestUser): string {
  const id = user.memberId ?? user.id;
  if (!id) throw new Error('No member ID on request user');
  return id;
}

@Controller()
export class UserController<
  TID extends PlatformID = DefaultBackendIdType,
> extends DecoratorBaseController<
  CoreLanguageCode,
  TID,
  IBrightChainApplication<TID>
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  @Post('/register')
  async register(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const validation = validateRegistration(req.body);
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_MissingValidatedData,
          ),
          errors: validation.errors,
        } as IApiMessageResponse,
      };
    }

    try {
      const { username, email, password } =
        req.body as unknown as IRegistrationRequest;

      const authService = this.application.services.get<AuthService>('auth');
      const result = await authService.register(
        username,
        email,
        new SecureString(password),
      );

      const authResponse: IAuthResponse<string> = {
        token: result.token,
        memberId: result.memberId,
        energyBalance: result.energyBalance,
      };

      return {
        statusCode: 201,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Registration_Success,
          ),
          data: authResponse,
        } as IAuthApiResponse,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : getSuiteCoreTranslation(SuiteCoreStringKey.Common_UnexpectedError);
      return {
        statusCode: 400,
        response: {
          message: errorMessage,
          error: errorMessage,
        },
      };
    }
  }

  @Post('/login')
  async login(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_MissingValidatedData,
          ),
          errors: validation.errors,
        } as IApiMessageResponse,
      };
    }

    try {
      const { username, password } = req.body as unknown as ILoginRequest;

      const authService = this.application.services.get<AuthService>('auth');
      const result = await authService.login({
        username,
        password: new SecureString(password),
      });

      const authResponse: IAuthResponse<string> = {
        token: result.token,
        memberId: result.memberId,
        energyBalance: result.energyBalance,
      };

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(SuiteCoreStringKey.LoggedIn_Success),
          data: authResponse,
        } as IAuthApiResponse,
      };
    } catch {
      return {
        statusCode: 401,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidCredentials,
          ),
          error: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidCredentials,
          ),
        },
      };
    }
  }

  @Get('/profile', { auth: true })
  async getProfile(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as { user?: IRequestUser }).user;

    if (!user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    try {
      const memberId = getUserId(user);
      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(memberId);
      const idRawBytes = sp.idProvider.toBytes(typedId);
      const memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);

      const energyStore =
        this.application.services.get<EnergyAccountStore>('energyStore');
      const energyAccount = await energyStore.getOrCreate(memberChecksum);

      let email = '';
      const memberStore =
        this.application.services.get<MemberStore>('memberStore');
      try {
        if (memberStore) {
          const member = await memberStore.getMember(typedId);
          email = member.email.toString();
        }
      } catch {
        // Member lookup failed, continue with empty email
      }

      let memberProfile: IUserProfileMetadata | undefined;
      try {
        if (memberStore) {
          const profile = await memberStore.getMemberProfile(typedId);
          if (profile.publicProfile) {
            memberProfile = {
              status: profile.publicProfile.status,
              storageQuota: profile.publicProfile.storageQuota?.toString(),
              storageUsed: profile.publicProfile.storageUsed?.toString(),
              lastActive: profile.publicProfile.lastActive?.toISOString(),
              dateCreated: profile.publicProfile.dateCreated?.toISOString(),
            };
          }
        }
      } catch {
        // MemberStore profile not available
      }

      const userProfile: IUserProfile<string> = {
        memberId,
        username: user.username,
        email,
        energyBalance: energyAccount.balance,
        availableBalance: energyAccount.availableBalance,
        earned: energyAccount.earned,
        spent: energyAccount.spent,
        reserved: energyAccount.reserved,
        reputation: energyAccount.reputation,
        createdAt: energyAccount.createdAt.toISOString(),
        lastUpdated: energyAccount.lastUpdated.toISOString(),
        ...(memberProfile && { profile: memberProfile }),
      };

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Settings_RetrievedSuccess,
          ),
          data: userProfile,
        } as IUserProfileApiResponse,
      };
    } catch {
      return {
        statusCode: 500,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Common_UnexpectedError,
          ),
          error: getSuiteCoreTranslation(
            SuiteCoreStringKey.Common_UnexpectedError,
          ),
        },
      };
    }
  }

  @Put('/profile', { auth: true })
  async updateProfile(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as { user?: IRequestUser }).user;

    if (!user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    try {
      const memberId = getUserId(user);
      const updateData = req.body as unknown as IUpdateProfileRequest;
      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(memberId);
      const idRawBytes = sp.idProvider.toBytes(typedId);
      const memberChecksum = sp.checksumService.calculateChecksum(idRawBytes);

      const memberStore =
        this.application.services.get<MemberStore>('memberStore');
      if (memberStore && updateData.settings) {
        const completeSettings = {
          autoReplication: updateData.settings.autoReplication ?? true,
          minRedundancy: updateData.settings.minRedundancy ?? 3,
          preferredRegions: updateData.settings.preferredRegions ?? [],
        };
        await memberStore.updateMember(typedId, {
          id: typedId,
          privateChanges: {
            settings: completeSettings,
          },
        });
      }

      const energyStore =
        this.application.services.get<EnergyAccountStore>('energyStore');
      const energyAccount = await energyStore.getOrCreate(memberChecksum);

      let email = '';
      try {
        if (memberStore) {
          const member = await memberStore.getMember(typedId);
          email = member.email.toString();
        }
      } catch {
        // Member lookup failed
      }

      let memberProfile: IUserProfileMetadata | undefined;
      try {
        if (memberStore) {
          const profile = await memberStore.getMemberProfile(typedId);
          if (profile.publicProfile) {
            memberProfile = {
              status: profile.publicProfile.status,
              storageQuota: profile.publicProfile.storageQuota?.toString(),
              storageUsed: profile.publicProfile.storageUsed?.toString(),
              lastActive: profile.publicProfile.lastActive?.toISOString(),
              dateCreated: profile.publicProfile.dateCreated?.toISOString(),
            };
          }
        }
      } catch {
        // MemberStore profile not available
      }

      const userProfile: IUserProfile<string> = {
        memberId,
        username: user.username,
        email,
        energyBalance: energyAccount.balance,
        availableBalance: energyAccount.availableBalance,
        earned: energyAccount.earned,
        spent: energyAccount.spent,
        reserved: energyAccount.reserved,
        reputation: energyAccount.reputation,
        createdAt: energyAccount.createdAt.toISOString(),
        lastUpdated: energyAccount.lastUpdated.toISOString(),
        ...(memberProfile && { profile: memberProfile }),
      };

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Settings_SaveSuccess,
          ),
          data: userProfile,
        } as IUserProfileApiResponse,
      };
    } catch {
      return {
        statusCode: 500,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Common_UnexpectedError,
          ),
          error: getSuiteCoreTranslation(
            SuiteCoreStringKey.Common_UnexpectedError,
          ),
        },
      };
    }
  }

  @Post('/change-password', { auth: true })
  async changePassword(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const validation = validatePasswordChange(req.body);
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_MissingValidatedData,
          ),
          errors: validation.errors,
        } as IApiMessageResponse,
      };
    }

    const user = (req as { user?: IRequestUser }).user;

    if (!user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    try {
      const memberId = getUserId(user);
      const { currentPassword, newPassword } =
        req.body as unknown as IPasswordChangeRequest;

      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(memberId);

      const authService = this.application.services.get<AuthService>('auth');
      await authService.changePassword(typedId, currentPassword, newPassword);

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.PasswordChange_Success,
          ),
          data: {
            memberId,
            success: true,
          },
        } as IApiPasswordChangeResponse,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : getSuiteCoreTranslation(SuiteCoreStringKey.Error_PasswordChange);

      if (errorMessage === 'Invalid credentials') {
        return {
          statusCode: 401,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidCredentials,
            ),
            error: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidCredentials,
            ),
          },
        };
      }

      return {
        statusCode: 500,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Error_PasswordChange,
          ),
          error: errorMessage,
        },
      };
    }
  }

  @Post('/backup-codes', { auth: true })
  async generateBackupCodes(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as { user?: IRequestUser }).user;

    if (!user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    try {
      const memberId = getUserId(user);
      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(memberId);

      const backupCodeService =
        this.application.services.get<BackupCodeService>('backupCodeService');
      const codes = await backupCodeService.generateCodes(typedId);

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.BackupCodeRecovery_YourNewCodes,
          ),
          backupCodes: codes,
        } as IApiBackupCodesResponse,
      };
    } catch (error) {
      return {
        statusCode: 500,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.BackupCodes_FailedToGenerate,
          ),
          error:
            error instanceof Error
              ? error.message
              : getSuiteCoreTranslation(
                  SuiteCoreStringKey.BackupCodes_FailedToGenerate,
                ),
        },
      };
    }
  }

  @Get('/backup-codes', { auth: true })
  async getBackupCodeCount(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as { user?: IRequestUser }).user;

    if (!user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    try {
      const memberId = getUserId(user);
      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(memberId);

      const backupCodeService =
        this.application.services.get<BackupCodeService>('backupCodeService');
      const count = await backupCodeService.getCodeCount(typedId);

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.BackupCodes_RetrievedSuccess,
          ),
          codeCount: count,
        } as IApiCodeCountResponse,
      };
    } catch (error) {
      return {
        statusCode: 500,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.BackupCodes_FailedToFetch,
          ),
          error:
            error instanceof Error
              ? error.message
              : getSuiteCoreTranslation(
                  SuiteCoreStringKey.BackupCodes_FailedToFetch,
                ),
        },
      };
    }
  }

  @Post('/recover')
  async recover(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const validation = validateRecovery(req.body);
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_MissingValidatedData,
          ),
          errors: validation.errors,
        } as IApiMessageResponse,
      };
    }

    try {
      const { email, mnemonic, newPassword } =
        req.body as unknown as IRecoveryRequest;

      const authService = this.application.services.get<AuthService>('auth');
      const result = await authService.recoverWithMnemonic(
        email,
        new SecureString(mnemonic),
        newPassword,
      );

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.MnemonicRecovery_Success,
          ),
          data: result,
        } as IApiRecoveryResponse,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : getSuiteCoreTranslation(SuiteCoreStringKey.Common_UnexpectedError);

      if (
        errorMessage === 'Invalid credentials' ||
        errorMessage === 'Invalid mnemonic'
      ) {
        return {
          statusCode: 401,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidCredentials,
            ),
            error: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidCredentials,
            ),
          },
        };
      }

      return {
        statusCode: 500,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Common_UnexpectedError,
          ),
          error: errorMessage,
        },
      };
    }
  }

  @Post('/logout', { auth: true })
  async logout(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as { user?: IRequestUser }).user;

    if (!user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    try {
      const authHeader = String(
        (req as { headers: { authorization?: string } }).headers
          ?.authorization ?? '',
      );
      if (!authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_TokenMissing,
            ),
            error: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_TokenMissing,
            ),
          },
        };
      }

      const token = authHeader.slice('Bearer '.length);

      const sessionAdapter =
        this.application.services.get<BrightChainSessionAdapter>(
          'sessionAdapter',
        );

      const session = await sessionAdapter.validateToken(token);
      if (session) {
        await sessionAdapter.deleteSession(session.sessionId);
      }

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(SuiteCoreStringKey.Common_Success),
        },
      };
    } catch {
      return {
        statusCode: 500,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Common_UnexpectedError,
          ),
          error: getSuiteCoreTranslation(
            SuiteCoreStringKey.Common_UnexpectedError,
          ),
        },
      };
    }
  }

  @Post('/request-direct-login')
  async requestDirectLogin(
    _req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiChallengeResponse | ApiErrorResponse>> {
    const systemUser = SystemUserService.getSystemUser(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.application.environment as any,
      this.application.constants,
    );
    const time = Buffer.alloc(8);
    time.writeBigUInt64BE(BigInt(new Date().getTime()));
    const nonce = randomBytes(32);
    const signature = systemUser.sign(Buffer.concat([time, nonce]));
    const challenge = Buffer.concat([time, nonce, signature]).toString('hex');

    return {
      statusCode: 200,
      response: {
        challenge,
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Login_ChallengeGenerated,
        ),
        serverPublicKey:
          (
            this.application.environment as {
              systemPublicKeyHex?: string;
            }
          ).systemPublicKeyHex ?? '',
      },
    };
  }
}
