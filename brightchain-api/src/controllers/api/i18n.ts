import {
  ApiErrorResponse,
  ApiRequestHandler,
  ApiResponse,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
} from '@BrightChain/brightchain-lib';
import { Request } from 'express';
import { IApplication } from '../../interfaces/application';
import { BaseController } from '../base';

interface II18nHandlers extends TypedHandlers<IApiMessageResponse | ApiErrorResponse> {
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
    req: Request,
  ): Promise<IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>> => {
    return {
      statusCode: 200,
      response: {
        message: 'I18n strings not implemented yet',
      },
    };
  };
}