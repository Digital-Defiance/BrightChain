import { Router } from 'express';
import { IApplication } from '../interfaces/application';

export abstract class BaseRouter {
  public readonly router: Router;
  public readonly application: IApplication;
  protected constructor(application: IApplication) {
    this.router = Router();
    this.application = application;
  }
}
