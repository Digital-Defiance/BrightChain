import { BufferStore } from './bufferStore';

describe('bufferStore', () => {
  it('should be able to store and retrieve a value', () => {
    const store = new BufferStore<string>();
    const key = 'key';
    const value = Buffer.from('value');
    store.set(key, value);
    expect(store.get(key)).toEqual(value);
  });
  it('should report whether a key exists', () => {
    const store = new BufferStore<string>();
    const key = 'key';
    const value = Buffer.from('value');
    store.set(key, value);
    expect(store.has(key)).toBeTruthy();
    expect(store.has('nonexistent')).toBeFalsy();
  });
  it('should throw an error when getting a nonexistent key', () => {
    const store = new BufferStore<string>();
    const key = 'key';
    expect(() => store.get(key)).toThrow(`Key not found: ${key}`);
  });
});
