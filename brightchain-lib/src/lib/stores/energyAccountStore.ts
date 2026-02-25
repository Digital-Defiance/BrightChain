import { ShortHexGuid, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { EnergyAccount } from '../energyAccount';
import { IEnergyAccountDto } from '../interfaces/energyAccount';
import { ITypedCollection } from '../interfaces/storage/documentStore';
import { Checksum } from '../types/checksum';

/**
 * Store for energy accounts with optional typed-collection persistence.
 *
 * When constructed without an ITypedCollection the store is purely in-memory
 * (backward-compatible with existing callers).  When a typed collection is
 * provided (e.g. a Model<IEnergyAccountDto, EnergyAccount> from brightchain-db),
 * every write is mirrored to the backing store and `loadFromStore()` can
 * hydrate the in-memory map on startup.
 */
export class EnergyAccountStore {
  private accounts: Map<ShortHexGuid, EnergyAccount>;
  private readonly typedCollection: ITypedCollection<
    IEnergyAccountDto,
    EnergyAccount
  > | null;

  constructor(
    typedCollection?: ITypedCollection<IEnergyAccountDto, EnergyAccount>,
  ) {
    this.accounts = new Map();
    this.typedCollection = typedCollection ?? null;
  }

  /**
   * Hydrate the in-memory map from the backing typed collection.
   * No-op when no collection is configured.
   */
  async loadFromStore(): Promise<void> {
    if (!this.typedCollection) return;

    const docs = await this.typedCollection.find({}).toArray();

    for (const account of docs) {
      // The collection already hydrates — account is an EnergyAccount
      const key = account.memberId.toHex() as ShortHexGuid;
      this.accounts.set(key, account);
    }
  }

  /**
   * Get account by member ID
   */
  get(memberId: Checksum): EnergyAccount | undefined {
    const key = uint8ArrayToHex(memberId.toUint8Array()) as ShortHexGuid;
    return this.accounts.get(key);
  }

  /**
   * Get or create account with trial credits
   */
  async getOrCreate(memberId: Checksum): Promise<EnergyAccount> {
    let account = this.get(memberId);
    if (!account) {
      account = EnergyAccount.createWithTrialCredits(memberId);
      await this.set(memberId, account);
    }
    return account;
  }

  /**
   * Set account — writes to in-memory map and persists to typed collection
   * (if configured).
   */
  async set(memberId: Checksum, account: EnergyAccount): Promise<void> {
    const key = uint8ArrayToHex(memberId.toUint8Array()) as ShortHexGuid;
    this.accounts.set(key, account);

    if (this.typedCollection) {
      await this.typedCollection.replaceOne(
        { memberId: key } as Partial<IEnergyAccountDto>,
        account,
        { upsert: true },
      );
    }
  }

  /**
   * Check if account exists
   */
  has(memberId: Checksum): boolean {
    const key = uint8ArrayToHex(memberId.toUint8Array()) as ShortHexGuid;
    return this.accounts.has(key);
  }

  /**
   * Delete account
   */
  delete(memberId: Checksum): boolean {
    const key = uint8ArrayToHex(memberId.toUint8Array()) as ShortHexGuid;
    return this.accounts.delete(key);
  }

  /**
   * Get all accounts
   */
  getAll(): EnergyAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get account count
   */
  get size(): number {
    return this.accounts.size;
  }

  /**
   * Clear all accounts
   */
  clear(): void {
    this.accounts.clear();
  }
}
