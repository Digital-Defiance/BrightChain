import { BrightChainMember } from '../brightChainMember';
import { GuidV4 } from '@digitaldefiance/ecies-lib';

export interface ISimpleStoreAsync<K, V> {
  /**
   * Whether the store has the given key, without respect to its type
   * @param key
   * @returns
   */
  has(key: K): boolean;
  /**
   * Gets the value from the store the key is present or throws an error
   * @param key
   */
  get(
    key: K,
    hydrateGuid: (guid: GuidV4) => Promise<BrightChainMember>,
  ): Promise<V>;
  /**
   * Adds the key and value to the store
   * @param key
   * @param value
   */
  set(key: K, value: V): Promise<void>;
}
