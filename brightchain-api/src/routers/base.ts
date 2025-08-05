import { Router } from 'express';
import { IApplication } from '../interfaces/application';

/**
 * Base router class
 */
export abstract class BaseRouter {
  protected router: Router;
  protected application: IApplication;

  constructor(application: IApplication) {
    this.application = application;
    this.router = Router();
  }
}