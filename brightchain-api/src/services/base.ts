import { IApplication } from '../interfaces/application';

/**
 * Base service class
 */
export abstract class BaseService {
  protected application: IApplication;

  constructor(application: IApplication) {
    this.application = application;
  }
}