import { hexToUint8Array, uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { ISimpleStore } from '../interfaces/simpleStore';

/**
 * Similar to a SimpleStore except that contents are loaded and expected to be buffers and be serialized to/from hex
 */
export class ArrayStore<K extends string | number> implements ISimpleStore<
  K,
  Uint8Array
> {
  private _data: Map<K, string>;

  constructor() {
    this._data = new Map<K, string>();
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
  public get(key: K): Uint8Array {
    const value = this._data.get(key);
    if (value === undefined) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: key,
      });
    }
    return hexToUint8Array(value);
  }
  /**
   * Adds the key and value to the store
   * @param key
   * @param value
   */
  public set(key: K, value: Uint8Array): void {
    this._data.set(key, uint8ArrayToHex(value));
  }
}
