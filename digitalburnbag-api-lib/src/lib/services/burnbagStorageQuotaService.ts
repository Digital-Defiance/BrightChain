/**
 * @fileoverview Node-side `StorageQuotaService` that layers a Joule-balance
 * check on top of the browser-safe byte quota.
 *
 * Activated when:
 *   - `BURNBAG_JOULE_ENABLED=true`, AND
 *   - the caller passes `options.tier` and `options.durationDays`
 *
 * The byte-space check is delegated to the base class — when it denies, this
 * subclass returns its result unchanged.  Otherwise we project the upfront
 * Joule cost via `calculateBurnbagStorageCost()` and compare it against the
 * member's available Joule balance.
 *
 * Requirements: 6.1–6.4 (Task 2.4)
 */
import type { AssetAccountStore, Checksum } from '@brightchain/brightchain-lib';
import { JOULE_ASSET_ID } from '@brightchain/brightchain-lib';
import type {
  IQuotaCheckResult,
  IStorageQuotaCheckOptions,
  IStorageQuotaRepository,
} from '@brightchain/digitalburnbag-lib';
import {
  calculateBurnbagStorageCost,
  StorageQuotaService,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { isBurnbagJouleEnabled } from '../config/burnbagConfig';

/**
 * `StorageQuotaService` extension that enforces a Joule-balance pre-check.
 */
export class BurnbagStorageQuotaService<
  TID extends PlatformID,
> extends StorageQuotaService<TID> {
  constructor(
    repository: IStorageQuotaRepository<TID>,
    isAdmin: (userId: TID) => Promise<boolean>,
    private readonly assetAccountStore: AssetAccountStore,
    private readonly resolveChecksum: (userId: TID) => Checksum,
  ) {
    super(repository, isAdmin);
  }

  /**
   * Byte-space check first; if allowed and the Joule feature is on with
   * `tier` + `durationDays` supplied, also enforce sufficient Joule balance.
   */
  override async checkQuota(
    userId: TID,
    additionalBytes: number,
    options?: IStorageQuotaCheckOptions,
  ): Promise<IQuotaCheckResult> {
    const baseResult = await super.checkQuota(userId, additionalBytes, options);

    if (!baseResult.allowed) {
      return {
        ...baseResult,
        reason: baseResult.reason ?? 'QUOTA_EXCEEDED',
      };
    }

    if (
      !isBurnbagJouleEnabled() ||
      !options?.tier ||
      typeof options.durationDays !== 'number'
    ) {
      return baseResult;
    }

    const cost = calculateBurnbagStorageCost({
      bytes: BigInt(additionalBytes),
      tier: options.tier,
      durationDays: options.durationDays,
    });

    const memberId = this.resolveChecksum(userId);
    const account = this.assetAccountStore.getForAsset(
      memberId,
      JOULE_ASSET_ID,
    );
    // Available = current balance minus microunits reserved for in-flight ops.
    const available: bigint = account ? account.balance - account.reserved : 0n;

    if (available < cost.upfrontMicroJoules) {
      return {
        ...baseResult,
        allowed: false,
        reason: 'INSUFFICIENT_JOULE_FOR_STORAGE',
      };
    }

    return baseResult;
  }
}
