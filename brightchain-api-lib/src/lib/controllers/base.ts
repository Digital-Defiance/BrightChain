import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiResponse,
  BaseController as UpstreamBaseController,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../interfaces/application';

export abstract class BaseController<
  TID extends PlatformID,
  T extends ApiResponse,
  THandler extends object,
  TLanguage extends string,
> extends UpstreamBaseController<T, THandler, TLanguage, TID> {
  public override readonly application: IBrightChainApplication<TID>;

  public constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.application = application;
  }
}
