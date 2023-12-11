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
    expect(() => store.get(key)).toThrow(`Key not found: ${key}`);
  });
});
