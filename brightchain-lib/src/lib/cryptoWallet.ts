import { mnemonicToSeedSync, validateMnemonic } from 'bip39';
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createECDH,
  CipherGCMTypes,
} from 'crypto';
import { hdkey } from 'ethereumjs-wallet';

export class EthereumECIES {
  private static readonly curveName = 'secp256k1';
  private static readonly primaryKeyDerivationPath = "m/44'/60'/0'/0/0";
  private static readonly ivLength = 16;
  private static readonly symmetricAlgorithm = 'aes';
  private static readonly symmetricKeyBits = 256;
  private static readonly symmetricKeyLength =
    EthereumECIES.symmetricKeyBits / 8;
  private static readonly symmetricKeyMode = 'gcm';
  private static readonly symmetricAlgorithmConfiguration = `${EthereumECIES.symmetricAlgorithm}-${EthereumECIES.symmetricKeyBits}-${EthereumECIES.symmetricKeyMode}` as CipherGCMTypes;

  public static generateKeyPairFromMnemonic(mnemonic: string): {
    privateKey: string;
    publicKey: string;
  } {
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    const seed = mnemonicToSeedSync(mnemonic);
    const hdWallet = hdkey.fromMasterSeed(seed);
    const wallet = hdWallet
      .derivePath(EthereumECIES.primaryKeyDerivationPath)
      .getWallet();

    const privateKey = wallet.getPrivateKey().toString('hex');
    const publicKey = '04' + wallet.getPublicKey().toString('hex');

    return { privateKey, publicKey };
  }

  public static encrypt(receiverPublicKeyHex: string, message: string): string {
    const ecdh = createECDH(EthereumECIES.curveName);
    ecdh.generateKeys();
    const ephemeralPublicKey = ecdh.getPublicKey().toString('hex');

    const sharedSecret = ecdh.computeSecret(receiverPublicKeyHex, 'hex');

    const iv = randomBytes(EthereumECIES.ivLength);
    const cipher = createCipheriv(
      EthereumECIES.symmetricAlgorithmConfiguration,
      sharedSecret.subarray(0, EthereumECIES.symmetricKeyLength),
      iv
    );

    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${ephemeralPublicKey}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  public static decrypt(privateKeyHex: string, encryptedData: string): string {
    const [ephemeralPublicKeyHex, ivHex, authTag, encrypted] = encryptedData.split(':');

    const ecdh = createECDH(EthereumECIES.curveName);
    ecdh.setPrivateKey(privateKeyHex, 'hex');
    const sharedSecret = ecdh.computeSecret(ephemeralPublicKeyHex, 'hex');

    const decipher = createDecipheriv(
      EthereumECIES.symmetricAlgorithmConfiguration,
      sharedSecret.subarray(0, EthereumECIES.symmetricKeyLength),
      Buffer.from(ivHex, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
