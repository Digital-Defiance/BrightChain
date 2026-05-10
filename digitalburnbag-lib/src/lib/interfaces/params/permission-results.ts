import { PermissionFlag } from '../../enumerations/permission-flag';

/**
 * Resolved effective permission — includes the atomic flags the user actually has.
 */
export interface IEffectivePermission {
  flags: PermissionFlag[];
  source: 'explicit' | 'inherited' | 'share_link' | 'organization';
  sourceId?: string;
}
