import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileSystemEventType } from '../../enumerations/sync-status';

/**
 * Represents a file system event detected by the local watcher.
 */
export interface ISyncEvent<TID extends PlatformID> {
  /** Unique event ID */
  eventId: TID;
  /** Type of file system event */
  eventType: FileSystemEventType;
  /** Local file path relative to the sync root */
  localPath: string;
  /** Previous path (for move/rename events) */
  previousPath?: string;
  /** Associated file ID on the server (if known) */
  fileId?: TID;
  /** Associated folder ID on the server (if known) */
  folderId?: TID;
  /** Timestamp of the event */
  timestamp: Date | string;
  /** File size in bytes (for create/modify) */
  fileSize?: number;
  /** Whether the event targets a directory */
  isDirectory: boolean;
}
