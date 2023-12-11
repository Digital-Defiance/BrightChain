import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { ArrayStore } from './arrayStore';

describe('arrayStore', () => {
  it('should be able to store and retrieve a value', () => {
    const store = new ArrayStore<string>();
    const key = 'key';
    const value = new Uint8Array([118, 97, 108, 117, 101]); // 'value' in UTF-8
    store.set(key, value);
    expect(arraysEqual(store.get(key), value)).toBe(true);
  });
  it('should report whether a key exists', () => {
    const store = new ArrayStore<string>();
    const key = 'key';
    const value = new Uint8Array([118, 97, 108, 117, 101]); // 'value' in UTF-8
    store.set(key, value);
    expect(store.has(key)).toBeTruthy();
    expect(store.has('nonexistent')).toBeFalsy();
  });
  it('should throw an error when getting a nonexistent key', () => {
    const store = new ArrayStore<string>();
    const key = 'key';
    expect(() => store.get(key)).toThrowType(
      StoreError,
      (error: StoreError) => {
        expect(error.type).toBe(StoreErrorType.KeyNotFound);
        expect(error.params?.['KEY']).toEqual(key);
      },
    );
  });
});
