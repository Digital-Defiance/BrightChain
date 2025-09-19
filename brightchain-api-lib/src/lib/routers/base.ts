import { Router } from 'express';
import { IApplication } from '../interfaces/application';

export abstract class BaseRouter {
  public readonly router: Router;
  public readonly application: IApplication;
  protected constructor(application: IApplication) {
    this.application = application;
    this.router = Router();
  }
}
