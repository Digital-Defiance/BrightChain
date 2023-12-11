import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { IJsonStore } from '../interfaces/jsonStore';

/**
 * Similar to a SimpleStore except that contents are loaded and saved to/from JSON format for serialization testing
 */
export class JsonStore<K extends string | number> implements IJsonStore<K> {
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
  public get<V>(key: K): V {
    const value = this._data.get(key);
    if (value === undefined) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, { KEY: key });
    }
    return JSON.parse(value) as V;
  }
  /**
   * Adds the key and value to the store
   * @param key
   * @param value
   */
  public set<V>(key: K, value: V): void {
    const hasToJSON = value && typeof value === 'object' && 'toJson' in value;
    this._data.set(
      key,
      hasToJSON
        ? (value as { toJson(): string }).toJson()
        : JSON.stringify(value),
    );
  }
}
