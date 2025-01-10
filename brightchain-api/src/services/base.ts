import { IApplication } from '../interfaces/application';

export class BaseService {
  protected readonly application: IApplication;

  public constructor(application: IApplication) {
    this.application = application;
  }
}
