import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ISyncEvent } from './sync-event';

/**
 * Watches the local file system for changes and emits sync events.
 */
export interface IFileSystemWatcher<TID extends PlatformID> {
  /** Start watching the given directory */
  start(rootPath: string): Promise<void>;
  /** Stop watching */
  stop(): Promise<void>;
  /** Whether the watcher is currently active */
  isWatching(): boolean;
  /** Register a callback for file system events */
  onEvent(handler: (event: ISyncEvent<TID>) => void): void;
  /** Remove a previously registered event handler */
  offEvent(handler: (event: ISyncEvent<TID>) => void): void;
}
