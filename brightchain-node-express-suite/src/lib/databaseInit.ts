/**
 * @fileoverview Generic BrightChain database initialization function.
 *
 * This is the Suite's generic version of the database init — it creates
 * the block store and BrightDb instance based on environment configuration,
 * but does NOT create domain-specific stores (MemberStore, EnergyAccountStore).
 *
 * Domain-specific model registrations are passed in via an optional callback.
 *
 * @module databaseInit
 */

import type {
  IBlockStore,
  ICloudBlockStoreConfig,
  IInitResult,
} from '@brightchain/brightchain-lib';
import {
  BlockSize,
  BlockStoreFactory,
  BlockStoreType,
} from '@brightchain/brightchain-lib';
import { BrightDb } from '@brightchain/db';
import { constants as fsConstants } from 'fs';
import { access, mkdir } from 'fs/promises';

/**
 * Minimal environment interface required by the generic database init.
 * Consumers pass an object satisfying this shape — it does NOT depend on
 * api-lib's full Environment class.
 */
export interface IDatabaseInitEnvironment {
  blockStorePath?: string;
  blockStoreBlockSizes: readonly BlockSize[];
  blockStoreType: BlockStoreType;
  devDatabasePoolName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  azureConfig?: ICloudBlockStoreConfig & Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s3Config?: ICloudBlockStoreConfig & Record<string, any>;
  memberPoolName: string;
}

/**
 * The backend data returned on successful generic database init.
 * Does NOT include domain-specific stores — those are added by the caller.
 */
export interface IGenericInitData {
  blockStore: IBlockStore;
  db: BrightDb;
}

/**
 * Validate that the given directory path exists and is accessible.
 * If the directory does not exist, attempt to create it recursively.
 * Throws if the path is inaccessible after creation attempt.
 */
async function validateDataDir(dirPath: string): Promise<void> {
  try {
    await access(dirPath, fsConstants.R_OK | fsConstants.W_OK);
  } catch {
    // Directory doesn't exist or isn't accessible — try to create it
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (mkdirError: unknown) {
      const message =
        mkdirError instanceof Error ? mkdirError.message : String(mkdirError);
      throw new Error(
        `Cannot create or access data directory "${dirPath}": ${message}`,
      );
    }
  }
}

/**
 * Initialize the BrightChain database stack (generic version).
 *
 * Creates a block store and BrightDb instance based on environment config.
 * Optionally calls a `modelRegistrations` callback after db.connect() so
 * that the caller can register domain-specific models (e.g. energy_accounts).
 *
 * @param environment - Object satisfying IDatabaseInitEnvironment
 * @param options.modelRegistrations - Optional callback to register models on the BrightDb instance.
 *        Receives both the db and blockStore so callers can create domain-specific stores.
 * @returns An IInitResult containing { blockStore, db } on success,
 *          or a failure result with a descriptive error message.
 */
export async function brightchainDatabaseInit(
  environment: IDatabaseInitEnvironment,
  options?: {
    modelRegistrations?: (db: BrightDb, blockStore: IBlockStore) => void | Promise<void>;
  },
): Promise<IInitResult<IGenericInitData>> {
  try {
    const blockStorePath = environment.blockStorePath;
    const supportedBlockSizes: readonly BlockSize[] =
      environment.blockStoreBlockSizes;
    const devPoolName = environment.devDatabasePoolName;

    let blockStore: IBlockStore;
    let dataDir: string | undefined;

    if (devPoolName) {
      // DEV_DATABASE is set — use ephemeral in-memory store for development
      console.info(
        `[BrightChain] DEV_DATABASE="${devPoolName}" — using ephemeral MemoryBlockStore. Data will not persist across restarts.`,
      );
      blockStore = BlockStoreFactory.createMemoryStore({ supportedBlockSizes });
    } else if (environment.blockStoreType === BlockStoreType.AzureBlob) {
      // Factory must have been registered by the consuming app importing
      // '@brightchain/azure-store' at its entry point.
      blockStore = BlockStoreFactory.createAzureStore(environment.azureConfig!);
    } else if (environment.blockStoreType === BlockStoreType.S3) {
      // Factory must have been registered by the consuming app importing
      // '@brightchain/s3-store' at its entry point.
      blockStore = BlockStoreFactory.createS3Store(environment.s3Config!);
    } else if (blockStorePath) {
      // Validate path accessibility, create if needed
      await validateDataDir(blockStorePath);

      blockStore = BlockStoreFactory.createDiskStore({
        storePath: blockStorePath,
        supportedBlockSizes,
      });
      dataDir = blockStorePath;
    } else {
      throw new Error(
        'Neither DEV_DATABASE nor BRIGHTCHAIN_BLOCKSTORE_PATH is set. ' +
          'Set DEV_DATABASE to a pool name for in-memory development mode, ' +
          'or set BRIGHTCHAIN_BLOCKSTORE_PATH for persistent disk storage.',
      );
    }

    // Create BrightDb — uses PersistentHeadRegistry when dataDir is set,
    // InMemoryHeadRegistry otherwise.
    const db = new BrightDb(
      blockStore,
      dataDir ? { name: environment.memberPoolName, dataDir } : undefined,
    );

    // Mark the db as connected (no-op for block-store-backed DB, but sets
    // the isConnected() flag that consumers check).
    await db.connect();

    // Call optional model registrations callback
    if (options?.modelRegistrations) {
      await options.modelRegistrations(db, blockStore);
    }

    return {
      success: true,
      backend: {
        blockStore,
        db,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Database initialization failed: ${message}`,
    };
  }
}
