// eslint-disable-next-line jest/no-mocks-import -- VS Code mock is the standard pattern for extension tests
import { SecretStorage } from '../../__mocks__/vscode';
import { TokenStore } from '../../auth/token-store';

describe('TokenStore', () => {
  let secrets: SecretStorage;
  let tokenStore: TokenStore;

  beforeEach(() => {
    secrets = new SecretStorage();
    tokenStore = new TokenStore(
      secrets as unknown as import('vscode').SecretStorage,
    );
  });

  it('should return undefined when no token is stored', async () => {
    expect(await tokenStore.get()).toBeUndefined();
  });

  it('should store and retrieve a token', async () => {
    await tokenStore.store('my-jwt-token');
    expect(await tokenStore.get()).toBe('my-jwt-token');
  });

  it('should overwrite a previously stored token', async () => {
    await tokenStore.store('token-1');
    await tokenStore.store('token-2');
    expect(await tokenStore.get()).toBe('token-2');
  });

  it('should clear the stored token', async () => {
    await tokenStore.store('my-jwt-token');
    await tokenStore.clear();
    expect(await tokenStore.get()).toBeUndefined();
  });

  it('should not throw when clearing with no stored token', async () => {
    await expect(tokenStore.clear()).resolves.toBeUndefined();
  });
});
