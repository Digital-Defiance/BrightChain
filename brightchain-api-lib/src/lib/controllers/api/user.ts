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
    ];

    this.handlers = {
      register: this.handleRegister.bind(this),
      login: this.handleLogin.bind(this),
      profile: this.handleProfile.bind(this),
    };
  }

  private handleRegister: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
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
  };

  private handleLogin: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
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
  };

  private handleProfile: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    const user = (req as { user?: unknown }).user;

    if (!user) {
      return {
        statusCode: 401,
        response: {
          message: 'Not authenticated',
          error: 'Not authenticated',
        },
      };
    }

    return {
      statusCode: 200,
      response: {
        message: 'Profile retrieved',
        user,
      } as IApiMessageResponse,
    };
  };
}
