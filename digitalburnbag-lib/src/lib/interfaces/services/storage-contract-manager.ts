import type { BurnbagStorageTier } from '../../joule/burnbagDurability';
import type { IBurnbagStorageContract } from '../../joule/storageContract';

/**
 * Parameters for creating a new storage contract at upload-commit time.
 * All monetary values are bigint (µJ) pre-computed by the upload service.
 */
export interface IBurnbagCreateContractParams {
  readonly fileId: string;
  readonly ownerId: string;
  /** Block-aligned encrypted byte count. */
  readonly bytes: bigint;
  readonly tier: BurnbagStorageTier;
  readonly rsK: number;
  readonly rsM: number;
  readonly committedDays: number;
  readonly upfrontMicroJoules: bigint;
  readonly dailyMicroJoules: bigint;
  readonly providerNodeIds?: readonly string[];
  readonly autoRenew?: boolean;
}

/**
 * Service interface for managing the lifecycle of Burnbag storage contracts.
 *
 * Covers creation, RS-param upgrades, burn-date downgrades, stale expiry,
 * and destruction-triggered teardown.
 *
 * Requirements: 4.1–4.8
 */
export interface IBurnbagStorageContractManager {
  /**
   * Instantiate a new contract record from upload-commit params and persist it.
   * Called by UploadService.commit() after blocks are written.
   */
  createContract(
    params: IBurnbagCreateContractParams,
  ): Promise<IBurnbagStorageContract>;

  /**
   * Extend the contract's expiry by additionalDays with no charge.
   * Called from the survival-fund sweep when autoRenew is true.
   */
  extendContract(contractId: string, additionalDays: number): Promise<void>;

  /**
   * Downgrade the file's tier to 'pending-burn', recalculate daily cost
   * using RS(4,1) params, and refund the credit difference to the owner's
   * L1 balance.
   *
   * @returns The µJ amount credited back to the owner.
   */
  applyBurnDateDowngrade(fileId: string): Promise<bigint>;

  /**
   * Upgrade RS parity params, regenerate parity shards, and deduct the
   * upgrade cost from the contract's survivalFundMicroJoules.
   *
   * Throws if survivalFundMicroJoules is insufficient to cover the fee.
   */
  upgradeRsParams(
    contractId: string,
    newK: number,
    newM: number,
  ): Promise<void>;

  /**
   * Scan for active contracts whose expiresAt < now and autoRenew=false,
   * then mark them 'expired'.
   *
   * @returns The number of contracts that were expired.
   */
  expireStaleContracts(): Promise<number>;

  /**
   * Mark a file's contract as 'destroyed' and return its remaining credit
   * so the caller (DestructionService) can issue an L1 refund.
   *
   * The actual AssetAccountStore credit is the caller's responsibility
   * (see task 3.4).
   *
   * @returns The remainingCreditMicroJoules to refund to the owner.
   */
  expireOnDestruction(fileId: string): Promise<bigint>;
}
