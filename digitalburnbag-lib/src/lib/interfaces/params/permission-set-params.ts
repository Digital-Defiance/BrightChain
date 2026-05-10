import { PlatformID } from '@digitaldefiance/ecies-lib';
import { PermissionFlag } from '../../enumerations/permission-flag';

/**
 * Parameters for creating a custom permission set.
 */
export interface ICreatePermissionSetParams<TID extends PlatformID> {
  name: string;
  flags: PermissionFlag[];
  organizationId?: TID;
}
