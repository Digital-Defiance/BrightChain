/**
 * @fileoverview Base UserController for BrightDB-backed applications.
 *
 * Provides core user authentication routes: register, login, verify,
 * request-direct-login, profile, settings, logout, change-password,
 * recover, and refresh-token.
 *
 * Domain-specific extensions (e.g. BrightHub profile creation, backup codes,
 * direct-challenge verification, energy account in profile) are added by
 * subclasses in consuming libraries like brightchain-api-lib.
 *
 * @module controllers/user
 */

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
  IRequestUserDTO,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { IBrightDbApplication } from '../interfaces/bright-db-application';
import {
  IApiLoginResponse,
  IApiPasswordChangeResponse,
  IApiRecoveryResponse,
  IApiRequestUserResponse,
  IAuthApiResponse,
  IUserProfileApiResponse,
} from '../interfaces/responses';
import { BrightDbAuthService } from '../services/auth';
import { BrightChainSessionAdapter } from '../services/sessionAdapter';
import {
  validateLogin,
  validatePasswordChange,
  validateRecovery,
  validateRegistration,
} from '../validation/userValidation';

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
export class BrightDbUserController<
  TID extends PlatformID = Buffer,
> extends DecoratorBaseController<
  CoreLanguageCode,
  TID,
  IBrightDbApplication<TID>
> {
  constructor(application: IBrightDbApplication<TID>) {
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
      const { username, email, password, mnemonic } =
        req.body as unknown as IRegistrationRequest;

      const authService =
        this.application.services.get<BrightDbAuthService<TID>>('auth');
      const result = await authService.register(
        username,
        email,
        new SecureString(password),
        mnemonic ? new SecureString(mnemonic) : undefined,
      );

      // Hook for subclasses to perform post-registration actions
      // (e.g. creating BrightHub social profiles)
      await this.onPostRegister(result.memberId, username);

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

  /**
   * Hook called after successful registration.
   * Override in subclasses to create social profiles, etc.
   */
  protected async onPostRegister(
    _memberId: string,
    _username: string,
  ): Promise<void> {
    // No-op in base class
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

      const authService =
        this.application.services.get<BrightDbAuthService<TID>>('auth');
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

      const authService =
        this.application.services.get<BrightDbAuthService<TID>>('auth');
      await authService.changePassword(typedId as unknown as TID, currentPassword, newPassword);

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

      const authService =
        this.application.services.get<BrightDbAuthService<TID>>('auth');
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

  /**
   * GET /verify — returns the authenticated user's DTO.
   * The auth middleware already populates req.user with a full IRequestUserDTO
   * via buildRequestUserDTO, so we just return it.
   */
  @Get('/verify', { auth: true })
  async verify(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiRequestUserResponse | ApiErrorResponse>> {
    if (!req.user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    const user = req.user as IRequestUserDTO;
    return {
      statusCode: 200,
      response: {
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Validation_TokenValid,
        ),
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          roles: user.roles || [],
          rolePrivileges: user.rolePrivileges,
          timezone: user.timezone,
          currency: user.currency,
          emailVerified: user.emailVerified,
          darkMode: user.darkMode,
          siteLanguage: user.siteLanguage,
          directChallenge: user.directChallenge,
          ...(user.lastLogin && { lastLogin: user.lastLogin }),
        },
      },
    };
  }

  /**
   * GET /settings — returns the authenticated user's settings.
   */
  @Get('/settings', { auth: true })
  async getSettings(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    if (!req.user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    const user = req.user as IRequestUserDTO;
    return {
      statusCode: 200,
      response: {
        message: getSuiteCoreTranslation(
          SuiteCoreStringKey.Settings_RetrievedSuccess,
        ),
        settings: {
          email: user.email || '',
          timezone: user.timezone || '',
          currency: user.currency || '',
          siteLanguage: user.siteLanguage || '',
          darkMode: user.darkMode || false,
          directChallenge: user.directChallenge || false,
        },
      } as IApiMessageResponse,
    };
  }

  /**
   * POST /settings — updates the authenticated user's settings.
   */
  @Post('/settings', { auth: true })
  async updateSettings(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiRequestUserResponse | ApiErrorResponse>> {
    if (!req.user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    try {
      const user = req.user as IRequestUserDTO;
      const memberId = user.id;
      const {
        email,
        timezone,
        siteLanguage,
        currency,
        darkMode,
        directChallenge,
      } = req.body as {
        email?: string;
        timezone?: string;
        siteLanguage?: string;
        currency?: string;
        darkMode?: boolean;
        directChallenge?: boolean;
      };

      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(memberId);
      const idHex = sp.idProvider.toString(typedId, 'hex');

      // Update user-facing settings (timezone, darkMode, etc.) in the DB
      // users collection. These are NOT part of the member store's
      // IPrivateMemberData.settings (which tracks replication/storage config).
      try {
        const db =
          this.application.services.get<import('@brightchain/db').BrightDb>(
            'db',
          );
        if (db) {
          const usersCol = db.collection('user_settings');
          const updateFields: Record<string, unknown> = {};
          if (email !== undefined) updateFields['email'] = email;
          if (timezone !== undefined) updateFields['timezone'] = timezone;
          if (siteLanguage !== undefined)
            updateFields['siteLanguage'] = siteLanguage;
          if (currency !== undefined) updateFields['currency'] = currency;
          if (darkMode !== undefined) updateFields['darkMode'] = darkMode;
          if (directChallenge !== undefined)
            updateFields['directChallenge'] = directChallenge;

          if (Object.keys(updateFields).length > 0) {
            await usersCol.updateOne(
              { _id: idHex } as never,
              { $set: updateFields } as never,
              { upsert: true } as never,
            );
          }
        }
      } catch {
        // DB update is best-effort
      }

      // Build updated user DTO
      const updatedUser: IRequestUserDTO = {
        ...user,
        ...(email !== undefined && { email }),
        ...(timezone !== undefined && { timezone }),
        ...(siteLanguage !== undefined && { siteLanguage }),
        ...(currency !== undefined && { currency }),
        ...(darkMode !== undefined && { darkMode }),
        ...(directChallenge !== undefined && { directChallenge }),
      };

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Settings_SaveSuccess,
          ),
          user: updatedUser,
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

  /**
   * GET /refresh-token — re-signs the JWT and returns a new token + user DTO.
   */
  @Get('/refresh-token', { auth: true })
  async refreshToken(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | ApiErrorResponse>> {
    if (!req.user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    try {
      const user = req.user as IRequestUserDTO;
      const authService =
        this.application.services.get<BrightDbAuthService<TID>>('auth');

      // Verify the current token is still valid
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

      const oldToken = authHeader.slice('Bearer '.length);
      const decoded = await authService.verifyToken(oldToken);

      // Re-sign with fresh expiry
      const newToken = authService.signToken(
        decoded.memberId,
        decoded.username,
        decoded.type,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = this.application.environment as any;
      const serverPublicKey: string = env.systemPublicKeyHex ?? '';

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(SuiteCoreStringKey.Common_Success),
          user,
          token: newToken,
          serverPublicKey,
        },
        headers: {
          Authorization: `Bearer ${newToken}`,
        },
      } as IStatusCodeResponse<IApiLoginResponse>;
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
}
