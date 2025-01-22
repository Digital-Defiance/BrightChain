import { I18nController } from '../controllers/api/i18n';
import { UserController } from '../controllers/api/user';
import { IApplication } from '../interfaces/application';
import { BaseRouter } from './base';

/**
 * Router for the API
 */
export class ApiRouter extends BaseRouter {
  private readonly userController: UserController;
  private readonly i18nController: I18nController;

  constructor(application: IApplication) {
    super(application);
    this.userController = new UserController(application);
    this.i18nController = new I18nController(application);
    this.router.use('/i18n', this.i18nController.router);
    this.router.use('/user', this.userController.router);
  }
}
