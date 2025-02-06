import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { JsonStore } from './jsonStore';

describe('jsonStore', () => {
  it('should be able to store and retrieve a value', () => {
    const store = new JsonStore<string>();
    const key = 'key';
    const value = { value: 'value' };
    store.set(key, value);
    expect(store.get(key)).toEqual(value);
  });
  it('should report whether a key exists', () => {
    const store = new JsonStore<string>();
    const key = 'key';
    const value = { value: 2 };
    store.set(key, value);
    expect(store.has(key)).toBeTruthy();
    expect(store.has('nonexistent')).toBeFalsy();
  });
  it('should throw an error when getting a nonexistent key', () => {
    const store = new JsonStore<string>();
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
