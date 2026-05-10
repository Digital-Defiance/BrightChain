import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ISyncConfig } from './sync-config';

/**
 * Abstraction for the virtual drive mount (FUSE on Linux/macOS, ProjFS on Windows).
 */
export interface IVirtualDriveMount<TID extends PlatformID> {
  /** Mount the virtual drive at the configured path */
  mount(config: ISyncConfig<TID>): Promise<void>;
  /** Unmount the virtual drive */
  unmount(): Promise<void>;
  /** Whether the drive is currently mounted */
  isMounted(): boolean;
  /** Get the mount path */
  getMountPath(): string;
  /**
   * Hydrate a placeholder file — download content on demand.
   * Called when the OS requests content for a cloud-only file.
   */
  hydrateFile(localPath: string, fileId: TID): Promise<void>;
  /**
   * Dehydrate a file — replace local content with a placeholder.
   * Frees local disk space while keeping the file visible.
   */
  dehydrateFile(localPath: string): Promise<void>;
}
