/**
 * @fileoverview BrightDB-specific base service extending the database-agnostic
 * BaseService. Constrains TApplication to IBrightDbApplication so subclasses
 * get type-safe access to .db, .getModel(), and .environment.
 * Parallel to upstream's MongoBaseService.
 *
 * @module services/bright-db-base-service
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { BaseService } from '@digitaldefiance/node-express-suite';
import type { IBrightDbApplication } from '../interfaces/bright-db-application';

/**
 * BrightDB-specific base service.
 * Extends BaseService with TApplication constrained to IBrightDbApplication.
 *
 * Use this for services that need BrightDB-specific access (application.db,
 * application.getModel, application.environment). Services that are
 * database-agnostic should extend BaseService directly.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TApplication - Must extend IBrightDbApplication
 */
export class BrightDbBaseService<
  TID extends PlatformID = Buffer,
  TApplication extends IBrightDbApplication<TID> = IBrightDbApplication<TID>,
> extends BaseService<TID, TApplication> {
  constructor(application: TApplication) {
    super(application);
  }
}
