/* eslint-disable @nx/enforce-module-boundaries */
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
} from '@brightchain/brightchain-api-lib';
import { IApplication } from '../../interfaces/application';
import { BaseController } from '../base';

interface IMembersHandlers extends TypedHandlers {
  getMembers: ApiRequestHandler<IApiMessageResponse | ApiErrorResponse>;
}

/**
 * Controller for member operations
 */
export class MembersController extends BaseController<
  IApiMessageResponse | ApiErrorResponse,
  IMembersHandlers
> {
  constructor(application: IApplication) {
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
