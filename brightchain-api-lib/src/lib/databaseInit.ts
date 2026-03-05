/**
 * @fileoverview BrightChain database initialization function.
 *
 * Replaces the no-op DatabaseInitFunction with a real implementation that
 * creates persistent (or ephemeral) stores based on environment configuration.
 *
 * @module databaseInit
 */

import type {
  IBlockStore,
  IBrightChainInitData,
  IEnergyAccountDto,
  IInitResult,
} from '@brightchain/brightchain-lib';
import {
  BlockSize,
  BlockStoreType,
  EnergyAccount,
  EnergyAccountStore,
  MemberStore,
} from '@brightchain/brightchain-lib';
import { BrightDb } from '@brightchain/db';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { constants as fsConstants } from 'fs';
import { access, mkdir } from 'fs/promises';
import { Environment } from './environment';
import { BlockStoreFactory } from './factories/blockStoreFactory';
import { createEnergyAccountHydrationSchema } from './hydration/energyAccountHydration';

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
 * Initialize the BrightChain database stack.
 *
 * Reads `blockStorePath` and `blockStoreBlockSize` from the Environment:
 * - If `blockStorePath` is set: validates the path, creates a DiskBlockStore,
 *   and creates a BrightDb with a PersistentHeadRegistry via `dataDir`.
 * - If `blockStorePath` is not set: creates a MemoryBlockStore, logs a warning,
 *   and creates a BrightDb with an InMemoryHeadRegistry.
 *
 * Registers an `energy_accounts` Model on BrightDB with the energy account
 * hydration schema, then passes the Model (as ITypedCollection) directly to
 * EnergyAccountStore — no adapter needed.
 *
 * @returns An IInitResult containing the initialized stores on success,
 *          or a failure result with a descriptive error message.
 */
export async function brightchainDatabaseInit<TID extends PlatformID>(
  environment: Environment<TID>,
): Promise<IInitResult<IBrightChainInitData>> {
  try {
    const blockStorePath = environment.blockStorePath;
    const blockSize: BlockSize = environment.blockStoreBlockSize;
    const devPoolName = environment.devDatabasePoolName;

    let blockStore: IBlockStore;
    let dataDir: string | undefined;

    if (devPoolName) {
      // DEV_DATABASE is set — use ephemeral in-memory store for development
      console.info(
        `[BrightChain] DEV_DATABASE="${devPoolName}" — using ephemeral MemoryBlockStore. Data will not persist across restarts.`,
      );
      blockStore = BlockStoreFactory.createMemoryStore({ blockSize });
    } else if (
      environment.blockStoreType === BlockStoreType.AzureBlob
    ) {
      // Factory must have been registered by the consuming app importing
      // '@brightchain/azure-store' at its entry point.
      blockStore = BlockStoreFactory.createAzureStore(environment.azureConfig!);
    } else if (
      environment.blockStoreType === BlockStoreType.S3
    ) {
      // Factory must have been registered by the consuming app importing
      // '@brightchain/s3-store' at its entry point.
      blockStore = BlockStoreFactory.createS3Store(environment.s3Config!);
    } else if (blockStorePath) {
      // Validate path accessibility, create if needed
      await validateDataDir(blockStorePath);

      blockStore = BlockStoreFactory.createDiskStore({
        storePath: blockStorePath,
        blockSize,
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
    // IMPORTANT: name must match what BrightChainMemberInitService uses
    // (config.memberPoolName) so the head registry keys are consistent across
    // the plugin's db and the seeding service's db.
    const db = new BrightDb(
      blockStore,
      dataDir ? { name: environment.memberPoolName, dataDir } : undefined,
    );

    // Mark the db as connected (no-op for block-store-backed DB, but sets
    // the isConnected() flag that consumers check).
    await db.connect();

    // Register the energy_accounts Model with hydration schema.
    // The Model satisfies ITypedCollection<IEnergyAccountDto, EnergyAccount>
    // so EnergyAccountStore can use it directly — no adapter needed.
    const energyAccountModel = db.model<IEnergyAccountDto, EnergyAccount>(
      'energy_accounts',
      { hydration: createEnergyAccountHydrationSchema() },
    );

    // Initialize stores
    const memberStore = new MemberStore(blockStore);
    const energyStore = new EnergyAccountStore(energyAccountModel);

    // Load persisted energy accounts (no-op if no typed collection)
    try {
      await energyStore.loadFromStore();
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error ? loadError.message : String(loadError);
      console.warn(
        `[BrightChain] Failed to load energy accounts from store, continuing with empty store: ${message}`,
      );
    }

    return {
      success: true,
      backend: {
        blockStore,
        db,
        memberStore,
        energyStore,
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
