import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { BaseService as UpstreamBaseService } from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../interfaces/application';
import { DefaultBackendIdType } from '../shared-types';

/**
 * Base service class
 */
export abstract class BaseService<
  TID extends PlatformID = DefaultBackendIdType,
> extends UpstreamBaseService<TID, IBrightChainApplication<TID>> {
  protected override readonly application: IBrightChainApplication<TID>;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.application = application;
  }
}
