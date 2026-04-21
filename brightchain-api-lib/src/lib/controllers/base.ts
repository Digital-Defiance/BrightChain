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
> extends UpstreamBaseController<
  T,
  THandler,
  TLanguage,
  TID,
  IBrightChainApplication<TID>
> {
  public constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Pre-populate the ECIES public key cache for one or more members.
   * Must be called before any service operation that wraps epoch keys
   * (create group/channel/server, add members, join, redeem invite, send DM).
   *
   * No-op when the ensureMemberPublicKey service is not registered
   * (e.g. in unit tests without full application wiring).
   */
  protected async ensureMemberKeys(...memberIds: string[]): Promise<void> {
    const services = this.application.services;
    if (!services || typeof services.has !== 'function' || !services.has('ensureMemberPublicKey')) return;
    const ensureKey = services.get('ensureMemberPublicKey') as (id: string) => Promise<void>;
    if (!ensureKey) return;
    await Promise.all(memberIds.map((id) => ensureKey(id)));
  }
}
