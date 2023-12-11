import { JOULE_ASSET_ID } from '../asset/jouleConstants';
import { EnergyAccount } from '../energyAccount';
import { IAssetAccount } from '../interfaces/assetAccount';
import { IEnergyAccountDto } from '../interfaces/energyAccount';
import { ITypedCollection } from '../interfaces/storage/documentStore';
import { Checksum } from '../types/checksum';
import { AssetAccountStore } from './assetAccountStore';

/**
 * Energy-specific account store.
 *
 * Extends {@link AssetAccountStore} with `defaultAssetId = 'joule'` and
 * optional typed-collection persistence for startup hydration.
 *
 * When constructed without an {@link ITypedCollection} the store is purely
 * in-memory (backward-compatible with existing callers). When a typed
 * collection is provided (e.g. a Model from brightchain-db), every write is
 * mirrored to the backing store and `loadFromStore()` can hydrate the
 * in-memory map on startup.
 */
export class EnergyAccountStore extends AssetAccountStore {
  private readonly typedCollection: ITypedCollection<
    IEnergyAccountDto,
    EnergyAccount
  > | null;

  constructor(
    typedCollection?: ITypedCollection<IEnergyAccountDto, EnergyAccount>,
  ) {
    super(JOULE_ASSET_ID);
    this.typedCollection = typedCollection ?? null;
  }

  /**
   * Store the account in memory and persist to the backing collection.
   *
   * Overrides the synchronous parent method with an async variant so that
   * callers can `await` the full write-through.
   */
  override async set(
    memberId: Checksum,
    account: IAssetAccount,
  ): Promise<void> {
    super.set(memberId, account);
    if (this.typedCollection) {
      const key = memberId.toHex();
      await this.typedCollection.replaceOne(
        { memberId: key } as Partial<IEnergyAccountDto>,
        account as EnergyAccount,
        { upsert: true },
      );
    }
  }

  /**
   * Get or create account with trial credits.
   */
  async getOrCreate(memberId: Checksum): Promise<EnergyAccount> {
    let account = this.get(memberId) as EnergyAccount | undefined;
    if (!account) {
      account = EnergyAccount.createWithTrialCredits(memberId);
      await this.set(memberId, account);
    }
    return account;
  }

  /**
   * Hydrate the in-memory map from the backing typed collection.
   * No-op when no collection is configured.
   */
  async loadFromStore(): Promise<void> {
    if (!this.typedCollection) return;
    const docs = await this.typedCollection.find({}).toArray();
    for (const account of docs) {
      super.set(account.memberId, account);
    }
  }

  /**
   * Get all joule accounts.
   */
  getAll(): EnergyAccount[] {
    return this.getAllForAsset(JOULE_ASSET_ID) as EnergyAccount[];
  }
}
