import * as Suite from '../index';

describe('@brightchain/node-express-suite exports', () => {
  // Moved modules
  it('exports BlockDocumentStore', () => {
    expect(Suite.BlockDocumentStore).toBeDefined();
  });
  it('exports MemoryDocumentStore', () => {
    expect(Suite.MemoryDocumentStore).toBeDefined();
  });
  it('exports CollectionHeadRegistry', () => {
    expect(Suite.CollectionHeadRegistry).toBeDefined();
  });
  it('exports validation functions', () => {
    expect(Suite.validateRegistration).toBeDefined();
    expect(Suite.validateLogin).toBeDefined();
    expect(Suite.validatePasswordChange).toBeDefined();
    expect(Suite.validateRecovery).toBeDefined();
  });
  it('exports validateBody middleware', () => {
    expect(Suite.validateBody).toBeDefined();
  });
  it('exports BrightChainSessionAdapter', () => {
    expect(Suite.BrightChainSessionAdapter).toBeDefined();
  });
  it('exports brightchainDatabaseInit', () => {
    expect(Suite.brightchainDatabaseInit).toBeDefined();
  });
  it('exports BlockStoreFactory', () => {
    expect(Suite.BlockStoreFactory).toBeDefined();
  });

  // Base classes
  it('exports BrightDbEnvironment', () => {
    expect(Suite.BrightDbEnvironment).toBeDefined();
  });
  it('exports BrightDbDatabasePlugin', () => {
    expect(Suite.BrightDbDatabasePlugin).toBeDefined();
  });
  it('exports BrightDbApplication', () => {
    expect(Suite.BrightDbApplication).toBeDefined();
  });
  it('exports BrightDbAuthenticationProvider', () => {
    expect(Suite.BrightDbAuthenticationProvider).toBeDefined();
  });
  it('exports configureBrightDbApp', () => {
    expect(Suite.configureBrightDbApp).toBeDefined();
  });
  it('exports BrightDbConstants', () => {
    expect(Suite.BrightDbConstants).toBeDefined();
  });
  it('exports BrightDbMiddlewares', () => {
    expect(Suite.BrightDbMiddlewares).toBeDefined();
  });

  // Re-export barrels
  it('exports upstream Application', () => {
    expect(Suite.Application).toBeDefined();
  });
  it('exports BrightDb from @brightchain/db', () => {
    expect(Suite.BrightDb).toBeDefined();
  });
  it('exports BlockSize from brightchain-lib', () => {
    expect(Suite.BlockSize).toBeDefined();
  });
  it('exports BlockStoreType from brightchain-lib', () => {
    expect(Suite.BlockStoreType).toBeDefined();
  });

  // Test utilities
  it('exports createTestApp', () => {
    expect(Suite.createTestApp).toBeDefined();
  });
});
