import { ShortHexGuid, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { EnergyAccount } from '../energyAccount';
import { IEnergyAccountDto } from '../interfaces/energyAccount';
import { IDocumentStore } from '../interfaces/storage/documentStore';
import { Checksum } from '../types/checksum';

/**
 * Store for energy accounts with optional document-store persistence.
 *
 * When constructed without an IDocumentStore the store is purely in-memory
 * (backward-compatible with existing callers).  When a document store is
 * provided, every write is mirrored to the `energy_accounts` collection and
 * `loadFromStore()` can hydrate the in-memory map on startup.
 */
export class EnergyAccountStore {
  private accounts: Map<ShortHexGuid, EnergyAccount>;
  private readonly documentStore: IDocumentStore | null;

  constructor(documentStore?: IDocumentStore) {
    this.accounts = new Map();
    this.documentStore = documentStore ?? null;
  }

  /**
   * Hydrate the in-memory map from the backing document store.
   * No-op when no document store is configured.
   */
  async loadFromStore(): Promise<void> {
    if (!this.documentStore) return;

    const collection =
      this.documentStore.collection<IEnergyAccountDto>('energy_accounts');
    const cursor = await collection.find({});
    const docs = await cursor.toArray();

    for (const doc of docs) {
      const account = EnergyAccount.fromDto(doc);
      const key = doc.memberId as ShortHexGuid;
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
   * Set account — writes to in-memory map and persists to document store
   * (if configured).
   */
  async set(memberId: Checksum, account: EnergyAccount): Promise<void> {
    const key = uint8ArrayToHex(memberId.toUint8Array()) as ShortHexGuid;
    this.accounts.set(key, account);

    if (this.documentStore) {
      const collection =
        this.documentStore.collection<IEnergyAccountDto>('energy_accounts');
      await collection.replaceOne(
        { memberId: key } as Partial<IEnergyAccountDto>,
        account.toDto(),
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
