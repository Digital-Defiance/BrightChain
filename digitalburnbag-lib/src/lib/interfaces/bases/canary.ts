import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  IHasCreation,
  IHasCreator,
  IHasId,
} from '@digitaldefiance/suite-core-lib';

/**
 * Represents a signal for when a user activity occurs from a given source
 */
export interface ICanaryBase<I extends PlatformID, D extends Date | string>
  extends IHasId<I>,
    IHasCreation<D>,
    IHasCreator<I> {
  /**
   * The unique name of the canary
   */
  name: string;
  /**
   * The description of the canary
   */
  description: string;
  /**
   * Whether the canary status can be viewed by anyone
   * {username}.canaryprotocol.io/canary/id/{canaryId} or {username}.canaryprotocol.io/canary/name/{canaryName}
   */
  publicStatus: boolean;
}
