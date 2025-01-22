import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import {
  CipherGCMTypes,
  createCipheriv,
  createDecipheriv,
  createECDH,
  randomBytes,
} from 'crypto';
import {
  ecrecover,
  ecsign,
  hashPersonalMessage,
  publicToAddress,
  toBuffer,
} from 'ethereumjs-util';
import Wallet, { hdkey } from 'ethereumjs-wallet';
import { IEncryptionLength } from './interfaces/encryptionLength';
import { ISimpleKeyPairBuffer } from './interfaces/simpleKeyPairBuffer';
import { SecureBuffer } from './secureBuffer';
import { HexString, SignatureBuffer, SignatureString } from './types';

/**
 * Static helpers and constants for ECIES
 * Do not change these values in an already established system- it will break all of the blocks.
 */
export class StaticHelpersECIES {
  /**
   * The name of the curve to use
   */
  public static readonly curveName = 'secp256k1';
  /**
   * The primary key derivation path
   */
  public static readonly primaryKeyDerivationPath = "m/44'/60'/0'/0/0";
  /**
   * The length of the authentication tag in bytes
   */
  public static readonly authTagLength = 16;
  /**
   * The length of the IV in bytes
   */
  public static readonly ivLength = 16;
  /**
   * The length of the signature in bytes
   */
  public static readonly signatureLength = 65;
  /**
   * The length of the raw public key in bytes (without 0x04 prefix)
   */
  public static readonly rawPublicKeyLength = 64;
  /**
   * The length of the public key in bytes (with 0x04 prefix)
   */
  public static readonly publicKeyLength =
    StaticHelpersECIES.rawPublicKeyLength + 1;
  /**
   * The length of the ECIES overhead in bytes
   */
  public static readonly eciesOverheadLength =
    StaticHelpersECIES.publicKeyLength + // Include 0x04 prefix since we store it
    StaticHelpersECIES.ivLength +
    StaticHelpersECIES.authTagLength;
  /**
   * Mnemonic strength in bits. This will produce a 32-bit key for ECDSA.
   */
  public static readonly mnemonicStrength: number = 256;
  /**
   * The symmetric algorithm to use
   */
  public static readonly symmetricAlgorithm = 'aes';
  /**
   * The number of bits for the symmetric key
   */
  public static readonly symmetricKeyBits = 256;
  /**
   * The length of the symmetric key in bytes
   */
  public static readonly symmetricKeyLength =
    StaticHelpersECIES.symmetricKeyBits / 8;
  /**
   * The mode for the symmetric algorithm
   */
  public static readonly symmetricKeyMode = 'gcm';
  /**
   * The configuration for the symmetric algorithm
   */
  public static readonly symmetricAlgorithmConfiguration =
    `${StaticHelpersECIES.symmetricAlgorithm}-${StaticHelpersECIES.symmetricKeyBits}-${StaticHelpersECIES.symmetricKeyMode}` as CipherGCMTypes;

  /**
   * Generate a new mnemonic
   * @returns the new mnemonic
   */
  public static generateNewMnemonic(): string {
    return generateMnemonic(StaticHelpersECIES.mnemonicStrength);
  }

  /**
   * Generate a wallet from a seed
   * @param seed - the seed to generate the wallet from
   * @returns the wallet
   */
  public static walletFromSeed(seed: Buffer): Wallet {
    const hdWallet = hdkey.fromMasterSeed(seed);
    return hdWallet
      .derivePath(StaticHelpersECIES.primaryKeyDerivationPath)
      .getWallet();
  }

  /**
   * Generate a wallet and seed from a mnemonic
   * @param mnemonic - the mnemonic to generate the wallet and seed from
   * @returns the seed and wallet
   */
  public static walletAndSeedFromMnemonic(mnemonic: string): {
    seed: SecureBuffer;
    wallet: Wallet;
  } {
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    const seed = mnemonicToSeedSync(mnemonic);
    const wallet = StaticHelpersECIES.walletFromSeed(seed);

    return {
      seed: new SecureBuffer(seed),
      wallet,
    };
  }

  /**
   * Convert a wallet to a simple key pair buffer
   * @param wallet - the wallet to convert
   * @returns the simple key pair buffer
   */
  public static walletToSimpleKeyPairBuffer(
    wallet: Wallet,
  ): ISimpleKeyPairBuffer {
    const privateKey = wallet.getPrivateKey();
    // 04 + publicKey
    const buf04 = new Uint8Array(1);
    buf04[0] = 4;
    const publicKey = Buffer.concat([buf04, wallet.getPublicKey()]);

    return { privateKey, publicKey };
  }

  /**
   * Convert a seed to a simple key pair buffer
   * @param seed - the seed to convert
   * @returns the simple key pair buffer
   */
  public static seedToSimpleKeyPairBuffer(seed: Buffer): ISimpleKeyPairBuffer {
    const wallet = StaticHelpersECIES.walletFromSeed(seed);

    return StaticHelpersECIES.walletToSimpleKeyPairBuffer(wallet);
  }

  /**
   * Compute a key pair from a mnemonic
   * @param mnemonic - the mnemonic to convert
   * @returns the simple key pair buffer
   */
  public static mnemonicToSimpleKeyPairBuffer(
    mnemonic: string,
  ): ISimpleKeyPairBuffer {
    const { seed } = StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);
    return StaticHelpersECIES.seedToSimpleKeyPairBuffer(seed.value);
  }

  /**
   * Encrypt a buffer
   * @param receiverPublicKey - the public key of the receiver to encrypt the buffer for
   * @param message - the buffer to encrypt
   * @returns the encrypted buffer
   */
  public static encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    const ecdh = createECDH(StaticHelpersECIES.curveName);
    ecdh.generateKeys();

    let sharedSecret: Buffer;
    // Generate shared secret
    try {
      // For ECDH, public key must be in uncompressed format (0x04 + x + y)
      // If key doesn't start with 0x04, add it
      const publicKeyForSecret =
        receiverPublicKey[0] === 0x04
          ? receiverPublicKey
          : Buffer.concat([Buffer.from([0x04]), receiverPublicKey]);

      // Compute shared secret using the complete public key
      sharedSecret = ecdh.computeSecret(publicKeyForSecret);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error computing shared secret:', error.message, {
          receiverPublicKey: receiverPublicKey.toString('hex'),
        });
      }
      throw error;
    }

    // Get ephemeral public key (already has 0x04 prefix)
    const ephemeralPublicKey = ecdh.getPublicKey();

    // Generate IV and create cipher
    const iv = randomBytes(StaticHelpersECIES.ivLength);
    const cipher = createCipheriv(
      StaticHelpersECIES.symmetricAlgorithmConfiguration,
      sharedSecret.subarray(0, StaticHelpersECIES.symmetricKeyLength),
      iv,
    );

    // Encrypt message
    let encrypted = cipher.update(message);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Return encrypted data with metadata
    return Buffer.concat([ephemeralPublicKey, iv, authTag, encrypted]);
  }

  public static decryptWithComponents(
    privateKey: Buffer,
    ephemeralPublicKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    encrypted: Buffer,
  ): Buffer {
    // Generate shared secret
    try {
      // For ECDH, public key must be in uncompressed format (0x04 + x + y)
      // If key doesn't start with 0x04, add it
      const publicKeyForSecret =
        ephemeralPublicKey[0] === 0x04
          ? ephemeralPublicKey
          : Buffer.concat([Buffer.from([0x04]), ephemeralPublicKey]);

      // Create ECDH instance and set private key
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      // If private key has 0x04 prefix, remove it
      const privateKeyForDecryption =
        privateKey[0] === 0x04 ? privateKey.subarray(1) : privateKey;
      ecdh.setPrivateKey(privateKeyForDecryption);

      // Compute shared secret using the complete public key
      const sharedSecret = ecdh.computeSecret(publicKeyForSecret);

      // Create decipher
      const decipher = createDecipheriv(
        StaticHelpersECIES.symmetricAlgorithmConfiguration,
        sharedSecret.subarray(0, StaticHelpersECIES.symmetricKeyLength),
        iv,
      );

      // Set auth tag and decrypt
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY'
      ) {
        throw new Error('Invalid ephemeral public key');
      }
      throw error;
    }
  }

  /**
   * Decrypt a buffer
   * @param privateKey - the private key to decrypt the buffer with
   * @param encryptedDataWithHeader - the buffer to decrypt
   * @returns the decrypted buffer
   */
  public static decrypt(privateKey: Buffer, encryptedData: Buffer): Buffer {
    return this.decryptWithHeader(privateKey, encryptedData);
  }

  public static decryptWithHeader(
    privateKey: Buffer,
    encryptedDataWithHeader: Buffer,
  ): Buffer {
    const ephemeralPublicKey = encryptedDataWithHeader.subarray(
      0,
      StaticHelpersECIES.publicKeyLength,
    );
    const iv = encryptedDataWithHeader.subarray(
      StaticHelpersECIES.publicKeyLength,
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
    );
    const authTag = encryptedDataWithHeader.subarray(
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
      StaticHelpersECIES.publicKeyLength +
        StaticHelpersECIES.ivLength +
        StaticHelpersECIES.authTagLength,
    );
    const encrypted = encryptedDataWithHeader.subarray(
      StaticHelpersECIES.publicKeyLength +
        StaticHelpersECIES.ivLength +
        StaticHelpersECIES.authTagLength,
    );

    return StaticHelpersECIES.decryptWithComponents(
      privateKey,
      ephemeralPublicKey,
      iv,
      authTag,
      encrypted,
    );
  }

  /**
   * Encrypt a string
   * @param receiverPublicKeyHex - the public key of the receiver to encrypt the string for
   * @param message - the message to encrypt
   * @returns the encrypted string
   */
  public static encryptString(
    receiverPublicKeyHex: string,
    message: string,
  ): string {
    const encryptedData = this.encrypt(
      Buffer.from(receiverPublicKeyHex, 'hex'),
      Buffer.from(message, 'utf8'),
    );
    return encryptedData.toString('hex');
  }

  /**
   * Decrypt a string
   * @param privateKeyHex - the private key to decrypt the string with
   * @param encryptedDataHex - the encrypted data to decrypt
   * @returns the decrypted string
   */
  public static decryptString(
    privateKeyHex: string,
    encryptedDataHex: string,
  ): string {
    const decryptedData = this.decryptWithHeader(
      Buffer.from(privateKeyHex, 'hex'),
      Buffer.from(encryptedDataHex, 'hex'),
    );
    return decryptedData.toString('utf8');
  }

  /**
   * Sign a message
   * @param privateKey - the private key to sign the message with
   * @param message - the message to sign
   * @returns the signature
   */
  public static signMessage(
    privateKey: Buffer,
    message: Buffer,
  ): SignatureBuffer {
    const messageHash = hashPersonalMessage(message);
    const signature = ecsign(messageHash, privateKey);
    return Buffer.concat([
      toBuffer(signature.r),
      toBuffer(signature.s),
      toBuffer(signature.v - 27),
    ]) as SignatureBuffer;
  }

  /**
   * Verify a message signature
   * @param senderPublicKey - the public key of the sender
   * @param message - the message to verify
   * @param signature - the signature to verify
   * @returns true if the signature is valid, false otherwise
   */
  public static verifyMessage(
    senderPublicKey: Buffer,
    message: Buffer,
    signature: SignatureBuffer,
  ): boolean {
    if (signature.length !== StaticHelpersECIES.signatureLength) {
      throw new Error('Invalid signature');
    }
    // if the sender public key length is 65, it should have a 04 prefix
    // it should otherwise be 64 bytes
    // throw an error if it is not
    if (
      senderPublicKey.length !== StaticHelpersECIES.publicKeyLength &&
      senderPublicKey.length !== 64
    ) {
      throw new Error('Invalid sender public key');
    }
    if (
      senderPublicKey.length === StaticHelpersECIES.publicKeyLength &&
      senderPublicKey[0] !== 4
    ) {
      throw new Error('Invalid sender public key');
    }
    const has04Prefix =
      senderPublicKey.length === StaticHelpersECIES.publicKeyLength &&
      senderPublicKey[0] === 4;
    const messageHash = hashPersonalMessage(message);
    const r = signature.subarray(0, 32);
    const s = signature.subarray(32, 64);
    const v = signature[64] + 27; // Ensure v is correctly adjusted

    const publicKey = ecrecover(messageHash, v, r, s);
    const derivedAddress = publicToAddress(publicKey);
    // strip the 04 prefix from the public key
    const knownAddress = publicToAddress(
      has04Prefix ? senderPublicKey.subarray(1) : senderPublicKey,
    );

    return derivedAddress.equals(knownAddress);
  }

  /**
   * Convert a signature string to a signature buffer
   * @param signatureString - the signature as a hex string
   * @returns the signature as a buffer
   */
  public static signatureStringToSignatureBuffer(
    signatureString: HexString,
  ): SignatureBuffer {
    return Buffer.from(signatureString, 'hex') as SignatureBuffer;
  }
  public static signatureBufferToSignatureString(
    signatureBuffer: SignatureBuffer,
  ): SignatureString {
    return signatureBuffer.toString('hex') as SignatureString;
  }

  /**
   * Compute the length of the encrypted data given the length of the data to be encrypted and the block size
   * @param dataLength - the length of the data to be encrypted
   * @param blockSize - the block size
   * @returns the capacity of an encrypted block, the number of blocks needed to store the data, the amount of padding needed to fill the last block, and the total length of the encrypted data
   */
  public static computeEncryptedLengthFromDataLength(
    dataLength: number,
    blockSize: number,
  ): IEncryptionLength {
    // calculate the capacity of an encrypted block given the blockSize
    const capacityPerBlock = blockSize - StaticHelpersECIES.eciesOverheadLength;
    // calculate the number of blocks needed to store the data
    const blocksNeeded = Math.ceil(dataLength / capacityPerBlock);
    // calculate the amount of padding needed to fill the last block
    const padding = capacityPerBlock - (dataLength % capacityPerBlock);
    // calculate the total size of the encrypted data
    const totalEncryptedSize = blocksNeeded * blockSize;
    // calculate the total length of the encrypted data
    const encryptedDataLength = totalEncryptedSize - padding;
    return {
      capacityPerBlock,
      blocksNeeded,
      padding,
      encryptedDataLength,
      totalEncryptedSize,
    };
  }

  /**
   * Calculate the length of the decrypted data given the length of the encrypted data and the block size
   * @param encryptedDataLength - the length of the encrypted data
   * @param blockSize - the block size
   * @param padding - the amount of padding to remove from the last block
   * @returns the length of the decrypted data
   */
  public static computeDecryptedLengthFromEncryptedDataLength(
    encryptedDataLength: number,
    blockSize: number,
    padding?: number,
  ): number {
    // calculate the number of blocks needed to store the data
    const numBlocks = Math.ceil(encryptedDataLength / blockSize);
    if (numBlocks * blockSize !== encryptedDataLength) {
      throw new Error('Invalid encrypted data length');
    }
    // calculate the ecies overhead for all blocks
    const overhead = numBlocks * StaticHelpersECIES.eciesOverheadLength;
    // calculate the data length after subtracting the overhead
    return encryptedDataLength - overhead - (padding ?? 0);
  }
}
