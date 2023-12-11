import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication } from '@digitaldefiance/node-express-suite';
import { Router } from 'express';
import { DefaultBackendIdType } from '../shared-types';

export abstract class BaseRouter<
  TID extends PlatformID = DefaultBackendIdType,
> {
  public readonly router: Router;
  public readonly application: IApplication<TID>;
  protected constructor(application: IApplication<TID>) {
    this.application = application;
    this.router = Router();
  }
}
