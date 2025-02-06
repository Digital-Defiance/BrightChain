import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { ISimpleStore } from '../interfaces/simpleStore';

export class SimpleStore<K, V> implements ISimpleStore<K, V> {
  private _data: Map<K, V>;

  constructor() {
    this._data = new Map<K, V>();
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
      let keyString;
      if (typeof key === 'string') {
        keyString = key;
      } else if (key && typeof key === 'object' && 'toString' in key) {
        keyString = key.toString();
      } else if (
        key &&
        typeof key === 'object' &&
        'toJSON' in key &&
        typeof key.toJSON === 'function'
      ) {
        keyString = key.toJSON();
      } else {
        keyString = JSON.stringify(key);
      }
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyString,
      });
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
