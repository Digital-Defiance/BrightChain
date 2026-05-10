/**
 * Feature: brightchain-vfs-explorer, Property 8: Token persistence round-trip
 *
 * For any JWT token string, storing it via `TokenStore.store()` and then
 * retrieving it via `TokenStore.get()` should return the identical token string.
 *
 * **Validates: Requirements 4.1**
 */

import fc from 'fast-check';
// eslint-disable-next-line jest/no-mocks-import -- VS Code mock is the standard pattern for extension tests
import { SecretStorage } from '../../__mocks__/vscode';
import { TokenStore } from '../../auth/token-store';

describe('Property 8: Token persistence round-trip', () => {
  it('store() then get() returns the identical token string', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (token) => {
        const secrets = new SecretStorage();
        const store = new TokenStore(
          secrets as unknown as import('vscode').SecretStorage,
        );

        await store.store(token);
        const retrieved = await store.get();

        expect(retrieved).toBe(token);
      }),
      { numRuns: 100 },
    );
  });
});
