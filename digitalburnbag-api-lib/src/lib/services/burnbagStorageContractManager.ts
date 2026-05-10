/**
 * @fileoverview BurnbagStorageContractManager — Joule-economy contract lifecycle.
 *
 * Manages the creation, tier-downgrade, RS-param upgrades, stale-expiry, and
 * destruction teardown of `IBurnbagStorageContract` records.
 *
 * All methods that mutate Joule balances operate on the in-memory
 * `AssetAccountStore` (L1).  Durable ledger settlement is a separate concern
 * handled by the settlement cron (task 3.3).
 *
 * Requirements: 4.1–4.8, 2.2–2.4
 */
import type { AssetAccountStore, Checksum } from '@brightchain/brightchain-lib';
import { JOULE_ASSET_ID } from '@brightchain/brightchain-lib';
import type {
  IBurnbagCreateContractParams,
  IBurnbagStorageContract,
  IBurnbagStorageContractManager,
  IBurnbagStorageContractRepository,
} from '@brightchain/digitalburnbag-lib';
import {
  BURNBAG_TIER_RS_PARAMS,
  calculateBurnbagStorageCost,
} from '@brightchain/digitalburnbag-lib';
import { NotFoundError } from '../errors';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Milliseconds in one day — used to compute remaining commitment days. */
const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Optional dependency bag
// ---------------------------------------------------------------------------

/**
 * Injected side-effects used by the contract manager.
 *
 * All fields are optional so the manager can be instantiated in environments
 * where FEC or metering infrastructure is not yet wired up.
 */
export interface IBurnbagContractManagerDeps {
  /**
   * Regenerate parity shards for a file after RS parameter changes.
   *
   * Called by `upgradeRsParams()` and (optionally) `createContract()`.
   * Implementations are responsible for resolving the appropriate
   * `IFecService` (the manager intentionally has no FEC dependency to
   * avoid a circular package import on `brightchain-api-lib`).
   *
   * If omitted, RS param updates skip parity regeneration (no-op).
   */
  regenerateParityShards?: (
    fileId: string,
    rsK: number,
    rsM: number,
  ) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate remaining whole days until `expiresAt` from now. */
function remainingDays(expiresAt: Date): number {
  return Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / MS_PER_DAY),
  );
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Manages the Joule-economy lifecycle of Burnbag storage contracts.
 *
 * Inject via constructor; all I/O is performed through the injected repository.
 * `AssetAccountStore` is used for direct L1 balance mutations (refunds).
 */
export class BurnbagStorageContractManager
  implements IBurnbagStorageContractManager
{
  constructor(
    private readonly repository: IBurnbagStorageContractRepository,
    private readonly assetAccountStore: AssetAccountStore,
    /**
     * Convert a plain owner-ID string into a `Checksum` for AssetAccountStore
     * key lookups.  Implementation is node-specific.
     */
    private readonly resolveChecksum: (userId: string) => Checksum,
    private readonly deps: IBurnbagContractManagerDeps = {},
  ) {}

  // -------------------------------------------------------------------------
  // createContract
  // -------------------------------------------------------------------------

  async createContract(
    params: IBurnbagCreateContractParams,
  ): Promise<IBurnbagStorageContract> {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + params.committedDays * MS_PER_DAY,
    );

    const contract: IBurnbagStorageContract = {
      contractId: globalThis.crypto.randomUUID(),
      fileId: params.fileId,
      ownerId: params.ownerId,
      createdAt: now,
      expiresAt,
      committedDays: params.committedDays,
      bytes: params.bytes,
      tier: params.tier,
      rsK: params.rsK,
      rsM: params.rsM,
      upfrontMicroJoules: params.upfrontMicroJoules,
      dailyMicroJoules: params.dailyMicroJoules,
      // Upfront payment covers the full committed period.
      remainingCreditMicroJoules: params.upfrontMicroJoules,
      survivalFundMicroJoules: 0n,
      autoRenew: params.autoRenew ?? false,
      providerNodeIds: params.providerNodeIds
        ? [...params.providerNodeIds]
        : [],
      status: 'active',
      lastSettledAt: now,
    };

    await this.repository.create(contract);
    return contract;
  }

  // -------------------------------------------------------------------------
  // extendContract
  // -------------------------------------------------------------------------

  async extendContract(
    contractId: string,
    additionalDays: number,
  ): Promise<void> {
    const contract = await this.repository.findByContractId(contractId);
    if (!contract) {
      throw new NotFoundError('StorageContract', contractId);
    }

    const newExpiresAt = new Date(
      contract.expiresAt.getTime() + additionalDays * MS_PER_DAY,
    );

    await this.repository.updateContract(contractId, {
      expiresAt: newExpiresAt,
    });
  }

  // -------------------------------------------------------------------------
  // applyBurnDateDowngrade
  // -------------------------------------------------------------------------

  async applyBurnDateDowngrade(fileId: string): Promise<bigint> {
    const contract = await this.repository.findByFileId(fileId);
    if (!contract) {
      throw new NotFoundError('StorageContract (by fileId)', fileId);
    }

    // Idempotent — already downgraded.
    if (contract.tier === 'pending-burn') {
      return 0n;
    }

    const days = remainingDays(contract.expiresAt);

    // pending-burn uses RS(4,1) regardless of original tier.
    const pendingBurnParams = BURNBAG_TIER_RS_PARAMS['pending-burn'];
    const newCost = calculateBurnbagStorageCost({
      bytes: contract.bytes,
      tier: 'pending-burn',
      durationDays: Math.max(days, 1),
      rsK: pendingBurnParams.k,
      rsM: pendingBurnParams.m,
    });

    const newRemainingCredit = newCost.dailyMicroJoules * BigInt(days);
    const refund =
      contract.remainingCreditMicroJoules > newRemainingCredit
        ? contract.remainingCreditMicroJoules - newRemainingCredit
        : 0n;

    await this.repository.updateContract(contract.contractId, {
      tier: 'pending-burn',
      rsK: pendingBurnParams.k,
      rsM: pendingBurnParams.m,
      dailyMicroJoules: newCost.dailyMicroJoules,
      remainingCreditMicroJoules: newRemainingCredit,
    });

    // Credit refund back to the owner's L1 Joule account.
    if (refund > 0n) {
      const memberId = this.resolveChecksum(contract.ownerId);
      const account = this.assetAccountStore.getForAsset(
        memberId,
        JOULE_ASSET_ID,
      );
      if (account) {
        account.balance += refund;
        account.lastUpdated = new Date();
      }
    }

    return refund;
  }

  // -------------------------------------------------------------------------
  // upgradeRsParams
  // -------------------------------------------------------------------------

  async upgradeRsParams(
    contractId: string,
    newK: number,
    newM: number,
  ): Promise<void> {
    const contract = await this.repository.findByContractId(contractId);
    if (!contract) {
      throw new NotFoundError('StorageContract', contractId);
    }
    if (contract.status !== 'active') {
      throw new Error('CONTRACT_NOT_ACTIVE');
    }

    const days = remainingDays(contract.expiresAt);

    const newCost = calculateBurnbagStorageCost({
      bytes: contract.bytes,
      tier: contract.tier,
      durationDays: Math.max(days, 1),
      rsK: newK,
      rsM: newM,
    });

    // Upgrade fee = one day's worth of the new (higher) daily rate.
    const upgradeCost = newCost.dailyMicroJoules;
    if (upgradeCost > contract.survivalFundMicroJoules) {
      throw new Error('INSUFFICIENT_SURVIVAL_FUND');
    }

    // Regenerate parity shards via the injected callback (which owns the
    // FEC service implementation — see `IBurnbagContractManagerDeps`).
    if (this.deps.regenerateParityShards) {
      await this.deps.regenerateParityShards(contract.fileId, newK, newM);
    }

    await this.repository.updateContract(contractId, {
      rsK: newK,
      rsM: newM,
      dailyMicroJoules: newCost.dailyMicroJoules,
      survivalFundMicroJoules: contract.survivalFundMicroJoules - upgradeCost,
    });
  }

  // -------------------------------------------------------------------------
  // expireStaleContracts
  // -------------------------------------------------------------------------

  async expireStaleContracts(): Promise<number> {
    const now = new Date();
    const stale = await this.repository.findActiveExpiredBefore(now);

    await Promise.all(
      stale.map((c) =>
        this.repository.updateContract(c.contractId, { status: 'expired' }),
      ),
    );

    return stale.length;
  }

  // -------------------------------------------------------------------------
  // expireOnDestruction
  // -------------------------------------------------------------------------

  async expireOnDestruction(fileId: string): Promise<bigint> {
    const contract = await this.repository.findByFileId(fileId);
    if (!contract) {
      throw new NotFoundError('StorageContract (by fileId)', fileId);
    }

    const remainingCredit = contract.remainingCreditMicroJoules;

    await this.repository.updateContract(contract.contractId, {
      status: 'destroyed',
      remainingCreditMicroJoules: 0n,
    });

    // The caller (DestructionService, task 3.4) is responsible for crediting
    // `remainingCredit` back to the owner's L1 Joule account.
    return remainingCredit;
  }
}
