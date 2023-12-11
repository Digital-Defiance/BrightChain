import { SecureHeapStorage } from './secureHeapStorage';
import { SystemKeyring } from './systemKeyring';

/**
 * Browser-compatible secure key storage
 * For Node.js environment variable initialization, use the version in brightchain-api-lib
 */
export class SecureKeyStorage {
  private static instance: SecureKeyStorage;
  private readonly secureHeap: SecureHeapStorage;
  private readonly systemKeyring: SystemKeyring;

  private constructor() {
    this.secureHeap = new SecureHeapStorage();
    this.systemKeyring = SystemKeyring.getInstance();
  }

  public static getInstance(): SecureKeyStorage {
    if (!SecureKeyStorage.instance) {
      SecureKeyStorage.instance = new SecureKeyStorage();
    }
    return SecureKeyStorage.instance;
  }

  /**
   * Store a mnemonic directly (browser-compatible)
   * @param mnemonic The mnemonic to store
   */
  public async storeMnemonic(mnemonic: string): Promise<void> {
    // Store in secure heap with auto-wiping
    await this.secureHeap.store('node-mnemonic', mnemonic);
  }

  public async withMnemonic<T>(
    operation: (mnemonic: string) => Promise<T>,
  ): Promise<T> {
    try {
      const mnemonic = await this.secureHeap.retrieve('node-mnemonic');
      const result = await operation(mnemonic);
      return result;
    } finally {
      // Ensure memory is wiped after use
      this.secureHeap.wipe('node-mnemonic');
    }
  }
}
