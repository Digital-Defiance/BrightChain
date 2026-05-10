// eslint-disable-next-line jest/no-mocks-import -- VS Code mock is the standard pattern for extension tests
import { SecretStorage } from '../../__mocks__/vscode';
import type { ILoginResponseData } from '../../api/types';
import {
  AuthManager,
  zeroBuffer,
  type IAuthApiDelegate,
} from '../../auth/auth-manager';
import { TokenStore } from '../../auth/token-store';
import type { IAuthState } from '../../auth/types';
import { SettingsManager } from '../../services/settings-manager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal JWT with the given payload (no real signature). */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString(
    'base64url',
  );
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

function makeLoginResponse(
  overrides?: Partial<ILoginResponseData>,
): ILoginResponseData {
  return {
    token: fakeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'u1',
        email: 'a@b.com',
        username: 'alice',
        emailVerified: true,
      },
    }),
    user: {
      id: 'u1',
      email: 'a@b.com',
      username: 'alice',
      emailVerified: true,
    },
    serverPublicKey: 'spk-hex',
    ...overrides,
  };
}

function makeMockDelegate(
  response?: ILoginResponseData,
  error?: Error,
): IAuthApiDelegate {
  return {
    requestDirectLogin: jest.fn().mockResolvedValue({
      challenge: 'aa'.repeat(104), // 104 bytes hex = 208 chars
      message: 'Challenge generated',
      serverPublicKey: 'spk-hex',
    }),
    directChallenge: error
      ? jest.fn().mockRejectedValue(error)
      : jest.fn().mockResolvedValue(response ?? makeLoginResponse()),
    passwordLogin: error
      ? jest.fn().mockRejectedValue(error)
      : jest.fn().mockResolvedValue(response ?? makeLoginResponse()),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthManager', () => {
  let secrets: SecretStorage;
  let tokenStore: TokenStore;
  let settings: SettingsManager;
  let auth: AuthManager;

  beforeEach(() => {
    secrets = new SecretStorage();
    tokenStore = new TokenStore(
      secrets as unknown as import('vscode').SecretStorage,
    );
    settings = new SettingsManager();
    auth = new AuthManager(tokenStore, settings);
  });

  afterEach(() => {
    auth.dispose();
    settings.dispose();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  it('should start with authenticated: false', () => {
    expect(auth.state).toEqual({ authenticated: false });
  });

  // -------------------------------------------------------------------------
  // restoreSession
  // -------------------------------------------------------------------------

  describe('restoreSession', () => {
    it('should remain unauthenticated when no token is stored', async () => {
      await auth.restoreSession();
      expect(auth.state.authenticated).toBe(false);
    });

    it('should restore session when token is valid (exp in future)', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const user = {
        id: 'u1',
        email: 'a@b.com',
        username: 'alice',
        emailVerified: true,
      };
      await tokenStore.store(fakeJwt({ exp, user, serverPublicKey: 'spk' }));

      await auth.restoreSession();

      expect(auth.state.authenticated).toBe(true);
      expect(auth.state.user).toEqual(user);
      expect(auth.state.serverPublicKey).toBe('spk');
    });

    it('should clear token and set unauthenticated when token is expired', async () => {
      const exp = Math.floor(Date.now() / 1000) - 60; // expired 60s ago
      await tokenStore.store(fakeJwt({ exp }));

      await auth.restoreSession();

      expect(auth.state.authenticated).toBe(false);
      expect(await tokenStore.get()).toBeUndefined();
    });

    it('should clear token on malformed JWT', async () => {
      await tokenStore.store('not-a-jwt');

      await auth.restoreSession();

      expect(auth.state.authenticated).toBe(false);
      expect(await tokenStore.get()).toBeUndefined();
    });

    it('should emit auth-changed event on restore', async () => {
      const events: IAuthState[] = [];
      auth.onAuthChanged((s) => events.push(s));

      await auth.restoreSession();

      expect(events.length).toBe(1);
      expect(events[0].authenticated).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // passwordLogin
  // -------------------------------------------------------------------------

  describe('passwordLogin', () => {
    it('should store token and set authenticated state', async () => {
      const delegate = makeMockDelegate();
      auth.setApiDelegate(delegate);

      await auth.passwordLogin('alice', 'secret');

      expect(auth.state.authenticated).toBe(true);
      expect(auth.state.user?.username).toBe('alice');
      expect(await tokenStore.get()).toBeDefined();
    });

    it('should emit auth-changed with authenticated: true', async () => {
      const delegate = makeMockDelegate();
      auth.setApiDelegate(delegate);
      const events: IAuthState[] = [];
      auth.onAuthChanged((s) => events.push(s));

      await auth.passwordLogin('alice', 'secret');

      expect(events.length).toBe(1);
      expect(events[0].authenticated).toBe(true);
    });

    it('should throw when API delegate is not set', async () => {
      await expect(auth.passwordLogin('alice', 'secret')).rejects.toThrow(
        'API delegate not configured',
      );
    });

    it('should propagate API errors', async () => {
      const delegate = makeMockDelegate(
        undefined,
        new Error('Invalid credentials'),
      );
      auth.setApiDelegate(delegate);

      await expect(auth.passwordLogin('alice', 'wrong')).rejects.toThrow(
        'Invalid credentials',
      );
      expect(auth.state.authenticated).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // mnemonicLogin
  // -------------------------------------------------------------------------

  describe('mnemonicLogin', () => {
    it('should store token and set authenticated state on success', async () => {
      const delegate = makeMockDelegate();
      auth.setApiDelegate(delegate);

      await auth.mnemonicLogin(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'alice',
      );

      expect(auth.state.authenticated).toBe(true);
      expect(delegate.directChallenge).toHaveBeenCalledTimes(1);
      const call = (delegate.directChallenge as jest.Mock).mock.calls[0][0];
      expect(call.challenge).toBeDefined();
      expect(call.signature).toBeDefined();
      expect(call.username).toBe('alice');
    });

    it('should throw when API delegate is not set', async () => {
      await expect(auth.mnemonicLogin('test mnemonic')).rejects.toThrow(
        'API delegate not configured',
      );
    });

    it('should propagate API errors and still zero key material', async () => {
      const delegate = makeMockDelegate(
        undefined,
        new Error('Challenge rejected'),
      );
      auth.setApiDelegate(delegate);

      await expect(
        auth.mnemonicLogin('test mnemonic phrase', 'alice'),
      ).rejects.toThrow('Challenge rejected');
      expect(auth.state.authenticated).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------

  describe('logout', () => {
    it('should clear token and emit auth-changed with authenticated: false', async () => {
      const delegate = makeMockDelegate();
      auth.setApiDelegate(delegate);
      await auth.passwordLogin('alice', 'secret');

      const events: IAuthState[] = [];
      auth.onAuthChanged((s) => events.push(s));

      await auth.logout();

      expect(auth.state.authenticated).toBe(false);
      expect(await tokenStore.get()).toBeUndefined();
      expect(events.length).toBe(1);
      expect(events[0].authenticated).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getToken
  // -------------------------------------------------------------------------

  describe('getToken', () => {
    it('should return null when no token is stored', async () => {
      expect(await auth.getToken()).toBeNull();
    });

    it('should return the stored token', async () => {
      const delegate = makeMockDelegate();
      auth.setApiDelegate(delegate);
      await auth.passwordLogin('alice', 'secret');

      const token = await auth.getToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // handleUnauthorized
  // -------------------------------------------------------------------------

  describe('handleUnauthorized', () => {
    it('should clear token and set state to unauthenticated', async () => {
      const delegate = makeMockDelegate();
      auth.setApiDelegate(delegate);
      await auth.passwordLogin('alice', 'secret');
      expect(auth.state.authenticated).toBe(true);

      const events: IAuthState[] = [];
      auth.onAuthChanged((s) => events.push(s));

      await auth.handleUnauthorized();

      expect(auth.state.authenticated).toBe(false);
      expect(await tokenStore.get()).toBeUndefined();
      expect(events.length).toBe(1);
      expect(events[0].authenticated).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Utility functions
  // -------------------------------------------------------------------------

  describe('zeroBuffer', () => {
    it('should fill buffer with zeros', () => {
      const buf = Buffer.from([1, 2, 3, 4, 5]);
      zeroBuffer(buf);
      expect(buf.every((b) => b === 0)).toBe(true);
    });
  });
});
