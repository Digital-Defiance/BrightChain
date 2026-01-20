/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Member } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

interface ISessionsHandlers extends TypedHandlers {
  getSessions: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for session operations
 */
export class SessionsController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  ISessionsHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
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
