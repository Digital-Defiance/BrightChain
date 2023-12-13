import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  constants as cryptoConstants,
} from 'crypto';
import { ISymmetricEncryptionResults } from './interfaces/symmetricEncryptionResults';

/**
 * @description
 * Static helper functions for BrightChain and BrightChain Quorum. Encryption and other utilities.
 * - Uses secrets.js-34r7h fork of secrets.js for Shamir's Secret Sharing
 * - Uses elliptic for ECDSA
 * - Uses bip39 for BIP39 Mnemonic generation
 * - Uses crypto for AES encryption
 * - Uses crypto for RSA key generation, encryption/decryption
 */
export abstract class StaticHelpersKeyPair {
  public static readonly SymmetricKeyAlgorithm = 'aes';
  /**
   * The symmetric algorithm key size
   */
  public static readonly SymmetricKeyBits = 256;

  /**
   * Helper to convert the bits to bytes for the symmetric key size
   */
  public static readonly SymmetricKeyBytes =
    StaticHelpersKeyPair.SymmetricKeyBits / 8;

  /**
   * The symmetric algorithm data mode (CBC/CTR, etc)
   */
  public static readonly SymmetricKeyMode = 'ctr';

  /**
   * The number of bytes to use for the AES IV
   */
  public static readonly SymmetricKeyIvBytes = 16;

  /**
   * The encryption algorithm (cipher) type string to be used.
   * @type {String}
   * @const
   * @private
   */
  public static readonly SymmetricAlgorithmType: string = `${StaticHelpersKeyPair.SymmetricKeyAlgorithm}-${StaticHelpersKeyPair.SymmetricKeyBits}-${StaticHelpersKeyPair.SymmetricKeyMode}`;

  public static readonly Sha3DefaultHashBits: number = 512;

  /**
   * unused/future/unsupported on my platform/version.
   */
  public static readonly EnableOaepHash: boolean = true;

  /**
   * Number of bits in an RSA key used for the data encryption key.
   */
  public static readonly AsymmetricKeyBits: number = 4096;

  /**
   * Mnemonic strength in bits. This will produce a 32-bit key for ECDSA.
   */
  public static readonly MnemonicStrength: number = 256;

  /**
   * The HD derivation path for the data key pair
   */
  public static readonly DerivationPath: string = "m/44'/60'/0'/0/0";


  /**
   * Encrypt data with AES
   * @param data
   * @param encryptionKey
   * @returns
   */
  public static symmetricEncryptBuffer(
    data: Buffer,
    encryptionKey?: Buffer
  ): ISymmetricEncryptionResults {
    if (
      encryptionKey &&
      encryptionKey.length != StaticHelpersKeyPair.SymmetricKeyBytes
    )
      throw new Error(
        `Encryption key must be ${StaticHelpersKeyPair.SymmetricKeyBytes} bytes long`
      );

    // encrypt the document using AES-256 and the key
    // Initialization Vector
    const ivBuffer = randomBytes(StaticHelpersKeyPair.SymmetricKeyIvBytes);
    const key: Buffer = encryptionKey ?? randomBytes(this.SymmetricKeyBytes);
    const cipher = createCipheriv(
      StaticHelpersKeyPair.SymmetricAlgorithmType,
      key,
      ivBuffer
    );

    const ciphertextBuffer = cipher.update(data);
    const encryptionIvPlusData: Buffer = Buffer.concat([
      ivBuffer,
      ciphertextBuffer,
      cipher.final(),
    ]);
    return {
      encryptedData: encryptionIvPlusData,
      key: key,
    };
  }

  /**
   * Decrypt the given buffer with AES, as a buffer
   * @param encryptedData
   * @param key
   * @returns
   */
  public static symmetricDecryptBuffer(
    encryptedData: Buffer,
    key: Buffer
  ): Buffer {
    const ivBuffer = encryptedData.subarray(
      0,
      StaticHelpersKeyPair.SymmetricKeyIvBytes
    );
    const ciphertextBuffer = encryptedData.subarray(
      StaticHelpersKeyPair.SymmetricKeyIvBytes
    );
    const decipher = createDecipheriv(
      StaticHelpersKeyPair.SymmetricAlgorithmType,
      key,
      ivBuffer
    );
    const decryptedDataBuffer = decipher.update(ciphertextBuffer);
    return decryptedDataBuffer;
  }
}
