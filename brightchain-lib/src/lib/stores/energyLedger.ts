import { ShortHexGuid, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { EnergyTransaction } from '../interfaces/energyTransaction';
import { Checksum } from '../types/checksum';

/**
 * In-memory ledger for energy transactions
 * Provides audit trail of all energy flows
 */
export class EnergyLedger {
  private transactions: Map<ShortHexGuid, EnergyTransaction>;
  private byMember: Map<ShortHexGuid, ShortHexGuid[]>;

  constructor() {
    this.transactions = new Map();
    this.byMember = new Map();
  }

  /**
   * Add transaction to ledger
   */
  add(transaction: EnergyTransaction): void {
    const txId = uint8ArrayToHex(transaction.id.toUint8Array()) as ShortHexGuid;
    this.transactions.set(txId, transaction);

    // Index by source
    const sourceId = uint8ArrayToHex(
      transaction.source.toUint8Array(),
    ) as ShortHexGuid;
    if (!this.byMember.has(sourceId)) {
      this.byMember.set(sourceId, []);
    }
    this.byMember.get(sourceId)!.push(txId);

    // Index by destination
    const destId = uint8ArrayToHex(
      transaction.destination.toUint8Array(),
    ) as ShortHexGuid;
    if (!this.byMember.has(destId)) {
      this.byMember.set(destId, []);
    }
    this.byMember.get(destId)!.push(txId);
  }

  /**
   * Get transaction by ID
   */
  get(txId: Checksum): EnergyTransaction | undefined {
    const key = uint8ArrayToHex(txId.toUint8Array()) as ShortHexGuid;
    return this.transactions.get(key);
  }

  /**
   * Get all transactions for a member
   */
  getByMember(memberId: Checksum): EnergyTransaction[] {
    const key = uint8ArrayToHex(memberId.toUint8Array()) as ShortHexGuid;
    const txIds = this.byMember.get(key) || [];
    return txIds
      .map((id) => this.transactions.get(id))
      .filter((tx): tx is EnergyTransaction => tx !== undefined);
  }

  /**
   * Get transactions in time range
   */
  getByTimeRange(start: Date, end: Date): EnergyTransaction[] {
    return Array.from(this.transactions.values()).filter(
      (tx) => tx.timestamp >= start && tx.timestamp <= end,
    );
  }

  /**
   * Get all transactions
   */
  getAll(): EnergyTransaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get transaction count
   */
  get size(): number {
    return this.transactions.size;
  }

  /**
   * Clear all transactions
   */
  clear(): void {
    this.transactions.clear();
    this.byMember.clear();
  }
}
