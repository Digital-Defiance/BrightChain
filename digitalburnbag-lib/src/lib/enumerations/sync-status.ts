/**
 * Sync status for individual files/folders in the virtual drive.
 */
export enum SyncStatus {
  /** File is fully synced with server */
  Synced = 'synced',
  /** File is currently being uploaded or downloaded */
  Syncing = 'syncing',
  /** File exists only on server; placeholder shown locally */
  CloudOnly = 'cloud-only',
  /** File is available locally but not yet pushed to server */
  LocalOnly = 'local-only',
  /** Sync failed — requires user attention */
  Error = 'error',
  /** File has conflicting edits on local and remote */
  Conflict = 'conflict',
  /** File is queued for sync when network is available */
  Queued = 'queued',
}

/**
 * Conflict resolution strategy chosen by the user.
 */
export enum ConflictResolution {
  /** Keep both versions (rename local copy) */
  KeepBoth = 'keep-both',
  /** Keep the local version, discard remote */
  KeepLocal = 'keep-local',
  /** Keep the remote version, discard local */
  KeepRemote = 'keep-remote',
  /** Attempt automatic merge (text files only) */
  Merge = 'merge',
}

/**
 * Type of file system event detected by the watcher.
 */
export enum FileSystemEventType {
  Created = 'created',
  Modified = 'modified',
  Deleted = 'deleted',
  Moved = 'moved',
  Renamed = 'renamed',
}

/**
 * Type of queued offline operation.
 */
export enum OfflineOperationType {
  Upload = 'upload',
  Download = 'download',
  Delete = 'delete',
  Move = 'move',
  Rename = 'rename',
  UpdateMetadata = 'update-metadata',
  UpdateACL = 'update-acl',
}
