/**
 * @fileoverview BanListCache interface for the network trust system.
 *
 * Each node maintains a local cache of the active ban list, updated via
 * gossip announcements. Enforcement points (gossip, discovery, reconciliation,
 * block store) check this cache with O(1) lookups.
 *
 * @see Network Trust and Ban Mechanism spec
 */

import { HexString, PlatformID } from '@digitaldefiance/ecies-lib';
import { IBanRecord } from './banRecord';

/**
 * Interface for the local ban list cache.
 * Implementations must provide O(1) lookup for isBanned().
 *
 * @template TID - Platform ID type
 */
export interface IBanListCache<TID extends PlatformID = Uint8Array> {
  /** Check if a member is banned — must be O(1) */
  isBanned(memberId: TID): boolean;

  /** Add a verified ban record to the cache */
  addBan(record: IBanRecord<TID>): void;

  /** Remove a ban record (unban) */
  removeBan(memberId: TID): void;

  /** Get all active ban records */
  getAll(): IBanRecord<TID>[];

  /** Get a specific ban record by member ID, or null if not banned */
  getBan(memberId: TID): IBanRecord<TID> | null;

  /** Bulk load ban records (used on startup/reconnect sync) */
  loadFrom(records: IBanRecord<TID>[]): void;

  /** Number of currently banned members */
  readonly size: number;

  /**
   * Verify a ban record's quorum signatures against known public keys.
   * Returns true if the record has at least `requiredSignatures` valid signatures.
   */
  verifySignatures(
    record: IBanRecord<TID>,
    quorumPublicKeys: Map<HexString, Uint8Array>,
  ): Promise<boolean>;
}
