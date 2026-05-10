import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  IHasCreation,
  IHasCreator,
  IHasId,
} from '@digitaldefiance/suite-core-lib';
import { SourceType } from '../../enumerations/source-type';

export interface ICanaryChirpBase<
  I extends PlatformID,
  D extends Date | string,
  S extends SourceType | string,
> extends IHasId<I>,
    IHasCreation<D>,
    IHasCreator<I> {
  /**
   * The ID of the canary associated with the chirp
   */
  canaryId: I;
  /**
   * The type of chirp, indicating the nature of the user activity
   */
  type: S;
}
