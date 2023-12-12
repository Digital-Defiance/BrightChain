import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createECDH,
  CipherGCMTypes,
} from 'crypto';
import { hdkey } from 'ethereumjs-wallet';
import { ISimpleKeyPairBuffer } from './interfaces/simpleKeyPairBuffer';

export class EthereumECIES {
  private static readonly curveName = 'secp256k1';
  private static readonly primaryKeyDerivationPath = "m/44'/60'/0'/0/0";
  private static readonly authTagLength = 16;
  private static readonly ivLength = 16;
  /**
   * Mnemonic strength in bits. This will produce a 32-bit key for ECDSA.
   */
  public static readonly mnemonicStrength: number = 256;
  private static readonly symmetricAlgorithm = 'aes';
  private static readonly symmetricKeyBits = 256;
  private static readonly symmetricKeyLength =
    EthereumECIES.symmetricKeyBits / 8;
  private static readonly symmetricKeyMode = 'gcm';
  private static readonly symmetricAlgorithmConfiguration = `${EthereumECIES.symmetricAlgorithm}-${EthereumECIES.symmetricKeyBits}-${EthereumECIES.symmetricKeyMode}` as CipherGCMTypes;

  public static generateNewMnemonic(): string {
    const mnemonic = generateMnemonic(EthereumECIES.mnemonicStrength);
    return mnemonic;
  }

  public static generateKeyPairFromMnemonic(mnemonic: string): ISimpleKeyPairBuffer {
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    const seed = mnemonicToSeedSync(mnemonic);
    const hdWallet = hdkey.fromMasterSeed(seed);
    const wallet = hdWallet
      .derivePath(EthereumECIES.primaryKeyDerivationPath)
      .getWallet();

    const privateKey = wallet.getPrivateKey();
    // 04 + publicKey
    const buf04 = new Uint8Array(1);
    buf04[0] = 4;
    const publicKey = Buffer.concat([buf04, wallet.getPublicKey()]);

    return { privateKey, publicKey };
  }

  public static encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    const ecdh = createECDH(EthereumECIES.curveName);
    ecdh.generateKeys();
    const ephemeralPublicKey = ecdh.getPublicKey();

    const sharedSecret = ecdh.computeSecret(receiverPublicKey);

    const iv = randomBytes(EthereumECIES.ivLength);
    const cipher = createCipheriv(
      EthereumECIES.symmetricAlgorithmConfiguration,
      sharedSecret.subarray(0, EthereumECIES.symmetricKeyLength),
      iv
    );

    let encrypted = cipher.update(message);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([ephemeralPublicKey, iv, authTag, encrypted]);
  }

  public static decrypt(privateKey: Buffer, encryptedData: Buffer): Buffer {
    const ephemeralPublicKey = encryptedData.slice(0, 65);
    const iv = encryptedData.subarray(65, 65 + EthereumECIES.ivLength);
    const authTag = encryptedData.subarray(65 + EthereumECIES.ivLength, 65 + EthereumECIES.ivLength + EthereumECIES.authTagLength);
    const encrypted = encryptedData.subarray(65 + EthereumECIES.ivLength + EthereumECIES.authTagLength);

    const ecdh = createECDH(EthereumECIES.curveName);
    ecdh.setPrivateKey(privateKey);
    const sharedSecret = ecdh.computeSecret(ephemeralPublicKey);

    const decipher = createDecipheriv(
      EthereumECIES.symmetricAlgorithmConfiguration,
      sharedSecret.subarray(0, EthereumECIES.symmetricKeyLength),
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  public static encryptString(receiverPublicKeyHex: string, message: string): string {
    const encryptedData = this.encrypt(Buffer.from(receiverPublicKeyHex, 'hex'), Buffer.from(message, 'utf8'));
    return encryptedData.toString('hex');
  }

  public static decryptString(privateKeyHex: string, encryptedDataHex: string): string {
    const decryptedData = this.decrypt(Buffer.from(privateKeyHex, 'hex'), Buffer.from(encryptedDataHex, 'hex'));
    return decryptedData.toString('utf8');
  }
}
