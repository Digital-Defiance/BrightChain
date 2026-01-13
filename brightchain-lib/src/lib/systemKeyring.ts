import { randomBytes } from './browserCrypto';
import { KEYRING_ALGORITHM_CONFIGURATION } from './constants';
import { SystemKeyringErrorType } from './enumerations/systemKeyringErrorType';
import { SystemKeyringError } from './errors/systemKeyringError';
import { IKeyringEntry } from './interfaces/keyringEntry';
import { BrowserKeyring } from './browserKeyring';

// Browser-compatible SystemKeyring that delegates to BrowserKeyring
export class SystemKeyring {
  private static instance: SystemKeyring;
  private browserKeyring: BrowserKeyring;

  private constructor() {
    this.browserKeyring = BrowserKeyring.getInstance();
  }

  public static getInstance(): SystemKeyring {
    if (!SystemKeyring.instance) {
      SystemKeyring.instance = new SystemKeyring();
    }
    return SystemKeyring.instance;
  }

  public async storeKey(
    id: string,
    data: Uint8Array,
    password: string,
  ): Promise<void> {
    return this.browserKeyring.storeKey(id, data, password);
  }

  public async retrieveKey(id: string, password: string): Promise<Uint8Array> {
    return this.browserKeyring.retrieveKey(id, password);
  }

  public async initialize(): Promise<void> {
    return this.browserKeyring.initialize();
  }

  public async rotateKey(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    return this.browserKeyring.rotateKey(id, oldPassword, newPassword);
  }
}
