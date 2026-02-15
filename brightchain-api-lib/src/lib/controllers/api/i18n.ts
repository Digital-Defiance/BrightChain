/* eslint-disable @typescript-eslint/no-unused-vars */
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

interface II18nHandlers extends TypedHandlers {
  getStrings: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for i18n operations
 */
export class I18nController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  II18nHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.handlers = {
      getStrings: this.handleGetStrings.bind(this),
    };
  }

  private async handleGetStrings(
    req: Parameters<ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> {
    return {
      statusCode: 200,
      response: {
        message: 'I18n strings not implemented yet',
      },
    };
  }
}
