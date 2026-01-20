import { ShortHexGuid, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { EnergyAccount } from '../energyAccount';
import { Checksum } from '../types/checksum';

/**
 * In-memory store for energy accounts
 * Follows existing SimpleStore/ArrayStore patterns
 */
export class EnergyAccountStore {
  private accounts: Map<ShortHexGuid, EnergyAccount>;

  constructor() {
    this.accounts = new Map();
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
   * Set account
   */
  async set(memberId: Checksum, account: EnergyAccount): Promise<void> {
    const key = uint8ArrayToHex(memberId.toUint8Array()) as ShortHexGuid;
    this.accounts.set(key, account);
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
