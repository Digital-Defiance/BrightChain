import { BlocksController } from '../controllers/api/blocks';
import { CBLController } from '../controllers/api/cbl';
import { I18nController } from '../controllers/api/i18n';
import { QuorumController } from '../controllers/api/quorum';
import { UserController } from '../controllers/api/user';
import { IApplication } from '../interfaces/application';
import { BaseRouter } from './base';

/**
 * Router for the API
 *
 * This router wires up all API controllers:
 * - /api/blocks - Block storage operations (store, retrieve, delete, brighten)
 * - /api/quorum - Quorum member management and document sealing/unsealing
 * - /api/cbl - Constituent Block List operations
 * - /api/user - User management
 * - /api/i18n - Internationalization
 */
export class ApiRouter extends BaseRouter {
  private readonly blocksController: BlocksController;
  private readonly userController: UserController;
  private readonly i18nController: I18nController;
  private readonly quorumController: QuorumController;
  private readonly cblController: CBLController;

  constructor(application: IApplication) {
    super(application);
    this.blocksController = new BlocksController(application);
    this.userController = new UserController(application);
    this.i18nController = new I18nController(application);
    this.quorumController = new QuorumController(application);
    this.cblController = new CBLController(application);

    // Wire up all routes
    this.router.use('/blocks', this.blocksController.router);
    this.router.use('/i18n', this.i18nController.router);
    this.router.use('/user', this.userController.router);
    this.router.use('/quorum', this.quorumController.router);
    this.router.use('/cbl', this.cblController.router);
  }
}
