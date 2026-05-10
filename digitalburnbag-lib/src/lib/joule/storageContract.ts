import type { BurnbagStorageTier } from './burnbagDurability';

/**
 * A Burnbag storage contract tracks the Joule economy for a single stored file.
 * Created when a file upload is committed; updated by the daily settlement cron.
 *
 * All Joule amounts are bigint stored as strings for JSON/DB compatibility.
 */
export interface IBurnbagStorageContract {
  readonly contractId: string;
  readonly fileId: string;
  readonly ownerId: string;
  readonly createdAt: Date;
  expiresAt: Date;
  readonly committedDays: number;
  readonly bytes: bigint;
  /** Storage tier — mutable when AUTO_RS_UPGRADE promotes to higher durability. */
  tier: BurnbagStorageTier;
  /** RS data shards — mutable: upgraded by AUTO_RS_UPGRADE. */
  rsK: number;
  /** RS parity shards — mutable: upgraded by AUTO_RS_UPGRADE. */
  rsM: number;
  readonly upfrontMicroJoules: bigint;
  readonly dailyMicroJoules: bigint;
  /** Credits remaining for future daily settlements. */
  remainingCreditMicroJoules: bigint;
  /** Funded by download bandwidth fees; used to auto-extend contracts. */
  survivalFundMicroJoules: bigint;
  autoRenew: boolean;
  /** IDs of storage provider nodes currently holding shards. */
  providerNodeIds: string[];
  status: 'active' | 'expired' | 'destroyed' | 'suspended';
  lastSettledAt: Date;
}
