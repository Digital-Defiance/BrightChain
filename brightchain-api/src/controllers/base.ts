import {
  ApiResponse,
  RouteConfig,
  TypedHandlers,
} from '@BrightChain/brightchain-lib';
import { IApplication } from '../interfaces/application';

export abstract class BaseController<
  TResponse extends ApiResponse,
  THandlers extends TypedHandlers<TResponse>,
> {
  protected application: IApplication;
  protected handlers!: THandlers;
  protected routeDefinitions: RouteConfig<TResponse, THandlers>[] = [];

  constructor(application: IApplication) {
    this.application = application;
    this.initRouteDefinitions();
  }

  protected abstract initRouteDefinitions(): void;
}
