import { BrowserKeyring } from './browserKeyring';
import type { IKeyring } from './keyring.types';
import { NodeKeyring } from './nodeKeyring';

// IKeyring interface is defined in keyring.types.ts to avoid circular imports

/**
 * Keyring type enumeration for identifying which backend is in use
 */
export enum KeyringType {
  Browser = 'browser',
  Node = 'node',
  SecureEnclave = 'secure-enclave',
}

/**
 * SystemKeyring delegates to the appropriate implementation based on environment
 *
 * Priority order:
 * 1. SecureEnclaveKeyring - On macOS Apple Silicon with Enclave Bridge running
 * 2. NodeKeyring - In Node.js environments
 * 3. BrowserKeyring - In browser environments
 */
export class SystemKeyring implements IKeyring {
  private static instance: SystemKeyring;
  private keyringImpl: IKeyring | null = null;
  private keyringType: KeyringType | null = null;
  private initPromise: Promise<void> | null = null;
  private useSecureEnclave: boolean | null = null;

  private constructor() {
    // Keyring implementation is initialized lazily
  }

  public static getInstance(): SystemKeyring {
    if (!SystemKeyring.instance) {
      SystemKeyring.instance = new SystemKeyring();
    }
    return SystemKeyring.instance;
  }

  /**
   * Check if Secure Enclave is available and preferred
   * This can be called to determine which keyring backend will be used
   */
  public static async isSecureEnclaveAvailable(): Promise<boolean> {
    // Only check on macOS Apple Silicon
    if (
      typeof process === 'undefined' ||
      process.platform !== 'darwin' ||
      process.arch !== 'arm64'
    ) {
      return false;
    }

    try {
      const { SecureEnclaveKeyring } = await import('./secureEnclaveKeyring');
      return await SecureEnclaveKeyring.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Get the current keyring type
   * Returns null if keyring hasn't been initialized yet
   */
  public getKeyringType(): KeyringType | null {
    return this.keyringType;
  }

  /**
   * Force using (or not using) Secure Enclave
   * Must be called before initialize() or any key operations
   *
   * @param use - true to force Secure Enclave, false to skip it
   */
  public setUseSecureEnclave(use: boolean): void {
    if (this.keyringImpl !== null) {
      throw new Error(
        'Cannot change Secure Enclave preference after keyring is initialized',
      );
    }
    this.useSecureEnclave = use;
  }

  /**
   * Initialize the keyring - detects and connects to the appropriate backend
   */
  public async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    if (this.keyringImpl) {
      return;
    }

    this.keyringImpl = await this.detectKeyringImpl();
    await this.keyringImpl.initialize();
  }

  /**
   * Detects and returns the appropriate keyring implementation
   */
  private async detectKeyringImpl(): Promise<IKeyring> {
    // Node.js detection
    const isNode =
      typeof process !== 'undefined' &&
      process.versions &&
      process.versions.node;

    if (isNode) {
      // Check for Apple Silicon macOS with Secure Enclave
      const isMacOSAppleSilicon =
        process.platform === 'darwin' && process.arch === 'arm64';

      if (isMacOSAppleSilicon && this.useSecureEnclave !== false) {
        try {
          const { SecureEnclaveKeyring } =
            await import('./secureEnclaveKeyring');
          const isAvailable = await SecureEnclaveKeyring.isAvailable();

          if (isAvailable) {
            this.keyringType = KeyringType.SecureEnclave;
            return SecureEnclaveKeyring.getInstance();
          }
        } catch {
          // Secure Enclave not available, fall through to NodeKeyring
        }
      }

      // Fallback to NodeKeyring for Node.js

      this.keyringType = KeyringType.Node;
      return NodeKeyring.getInstance();
    }

    // Default to browser

    this.keyringType = KeyringType.Browser;
    return BrowserKeyring.getInstance();
  }

  /**
   * Ensures the keyring is initialized before use
   */
  private async ensureInitialized(): Promise<IKeyring> {
    if (!this.keyringImpl) {
      await this.initialize();
    }
    return this.keyringImpl!;
  }

  public async storeKey(
    id: string,
    data: Uint8Array,
    password: string,
  ): Promise<void> {
    const impl = await this.ensureInitialized();
    return impl.storeKey(id, data, password);
  }

  public async retrieveKey(id: string, password: string): Promise<Uint8Array> {
    const impl = await this.ensureInitialized();
    return impl.retrieveKey(id, password);
  }

  public async rotateKey(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const impl = await this.ensureInitialized();
    return impl.rotateKey(id, oldPassword, newPassword);
  }
}
