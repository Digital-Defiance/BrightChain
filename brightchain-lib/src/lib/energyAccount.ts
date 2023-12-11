import { AssetAccount } from './asset/assetAccount';
import {
  JOULE_ASSET_ID,
  JOULE_MICROUNITS_PER_UNIT,
} from './asset/jouleConstants';
import { ENERGY } from './energyConsts';
import { Checksum } from './types/checksum';

/** Trial credits in microjoules (1 000 Joules × 1 000 000 microjoules/Joule). */
const TRIAL_CREDITS_MICROJOULES: bigint =
  BigInt(ENERGY.TRIAL_CREDITS) * JOULE_MICROUNITS_PER_UNIT;

/**
 * Energy account for tracking a member's microjoule balance.
 *
 * Extends {@link AssetAccount} with `assetId = 'joule'` and provides the
 * legacy `netEnergy` alias and `createWithTrialCredits` factory retained for
 * backward compatibility.
 */
export class EnergyAccount extends AssetAccount {
  constructor(
    memberId: Checksum,
    createdAt: Date = new Date(),
    balance: bigint = TRIAL_CREDITS_MICROJOULES,
    earned: bigint = 0n,
    spent: bigint = 0n,
    reserved: bigint = 0n,
    reputation: number = 0.5,
    lastUpdated?: Date,
  ) {
    super(
      memberId,
      JOULE_ASSET_ID,
      createdAt,
      balance,
      earned,
      spent,
      reserved,
      reputation,
      lastUpdated,
    );
  }

  /** Create a new account pre-loaded with trial credits. */
  static createWithTrialCredits(memberId: Checksum): EnergyAccount {
    return new EnergyAccount(memberId);
  }

  /**
   * Net energy = earned − spent.
   * @deprecated Use {@link netAsset}.
   */
  get netEnergy(): bigint {
    return this.netAsset;
  }

  /** Override to return a typed {@link EnergyAccount} instance. */
  static override fromDto(dto: Record<string, unknown>): EnergyAccount {
    const base = AssetAccount.fromDto(dto);
    return new EnergyAccount(
      base.memberId,
      base.createdAt,
      base.balance,
      base.earned,
      base.spent,
      base.reserved,
      base.reputation,
      base.lastUpdated,
    );
  }

  /** Override to return a typed {@link EnergyAccount} instance. */
  static override fromJson(json: string): EnergyAccount {
    return EnergyAccount.fromDto(JSON.parse(json) as Record<string, unknown>);
  }
}
