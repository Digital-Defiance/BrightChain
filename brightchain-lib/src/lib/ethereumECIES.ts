import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createECDH,
  CipherGCMTypes,
} from 'crypto';
import Wallet, { hdkey } from 'ethereumjs-wallet';
import {
  ecrecover,
  ecsign,
  hashPersonalMessage,
  publicToAddress,
  toBuffer,
} from 'ethereumjs-util';
import { ISimpleKeyPairBuffer } from './interfaces/simpleKeyPairBuffer';
import { SecureBuffer } from './secureBuffer';
import { HexString, SignatureBuffer, SignatureString } from './types';

export class EthereumECIES {
  public static readonly curveName = 'secp256k1';
  public static readonly primaryKeyDerivationPath = "m/44'/60'/0'/0/0";
  public static readonly authTagLength = 16;
  public static readonly ivLength = 16;
  public static readonly signatureLength = 65;
  public static readonly publicKeyLength = 65;
  public static readonly ecieOverheadLength = EthereumECIES.publicKeyLength + EthereumECIES.ivLength + EthereumECIES.authTagLength; // 97 bytes
  /**
   * Mnemonic strength in bits. This will produce a 32-bit key for ECDSA.
   */
  public static readonly mnemonicStrength: number = 256;
  public static readonly symmetricAlgorithm = 'aes';
  public static readonly symmetricKeyBits = 256;
  public static readonly symmetricKeyLength =
    EthereumECIES.symmetricKeyBits / 8;
  public static readonly symmetricKeyMode = 'gcm';
  public static readonly symmetricAlgorithmConfiguration =
    `${EthereumECIES.symmetricAlgorithm}-${EthereumECIES.symmetricKeyBits}-${EthereumECIES.symmetricKeyMode}` as CipherGCMTypes;

  public static generateNewMnemonic(): string {
    const mnemonic = generateMnemonic(EthereumECIES.mnemonicStrength);
    return mnemonic;
  }

  public static walletFromSeed(seed: Buffer): Wallet {
    const hdWallet = hdkey.fromMasterSeed(seed);
    return hdWallet
      .derivePath(EthereumECIES.primaryKeyDerivationPath)
      .getWallet();
  }

  public static walletAndSeedFromMnemonic(mnemonic: string): {
    seed: SecureBuffer;
    wallet: Wallet;
  } {
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    const seed = mnemonicToSeedSync(mnemonic);
    const wallet = EthereumECIES.walletFromSeed(seed);

    return {
      seed: new SecureBuffer(seed),
      wallet,
    };
  }

  public static walletToSimpleKeyPairBuffer(
    wallet: Wallet
  ): ISimpleKeyPairBuffer {
    const privateKey = wallet.getPrivateKey();
    // 04 + publicKey
    const buf04 = new Uint8Array(1);
    buf04[0] = 4;
    const publicKey = Buffer.concat([buf04, wallet.getPublicKey()]);

    return { privateKey, publicKey };
  }

  public static seedToSimpleKeyPairBuffer(seed: Buffer): ISimpleKeyPairBuffer {
    const wallet = EthereumECIES.walletFromSeed(seed);

    return EthereumECIES.walletToSimpleKeyPairBuffer(wallet);
  }

  public static mnemonicToSimpleKeyPairBuffer(
    mnemonic: string
  ): ISimpleKeyPairBuffer {
    const { seed } = EthereumECIES.walletAndSeedFromMnemonic(mnemonic);
    return EthereumECIES.seedToSimpleKeyPairBuffer(seed.value);
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
    const ephemeralPublicKey = encryptedData.subarray(0, EthereumECIES.publicKeyLength);
    const iv = encryptedData.subarray(EthereumECIES.publicKeyLength, EthereumECIES.publicKeyLength + EthereumECIES.ivLength);
    const authTag = encryptedData.subarray(
      EthereumECIES.publicKeyLength + EthereumECIES.ivLength,
      EthereumECIES.publicKeyLength + EthereumECIES.ivLength + EthereumECIES.authTagLength
    );
    const encrypted = encryptedData.subarray(
      EthereumECIES.publicKeyLength + EthereumECIES.ivLength + EthereumECIES.authTagLength
    );

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

  public static encryptString(
    receiverPublicKeyHex: string,
    message: string
  ): string {
    const encryptedData = this.encrypt(
      Buffer.from(receiverPublicKeyHex, 'hex'),
      Buffer.from(message, 'utf8')
    );
    return encryptedData.toString('hex');
  }

  public static decryptString(
    privateKeyHex: string,
    encryptedDataHex: string
  ): string {
    const decryptedData = this.decrypt(
      Buffer.from(privateKeyHex, 'hex'),
      Buffer.from(encryptedDataHex, 'hex')
    );
    return decryptedData.toString('utf8');
  }

  public static signMessage(privateKey: Buffer, message: Buffer): SignatureBuffer {
    const messageHash = hashPersonalMessage(message);
    const signature = ecsign(messageHash, privateKey);
    return Buffer.concat([
      toBuffer(signature.r),
      toBuffer(signature.s),
      toBuffer(signature.v - 27),
    ]) as SignatureBuffer;
  }

  public static verifyMessage(
    senderPublicKey: Buffer,
    message: Buffer,
    signature: SignatureBuffer
  ): boolean {
    if (signature.length !== EthereumECIES.signatureLength) {
      throw new Error('Invalid signature');
    }
    // if the sender public key length is 65, it should have a 04 prefix
    // it should otherwise be 64 bytes
    // throw an error if it is not
    if (senderPublicKey.length !== EthereumECIES.publicKeyLength && senderPublicKey.length !== 64) {
      throw new Error('Invalid sender public key');
    }
    if (senderPublicKey.length === EthereumECIES.publicKeyLength && senderPublicKey[0] !== 4) {
      throw new Error('Invalid sender public key');
    }
    const has04Prefix =
      senderPublicKey.length === EthereumECIES.publicKeyLength && senderPublicKey[0] === 4;
    const messageHash = hashPersonalMessage(message);
    const r = signature.subarray(0, 32);
    const s = signature.subarray(32, 64);
    const v = signature[64] + 27; // Ensure v is correctly adjusted

    const publicKey = ecrecover(messageHash, v, r, s);
    const derivedAddress = publicToAddress(publicKey);
    // strip the 04 prefix from the public key
    const knownAddress = publicToAddress(
      has04Prefix ? senderPublicKey.subarray(1) : senderPublicKey
    );

    return derivedAddress.equals(knownAddress);
  }

  public static signatureStringToSignatureBuffer(
    signatureString: HexString
  ): SignatureBuffer {
    return Buffer.from(signatureString, 'hex') as SignatureBuffer;
  }
  public static signatureBufferToSignatureString(signatureBuffer: SignatureBuffer): SignatureString {
    return signatureBuffer.toString('hex') as SignatureString;
  }
}
