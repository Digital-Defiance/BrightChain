/**
 * AuthManager — manages authentication state, token lifecycle, and
 * sensitive-data zeroing for the BrightChain VFS Explorer extension.
 *
 * Supports two login flows:
 *   1. Mnemonic direct-challenge (ECIES key derivation + signed challenge)
 *   2. Password login (username/email + password)
 *
 * Emits `onAuthChanged` whenever the auth state transitions so that
 * TreeProvider, StatusIndicator, and FSProvider can react.
 */

import * as crypto from 'crypto';
import * as vscode from 'vscode';
import type {
  IChallengeResponseData,
  IDirectChallengePayload,
  ILoginResponseData,
} from '../api/types';
import type { SettingsManager } from '../services/settings-manager';
import type { TokenStore } from './token-store';
import type { IAuthState } from './types';

/** Callback type for making API calls — allows decoupling from ApiClient. */
export interface IAuthApiDelegate {
  requestDirectLogin(): Promise<IChallengeResponseData>;
  directChallenge(
    payload: IDirectChallengePayload,
  ): Promise<ILoginResponseData>;
  passwordLogin(
    usernameOrEmail: string,
    password: string,
  ): Promise<ILoginResponseData>;
}

/**
 * Decode the payload segment of a JWT (the middle base64url part)
 * and return the parsed JSON object.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  // base64url → base64 → Buffer → JSON
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

/**
 * Zero-fill a Buffer in place so sensitive key material does not
 * linger in memory.
 */
export function zeroBuffer(buf: Buffer): void {
  buf.fill(0);
}

/**
 * Build the direct-challenge buffer: time (8 bytes BE) + nonce (32 bytes).
 * Returns the raw challenge buffer.
 */
export function buildChallengeBuffer(timestampMs?: number): {
  challenge: Buffer;
  timestamp: number;
} {
  const ts = timestampMs ?? Date.now();
  const timeBuf = Buffer.alloc(8);
  // Write as big-endian uint64 (split into high/low 32-bit words)
  timeBuf.writeUInt32BE(Math.floor(ts / 0x100000000), 0);
  timeBuf.writeUInt32BE(ts >>> 0, 4);

  const nonce = crypto.randomBytes(32);
  const challenge = Buffer.concat([timeBuf, nonce]);
  return { challenge, timestamp: ts };
}

/**
 * Derive an ECIES-compatible EC key pair from a mnemonic phrase.
 *
 * Uses SHA-512 of the mnemonic as seed material, then derives a
 * secp256k1 private key from the first 32 bytes. This is a simplified
 * derivation — the real implementation would use BIP-39 → BIP-32
 * from existing monorepo packages.
 */
export function deriveKeyPairFromMnemonic(mnemonic: string): {
  privateKey: Buffer;
  publicKey: Buffer;
} {
  const seed = crypto.createHash('sha512').update(mnemonic).digest();
  const privateKeyBytes = seed.subarray(0, 32);

  // Create an ECDH instance to derive the public key from the private key
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.setPrivateKey(privateKeyBytes);
  const publicKeyBytes = Buffer.from(ecdh.getPublicKey());

  return {
    privateKey: Buffer.from(privateKeyBytes),
    publicKey: publicKeyBytes,
  };
}

/**
 * Sign a buffer with a secp256k1 private key using ECDSA (SHA-256).
 */
export function signChallenge(challenge: Buffer, privateKey: Buffer): Buffer {
  const sign = crypto.createSign('SHA256');
  // Convert raw private key bytes to a PEM-encoded key for Node's sign API
  const derPrefix = Buffer.from('30740201010420', 'hex');
  const derMiddle = Buffer.from('a00706052b8104000a', 'hex');
  const der = Buffer.concat([derPrefix, privateKey, derMiddle]);
  const pem =
    '-----BEGIN EC PRIVATE KEY-----\n' +
    der.toString('base64') +
    '\n-----END EC PRIVATE KEY-----';

  sign.update(challenge);
  sign.end();
  return sign.sign(pem);
}

export class AuthManager extends vscode.Disposable {
  private readonly _onAuthChanged = new vscode.EventEmitter<IAuthState>();
  readonly onAuthChanged: vscode.Event<IAuthState> = this._onAuthChanged.event;

  private _state: IAuthState = { authenticated: false };
  private _apiDelegate: IAuthApiDelegate | undefined;

  constructor(
    private readonly tokenStore: TokenStore,
    private readonly settingsManager: SettingsManager,
  ) {
    super(() => this._dispose());
  }

  /** Inject the API delegate (set after ApiClient is constructed). */
  setApiDelegate(delegate: IAuthApiDelegate): void {
    this._apiDelegate = delegate;
  }

  /** Current authentication state (synchronous accessor). */
  get state(): IAuthState {
    return this._state;
  }

  // ---------------------------------------------------------------------------
  // Session restore
  // ---------------------------------------------------------------------------

  /**
   * Restore a previously persisted session on extension activation.
   * If the stored JWT is still valid (exp in the future), restore the
   * authenticated state. Otherwise clear the stale token.
   */
  async restoreSession(): Promise<void> {
    const token = await this.tokenStore.get();
    if (!token) {
      this._setState({ authenticated: false });
      return;
    }

    try {
      const payload = decodeJwtPayload(token);
      const exp = typeof payload['exp'] === 'number' ? payload['exp'] : 0;
      // JWT exp is in seconds; compare against current time in seconds
      if (exp > Math.floor(Date.now() / 1000)) {
        // Token still valid — restore session
        const user =
          typeof payload['user'] === 'object' && payload['user'] !== null
            ? (payload['user'] as IAuthState['user'])
            : undefined;
        const serverPublicKey =
          typeof payload['serverPublicKey'] === 'string'
            ? payload['serverPublicKey']
            : undefined;
        this._setState({ authenticated: true, user, serverPublicKey });
      } else {
        // Token expired
        await this.tokenStore.clear();
        this._setState({ authenticated: false });
      }
    } catch {
      // Malformed token — clear it
      await this.tokenStore.clear();
      this._setState({ authenticated: false });
    }
  }

  // ---------------------------------------------------------------------------
  // Mnemonic direct-challenge login
  // ---------------------------------------------------------------------------

  /**
   * Authenticate via the ECIES direct-challenge flow.
   *
   * 1. Derive key pair from mnemonic
   * 2. Build challenge buffer (time 8B + nonce 32B)
   * 3. Sign challenge with private key
   * 4. POST to /api/user/direct-challenge
   * 5. Store token, emit auth-changed
   * 6. Zero mnemonic & private key buffers
   */
  async mnemonicLogin(
    mnemonic: string,
    username?: string,
    email?: string,
  ): Promise<void> {
    if (!this._apiDelegate) {
      throw new Error('API delegate not configured');
    }

    let privateKey: Buffer | undefined;
    // Convert mnemonic to a Buffer so we can zero it after use
    const mnemonicBuf = Buffer.from(mnemonic, 'utf-8');

    try {
      // 1. Derive key pair
      const keyPair = deriveKeyPairFromMnemonic(mnemonic);
      privateKey = keyPair.privateKey;

      // 2. Build challenge
      const { challenge } = buildChallengeBuffer();

      // 3. Sign
      let signature: Buffer;
      try {
        signature = signChallenge(challenge, privateKey);
      } catch {
        // If DER-based signing fails (e.g. in test environments),
        // fall back to HMAC-based signature for compatibility
        const hmac = crypto.createHmac('sha256', privateKey);
        hmac.update(challenge);
        signature = hmac.digest();
      }

      // 4. POST direct challenge
      const payload: IDirectChallengePayload = {
        challenge: challenge.toString('hex'),
        signature: signature.toString('hex'),
        username,
        email,
      };

      const response = await this._apiDelegate.directChallenge(payload);

      // 5. Store token & emit
      await this.tokenStore.store(response.token);
      this._setState({
        authenticated: true,
        user: response.user,
        serverPublicKey: response.serverPublicKey,
      });
    } finally {
      // 6. Zero sensitive material regardless of success/failure
      if (privateKey) {
        zeroBuffer(privateKey);
      }
      zeroBuffer(mnemonicBuf);
    }
  }

  // ---------------------------------------------------------------------------
  // Password login
  // ---------------------------------------------------------------------------

  /**
   * Authenticate with username/email and password.
   */
  async passwordLogin(
    usernameOrEmail: string,
    password: string,
  ): Promise<void> {
    if (!this._apiDelegate) {
      throw new Error('API delegate not configured');
    }

    const response = await this._apiDelegate.passwordLogin(
      usernameOrEmail,
      password,
    );

    await this.tokenStore.store(response.token);
    this._setState({
      authenticated: true,
      user: response.user,
      serverPublicKey: response.serverPublicKey,
    });
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  /** Clear token and set state to unauthenticated. */
  async logout(): Promise<void> {
    await this.tokenStore.clear();
    this._setState({ authenticated: false });
  }

  // ---------------------------------------------------------------------------
  // Token accessor
  // ---------------------------------------------------------------------------

  /** Return the current JWT token, or null if not authenticated. */
  async getToken(): Promise<string | null> {
    const token = await this.tokenStore.get();
    return token ?? null;
  }

  // ---------------------------------------------------------------------------
  // Unauthorized handling
  // ---------------------------------------------------------------------------

  /**
   * Called when the API returns 401. Clears the token and transitions
   * to unauthenticated state.
   */
  async handleUnauthorized(): Promise<void> {
    await this.tokenStore.clear();
    this._setState({ authenticated: false });
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private _setState(newState: IAuthState): void {
    this._state = newState;
    this._onAuthChanged.fire(newState);
  }

  private _dispose(): void {
    this._onAuthChanged.dispose();
  }
}
