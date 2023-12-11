import { InsufficientAvailableBalanceError } from '../errors/asset/insufficientAvailableBalanceError';
import { InvalidAmountError } from '../errors/asset/invalidAmountError';
import { IAssetAccount, IAssetAccountDto } from '../interfaces/assetAccount';
import { Checksum } from '../types/checksum';
import { JOULE_ASSET_ID, JOULE_MICROUNITS_PER_UNIT } from './jouleConstants';

const BIGINT_FIELDS = ['balance', 'earned', 'spent', 'reserved'] as const;
type BigIntField = (typeof BIGINT_FIELDS)[number];

function assertNonNegativeBigInt(value: bigint, field: string): void {
  if (typeof value !== 'bigint') {
    throw new InvalidAmountError(`${field} must be bigint`, value);
  }
  if (value < 0n) {
    throw new InvalidAmountError(`${field} must be non-negative`, value);
  }
}

/**
 * Hydrate a raw DTO record into a canonical {@link IAssetAccountDto}.
 *
 * Handles two legacy markers introduced before the
 * `asset-account-store-generalization` refactor:
 *
 *  - **missing `assetId`** → defaults to `'joule'`.
 *  - **`number` balance fields** → multiplied by
 *    {@link JOULE_MICROUNITS_PER_UNIT} (rounded) and stored as decimal-
 *    string `bigint` microunits.
 *
 * Already-upgraded DTOs round-trip unchanged. The function never throws —
 * unrecognized field shapes coerce to `'0'` so the caller gets a fully
 * populated DTO it can persist on next write.
 *
 * @see asset-account-store-generalization spec, Requirements 1.4, 2.5, 2.6.
 */
export function hydrateAssetAccountDto(
  raw: Record<string, unknown>,
): IAssetAccountDto {
  const assetIdRaw = raw['assetId'];
  const assetId =
    typeof assetIdRaw === 'string' && assetIdRaw.length > 0
      ? assetIdRaw
      : JOULE_ASSET_ID;

  const out: Record<string, unknown> = { ...raw, assetId };

  for (const field of BIGINT_FIELDS) {
    const v = raw[field];
    if (typeof v === 'bigint') {
      out[field] = v.toString();
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      // Legacy joule DTO: number Joules → bigint microjoules.
      const micro = BigInt(Math.round(v * Number(JOULE_MICROUNITS_PER_UNIT)));
      out[field] = micro.toString();
    } else if (typeof v === 'string' && /^-?\d+$/.test(v)) {
      out[field] = v;
    } else {
      out[field] = '0';
    }
  }

  if (typeof out['reputation'] !== 'number') {
    out['reputation'] = 0;
  }
  if (typeof out['memberId'] !== 'string') {
    out['memberId'] = '';
  }
  if (typeof out['createdAt'] !== 'string') {
    out['createdAt'] = new Date(0).toISOString();
  }
  if (typeof out['lastUpdated'] !== 'string') {
    out['lastUpdated'] = out['createdAt'] as string;
  }

  return out as IAssetAccountDto;
}

/**
 * Generalized per-(member, asset) account.
 *
 * `bigint` microunit balances eliminate floating-point drift from
 * charge / credit paths. The legacy {@link EnergyAccount} class is
 * preserved untouched during this additive phase; a future phase will
 * fold it onto this base via re-export alias.
 *
 * @see asset-account-store-generalization spec, Phase 3.
 */
export class AssetAccount implements IAssetAccount {
  public balance: bigint;
  public earned: bigint;
  public spent: bigint;
  public reserved: bigint;
  public reputation: number;
  public lastUpdated: Date;

  constructor(
    public readonly memberId: Checksum,
    public readonly assetId: string = JOULE_ASSET_ID,
    public readonly createdAt: Date = new Date(),
    balance: bigint = 0n,
    earned: bigint = 0n,
    spent: bigint = 0n,
    reserved: bigint = 0n,
    reputation = 0.5,
    lastUpdated?: Date,
  ) {
    if (typeof assetId !== 'string' || assetId.length === 0) {
      throw new InvalidAmountError(
        'assetId must be a non-empty string',
        assetId,
      );
    }
    assertNonNegativeBigInt(balance, 'balance');
    assertNonNegativeBigInt(earned, 'earned');
    assertNonNegativeBigInt(spent, 'spent');
    assertNonNegativeBigInt(reserved, 'reserved');
    this.balance = balance;
    this.earned = earned;
    this.spent = spent;
    this.reserved = reserved;
    this.reputation = Math.max(0, Math.min(1, reputation));
    this.lastUpdated = lastUpdated ?? createdAt;
  }

  /** Available = balance - reserved, floored at 0. */
  get availableBalance(): bigint {
    const a = this.balance - this.reserved;
    return a > 0n ? a : 0n;
  }

  /** Net = earned - spent. May be negative. */
  get netAsset(): bigint {
    return this.earned - this.spent;
  }

  canAfford(amount: bigint): boolean {
    if (typeof amount !== 'bigint' || amount < 0n) return false;
    return this.availableBalance >= amount;
  }

  reserve(amount: bigint): void {
    assertNonNegativeBigInt(amount, 'amount');
    if (!this.canAfford(amount)) {
      throw new InsufficientAvailableBalanceError(
        this.assetId,
        amount,
        this.availableBalance,
      );
    }
    this.reserved += amount;
    this.lastUpdated = new Date();
  }

  release(amount: bigint): void {
    assertNonNegativeBigInt(amount, 'amount');
    this.reserved = this.reserved > amount ? this.reserved - amount : 0n;
    this.lastUpdated = new Date();
  }

  charge(amount: bigint): void {
    assertNonNegativeBigInt(amount, 'amount');
    if (amount > this.balance) {
      throw new InsufficientAvailableBalanceError(
        this.assetId,
        amount,
        this.balance,
      );
    }
    this.balance -= amount;
    this.spent += amount;
    this.lastUpdated = new Date();
  }

  credit(amount: bigint): void {
    assertNonNegativeBigInt(amount, 'amount');
    this.balance += amount;
    this.earned += amount;
    this.lastUpdated = new Date();
  }

  updateReputation(newReputation: number): void {
    if (typeof newReputation !== 'number' || !Number.isFinite(newReputation)) {
      throw new InvalidAmountError(
        'reputation must be finite number',
        newReputation,
      );
    }
    this.reputation = Math.max(0, Math.min(1, newReputation));
    this.lastUpdated = new Date();
  }

  toDto(): IAssetAccountDto {
    return {
      memberId: this.memberId.toHex(),
      assetId: this.assetId,
      balance: this.balance.toString(),
      earned: this.earned.toString(),
      spent: this.spent.toString(),
      reserved: this.reserved.toString(),
      reputation: this.reputation,
      createdAt: this.createdAt.toISOString(),
      lastUpdated: this.lastUpdated.toISOString(),
    };
  }

  /**
   * Build an {@link AssetAccount} from a DTO. Accepts both fully-upgraded
   * {@link IAssetAccountDto} and legacy `IEnergyAccountDto`-shaped records:
   * the input is run through {@link hydrateAssetAccountDto} first.
   */
  static fromDto(dto: Record<string, unknown>): AssetAccount {
    const h = hydrateAssetAccountDto(dto);
    return new AssetAccount(
      Checksum.fromHex(h.memberId),
      h.assetId,
      new Date(h.createdAt),
      BigInt(h.balance as string),
      BigInt(h.earned as string),
      BigInt(h.spent as string),
      BigInt(h.reserved as string),
      h.reputation,
      new Date(h.lastUpdated),
    );
  }

  toJson(): string {
    return JSON.stringify(this.toDto());
  }

  static fromJson(json: string): AssetAccount {
    return AssetAccount.fromDto(JSON.parse(json) as Record<string, unknown>);
  }
}

// Re-export field list for tests / store internals that need to walk
// every bigint-microunit field.
export const ASSET_ACCOUNT_BIGINT_FIELDS: readonly BigIntField[] =
  BIGINT_FIELDS;
