export interface ISimpleStore<K, V> {
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
  get(key: K): V;
  /**
   * Adds the key and value to the store
   * @param key
   * @param value
   */
  set(key: K, value: V): void;
  /**
   * Load the store from a file
   */
  load(): void;
  /**
   * Persist the store to a file
   */
  save(): void;
}
