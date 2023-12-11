/**
 * @fileoverview BrightChain database initialization function.
 *
 * Wraps the generic brightchainDatabaseInit from @brightchain/node-express-suite,
 * passing domain-specific model registrations (energy account hydration schema)
 * and pool security setup as callbacks. Returns the full IBrightChainInitData
 * including MemberStore and EnergyAccountStore.
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
  ChecksumService,
  EciesSignatureVerifier,
  EnergyAccount,
  EnergyAccountStore,
  LedgerChainValidator,
  LedgerEntrySerializer,
  MemberStore,
} from '@brightchain/brightchain-lib';
import {
  AuthorizedHeadRegistry,
  BrightDb,
  WriteAclManager,
} from '@brightchain/db';
import {
  brightchainDatabaseInit as genericDatabaseInit,
  type IPoolSecuritySetupContext,
} from '@brightchain/node-express-suite';
import { SecureString } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import { ECDSANodeAuthenticator } from './auth/ecdsaNodeAuthenticator';
import { Environment } from './environment';
import { createEnergyAccountHydrationSchema } from './hydration/energyAccountHydration';
import { MemberPoolLedgerService } from './services/memberPoolLedgerService';
import { loadPoolSecurity } from './services/poolSecurityService';

/**
 * Pool security setup callback for the generic database init.
 *
 * This function is passed to node-express-suite's brightchainDatabaseInit
 * as the poolSecuritySetup callback. It handles:
 * - Loading the ACL from __pool_security__ collection
 * - Creating WriteAclManager with ECDSANodeAuthenticator
 * - Recreating BrightDb with write enforcement
 * - Setting up the local signer for auto-signing
 * - Loading and validating the audit ledger
 */
async function setupPoolSecurity(context: IPoolSecuritySetupContext) {
  const {
    db: initialDb,
    blockStore,
    environment,
    dataDir,
    cloudRegistry,
  } = context;

  // Use loadPoolSecurity with signature verification instead of raw document read.
  // This ensures the ACL's ECDSA signature is verified against the full content hash,
  // preventing tampered ACL documents from being loaded at runtime.
  const authenticator = new ECDSANodeAuthenticator();
  const acl = await loadPoolSecurity(initialDb, authenticator);

  if (acl === null) {
    // loadPoolSecurity returns null for two reasons:
    // 1. No pool security configured (no __pool_security__ doc) — benign
    // 2. ACL signature verification failed — CRITICAL security issue
    //
    // Check if a document exists to distinguish the two cases.
    const securityCollection = initialDb.collection('__pool_security__');
    const aclDoc = await securityCollection.findOne({ _id: 'pool_acl' });

    if (aclDoc?.['aclData']) {
      // Document exists but signature verification failed — tampered ACL!
      console.error('[BrightChain] *** CRITICAL SECURITY WARNING ***');
      console.error(
        '[BrightChain] Pool ACL document exists but has an INVALID signature.',
      );
      console.error(
        '[BrightChain] This may indicate the ACL has been tampered with.',
      );
      console.error(
        '[BrightChain] Refusing to start with pool security enabled.',
      );
      return null; // Refuse to enable pool security
    }

    return null; // No pool security configured
  }

  // Pool security is configured — recreate BrightDb with enforcement
  await initialDb.disconnect();

  const aclManager = new WriteAclManager(blockStore, authenticator);
  aclManager.setCachedAcl(acl);

  const systemPublicKey = new Uint8Array(
    Buffer.from(environment.systemPublicKeyHex!, 'hex'),
  );
  const systemPrivateKey = new Uint8Array(
    Buffer.from(environment.systemPrivateKeyHex!, 'hex'),
  );

  const db = new BrightDb(blockStore, {
    name: environment.memberPoolName,
    ...(dataDir
      ? { dataDir }
      : cloudRegistry
        ? { headRegistry: cloudRegistry }
        : {}),
    writeAclConfig: {
      aclService: aclManager,
      authenticator,
    },
  });
  await db.connect();

  // Enable auto-signing for local writes
  const headReg = db.getHeadRegistry();
  if ('setLocalSigner' in headReg) {
    (headReg as AuthorizedHeadRegistry).setLocalSigner({
      publicKey: systemPublicKey,
      privateKey: systemPrivateKey,
    });
  }

  // Zero the local private key copy — setLocalSigner() has its own reference,
  // so this source array is no longer needed and should not linger in memory.
  systemPrivateKey.fill(0);

  console.info(
    '[BrightChain] Pool security enabled — writes require valid ECDSA signatures.',
  );

  // Load the member pool audit ledger
  try {
    const supportedBlockSizes = environment.blockStoreBlockSizes;
    const ledgerService = new MemberPoolLedgerService(
      blockStore,
      supportedBlockSizes[0] ?? (4096 as BlockSize),
      true,
    );
    await ledgerService.initialize(systemPublicKey, systemPrivateKey);
    console.info(
      `[BrightChain] Audit ledger loaded — ${ledgerService.length} entries, Merkle root: ${ledgerService.merkleRootHex?.substring(0, 16)}...`,
    );

    // Validate the ledger chain in the background (don't block startup)
    if (ledgerService.isActive) {
      const ledger = ledgerService.getLedger();
      if (ledger && ledger.length > 0) {
        setTimeout(async () => {
          try {
            const checksumService = new ChecksumService();
            const serializer = new LedgerEntrySerializer(checksumService);
            const { ECIESService: EciesService } = await import(
              '@digitaldefiance/ecies-lib'
            );
            const verifier = new EciesSignatureVerifier(new EciesService());
            const validator = new LedgerChainValidator(serializer, verifier);

            const entries = await ledger.getEntries(0, ledger.length - 1);
            const result = validator.validateAll(entries);

            if (result.isValid) {
              console.info(
                `[BrightChain] Audit ledger chain validated — ${result.entriesChecked} entries OK`,
              );
            } else {
              console.error(
                `[BrightChain] SECURITY WARNING: Audit ledger chain validation FAILED`,
                result.errors,
              );
            }
          } catch (validationError) {
            console.warn(
              '[BrightChain] Audit ledger validation skipped:',
              validationError instanceof Error
                ? validationError.message
                : validationError,
            );
          }
        }, 5000);
      }
    }
  } catch (ledgerError) {
    console.warn(
      '[BrightChain] Audit ledger failed to load — continuing without audit trail.',
      ledgerError instanceof Error ? ledgerError.message : ledgerError,
    );
  }

  return { db };
}

/**
 * Initialize the BrightChain database stack.
 *
 * Delegates to the Suite's generic brightchainDatabaseInit for block store
 * and BrightDb creation, then adds domain-specific stores (MemberStore,
 * EnergyAccountStore) on top via the modelRegistrations callback.
 * Pool security (ACL enforcement, audit ledger) is configured via the
 * poolSecuritySetup callback.
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

  // ── Derive system user keys for pool security ──────────────────────
  const envObj = environment.getObject();
  const systemPublicKeyHex = envObj['SYSTEM_PUBLIC_KEY'];
  const systemMnemonicRaw = envObj['SYSTEM_MNEMONIC'];

  // Propagate system keys to the environment so the generic init can see them
  if (systemPublicKeyHex) {
    environment.setEnvironment('systemPublicKeyHex', systemPublicKeyHex);
  }

  if (systemPublicKeyHex && systemMnemonicRaw) {
    const existingPrivateHex = (
      environment as unknown as Record<string, string | undefined>
    )['systemPrivateKeyHex'];
    if (!existingPrivateHex) {
      try {
        const eciesConfig = (environment as unknown as Record<string, unknown>)[
          'constants'
        ] as Record<string, unknown> | undefined;
        const ecies = new ECIESService(
          (eciesConfig?.['ECIES_CONFIG'] as Record<string, unknown>) ?? {},
        );
        const secMnemonic = new SecureString(systemMnemonicRaw);
        const { wallet } = ecies.walletAndSeedFromMnemonic(secMnemonic);
        const privateKeyHex = Buffer.from(wallet.getPrivateKey()).toString(
          'hex',
        );
        environment.setEnvironment('systemPrivateKeyHex', privateKeyHex);
        secMnemonic.dispose();

        // ── Store system key in best available keyring ──────────────────
        try {
          const { detectBestKeyring } = await import('./keyringFactory.js');
          const detection = await detectBestKeyring();
          if (detection.keyring) {
            await detection.keyring.storeKey(
              'system-user-private-key',
              Buffer.from(privateKeyHex, 'hex'),
              systemMnemonicRaw,
            );
            console.info(
              `[BrightChain] System key stored in ${detection.tier} keyring: ${detection.reason}`,
            );
          } else {
            console.warn(
              `[BrightChain] No keyring available (${detection.reason}). System key in memory only.`,
            );
          }
        } catch (keyringError) {
          console.warn(
            '[BrightChain] Keyring storage failed — system key in memory only.',
            keyringError instanceof Error ? keyringError.message : keyringError,
          );
        }
      } catch {
        // Mnemonic derivation failed — pool security will run in open mode
      }
    }
  }

  const genericResult = await genericDatabaseInit(environment, {
    poolSecuritySetup: setupPoolSecurity,
    modelRegistrations: async (db: BrightDb, blockStore: IBlockStore) => {
      const energyAccountModel = db.model<IEnergyAccountDto, EnergyAccount>(
        'energy_accounts',
        { hydration: createEnergyAccountHydrationSchema() },
      );

      memberStore = new MemberStore(blockStore);
      energyStore = new EnergyAccountStore(energyAccountModel);

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
