import {
  Checksum,
  EnergyAccountStore,
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
import { AuthService } from '../../services';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

interface IUserHandlers extends TypedHandlers {
  register: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  login: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  profile: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  updateProfile: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

interface IRegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface ILoginRequest {
  username: string;
  password: string;
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
    req: Parameters<ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { username, email, password } =
        req.body as unknown as IRegisterRequest;

      const authService = this.application.services.get<AuthService>('auth');
      const result = await authService.register(
        username,
        email,
        new SecureString(password),
      );

      return {
        statusCode: 201,
        response: {
          message: 'Registration successful',
          token: result.token,
          memberId: result.memberId,
          energyBalance: result.energyBalance,
        } as IApiMessageResponse,
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
    req: Parameters<ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    try {
      const { username, password } = req.body as unknown as ILoginRequest;

      const authService = this.application.services.get<AuthService>('auth');
      const result = await authService.login({
        username,
        password: new SecureString(password),
      });

      return {
        statusCode: 200,
        response: {
          message: 'Login successful',
          token: result.token,
          memberId: result.memberId,
          energyBalance: result.energyBalance,
        } as IApiMessageResponse,
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
    req: Parameters<ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as { user?: { memberId: string } }).user;

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

      // Try to get member profile from MemberStore if available
      let memberProfile = null;
      try {
        const memberStore =
          this.application.services.get<MemberStore>('memberStore');
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
        // MemberStore profile not available, continue with basic profile
      }

      return {
        statusCode: 200,
        response: {
          message: 'Profile retrieved',
          memberId: user.memberId,
          energyBalance: energyAccount.balance,
          availableBalance: energyAccount.availableBalance,
          earned: energyAccount.earned,
          spent: energyAccount.spent,
          reserved: energyAccount.reserved,
          reputation: energyAccount.reputation,
          createdAt: energyAccount.createdAt.toISOString(),
          lastUpdated: energyAccount.lastUpdated.toISOString(),
          ...(memberProfile && { profile: memberProfile }),
        } as IApiMessageResponse,
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
    req: Parameters<ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    const user = (req as { user?: { memberId: string } }).user;

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

      // Try to update member profile in MemberStore if available
      let profileUpdated = false;
      try {
        const memberStore =
          this.application.services.get<MemberStore>('memberStore');
        if (memberStore && updateData.settings) {
          // Build complete settings object with defaults for missing values
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
          profileUpdated = true;
        }
      } catch {
        // MemberStore update not available, continue
      }

      // Get updated energy account for response
      const energyStore =
        this.application.services.get<EnergyAccountStore>('energyStore');
      const energyAccount = await energyStore.getOrCreate(memberChecksum);

      return {
        statusCode: 200,
        response: {
          message: profileUpdated
            ? 'Profile updated successfully'
            : 'Profile update partially completed',
          memberId: user.memberId,
          energyBalance: energyAccount.balance,
          reputation: energyAccount.reputation,
          updated: profileUpdated,
        } as IApiMessageResponse,
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
