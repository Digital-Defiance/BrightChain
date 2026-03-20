import { BrightDbDatabasePlugin } from '../lib/plugins/bright-db-database-plugin';
import { BrightDbAuthenticationProvider } from '../lib/services/bright-db-authentication-provider';

describe('BrightDbDatabasePlugin', () => {
  // Use a mock environment that satisfies the constructor
  const mockEnv = {
    blockStoreBlockSizes: [],
    blockStoreType: 'disk',
    memberPoolName: 'test',
    getObject: () => ({}),
  } as unknown as ConstructorParameters<typeof BrightDbDatabasePlugin>[0];

  it('isConnected() returns false before connect', () => {
    const plugin = new BrightDbDatabasePlugin(mockEnv);
    expect(plugin.isConnected()).toBe(false);
  });

  it('database throws when not connected', () => {
    const plugin = new BrightDbDatabasePlugin(mockEnv);
    expect(() => plugin.database).toThrow(/not connected/);
  });

  it('blockStore throws when not connected', () => {
    const plugin = new BrightDbDatabasePlugin(mockEnv);
    expect(() => plugin.blockStore).toThrow(/not connected/);
  });

  it('brightDb throws when not connected', () => {
    const plugin = new BrightDbDatabasePlugin(mockEnv);
    expect(() => plugin.brightDb).toThrow(/not connected/);
  });

  it('disconnect() is idempotent when not connected', async () => {
    const plugin = new BrightDbDatabasePlugin(mockEnv);
    await expect(plugin.disconnect()).resolves.toBeUndefined();
  });
});

describe('BrightDbAuthenticationProvider', () => {
  it('verifyToken returns null for invalid token', async () => {
    const mockDb = {} as unknown as ConstructorParameters<
      typeof BrightDbAuthenticationProvider
    >[0];
    const provider = new BrightDbAuthenticationProvider(mockDb, 'test-secret');
    const result = await provider.verifyToken('invalid-token');
    expect(result).toBeNull();
  });
});
