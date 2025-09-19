import { Wallet } from '@ethereumjs/wallet';
import { EciesEncryptionTypeEnum } from '../enumerations/ecies-encryption-type';
import { Pbkdf2ProfileEnum } from '../enumerations/pbkdf2-profile';
import { SecureString } from '../secure-string';
import { hexToUint8Array, uint8ArrayToHex } from '../utils';
import { AESGCMService } from './aesGCM';
import { ECIESService } from './ecies/service';
import { Pbkdf2Service } from './pbkdf2';

export class PasswordLoginService {
  private readonly eciesService: ECIESService;

  constructor(eciesService: ECIESService) {
    this.eciesService = eciesService;
  }

  public async createPasswordLoginBundle(
    mnemonic: SecureString,
    password: SecureString,
  ): Promise<{
    salt: Uint8Array;
    encryptedPrivateKey: Uint8Array;
    encryptedMnemonic: Uint8Array;
    wallet: Wallet;
  }> {
    const { wallet } = this.eciesService.walletAndSeedFromMnemonic(mnemonic);

    const derivedKey =
      await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
        password.valueAsBuffer,
        Pbkdf2ProfileEnum.BROWSER_PASSWORD,
      );

    // Encrypt private key with derived key
    const privateKeyBytes = wallet.getPrivateKey();
    const { encrypted, iv, tag } = await AESGCMService.encrypt(
      privateKeyBytes,
      derivedKey.hash,
      true,
    );
    const encryptedPrivateKey = AESGCMService.combineIvTagAndEncryptedData(
      iv,
      encrypted,
      tag!,
    );

    // now use the public key to encrypt the mnemonic and store it
    const encryptedMnemonic = await this.eciesService.encrypt(
      EciesEncryptionTypeEnum.Simple,
      [{ publicKey: wallet.getPublicKey() }],
      mnemonic.valueAsBuffer,
    );

    return {
      salt: derivedKey.salt,
      encryptedPrivateKey: encryptedPrivateKey,
      encryptedMnemonic: encryptedMnemonic,
      wallet,
    };
  }

  /**
   * Set up password login by deriving a key from the password and using it to encrypt
   * @param mnemonic The user's mnemonic
   * @param password The user's password
   */
  public async setupPasswordLoginLocalStorageBundle(
    mnemonic: SecureString,
    password: SecureString,
  ): Promise<void> {
    const { salt, encryptedPrivateKey, encryptedMnemonic } =
      await this.createPasswordLoginBundle(mnemonic, password);

    // store the salt and encrypted private key in local storage
    localStorage.setItem('passwordLoginSalt', uint8ArrayToHex(salt));
    localStorage.setItem(
      'encryptedPrivateKey',
      uint8ArrayToHex(encryptedPrivateKey),
    );
    localStorage.setItem(
      'encryptedMnemonic',
      uint8ArrayToHex(encryptedMnemonic),
    );
  }

  public async getWalletAndMnemonicFromEncryptedPasswordBundle(
    salt: Uint8Array,
    encryptedPrivateKey: Uint8Array,
    encryptedMnemonic: Uint8Array,
    password: SecureString,
  ): Promise<{ wallet: Wallet; mnemonic: SecureString }> {
    if (!salt || !encryptedPrivateKey || !encryptedMnemonic) {
      throw new Error('Password login not set up');
    }

    const derivedKey =
      await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
        password.valueAsBuffer,
        Pbkdf2ProfileEnum.BROWSER_PASSWORD,
        salt,
      );

    // Decrypt private key with derived key
    const { iv, encryptedDataWithTag } = AESGCMService.splitEncryptedData(
      encryptedPrivateKey,
      true,
    );
    const privateKeyBytes = await AESGCMService.decrypt(
      iv,
      encryptedDataWithTag,
      derivedKey.hash,
      true,
    );

    const wallet = Wallet.fromPrivateKey(privateKeyBytes);

    // now decrypt the mnemonic
    const decryptedMnemonic =
      await this.eciesService.decryptSimpleOrSingleWithHeader(
        true,
        wallet.getPrivateKey(),
        encryptedMnemonic,
      );

    return { wallet, mnemonic: new SecureString(decryptedMnemonic) };
  }

  /**
   * Recover wallet and mnemonic from password
   * @param password The user's password
   * @returns The user's wallet and mnemonic
   */
  public async getWalletAndMnemonicFromLocalStorageBundle(
    password: SecureString,
  ): Promise<{ wallet: Wallet; mnemonic: SecureString }> {
    const saltHex = localStorage.getItem('passwordLoginSalt');
    const encryptedPrivateKeyHex = localStorage.getItem('encryptedPrivateKey');
    const encryptedMnemonicHex = localStorage.getItem('encryptedMnemonic');

    if (
      !saltHex ||
      !encryptedPrivateKeyHex ||
      !encryptedMnemonicHex ||
      saltHex === '' ||
      encryptedPrivateKeyHex === '' ||
      encryptedMnemonicHex === ''
    ) {
      throw new Error('Password login not set up');
    }

    const salt = hexToUint8Array(saltHex);
    const encryptedPrivateKey = hexToUint8Array(encryptedPrivateKeyHex);
    const encryptedMnemonic = hexToUint8Array(encryptedMnemonicHex);

    return await this.getWalletAndMnemonicFromEncryptedPasswordBundle(
      salt,
      encryptedPrivateKey,
      encryptedMnemonic,
      password,
    );
  }
}
