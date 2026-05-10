import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  IHasId,
  IHasTimestampOwners,
  IHasTimestamps,
} from '@digitaldefiance/suite-core-lib';
import { IACLBase } from './acl';

export interface IFileBase<I extends PlatformID, D extends Date | string>
  extends IHasId<I>,
    IHasTimestamps<D>,
    IHasTimestampOwners<I> {
  folderId: I;
  fileName: string;
  fileType: string;
  description?: string;
  encryptedKey: string;
  acl?: IACLBase<I>;
}
