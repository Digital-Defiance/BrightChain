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

interface IMembersHandlers extends TypedHandlers {
  getMembers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for member operations
 */
export class MembersController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  IMembersHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.handlers = {
      getMembers: this.handleGetMembers.bind(this),
    };
  }

  private handleGetMembers: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    _req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return {
      statusCode: 200,
      response: {
        message: 'Members not implemented yet',
      },
    };
  };
}
