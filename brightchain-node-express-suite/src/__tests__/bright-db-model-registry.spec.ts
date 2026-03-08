import { BrightDbModelRegistry } from '../lib/bright-db-model-registry';

describe('BrightDbModelRegistry', () => {
  let registry: BrightDbModelRegistry;

  beforeEach(() => {
    registry = BrightDbModelRegistry.createIsolated();
  });

  it('register and get a collection', () => {
    const mockCollection = { insertOne: jest.fn() } as any;
    registry.register({
      collectionName: 'users',
      collection: mockCollection,
    });
    const reg = registry.get('users');
    expect(reg.collectionName).toBe('users');
    expect(reg.collection).toBe(mockCollection);
  });

  it('has() returns true for registered models', () => {
    registry.register({
      collectionName: 'roles',
      collection: {} as any,
    });
    expect(registry.has('roles')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('list() returns all registered model names', () => {
    registry.register({ collectionName: 'a', collection: {} as any });
    registry.register({ collectionName: 'b', collection: {} as any });
    expect(registry.list()).toEqual(['a', 'b']);
  });

  it('get() throws for unregistered model', () => {
    expect(() => registry.get('missing')).toThrow(/not registered/);
  });

  it('clear() removes all registrations', () => {
    registry.register({ collectionName: 'x', collection: {} as any });
    registry.clear();
    expect(registry.list()).toEqual([]);
    expect(registry.has('x')).toBe(false);
  });

  it('singleton instance is consistent', () => {
    const a = BrightDbModelRegistry.instance;
    const b = BrightDbModelRegistry.instance;
    expect(a).toBe(b);
  });

  it('register with schema', () => {
    const schema = { properties: { name: { type: 'string' as const } } };
    registry.register({
      collectionName: 'items',
      schema,
      collection: {} as any,
    });
    const reg = registry.get('items');
    expect(reg.schema).toBe(schema);
  });
});
