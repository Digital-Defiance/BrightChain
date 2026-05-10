import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  IHasId,
  IHasTimestampOwners,
  IHasTimestamps,
} from '@digitaldefiance/suite-core-lib';
import { IACLBase } from './acl';

export interface IFolderBase<I extends PlatformID, D extends Date | string>
  extends IHasId<I>,
    IHasTimestamps<D>,
    IHasTimestampOwners<I> {
  name: string;
  acl?: IACLBase<I>;
}
