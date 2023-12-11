/**
 * @fileoverview BrightDB-specific application interface.
 * Extends the base IApplication with BrightDB-specific capabilities.
 * Parallel to upstream's IMongoApplication.
 *
 * Use this interface in controllers, services, and middlewares that require
 * direct access to the BrightDB document store or BrightDB configuration.
 *
 * @module interfaces/bright-db-application
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IApplication } from '@digitaldefiance/node-express-suite';
import type {
  DocumentCollection,
  DocumentRecord,
  DocumentStore,
} from '../datastore/document-store';
import type { BrightDbEnvironment } from '../environment';

/**
 * BrightDB-specific application interface.
 * Extends IApplication with the BrightDB document store and collection access.
 *
 * Use this interface when your code needs:
 *  - `application.db` (the BrightDB-backed document store)
 *  - `application.getModel<T>(name)` (BrightDB collection lookup)
 *  - `application.environment` typed as BrightDbEnvironment
 *
 * Non-BrightDB applications should use the base IApplication.
 */
export interface IBrightDbApplication<TID extends PlatformID = Buffer>
  extends IApplication<TID> {
  /** The BrightDB-backed document store */
  readonly db: DocumentStore;
  /** Retrieve a BrightDB collection by name */
  getModel<U extends DocumentRecord>(modelName: string): DocumentCollection<U>;
  /** The BrightDB environment */
  readonly environment: BrightDbEnvironment<TID>;
}
