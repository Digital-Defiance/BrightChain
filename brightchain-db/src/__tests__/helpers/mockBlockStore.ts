/**
 * In-memory mock of IBlockStore for testing.
 *
 * Implements only the methods that brightchain-db actually uses:
 *   has(key), get(key), put(key, data), delete(key)
 *
 * All other IBlockStore methods throw "not implemented" so tests catch
 * accidental usage immediately.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { IBlockStore } from '@brightchain/brightchain-lib';

export class MockBlockStore implements IBlockStore {
  readonly blocks = new Map<string, Uint8Array>();

  /** Track method calls for assertions */
  readonly calls = {
    has: [] as string[],
    get: [] as string[],
    put: [] as string[],
    delete: [] as string[],
  };

  /** Optional: simulate errors on specific keys */
  readonly errorKeys = new Set<string>();

  // ── Methods used by brightchain-db ──

  async has(key: any): Promise<boolean> {
    const k = String(key);
    this.calls.has.push(k);
    if (this.errorKeys.has(k))
      throw new Error(`MockBlockStore: simulated error on has(${k})`);
    return this.blocks.has(k);
  }

  get(key: any): any {
    const k = String(key);
    this.calls.get.push(k);
    if (this.errorKeys.has(k))
      throw new Error(`MockBlockStore: simulated error on get(${k})`);
    const data = this.blocks.get(k);
    if (!data) throw new Error(`Block not found: ${k}`);
    return { fullData: data };
  }

  async put(key: any, data: Uint8Array): Promise<void> {
    const k = String(key);
    this.calls.put.push(k);
    if (this.errorKeys.has(k))
      throw new Error(`MockBlockStore: simulated error on put(${k})`);
    this.blocks.set(k, data);
  }

  async delete(key: any): Promise<void> {
    const k = String(key);
    this.calls.delete.push(k);
    this.blocks.delete(k);
  }

  // ── Convenience ──

  /** Total number of blocks currently stored */
  get size(): number {
    return this.blocks.size;
  }

  /** Reset all stored data and call tracking */
  reset(): void {
    this.blocks.clear();
    this.calls.has.length = 0;
    this.calls.get.length = 0;
    this.calls.put.length = 0;
    this.calls.delete.length = 0;
    this.errorKeys.clear();
  }

  // ── Stubs for remaining IBlockStore methods ──

  get blockSize(): any {
    return 0;
  }
  async getData(): Promise<any> {
    throw new Error('not implemented');
  }
  async setData(): Promise<void> {
    throw new Error('not implemented');
  }
  async deleteData(): Promise<void> {
    throw new Error('not implemented');
  }
  async getRandomBlocks(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async getMetadata(): Promise<any> {
    throw new Error('not implemented');
  }
  async updateMetadata(): Promise<void> {
    throw new Error('not implemented');
  }
  async generateParityBlocks(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async getParityBlocks(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async recoverBlock(): Promise<any> {
    throw new Error('not implemented');
  }
  async verifyBlockIntegrity(): Promise<boolean> {
    throw new Error('not implemented');
  }
  async getBlocksPendingReplication(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async getUnderReplicatedBlocks(): Promise<any[]> {
    throw new Error('not implemented');
  }
  async recordReplication(): Promise<void> {
    throw new Error('not implemented');
  }
  async recordReplicaLoss(): Promise<void> {
    throw new Error('not implemented');
  }
  async brightenBlock(): Promise<any> {
    throw new Error('not implemented');
  }
  async storeCBLWithWhitening(): Promise<any> {
    throw new Error('not implemented');
  }
  async retrieveCBL(): Promise<any> {
    throw new Error('not implemented');
  }
  parseCBLMagnetUrl(): any {
    throw new Error('not implemented');
  }
  generateCBLMagnetUrl(): string {
    throw new Error('not implemented');
  }
}
