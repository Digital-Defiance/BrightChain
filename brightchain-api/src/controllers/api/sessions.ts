/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
} from '@brightchain/brightchain-api-lib';
import { Member } from '@digitaldefiance/ecies-lib';
import { IApplication } from '../../interfaces/application';
import { BaseController } from '../base';

interface ISessionsHandlers extends TypedHandlers {
  getSessions: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for session operations
 */
export class SessionsController extends BaseController<
  IApiMessageResponse | ApiErrorResponse,
  ISessionsHandlers
> {
  constructor(application: IApplication) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.handlers = {
      getSessions: this.handleGetSessions.bind(this),
    };
  }

  public getMemberFromSession(authorization: string): Member {
    // Temporary implementation
    // Temporary implementation - return null for now
    return null as any;
  }

  private handleGetSessions: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return {
      statusCode: 200,
      response: {
        message: 'Sessions not implemented yet',
      },
    };
  };
}
