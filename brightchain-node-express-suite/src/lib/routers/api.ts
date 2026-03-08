/**
 * @fileoverview Base API router for BrightDB-backed applications.
 *
 * Mounts the BrightDbUserController (register, login, verify, profile,
 * settings, change-password, recover, logout, request-direct-login,
 * refresh-token) on the Express router.
 *
 * Domain-specific routers (e.g. BrightChain's ApiRouter with blocks,
 * energy, messaging, etc.) extend this class and add their controllers.
 *
 * @module routers/api
 */

import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { BaseRouter } from '@digitaldefiance/node-express-suite';
import { BrightDbUserController } from '../controllers/user';
import type { IBrightDbApplication } from '../interfaces/bright-db-application';

/**
 * Base API router for BrightDB-backed applications.
 *
 * Provides user authentication routes out of the box. Subclasses can
 * override `createUserController()` to provide a domain-specific
 * UserController, and add domain-specific controllers in their constructor.
 */
export class BrightDbApiRouter<
  TID extends PlatformID = Buffer,
  TApplication extends IBrightDbApplication<TID> = IBrightDbApplication<TID>,
> extends BaseRouter<TID, TApplication> {
  protected readonly userController: BrightDbUserController<TID>;

  constructor(application: TApplication) {
    super(application);

    this.userController = this.createUserController(application);
    this.router.use('/user', this.userController.router);
  }

  /**
   * Factory method for creating the user controller.
   * Override in subclasses to provide a domain-specific UserController
   * (e.g. one that adds backup codes, direct-challenge, etc.).
   */
  protected createUserController(
    application: TApplication,
  ): BrightDbUserController<TID> {
    return new BrightDbUserController<TID>(application);
  }
}
