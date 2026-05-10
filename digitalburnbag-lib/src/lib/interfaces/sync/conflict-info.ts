import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ConflictResolution } from '../../enumerations/sync-status';

/**
 * Information about a sync conflict between local and remote versions.
 */
export interface IConflictInfo<TID extends PlatformID> {
  /** The file ID with the conflict */
  fileId: TID;
  /** Local file path */
  localPath: string;
  /** Local modification timestamp */
  localModifiedAt: Date | string;
  /** Remote modification timestamp */
  remoteModifiedAt: Date | string;
  /** Local version hash */
  localHash: string;
  /** Remote version hash */
  remoteHash: string;
  /** User who modified the remote version */
  remoteModifiedBy: TID;
  /** Resolution chosen (undefined until resolved) */
  resolution?: ConflictResolution;
}
