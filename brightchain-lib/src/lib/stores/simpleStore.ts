import { ISimpleStore } from '../interfaces/simpleStore';

export class SimpleStore<K, V> implements ISimpleStore<K, V> {
  private _data: Map<K, V>;

  constructor() {
    this._data = new Map<K, V>();
  }
  /**
   * Load the store from a file
   */
  public load(): void {
    // not supported
  }
  /**
   * Persist the store to a file
   */
  public save(): void {
    // not supported
  }
  /**
   * Whether the store has the given key, without respect to its type
   * @param key
   * @returns
   */
  public has(key: K): boolean {
    return this._data.has(key);
  }
  /**
   * Gets the value from the store the key is present or throws an error
   * @param key
   */
  public get(key: K): V {
    const value = this._data.get(key);
    if (value === undefined) {
      throw new Error(`Key not found: ${key}`);
    }
    return value;
  }
  /**
   * Adds the key and value to the store
   * @param key
   * @param value
   */
  public set(key: K, value: V): void {
    this._data.set(key, value);
  }
}
