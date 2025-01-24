import { IApplication } from '../interfaces/application';

export class BaseService {
  protected application: IApplication;

  constructor(application: IApplication) {
    this.application = application;
  }
}
