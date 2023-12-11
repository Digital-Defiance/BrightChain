import { BrightDbDatabasePlugin } from '../lib/plugins/bright-db-database-plugin';

describe('BrightDbDatabasePlugin smoke test', () => {
  it('can be instantiated with mock environment', () => {
    const mockEnv = {
      blockStoreBlockSizes: [],
      blockStoreType: 'disk',
      memberPoolName: 'test',
      getObject: () => ({}),
    } as unknown as ConstructorParameters<typeof BrightDbDatabasePlugin>[0];

    const plugin = new BrightDbDatabasePlugin(mockEnv);
    expect(plugin).toBeDefined();
    expect(plugin.isConnected()).toBe(false);
    expect(plugin.name).toBe('brightdb');
    expect(plugin.version).toBe('1.0.0');
  });
});
