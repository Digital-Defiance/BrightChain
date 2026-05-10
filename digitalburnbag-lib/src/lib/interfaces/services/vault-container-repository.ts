import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IVaultContainerBase } from '../bases/vault-container';

/**
 * Repository interface abstracting BrightDB access for vault container operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation.
 */
export interface IVaultContainerRepository<TID extends PlatformID> {
  /** Get a vault container by ID, or null if not found */
  getContainerById(containerId: TID): Promise<IVaultContainerBase<TID> | null>;

  /** Get all vault containers for a user */
  getContainersByOwner(ownerId: TID): Promise<IVaultContainerBase<TID>[]>;

  /** Get all public vault containers, optionally paginated */
  getPublicContainers(opts?: {
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: 'name' | 'createdAt' | 'fileCount';
    sortDir?: 'asc' | 'desc';
  }): Promise<{ containers: IVaultContainerBase<TID>[]; total: number }>;

  /** Create a new vault container */
  createContainer(
    container: IVaultContainerBase<TID>,
  ): Promise<IVaultContainerBase<TID>>;

  /** Update a vault container */
  updateContainer(
    containerId: TID,
    updates: Partial<IVaultContainerBase<TID>>,
  ): Promise<IVaultContainerBase<TID>>;

  /** Check if a container name already exists for a user */
  containerNameExists(name: string, ownerId: TID): Promise<boolean>;

  /** Get all file IDs within a container (recursive through all folders) */
  getAllFileIdsInContainer(containerId: TID): Promise<TID[]>;

  /** Get all files within a container with metadata */
  getAllFilesInContainer(containerId: TID): Promise<IFileMetadataBase<TID>[]>;

  /** Count files in a container */
  getFileCount(containerId: TID): Promise<number>;

  /** Count folders in a container */
  getFolderCount(containerId: TID): Promise<number>;
}
