import { PlatformID } from '@digitaldefiance/ecies-lib';
import { PermissionFlag } from '../../enumerations/permission-flag';

/**
 * A named custom permission set composed of atomic permission flags.
 * Organizations can define custom sets beyond the built-in levels.
 */
export interface IPermissionSetBase<TID extends PlatformID> {
  id: TID;
  name: string;
  organizationId?: TID;
  flags: PermissionFlag[];
  createdBy: TID;
  createdAt: Date | string;
  updatedAt: Date | string;
}
