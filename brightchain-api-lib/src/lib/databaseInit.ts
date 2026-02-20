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
  IInitResult,
} from '@brightchain/brightchain-lib';
import {
  BlockSize,
  EnergyAccountStore,
  MemberStore,
} from '@brightchain/brightchain-lib';
import { BrightChainDb } from '@brightchain/db';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { constants as fsConstants } from 'fs';
import { access, mkdir } from 'fs/promises';
import { BrightChainDbDocumentStoreAdapter } from './adapters/brightChainDbDocumentStoreAdapter';
import { Environment } from './environment';
import { BlockStoreFactory } from './factories/blockStoreFactory';

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
 *   and creates a BrightChainDb with a PersistentHeadRegistry via `dataDir`.
 * - If `blockStorePath` is not set: creates a MemoryBlockStore, logs a warning,
 *   and creates a BrightChainDb with an InMemoryHeadRegistry.
 *
 * Then initializes MemberStore, EnergyAccountStore (backed by BrightChainDb
 * as IDocumentStore), and loads persisted energy accounts.
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

    let blockStore: IBlockStore;
    let dataDir: string | undefined;

    if (blockStorePath) {
      // Validate path accessibility, create if needed
      await validateDataDir(blockStorePath);

      blockStore = BlockStoreFactory.createDiskStore({
        storePath: blockStorePath,
        blockSize,
      });
      dataDir = blockStorePath;
    } else {
      console.warn(
        '[BrightChain] No BRIGHTCHAIN_BLOCKSTORE_PATH set — using ephemeral MemoryBlockStore. Data will not persist across restarts.',
      );
      blockStore = BlockStoreFactory.createMemoryStore({ blockSize });
    }

    // Create BrightChainDb — uses PersistentHeadRegistry when dataDir is set,
    // InMemoryHeadRegistry otherwise.
    const db = new BrightChainDb(blockStore, dataDir ? { dataDir } : undefined);
    await db.connect();

    // Wrap BrightChainDb as IDocumentStore for EnergyAccountStore
    const documentStore = new BrightChainDbDocumentStoreAdapter(db);

    // Initialize stores
    const memberStore = new MemberStore(blockStore);
    const energyStore = new EnergyAccountStore(documentStore);

    // Load persisted energy accounts (no-op if no document store)
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
        db: documentStore,
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
