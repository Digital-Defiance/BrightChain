/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
} from '@brightchain/brightchain-api-lib';
import { IApplication } from '../../interfaces/application';
import { BaseController } from '../base';

interface II18nHandlers extends TypedHandlers {
  getStrings: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for i18n operations
 */
export class I18nController extends BaseController<
  IApiMessageResponse | ApiErrorResponse,
  II18nHandlers
> {
  public router: any; // Temporary router property

  constructor(application: IApplication) {
    super(application);
    this.router = {}; // Temporary implementation
  }

  protected initRouteDefinitions(): void {
    this.handlers = {
      getStrings: this.handleGetStrings.bind(this),
    };
  }

  private handleGetStrings: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  > = async (
    req,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return {
      statusCode: 200,
      response: {
        message: 'I18n strings not implemented yet',
      },
    };
  };
}
