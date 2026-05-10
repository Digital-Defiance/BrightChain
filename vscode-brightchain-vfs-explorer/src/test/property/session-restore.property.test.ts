/**
 * Feature: brightchain-vfs-explorer, Property 9: Session restore respects token expiration
 *
 * For any stored JWT token, `AuthManager.restoreSession()` should restore the
 * authenticated session if and only if the token's `exp` claim is in the future.
 * If the token is expired, the token should be cleared from the TokenStore and
 * the auth state should be `{ authenticated: false }`.
 *
 * **Validates: Requirements 4.2, 4.3**
 */

import fc from 'fast-check';
// eslint-disable-next-line jest/no-mocks-import -- VS Code mock is the standard pattern for extension tests
import { SecretStorage } from '../../__mocks__/vscode';
import { AuthManager } from '../../auth/auth-manager';
import { TokenStore } from '../../auth/token-store';
import { SettingsManager } from '../../services/settings-manager';

/**
 * Build a fake JWT with the given payload object.
 * Format: base64url(header).base64url(payload).fakesig
 */
function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256' };
  const encode = (obj: Record<string, unknown>): string =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode(header)}.${encode(payload)}.fakesig`;
}

/** Arbitrary user object embedded in JWT payload. */
const arbUser = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  username: fc.string({ minLength: 1, maxLength: 30 }),
  displayName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
    nil: undefined,
  }),
  emailVerified: fc.boolean(),
});

/** Arbitrary hex-encoded server public key. */
const arbServerPublicKey = fc
  .uint8Array({ minLength: 16, maxLength: 64 })
  .map((bytes) => Buffer.from(bytes).toString('hex'));

/**
 * Generate an `exp` value that is clearly in the future (60–3600 seconds from now).
 */
const arbFutureExp = fc
  .integer({ min: 60, max: 3600 })
  .map((offset) => Math.floor(Date.now() / 1000) + offset);

/**
 * Generate an `exp` value that is clearly in the past (1–3600 seconds ago).
 */
const arbPastExp = fc
  .integer({ min: 1, max: 3600 })
  .map((offset) => Math.floor(Date.now() / 1000) - offset);

describe('Property 9: Session restore respects token expiration', () => {
  it('restores session when token exp is in the future', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUser,
        arbServerPublicKey,
        arbFutureExp,
        async (user, serverPublicKey, exp) => {
          const secrets = new SecretStorage();
          const tokenStore = new TokenStore(
            secrets as unknown as import('vscode').SecretStorage,
          );
          const settingsManager = new SettingsManager();
          const auth = new AuthManager(tokenStore, settingsManager);

          // Build and store a fake JWT with a future exp
          const token = buildFakeJwt({ exp, user, serverPublicKey });
          await tokenStore.store(token);

          // Act
          await auth.restoreSession();

          // Assert: session is restored
          expect(auth.state.authenticated).toBe(true);
          expect(auth.state.user).toEqual(user);
          expect(auth.state.serverPublicKey).toBe(serverPublicKey);

          // Assert: token is still in the store
          const storedToken = await tokenStore.get();
          expect(storedToken).toBe(token);

          // Cleanup
          auth.dispose();
          settingsManager.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('clears token and sets unauthenticated when token exp is in the past', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUser,
        arbServerPublicKey,
        arbPastExp,
        async (user, serverPublicKey, exp) => {
          const secrets = new SecretStorage();
          const tokenStore = new TokenStore(
            secrets as unknown as import('vscode').SecretStorage,
          );
          const settingsManager = new SettingsManager();
          const auth = new AuthManager(tokenStore, settingsManager);

          // Build and store a fake JWT with a past exp
          const token = buildFakeJwt({ exp, user, serverPublicKey });
          await tokenStore.store(token);

          // Act
          await auth.restoreSession();

          // Assert: session is NOT restored
          expect(auth.state.authenticated).toBe(false);
          expect(auth.state.user).toBeUndefined();

          // Assert: token is cleared from the store
          const storedToken = await tokenStore.get();
          expect(storedToken).toBeUndefined();

          // Cleanup
          auth.dispose();
          settingsManager.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });
});
