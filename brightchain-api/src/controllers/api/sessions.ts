import {
  ApiErrorResponse,
  ApiRequestHandler,
  ApiResponse,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
  BrightChainMember,
} from '@BrightChain/brightchain-lib';
import { Request } from 'express';
import { IApplication } from '../../interfaces/application';
import { BaseController } from '../base';

interface ISessionsHandlers extends TypedHandlers<IApiMessageResponse | ApiErrorResponse> {
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

  public getMemberFromSession(authorization: string): BrightChainMember {
    // Temporary implementation
    // Temporary implementation - return null for now
    return null as any;
  }

  private handleGetSessions: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return {
      statusCode: 200,
      response: {
        message: 'Sessions not implemented yet',
      },
    };
  };
}