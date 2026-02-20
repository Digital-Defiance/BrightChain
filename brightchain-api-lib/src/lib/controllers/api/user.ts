import {
  Checksum,
  EnergyAccountStore,
  IAuthResponse,
  ILoginRequest,
  IRegistrationRequest,
  IUserProfile,
  IUserProfileMetadata,
  MemberStore,
} from '@brightchain/brightchain-lib';
import { SecureString } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  IAuthApiResponse,
  IUserProfileApiResponse,
} from '../../interfaces/userApiResponse';
import { AuthService } from '../../services';
import { DefaultBackendIdType } from '../../shared-types';
import {
  validateLogin,
  validateRegistration,
} from '../../validation/userValidation';
import { BaseController } from '../base';

interface IUserHandlers extends TypedHandlers {
  register: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  login: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  profile: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  updateProfile: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

interface IUpdateProfileRequest {
  displayName?: string;
  settings?: {
    autoReplication?: boolean;
    minRedundancy?: number;
    preferredRegions?: string[];
  };
}

export class UserController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  IUserHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/register', {
        handlerKey: 'register',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/login', {
        handlerKey: 'login',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/profile', {
        handlerKey: 'profile',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('put', '/profile', {
        handlerKey: 'updateProfile',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      register: this.handleRegister.bind(this),
      login: this.handleLogin.bind(this),
      profile: this.handleProfile.bind(this),
      updateProfile: this.handleUpdateProfile.bind(this),
    };
  }

  private async handleRegister(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    // Validate request body before processing
    const validation = validateRegistration(req.body);
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: 'Validation failed',
          errors: validation.errors,
        } as IApiMessageResponse,
      };
    }

    try {
      // Validation already confirmed these fields exist and are valid strings
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
          message: 'Registration successful',
          data: authResponse,
        } as IAuthApiResponse,
      };
    } catch (error) {
      return {
        statusCode: 400,
        response: {
          message:
            error instanceof Error ? error.message : 'Registration failed',
          error: error instanceof Error ? error.message : 'Registration failed',
        },
      };
    }
  }

  private async handleLogin(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    // Validate request body before processing
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: 'Validation failed',
          errors: validation.errors,
        } as IApiMessageResponse,
      };
    }

    try {
      // Validation already confirmed these fields exist and are valid strings
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
          message: 'Login successful',
          data: authResponse,
        } as IAuthApiResponse,
      };
    } catch {
      return {
        statusCode: 401,
        response: {
          message: 'Invalid credentials',
          error: 'Invalid credentials',
        },
      };
    }
  }

  private async handleProfile(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as { user?: { memberId: string; username: string } })
      .user;

    if (!user) {
      return {
        statusCode: 401,
        response: {
          message: 'Not authenticated',
          error: 'Not authenticated',
        },
      };
    }

    try {
      // Get energy account for balance and reputation
      const energyStore =
        this.application.services.get<EnergyAccountStore>('energyStore');
      const memberChecksum = Checksum.fromHex(user.memberId);
      const energyAccount = await energyStore.getOrCreate(memberChecksum);

      // Try to get member email from MemberStore
      let email = '';
      const memberStore =
        this.application.services.get<MemberStore>('memberStore');
      try {
        if (memberStore) {
          const member = await memberStore.getMember(
            memberChecksum.toUint8Array(),
          );
          email = member.email.toString();
        }
      } catch {
        // Member lookup failed, continue with empty email
      }

      // Try to get member profile metadata from MemberStore if available
      let memberProfile: IUserProfileMetadata | undefined;
      try {
        if (memberStore) {
          const profile = await memberStore.getMemberProfile(
            memberChecksum.toUint8Array(),
          );
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
        // MemberStore profile not available, continue without profile metadata
      }

      const userProfile: IUserProfile<string> = {
        memberId: user.memberId,
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
          message: 'Profile retrieved',
          data: userProfile,
        } as IUserProfileApiResponse,
      };
    } catch {
      return {
        statusCode: 500,
        response: {
          message: 'Failed to retrieve profile',
          error: 'Failed to retrieve profile',
        },
      };
    }
  }

  private async handleUpdateProfile(
    req: Parameters<
      ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as { user?: { memberId: string; username: string } })
      .user;

    if (!user) {
      return {
        statusCode: 401,
        response: {
          message: 'Not authenticated',
          error: 'Not authenticated',
        },
      };
    }

    try {
      const updateData = req.body as unknown as IUpdateProfileRequest;
      const memberChecksum = Checksum.fromHex(user.memberId);
      const memberIdBytes = memberChecksum.toUint8Array();

      // Persist settings via MemberStore — let errors propagate to return 500
      const memberStore =
        this.application.services.get<MemberStore>('memberStore');
      if (memberStore && updateData.settings) {
        const completeSettings = {
          autoReplication: updateData.settings.autoReplication ?? true,
          minRedundancy: updateData.settings.minRedundancy ?? 3,
          preferredRegions: updateData.settings.preferredRegions ?? [],
        };
        await memberStore.updateMember(memberIdBytes, {
          id: memberIdBytes,
          privateChanges: {
            settings: completeSettings,
          },
        });
      }

      // Get updated energy account for response
      const energyStore =
        this.application.services.get<EnergyAccountStore>('energyStore');
      const energyAccount = await energyStore.getOrCreate(memberChecksum);

      // Try to get member email from MemberStore
      let email = '';
      try {
        if (memberStore) {
          const member = await memberStore.getMember(memberIdBytes);
          email = member.email.toString();
        }
      } catch {
        // Member lookup failed, continue with empty email
      }

      // Try to get member profile metadata from MemberStore
      let memberProfile: IUserProfileMetadata | undefined;
      try {
        if (memberStore) {
          const profile = await memberStore.getMemberProfile(memberIdBytes);
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
        // MemberStore profile not available, continue without profile metadata
      }

      const userProfile: IUserProfile<string> = {
        memberId: user.memberId,
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
          message: 'Profile updated successfully',
          data: userProfile,
        } as IUserProfileApiResponse,
      };
    } catch {
      return {
        statusCode: 500,
        response: {
          message: 'Failed to update profile',
          error: 'Failed to update profile',
        },
      };
    }
  }
}
