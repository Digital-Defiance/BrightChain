import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IDatabasePort,
  IServicesPort,
  BaseService as UpstreamBaseService,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../interfaces/application';
import { DefaultBackendIdType } from '../shared-types';

/**
 * Base service class
 */
export abstract class BaseService<
  TID extends PlatformID = DefaultBackendIdType,
  TApplication extends IServicesPort &
    IDatabasePort = IBrightChainApplication<TID>,
> extends UpstreamBaseService<TID, TApplication> {
  constructor(application: TApplication) {
    super(application);
  }
}
