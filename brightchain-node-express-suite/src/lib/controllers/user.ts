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
  microjoulesToJoules,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { MemberType, SecureString } from '@digitaldefiance/ecies-lib';
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
  TotpService,
  ServiceKeys,
  findAuthToken,
} from '@digitaldefiance/node-express-suite';
import {
  getSuiteCoreTranslation,
  IRequestUserDTO,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { randomBytes } from 'crypto';
import { verify as jwtVerify, JwtPayload, TokenExpiredError as JwtTokenExpiredError } from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { SchemaCollection } from '../enumerations/schema-collection';
import type { IBrightDbApplication } from '../interfaces/bright-db-application';
import {
  IApiLoginResponse,
  IApiPasswordChangeResponse,
  IApiRecoveryResponse,
  IApiRequestUserResponse,
  IApiTotpSetupResponse,
  IApiUserSettingsResponse,
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
 * The middleware sets `id` to match IRequestUserDTO.
 */
interface IRequestUser {
  id?: string;
  username: string;
}

/** Extract the member ID from req.user. */
function getUserId(user: IRequestUser): string {
  const id = user.id;
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
    const validation = validateRegistration(req.body, [
      this.application.environment.emailDomain,
    ]);
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
      const { username, email, password, mnemonic, displayName } =
        req.body as unknown as IRegistrationRequest;

      const authService =
        this.application.services.get<BrightDbAuthService<TID>>('auth');
      const result = await authService.register(
        username,
        email,
        new SecureString(password),
        mnemonic ? new SecureString(mnemonic) : undefined,
        displayName,
      );

      // Hook for subclasses to perform post-registration actions
      // (e.g. creating BrightHub social profiles)
      await this.onPostRegister(result.memberId, username, displayName);

      const authResponse: IAuthResponse<string> = {
        token: result.token,
        memberId: result.memberId,
        energyBalance: result.energyBalance,
        ...(result.mnemonic ? { mnemonic: result.mnemonic } : {}),
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
      // Log the full error for server-side debugging
      console.error('[UserController] register failed:', errorMessage);
      if (error instanceof Error && error.cause) {
        console.error('[UserController] cause:', error.cause);
      }
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
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
    _displayName?: string,
  ): Promise<void> {
    // No-op in base class
  }

  /**
   * POST /verify-email — Verify a user's email address using a token
   * sent during registration.
   */
  @Post('/verify-email')
  async verifyEmail(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const { token } = req.body as { token?: string };

    if (!token) {
      return {
        statusCode: 400,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.NoVerificationTokenProvided,
          ),
        },
      };
    }

    try {
      const authService =
        this.application.services.get<BrightDbAuthService<TID>>('auth');
      await authService.verifyEmailToken(token);

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.EmailVerification_Success,
          ),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : getSuiteCoreTranslation(
              SuiteCoreStringKey.EmailVerification_Failed,
            );
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
   * POST /resend-verification — Resend the email verification link.
   * Requires the user's email address in the request body.
   */
  @Post('/resend-verification')
  async resendVerification(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const { email } = req.body as { email?: string };

    if (!email) {
      return {
        statusCode: 400,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.Validation_InvalidEmail,
          ),
        },
      };
    }

    try {
      const authService =
        this.application.services.get<BrightDbAuthService<TID>>('auth');

      // Look up user by email
      const usersCol = this.application.db.collection<{
        _id?: string;
        email?: string;
        username?: string;
        emailVerified?: boolean;
        accountStatus?: string;
      }>(SchemaCollection.User);

      const userDoc = await usersCol.findOne({ email } as never);
      if (!userDoc) {
        // Don't reveal whether the email exists — always return success
        return {
          statusCode: 200,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.EmailVerification_Resent,
            ),
          },
        };
      }

      if (userDoc.emailVerified) {
        return {
          statusCode: 200,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.EmailVerification_AlreadyVerified,
            ),
          },
        };
      }

      // Generate a new token and send the email
      const memberId = userDoc._id!;
      const username = userDoc.username ?? 'User';
      await authService.resendVerificationEmail(memberId, email, username);

      return {
        statusCode: 200,
        response: {
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.EmailVerification_Resent,
          ),
        },
      };
    } catch (error) {
      console.error('[UserController] resendVerification failed:', error);
      return {
        statusCode: 200,
        response: {
          // Always return success to avoid email enumeration
          message: getSuiteCoreTranslation(
            SuiteCoreStringKey.EmailVerification_Resent,
          ),
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
    } catch (error) {
      // Provide a specific message for unverified email addresses
      if (error instanceof Error && error.message === 'Email not verified') {
        return {
          statusCode: 403,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_EmailNotVerified,
            ),
            error: 'Email not verified',
          },
        };
      }
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
        energyBalance: microjoulesToJoules(energyAccount.balance),
        availableBalance: microjoulesToJoules(energyAccount.availableBalance),
        earned: microjoulesToJoules(energyAccount.earned),
        spent: microjoulesToJoules(energyAccount.spent),
        reserved: microjoulesToJoules(energyAccount.reserved),
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
        energyBalance: microjoulesToJoules(energyAccount.balance),
        availableBalance: microjoulesToJoules(energyAccount.availableBalance),
        earned: microjoulesToJoules(energyAccount.earned),
        spent: microjoulesToJoules(energyAccount.spent),
        reserved: microjoulesToJoules(energyAccount.reserved),
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
      await authService.changePassword(
        typedId as unknown as TID,
        currentPassword,
        newPassword,
      );

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

  @Post('/direct-challenge')
  async directChallenge(
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
      const authService =
        this.application.services.get<BrightDbAuthService<TID>>('auth');
      if (!authService) {
        throw new Error(
          'Auth service not available — ensure BrightDbDatabasePlugin.init() ran',
        );
      }
      const { member, memberId, userDTO } =
        await authService.verifyDirectLoginChallenge(
          String(challenge),
          String(signature),
          username ? String(username) : undefined,
          email ? String(email) : undefined,
        );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = this.application.environment as any;
      const serverPublicKey: string = env.systemPublicKeyHex ?? '';

      const token = authService.signToken(
        memberId,
        member.name,
        member.type,
        userDTO?.rolePrivileges?.admin ? ['admin'] : [],
      );

      // Check if the user has TOTP enabled — if so, return a pending token
      // instead of the full JWT.
      try {
        const usersCol = this.application.db.collection<{
          _id?: string;
          totpEnabled?: boolean;
        }>(SchemaCollection.User);
        const sp = ServiceProvider.getInstance();
        const typedId = sp.idProvider.idFromString(memberId);
        const idHex = sp.idProvider.toString(typedId, 'hex');
        let userDoc = await usersCol.findOne({ _id: idHex } as never);
        if (!userDoc) {
          const dashed = idHex.replace(
            /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
            '$1-$2-$3-$4-$5',
          );
          userDoc = await usersCol.findOne({ _id: dashed } as never);
        }
        if (userDoc?.totpEnabled) {
          const pendingTotpToken = authService.signPendingTotpToken(memberId);
          return {
            statusCode: 200,
            response: {
              pendingTotpToken,
              message: 'TOTP verification required',
            },
          };
        }
      } catch {
        // DB lookup failed — proceed with normal login
      }

      // Strip the internal `member` property from the DTO before serialization —
      // it may contain BigInt fields (storageQuota, storageUsed) that cannot be
      // serialized by JSON.stringify.
      let cleanUserDTO = userDTO;
      if (userDTO && 'member' in userDTO) {
        const { member: _m, ...rest } = userDTO as typeof userDTO & {
          member: unknown;
        };
        cleanUserDTO = rest;
      }

      const response: IApiLoginResponse = {
        message: getSuiteCoreTranslation(SuiteCoreStringKey.LoggedIn_Success),
        user: cleanUserDTO ?? {
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
      // Provide a specific message for unverified email addresses
      if (msg === 'Email not verified') {
        return {
          statusCode: 403,
          response: {
            message: getSuiteCoreTranslation(
              SuiteCoreStringKey.Validation_EmailNotVerified,
            ),
            error: 'Email not verified',
          },
        };
      }
      if (msg === 'Account is locked') {
        return {
          statusCode: 403,
          response: {
            message: 'Account is locked',
            error: msg,
          },
        };
      }
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
          ...(user.displayName && { displayName: user.displayName }),
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
  ): Promise<IStatusCodeResponse<IApiUserSettingsResponse | ApiErrorResponse>> {
    if (!req.user) {
      throw new HandleableError(
        new Error(
          getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest),
        ),
        { statusCode: 401 },
      );
    }

    const user = req.user as IRequestUserDTO;

    // Fetch totpEnabled from the users collection
    let totpEnabled = false;
    try {
      const sp = ServiceProvider.getInstance();
      const typedId = sp.idProvider.idFromString(user.id);
      const idHex = sp.idProvider.toString(typedId, 'hex');
      const usersCol = this.application.db.collection<{
        _id?: string;
        totpEnabled?: boolean;
      }>(SchemaCollection.User);
      let userDoc = await usersCol.findOne({ _id: idHex } as never);
      if (!userDoc) {
        const dashed = idHex.replace(
          /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
          '$1-$2-$3-$4-$5',
        );
        userDoc = await usersCol.findOne({ _id: dashed } as never);
      }
      totpEnabled = userDoc?.totpEnabled ?? false;
    } catch {
      // DB lookup failed — default to false
    }

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
          ...(user.displayName ? { displayName: user.displayName } : {}),
          totpEnabled,
        },
      },
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
        displayName,
      } = req.body as {
        email?: string;
        timezone?: string;
        siteLanguage?: string;
        currency?: string;
        darkMode?: boolean;
        directChallenge?: boolean;
        displayName?: string;
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
          const updateFields: Record<string, unknown> = {};
          if (email !== undefined) updateFields['email'] = email;
          if (timezone !== undefined) updateFields['timezone'] = timezone;
          if (siteLanguage !== undefined)
            updateFields['siteLanguage'] = siteLanguage;
          if (currency !== undefined) updateFields['currency'] = currency;
          if (darkMode !== undefined) updateFields['darkMode'] = darkMode;
          if (directChallenge !== undefined)
            updateFields['directChallenge'] = directChallenge;
          if (displayName !== undefined)
            updateFields['displayName'] = displayName;

          if (Object.keys(updateFields).length > 0) {
            // Update the main users collection so buildRequestUserDTO
            // returns the latest settings on subsequent verify calls.
            const usersCol = db.collection(SchemaCollection.User);
            await usersCol.updateOne(
              { _id: idHex } as never,
              { $set: updateFields } as never,
            );

            // Also persist to user_settings for dedicated settings queries.
            const settingsCol = db.collection(SchemaCollection.UserSettings);
            await settingsCol.updateOne(
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
        ...(displayName !== undefined && { displayName }),
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
        decoded.roles,
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

  // ─── TOTP Endpoints ────────────────────────────────────────────────────────

  /**
   * POST /totp/setup — generate a pending TOTP secret and return provisioning URI.
   * Requires full JWT auth. Returns 409 if TOTP is already enabled.
   */
  @Post('/totp/setup', { auth: true })
  async totpSetup(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiTotpSetupResponse | IApiMessageResponse>> {
    if (!req.user) {
      return { statusCode: 401, response: { message: getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest) } };
    }

    const user = req.user as IRequestUserDTO;
    const sp = ServiceProvider.getInstance();
    const typedId = sp.idProvider.idFromString(user.id);
    const idHex = sp.idProvider.toString(typedId, 'hex');

    const usersCol = this.application.db.collection<{
      _id?: string;
      totpEnabled?: boolean;
      totpPendingSecret?: string;
    }>(SchemaCollection.User);

    let userDoc = await usersCol.findOne({ _id: idHex } as never);
    if (!userDoc) {
      const dashed = idHex.replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
      userDoc = await usersCol.findOne({ _id: dashed } as never);
    }

    if (userDoc?.totpEnabled) {
      return { statusCode: 409, response: { message: 'TOTP is already active' } };
    }

    const totpService = this.application.services.get<TotpService>(ServiceKeys.TOTP);
    const secret = totpService.generateSecret();

    // Encrypt with system user's ECIES public key for server-side decryption
    const systemUser = SystemUserService.getSystemUser(
      this.application.environment as never,
      this.application.constants,
    );
    const encryptedSecret = (await systemUser.encryptData(Buffer.from(secret, 'utf-8'))).toString('hex');

    const docId = userDoc?._id ?? idHex;
    if (!userDoc) {
      // Document doesn't exist yet — create it with the pending secret
      await usersCol.create({ _id: docId, totpPendingSecret: encryptedSecret } as never);
    } else {
      await usersCol.updateOne(
        { _id: docId } as never,
        { totpPendingSecret: encryptedSecret } as never,
      );
    }

    const provisioningUri = totpService.generateProvisioningUri(
      secret,
      user.email,
      (this.application.environment as { host?: string }).host ?? 'BrightChain',
    );

    return {
      statusCode: 200,
      response: { provisioningUri, secret, message: 'TOTP setup initiated' },
    };
  }

  /**
   * POST /totp/confirm — verify a 6-digit code against the pending secret and activate TOTP.
   * Requires full JWT auth.
   */
  @Post('/totp/confirm', { auth: true })
  async totpConfirm(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse>> {
    if (!req.user) {
      return { statusCode: 401, response: { message: getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest) } };
    }

    const { code } = req.body as { code?: unknown };
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return { statusCode: 400, response: { message: 'Code must be exactly 6 digits' } };
    }

    const user = req.user as IRequestUserDTO;
    const sp = ServiceProvider.getInstance();
    const typedId = sp.idProvider.idFromString(user.id);
    const idHex = sp.idProvider.toString(typedId, 'hex');

    const usersCol = this.application.db.collection<{
      _id?: string;
      totpEnabled?: boolean;
      totpSecret?: string;
      totpPendingSecret?: string;
    }>(SchemaCollection.User);

    let userDoc = await usersCol.findOne({ _id: idHex } as never);
    if (!userDoc) {
      const dashed = idHex.replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
      userDoc = await usersCol.findOne({ _id: dashed } as never);
    }

    if (!userDoc?.totpPendingSecret) {
      return { statusCode: 400, response: { message: 'TOTP setup has not been initiated' } };
    }

    const systemUser = SystemUserService.getSystemUser(
      this.application.environment as never,
      this.application.constants,
    );
    const decryptedSecret = systemUser.decryptData(Buffer.from(userDoc.totpPendingSecret, 'hex')).toString('utf-8');

    const totpService = this.application.services.get<TotpService>(ServiceKeys.TOTP);
    if (!totpService.verifyCode(decryptedSecret, code)) {
      return { statusCode: 400, response: { message: 'Invalid TOTP code' } };
    }

    const docId = userDoc._id ?? idHex;
    await usersCol.updateOne(
      { _id: docId } as never,
      { totpSecret: userDoc.totpPendingSecret, totpEnabled: true, totpPendingSecret: null } as never,
    );

    return { statusCode: 200, response: { message: 'TOTP has been enabled successfully' } };
  }

  /**
   * POST /totp/disable — verify code and disable TOTP.
   * Requires full JWT auth. Returns 409 if TOTP is not active.
   */
  @Post('/totp/disable', { auth: true })
  async totpDisable(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiMessageResponse>> {
    if (!req.user) {
      return { statusCode: 401, response: { message: getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest) } };
    }

    const { code } = req.body as { code?: unknown };
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return { statusCode: 400, response: { message: 'Code must be exactly 6 digits' } };
    }

    const user = req.user as IRequestUserDTO;
    const sp = ServiceProvider.getInstance();
    const typedId = sp.idProvider.idFromString(user.id);
    const idHex = sp.idProvider.toString(typedId, 'hex');

    const usersCol = this.application.db.collection<{
      _id?: string;
      totpEnabled?: boolean;
      totpSecret?: string;
      totpPendingSecret?: string;
    }>(SchemaCollection.User);

    let userDoc = await usersCol.findOne({ _id: idHex } as never);
    if (!userDoc) {
      const dashed = idHex.replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
      userDoc = await usersCol.findOne({ _id: dashed } as never);
    }

    if (!userDoc?.totpEnabled) {
      return { statusCode: 409, response: { message: 'TOTP is not currently active' } };
    }

    const systemUser = SystemUserService.getSystemUser(
      this.application.environment as never,
      this.application.constants,
    );
    const decryptedSecret = systemUser.decryptData(Buffer.from(userDoc.totpSecret as string, 'hex')).toString('utf-8');

    const totpService = this.application.services.get<TotpService>(ServiceKeys.TOTP);
    if (!totpService.verifyCode(decryptedSecret, code)) {
      return { statusCode: 400, response: { message: 'Invalid TOTP code' } };
    }

    const docId = userDoc._id ?? idHex;
    await usersCol.updateOne(
      { _id: docId } as never,
      { totpEnabled: false, totpSecret: null, totpPendingSecret: null } as never,
    );

    return { statusCode: 200, response: { message: 'TOTP has been disabled successfully' } };
  }

  /**
   * POST /totp/reset — verify current code, generate new pending secret for re-setup.
   * Requires full JWT auth. Returns 409 if TOTP is not active.
   */
  @Post('/totp/reset', { auth: true })
  async totpReset(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiTotpSetupResponse | IApiMessageResponse>> {
    if (!req.user) {
      return { statusCode: 401, response: { message: getSuiteCoreTranslation(SuiteCoreStringKey.Common_NoUserOnRequest) } };
    }

    const { code } = req.body as { code?: unknown };
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return { statusCode: 400, response: { message: 'Code must be exactly 6 digits' } };
    }

    const user = req.user as IRequestUserDTO;
    const sp = ServiceProvider.getInstance();
    const typedId = sp.idProvider.idFromString(user.id);
    const idHex = sp.idProvider.toString(typedId, 'hex');

    const usersCol = this.application.db.collection<{
      _id?: string;
      totpEnabled?: boolean;
      totpSecret?: string;
    }>(SchemaCollection.User);

    let userDoc = await usersCol.findOne({ _id: idHex } as never);
    if (!userDoc) {
      const dashed = idHex.replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
      userDoc = await usersCol.findOne({ _id: dashed } as never);
    }

    if (!userDoc?.totpEnabled) {
      return { statusCode: 409, response: { message: 'TOTP is not currently active' } };
    }

    const systemUser = SystemUserService.getSystemUser(
      this.application.environment as never,
      this.application.constants,
    );
    const decryptedSecret = systemUser.decryptData(Buffer.from(userDoc.totpSecret as string, 'hex')).toString('utf-8');

    const totpService = this.application.services.get<TotpService>(ServiceKeys.TOTP);
    if (!totpService.verifyCode(decryptedSecret, code)) {
      return { statusCode: 400, response: { message: 'Invalid TOTP code' } };
    }

    const newSecret = totpService.generateSecret();
    const encryptedNewSecret = (await systemUser.encryptData(Buffer.from(newSecret, 'utf-8'))).toString('hex');

    const docId = userDoc._id ?? idHex;
    await usersCol.updateOne(
      { _id: docId } as never,
      { totpPendingSecret: encryptedNewSecret } as never,
    );

    const provisioningUri = totpService.generateProvisioningUri(
      newSecret,
      user.email,
      (this.application.environment as { host?: string }).host ?? 'BrightChain',
    );

    return {
      statusCode: 200,
      response: { provisioningUri, secret: newSecret, message: 'TOTP reset initiated. Please confirm with the new code.' },
    };
  }

  /**
   * POST /totp/verify — verify a TOTP code using a pending token and issue a full JWT.
   * Does NOT require standard auth middleware — validates the pending token manually.
   */
  @Post('/totp/verify', { auth: false })
  async totpVerify(
    req: Request,
    _res: Response,
    _next: NextFunction,
  ): Promise<IStatusCodeResponse<IApiLoginResponse | IApiMessageResponse>> {
    const token = findAuthToken(req.headers);
    if (!token) {
      return { statusCode: 401, response: { message: getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken) } };
    }

    let decoded: JwtPayload;
    try {
      decoded = jwtVerify(
        token,
        this.application.environment.jwtSecret,
      ) as JwtPayload;
    } catch (err) {
      if (err instanceof JwtTokenExpiredError) {
        return { statusCode: 401, response: { message: getSuiteCoreTranslation(SuiteCoreStringKey.Validation_TokenExpired) } };
      }
      return { statusCode: 401, response: { message: getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken) } };
    }

    if (!decoded || decoded['pendingTotp'] !== true || !decoded['userId']) {
      return { statusCode: 401, response: { message: getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken) } };
    }

    const userId = decoded['userId'] as string;

    const { code } = req.body as { code?: unknown };
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return { statusCode: 400, response: { message: 'Code must be exactly 6 digits' } };
    }

    const sp = ServiceProvider.getInstance();
    const typedId = sp.idProvider.idFromString(userId);
    const idHex = sp.idProvider.toString(typedId, 'hex');

    const usersCol = this.application.db.collection<{
      _id?: string;
      totpEnabled?: boolean;
      totpSecret?: string;
      username?: string;
      email?: string;
    }>(SchemaCollection.User);

    let userDoc = await usersCol.findOne({ _id: idHex } as never);
    if (!userDoc) {
      const dashed = idHex.replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5');
      userDoc = await usersCol.findOne({ _id: dashed } as never);
    }

    if (!userDoc?.totpEnabled || !userDoc.totpSecret) {
      return { statusCode: 401, response: { message: getSuiteCoreTranslation(SuiteCoreStringKey.Validation_InvalidToken) } };
    }

    const systemUser = SystemUserService.getSystemUser(
      this.application.environment as never,
      this.application.constants,
    );
    const decryptedSecret = systemUser.decryptData(Buffer.from(userDoc.totpSecret, 'hex')).toString('utf-8');

    const totpService = this.application.services.get<TotpService>(ServiceKeys.TOTP);
    if (!totpService.verifyCode(decryptedSecret, code)) {
      return { statusCode: 400, response: { message: 'Invalid TOTP code' } };
    }

    const authService = this.application.services.get<BrightDbAuthService<TID>>('auth');
    const memberStore = this.application.services.get<MemberStore>('memberStore');

    let memberName = userDoc.username ?? userId;
    let memberType = MemberType.User;
    try {
      const member = await memberStore.getMember(typedId);
      memberName = member.name;
      memberType = member.type;
    } catch {
      // Fall back to stored username
    }

    // Build the user DTO using the auth provider to get proper RBAC roles
    // BEFORE signing the token so the JWT carries the correct role claims.
    let userDTO: IRequestUserDTO;
    try {
      // The auth service holds a reference to the authentication provider
      // which knows how to look up RBAC roles from the user_roles → roles tables
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authProvider = (authService as any).authProvider;
      const dto = authProvider
        ? await authProvider.buildRequestUserDTO(userId)
        : null;
      if (dto) {
        userDTO = dto;
      } else {
        userDTO = {
          id: userId,
          username: memberName,
          email: userDoc.email ?? '',
          roles: [],
          rolePrivileges: { admin: false, member: true, child: false, system: false },
          emailVerified: true,
          timezone: 'UTC',
          siteLanguage: 'en-US',
          darkMode: false,
          currency: 'USD',
          directChallenge: false,
        };
      }
    } catch {
      userDTO = {
        id: userId,
        username: memberName,
        email: userDoc.email ?? '',
        roles: [],
        rolePrivileges: { admin: false, member: true, child: false, system: false },
        emailVerified: true,
        timezone: 'UTC',
        siteLanguage: 'en-US',
        darkMode: false,
        currency: 'USD',
        directChallenge: false,
      };
    }

    const fullToken = authService.signToken(
      userId,
      memberName,
      memberType,
      userDTO.rolePrivileges?.admin ? ['admin'] : [],
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = this.application.environment as any;
    const serverPublicKey: string = env.systemPublicKeyHex ?? '';

    return {
      statusCode: 200,
      response: {
        user: userDTO,
        token: fullToken,
        serverPublicKey,
        message: getSuiteCoreTranslation(SuiteCoreStringKey.LoggedIn_Success),
      },
    };
  }
}
