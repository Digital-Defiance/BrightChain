import type { IBurnbagStorageContract } from '../../joule/storageContract';

/**
 * Repository interface for Burnbag storage contracts.
 * Contracts are never hard-deleted — they transition to 'expired' or 'destroyed'.
 */
export interface IBurnbagStorageContractRepository {
  /** Persist a newly created contract. */
  create(contract: IBurnbagStorageContract): Promise<void>;

  /** Look up a contract by its unique contractId. */
  findByContractId(contractId: string): Promise<IBurnbagStorageContract | null>;

  /** Look up the active contract for a given fileId (at most one active per file). */
  findByFileId(fileId: string): Promise<IBurnbagStorageContract | null>;

  /** Find all contracts owned by a user, optionally filtered by status. */
  findByOwner(
    ownerId: string,
    status?: IBurnbagStorageContract['status'],
  ): Promise<IBurnbagStorageContract[]>;

  /** Partially update a contract (e.g. credit balance, tier, status). */
  updateContract(
    contractId: string,
    updates: Partial<IBurnbagStorageContract>,
  ): Promise<void>;

  /**
   * Find active contracts whose lastSettledAt is before the given cutoff date.
   * Used by the daily settlement cron to identify contracts due for billing.
   */
  findDueForSettlement(cutoff: Date): Promise<IBurnbagStorageContract[]>;

  /**
   * Find active contracts whose expiresAt is before the given cutoff date
   * and autoRenew is false. Used by the stale-contract expiry sweep.
   */
  findActiveExpiredBefore(cutoff: Date): Promise<IBurnbagStorageContract[]>;

  /**
   * Mark the contract for the given fileId as 'expired'.
   * Called when the file is destroyed or the contract lapses.
   */
  expireByFileId(fileId: string): Promise<void>;
}
