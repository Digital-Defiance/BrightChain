/**
 * @fileoverview BrightChain database initialization function.
 *
 * Wraps the generic brightchainDatabaseInit from @brightchain/node-express-suite,
 * passing domain-specific model registrations (energy account hydration schema)
 * as a callback. Returns the full IBrightChainInitData including MemberStore
 * and EnergyAccountStore.
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
  EnergyAccount,
  EnergyAccountStore,
  MemberStore,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { brightchainDatabaseInit as genericDatabaseInit } from '@brightchain/node-express-suite';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { Environment } from './environment';
import { createEnergyAccountHydrationSchema } from './hydration/energyAccountHydration';

/**
 * Initialize the BrightChain database stack.
 *
 * Delegates to the Suite's generic brightchainDatabaseInit for block store
 * and BrightDb creation, then adds domain-specific stores (MemberStore,
 * EnergyAccountStore) on top via the modelRegistrations callback.
 *
 * @returns An IInitResult containing the initialized stores on success,
 *          or a failure result with a descriptive error message.
 */
export async function brightchainDatabaseInit<TID extends PlatformID>(
  environment: Environment<TID>,
): Promise<IInitResult<IBrightChainInitData>> {
  // Domain-specific references captured in the callback
  let memberStore: MemberStore | undefined;
  let energyStore: EnergyAccountStore | undefined;

  const genericResult = await genericDatabaseInit(environment, {
    modelRegistrations: async (db: BrightDb, blockStore: IBlockStore) => {
      // Register the energy_accounts Model with hydration schema.
      // The Model satisfies ITypedCollection<IEnergyAccountDto, EnergyAccount>
      // so EnergyAccountStore can use it directly — no adapter needed.
      const energyAccountModel = db.model<IEnergyAccountDto, EnergyAccount>(
        'energy_accounts',
        { hydration: createEnergyAccountHydrationSchema() },
      );

      // Initialize stores
      memberStore = new MemberStore(blockStore);
      energyStore = new EnergyAccountStore(energyAccountModel);

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
    },
  });

  if (!genericResult.success || !genericResult.backend) {
    return {
      success: false,
      error: genericResult.error,
    };
  }

  return {
    success: true,
    backend: {
      blockStore: genericResult.backend.blockStore,
      db: genericResult.backend.db,
      memberStore: memberStore!,
      energyStore: energyStore!,
    },
  };
}
