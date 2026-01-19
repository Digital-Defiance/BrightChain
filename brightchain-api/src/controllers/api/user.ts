/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IApplication } from '../../interfaces/application';
import { BaseController } from '../base';

interface IUserHandlers extends TypedHandlers {
  register: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
  login: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for user-related operations
 */
export class UserController extends BaseController<
  IApiMessageResponse | ApiErrorResponse,
  IUserHandlers
> {
  public router: any; // Temporary router property

  constructor(application: IApplication) {
    super(application);
    this.router = {}; // Temporary implementation
  }

  protected initRouteDefinitions(): void {
    this.handlers = {
      register: this.handleRegister.bind(this),
      login: this.handleLogin.bind(this),
    };
  }

  private handleRegister: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return {
      statusCode: 201,
      response: {
        message: 'User registration not implemented yet',
      },
    };
  };

  private handleLogin: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return {
      statusCode: 200,
      response: {
        message: 'User login not implemented yet',
      },
    };
  };
}
