import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
} from '@brightchain/brightchain-lib';
import { Request } from 'express';
import { IApplication } from '../../interfaces/application';
import { BaseController } from '../base';

interface IUserHandlers
  extends TypedHandlers<IApiMessageResponse | ApiErrorResponse> {
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
    req: Request,
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
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return {
      statusCode: 200,
      response: {
        message: 'User login not implemented yet',
      },
    };
  };
}
