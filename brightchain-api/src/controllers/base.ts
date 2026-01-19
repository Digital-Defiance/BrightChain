/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ApiResponse,
  RouteConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IApplication } from '../interfaces/application';

export abstract class BaseController<
  TResponse extends ApiResponse,
  THandlers extends TypedHandlers,
> {
  protected application: IApplication;
  protected handlers!: THandlers;
  protected routeDefinitions: RouteConfig<THandlers, string>[] = [];

  constructor(application: IApplication) {
    this.application = application;
    this.initRouteDefinitions();
  }

  protected abstract initRouteDefinitions(): void;
}
