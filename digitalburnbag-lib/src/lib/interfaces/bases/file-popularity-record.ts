import { PlatformID } from '@digitaldefiance/ecies-lib';
import { BurnbagStorageTier } from '../../joule/burnbagDurability';

/**
 * Tracks the network popularity and replication health of a publicly visible
 * file. A background service updates this record as the file accumulates
 * access events.
 *
 * When `replicationScore` crosses the configured `AUTO_RS_UPGRADE_THRESHOLD`,
 * the network may automatically promote the file's RS tier to a more redundant
 * configuration (e.g. standard RS(8,4) → performance RS(10,6)) at no cost to
 * the uploader. This is the core incentive for making files public.
 *
 * Requirement: Public Vault Popularity Replication
 */
export interface IFilePopularityRecordBase<TID extends PlatformID> {
  id: TID;
  /** The file this record tracks */
  fileId: TID;
  /** The vault container owning the file */
  vaultContainerId: TID;
  /**
   * Total number of unique requesters (distinct authenticated + anonymous
   * sessions) that have accessed the file.
   */
  uniqueRequesters: number;
  /**
   * Total number of access events (downloads, previews, streams) recorded.
   * A single requester counts once per session.
   */
  totalAccessEvents: number;
  /**
   * Weighted popularity score in the range [0, 1]. Combines recency-decay
   * and unique-requester count. Used by the AUTO_RS_UPGRADE daemon as the
   * threshold trigger.
   */
  replicationScore: number;
  /**
   * Number of times the network has automatically upgraded the RS tier for
   * this file due to popularity.
   */
  autoUpgradeCount: number;
  /**
   * The current effective RS tier after any network upgrades. May differ
   * from the storage contract tier when AUTO_RS_UPGRADE has promoted it.
   */
  effectiveTier: BurnbagStorageTier;
  /**
   * Timestamp of the last access event. Used for recency-decay calculations.
   */
  lastAccessedAt: Date | string;
  /**
   * Timestamp of the last AUTO_RS_UPGRADE promotion, if any.
   */
  lastUpgradedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
