/**
 * Feature: brightchain-vfs-explorer, Property 6: Successful login stores token and emits auth-changed
 *
 * For any successful login response (from either mnemonic or password flow)
 * containing a JWT token string, the AuthManager should store the token in
 * the TokenStore and emit an `auth-changed` event with `authenticated: true`
 * and the user DTO from the response.
 *
 * **Validates: Requirements 2.4, 2.5, 3.3**
 */

import fc from 'fast-check';
// eslint-disable-next-line jest/no-mocks-import -- VS Code mock is the standard pattern for extension tests
import { SecretStorage } from '../../__mocks__/vscode';
import type { ILoginResponseData, IRequestUserDTO } from '../../api/types';
import { AuthManager, IAuthApiDelegate } from '../../auth/auth-manager';
import { TokenStore } from '../../auth/token-store';
import type { IAuthState } from '../../auth/types';
import { SettingsManager } from '../../services/settings-manager';

/** Arbitrary that generates a plausible IRequestUserDTO. */
const arbUser: fc.Arbitrary<IRequestUserDTO> = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  username: fc.string({ minLength: 1, maxLength: 30 }),
  displayName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
    nil: undefined,
  }),
  emailVerified: fc.boolean(),
});

/** Arbitrary that generates a non-empty token string. */
const arbToken = fc.string({ minLength: 1, maxLength: 200 });

/** Arbitrary that generates a hex-encoded public key string. */
const arbServerPublicKey = fc
  .uint8Array({ minLength: 33, maxLength: 65 })
  .map((bytes) => Buffer.from(bytes).toString('hex'));

describe('Property 6: Successful login stores token and emits auth-changed', () => {
  it('passwordLogin stores token and emits auth-changed with authenticated: true', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUser,
        arbToken,
        arbServerPublicKey,
        async (user, token, serverPublicKey) => {
          // Setup
          const secrets = new SecretStorage();
          const tokenStore = new TokenStore(
            secrets as unknown as import('vscode').SecretStorage,
          );
          const settingsManager = new SettingsManager();
          const auth = new AuthManager(tokenStore, settingsManager);

          // Mock API delegate that returns the generated response
          const mockDelegate: IAuthApiDelegate = {
            requestDirectLogin: jest.fn(),
            directChallenge: jest.fn(),
            passwordLogin: jest.fn().mockResolvedValue({
              user,
              token,
              serverPublicKey,
            } satisfies ILoginResponseData),
          };
          auth.setApiDelegate(mockDelegate);

          // Collect emitted events
          const emittedEvents: IAuthState[] = [];
          auth.onAuthChanged((state) => emittedEvents.push(state));

          // Act
          await auth.passwordLogin('testuser', 'testpass');

          // Assert 1: token is stored
          const storedToken = await tokenStore.get();
          expect(storedToken).toBe(token);

          // Assert 2: auth state is authenticated
          expect(auth.state.authenticated).toBe(true);

          // Assert 3: user matches
          expect(auth.state.user).toEqual(user);

          // Assert 4: auth-changed event was emitted with authenticated: true
          expect(emittedEvents.length).toBeGreaterThanOrEqual(1);
          const lastEvent = emittedEvents[emittedEvents.length - 1];
          expect(lastEvent.authenticated).toBe(true);
          expect(lastEvent.user).toEqual(user);

          // Cleanup
          auth.dispose();
          settingsManager.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });
});
