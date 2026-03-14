import {
  MemberStore,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { IUserProfileService } from '@brightchain/brighthub-lib';
import { SecureString } from '@digitaldefiance/ecies-lib';
import { HandleableError } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  Controller,
  Get,
  IApiMessageResponse,
  IStatusCodeResponse,
  Post,
  Put,
} from '@digitaldefiance/node-express-suite';
import {
  BrightDbUserController,
  IApiBackupCodesResponse,
  IApiCodeCountResponse,
  IApiLoginResponse,
} from '@brightchain/node-express-suite';
import {
  getSuiteCoreTranslation,
  InvalidBackupCodeError,
  IRequestUserDTO,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import type { NextFunction, Request, Response } from 'express';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  AuthService,
  BrightChainBackupCodeService,
} from '../../services';
import { DefaultBackendIdType } from '../../shared-types';

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

/**
 * BrightChain domain-specific UserController.
 *
 * Extends BrightDbUserController with:
 * - BrightHub social profile creation on registration
 * - Backup code routes (generate, regenerate, get count, recover-with-backup)
 * - Direct challenge verification route (ECIES signature-based login)
 */
@Controller()
export class UserController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BrightDbUserController<TID> {
  constructor(application: IBrightChainApplication<TID>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(application as any);
  }

  /**
   * Hook called after successful registration.
   * Creates a BrightHub social profile for the new user.
   */
  protected override async onPostRegister(
    memberId: string,
    username: string,
  ): Promise<void> {
    try {
      const userProfileService =
        this.application.services.get<IUserProfileService>(
          'userProfileService',
        );
      if (userProfileService) {
        await userProfileService.createProfileForUser(
          memberId,
          username,
        );
      }
    } catch {
      // Non-fatal: profile can be created lazily if this fails
    }
  }

  @Post('/direct-challenge')
  override async directChallenge(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> {
    const { challenge, signature, username, email } = req.body as {
      challenge?: string;
      signature?: string;
      username?: string;
      email?: string;
    };

    try {
      const authService = this.application.services.get<AuthService>('auth');
      const { member, memberId, userDTO } =
        await authService.verifyDirectLoginChallenge(
          String(challenge),
          String(signature),
          username ? String(username) : undefined,
          email ? String(email) : undefined,
        );

      const token = authService.signToken(memberId, member.name, member.type);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = this.application.environment as any;
      const serverPublicKey: string = env.systemPublicKeyHex ?? '';

      const response: IApiLoginResponse = {
        message: getSuiteCoreTranslation(SuiteCoreStringKey.LoggedIn_Success),
        user: userDTO ?? {
          id: memberId,
          username: member.name,
          email: member.email.toString(),
          roles: [],
          rolePrivileges: {
            admin: false,
            member: true,
            child: false,
            system: false,
          },
          emailVerified: true,
          timezone: 'UTC',
          siteLanguage: 'en',
          darkMode: false,
          currency: 'USD',
          directChallenge: false,
        },
        token,
        serverPublicKey,
      };

      return { statusCode: 200, response };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unexpected error';
      if (
        msg === 'Challenge expired' ||
        msg === 'Invalid challenge' ||
        msg === 'Invalid credentials' ||
        msg === 'Challenge already used'
      ) {
        return {
          statusCode: 401,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidCredentials,
            ),
            error: msg,
          },
        };
      }
      return {
        statusCode: 500,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Common_UnexpectedError,
          ),
          error: msg,
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
        this.application.services.get<BrightChainBackupCodeService<TID>>(
          'backupCodeService',
        );
      const codes = await backupCodeService.generateCodes(typedId as TID);

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

  @Put('/backup-codes', { auth: true })
  async regenerateBackupCodes(
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
        this.application.services.get<BrightChainBackupCodeService<TID>>(
          'backupCodeService',
        );
      const codes = await backupCodeService.regenerateCodes(typedId as TID);

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
        this.application.services.get<BrightChainBackupCodeService<TID>>(
          'backupCodeService',
        );
      const count = await backupCodeService.getCodeCount(typedId as TID);

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

  @Post('/recover-backup', { auth: true })
  async recoverWithBackupCode(
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
      const { backupCode, newPassword } = req.body as {
        backupCode: string;
        newPassword?: string;
      };

      if (!backupCode) {
        return {
          statusCode: 400,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidBackupCode,
            ),
          },
        };
      }

      const memberId = getUserId(user);
      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(memberId);

      const backupCodeService =
        this.application.services.get<BrightChainBackupCodeService<TID>>(
          'backupCodeService',
        );
      const result = await backupCodeService.recoverKeyWithBackupCode(
        typedId as TID,
        backupCode,
        newPassword,
      );

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.BackupCodeRecovery_Success,
          ),
          codeCount: result.codeCount,
        } as IApiCodeCountResponse,
      };
    } catch (error) {
      if (error instanceof InvalidBackupCodeError) {
        return {
          statusCode: 401,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidBackupCode,
            ),
            error: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_InvalidBackupCode,
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
          error:
            error instanceof Error
              ? error.message
              : getSuiteCoreTranslation(
                  SuiteCoreStringKey.Common_UnexpectedError,
                ),
        },
      };
    }
  }
}
