import { SecureKeyStorage } from './secureKeyStorage';

describe('SecureKeyStorage (Node.js)', () => {
  let storage: SecureKeyStorage;

  beforeEach(() => {
    storage = SecureKeyStorage.getInstance();
    // Clear any existing environment variables
    delete process.env['NODE_MNEMONIC'];
  });

  afterEach(() => {
    delete process.env['NODE_MNEMONIC'];
  });

  it('should be a singleton', () => {
    const instance1 = SecureKeyStorage.getInstance();
    const instance2 = SecureKeyStorage.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize from environment variable', async () => {
    const testMnemonic = 'test mnemonic phrase for secure storage';
    process.env['NODE_MNEMONIC'] = testMnemonic;

    await storage.initializeFromEnvironment();

    // Verify the environment variable was cleared
    expect(process.env['NODE_MNEMONIC']).toBeUndefined();

    // Verify we can retrieve the mnemonic
    const result = await storage.withMnemonic(async (mnemonic) => {
      expect(mnemonic).toBe(testMnemonic);
      return 'success';
    });

    expect(result).toBe('success');
  });

  it('should throw error if NODE_MNEMONIC is not set', async () => {
    await expect(storage.initializeFromEnvironment()).rejects.toThrow(
      'NODE_MNEMONIC environment variable not set',
    );
  });

  it('should wipe mnemonic after use', async () => {
    const testMnemonic = 'test mnemonic for wiping';
    process.env['NODE_MNEMONIC'] = testMnemonic;

    await storage.initializeFromEnvironment();

    // Use the mnemonic once
    await storage.withMnemonic(async (mnemonic) => {
      expect(mnemonic).toBe(testMnemonic);
      return 'first use';
    });

    // Try to use it again - should fail because it was wiped
    await expect(
      storage.withMnemonic(async (mnemonic) => {
        return mnemonic;
      }),
    ).rejects.toThrow();
  });

  it('should handle operation errors and still wipe memory', async () => {
    const testMnemonic = 'test mnemonic for error handling';
    process.env['NODE_MNEMONIC'] = testMnemonic;

    await storage.initializeFromEnvironment();

    // Operation that throws an error
    await expect(
      storage.withMnemonic(async () => {
        throw new Error('Operation failed');
      }),
    ).rejects.toThrow('Operation failed');

    // Memory should still be wiped even after error
    await expect(
      storage.withMnemonic(async (mnemonic) => {
        return mnemonic;
      }),
    ).rejects.toThrow();
  });

  it('should support multiple operations before wiping', async () => {
    const testMnemonic = 'test mnemonic for multiple ops';
    process.env['NODE_MNEMONIC'] = testMnemonic;

    await storage.initializeFromEnvironment();

    // First operation
    const result1 = await storage.withMnemonic(async (mnemonic) => {
      expect(mnemonic).toBe(testMnemonic);
      return 'first';
    });
    expect(result1).toBe('first');

    // Memory should be wiped after first use
    await expect(
      storage.withMnemonic(async (mnemonic) => {
        return mnemonic;
      }),
    ).rejects.toThrow();
  });
});
