import { ECIES } from '../../constants';
import {
  EciesEncryptionType,
  EciesEncryptionTypeEnum,
} from '../../enumerations/eciesEncryptionType';
import { IECIESConfig } from '../../interfaces/eciesConfig';
import { SecureString } from '../../secureString';
import { SignatureString, SignatureUint8Array } from '../../types';
import { EciesCryptoCore } from './cryptoCore';
import { ISimpleKeyPair, IWalletSeed } from './interfaces';
import { EciesSignature } from './signature';
import { EciesSingleRecipient } from './singleRecipient';

/**
 * Browser-compatible ECIES service that mirrors the server-side functionality
 * Uses Web Crypto API and @scure/@noble libraries for browser compatibility
 */
export class ECIESService {
  private readonly _config: IECIESConfig;
  private readonly cryptoCore: EciesCryptoCore;
  private readonly signature: EciesSignature;
  private readonly singleRecipient: EciesSingleRecipient;

  constructor(config?: Partial<IECIESConfig>) {
    this._config = {
      curveName: ECIES.CURVE_NAME,
      primaryKeyDerivationPath: ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: ECIES.SYMMETRIC.ALGORITHM,
      symmetricKeyBits: ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: ECIES.SYMMETRIC.MODE,
      ...config,
    };

    // Initialize components
    this.cryptoCore = new EciesCryptoCore(this._config);
    this.signature = new EciesSignature(this.cryptoCore);
    this.singleRecipient = new EciesSingleRecipient(this._config);
  }

  public get core(): EciesCryptoCore {
    return this.cryptoCore;
  }

  public get config(): IECIESConfig {
    return this._config;
  }

  public get curveName(): string {
    return this._config.curveName;
  }

  // === Key Management Methods ===

  /**
   * Generate a new mnemonic
   */
  public generateNewMnemonic(): SecureString {
    return this.cryptoCore.generateNewMnemonic();
  }

  /**
   * Generate wallet and seed from mnemonic
   */
  public walletAndSeedFromMnemonic(mnemonic: SecureString): IWalletSeed {
    return this.cryptoCore.walletAndSeedFromMnemonic(mnemonic);
  }

  /**
   * Create simple key pair from seed
   */
  public seedToSimpleKeyPair(seed: Uint8Array): ISimpleKeyPair {
    return this.cryptoCore.seedToSimpleKeyPair(seed);
  }

  /**
   * Create simple key pair from mnemonic
   */
  public mnemonicToSimpleKeyPair(mnemonic: SecureString): ISimpleKeyPair {
    return this.cryptoCore.mnemonicToSimpleKeyPair(mnemonic);
  }

  /**
   * Get public key from private key
   */
  public getPublicKey(privateKey: Uint8Array): Uint8Array {
    return this.cryptoCore.getPublicKey(privateKey);
  }

  // === Core Encryption/Decryption Methods ===

  /**
   * Encrypt for single recipient (simple or single mode)
   */
  public async encryptSimpleOrSingle(
    encryptSimple: boolean,
    receiverPublicKey: Uint8Array,
    message: Uint8Array,
    preamble: Uint8Array = new Uint8Array(0),
  ): Promise<Uint8Array> {
    return this.singleRecipient.encrypt(
      encryptSimple,
      receiverPublicKey,
      message,
      preamble,
    );
  }

  /**
   * Parse single encrypted header
   */
  public parseSingleEncryptedHeader(
    encryptionType: EciesEncryptionTypeEnum,
    data: Uint8Array,
    preambleSize: number = 0,
    options?: { dataLength?: number },
  ) {
    const { header } = this.singleRecipient.parseEncryptedMessage(
      encryptionType,
      data,
      preambleSize,
      options,
    );
    return header;
  }

  /**
   * Decrypt with header
   */
  public async decryptSimpleOrSingleWithHeader(
    decryptSimple: boolean,
    privateKey: Uint8Array,
    encryptedData: Uint8Array,
    preambleSize: number = 0,
    options?: { dataLength?: number },
  ): Promise<Uint8Array> {
    return await this.singleRecipient.decryptWithHeader(
      decryptSimple
        ? EciesEncryptionTypeEnum.Simple
        : EciesEncryptionTypeEnum.Single,
      privateKey,
      encryptedData,
      preambleSize,
      options,
    );
  }

  /**
   * Extended decrypt with header
   */
  public async decryptSimpleOrSingleWithHeaderEx(
    encryptionType: EciesEncryptionTypeEnum,
    privateKey: Uint8Array,
    encryptedData: Uint8Array,
    preambleSize: number = 0,
    options?: { dataLength?: number },
  ) {
    return this.singleRecipient.decryptWithHeaderEx(
      encryptionType,
      privateKey,
      encryptedData,
      preambleSize,
      options,
    );
  }

  /**
   * Decrypt with individual components
   */
  public async decryptSingleWithComponents(
    privateKey: Uint8Array,
    ephemeralPublicKey: Uint8Array,
    iv: Uint8Array,
    authTag: Uint8Array,
    encrypted: Uint8Array,
  ): Promise<{ decrypted: Uint8Array; ciphertextLength?: number }> {
    const decrypted = await this.singleRecipient.decryptWithComponents(
      privateKey,
      ephemeralPublicKey,
      iv,
      authTag,
      encrypted,
    );

    return { decrypted, ciphertextLength: encrypted.length };
  }

  // === Signature Methods ===

  /**
   * Sign a message
   */
  public signMessage(
    privateKey: Uint8Array,
    data: Uint8Array,
  ): SignatureUint8Array {
    return this.signature.signMessage(privateKey, data);
  }

  /**
   * Verify a message signature
   */
  public verifyMessage(
    publicKey: Uint8Array,
    data: Uint8Array,
    signature: SignatureUint8Array,
  ): boolean {
    return this.signature.verifyMessage(publicKey, data, signature);
  }

  /**
   * Convert signature string to buffer
   */
  public signatureStringToSignatureBuffer(
    signatureString: SignatureString,
  ): SignatureUint8Array {
    return this.signature.signatureStringToSignatureBuffer(signatureString);
  }

  /**
   * Convert signature buffer to string
   */
  public signatureBufferToSignatureString(
    signatureBuffer: SignatureUint8Array,
  ): string {
    return this.signature.signatureBufferToSignatureString(signatureBuffer);
  }

  // === Utility Methods ===

  /**
   * Compute encrypted length from data length
   */
  public computeEncryptedLengthFromDataLength(
    dataLength: number,
    encryptionMode: EciesEncryptionType,
    recipientCount?: number,
  ): number {
    if (dataLength < 0) {
      throw new Error('Invalid data length');
    }

    switch (encryptionMode) {
      case 'simple':
        return dataLength + ECIES.SIMPLE.FIXED_OVERHEAD_SIZE;
      case 'single':
        return dataLength + ECIES.SINGLE.FIXED_OVERHEAD_SIZE;
      case 'multiple':
        // Basic calculation for multiple recipients
        return (
          dataLength +
          ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE +
          (recipientCount ?? 1) * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE
        );
      default:
        throw new Error('Invalid encryption type');
    }
  }

  /**
   * Compute decrypted length from encrypted data length
   */
  public computeDecryptedLengthFromEncryptedDataLength(
    encryptedDataLength: number,
    padding?: number,
  ): number {
    if (encryptedDataLength < 0) {
      throw new Error('Invalid encrypted data length');
    }

    const overhead = ECIES.SINGLE.FIXED_OVERHEAD_SIZE;
    const actualPadding = padding !== undefined ? padding : 0;
    const decryptedLength = encryptedDataLength - overhead - actualPadding;

    if (decryptedLength < 0) {
      throw new Error('Computed decrypted length is negative');
    }

    return decryptedLength;
  }

  /**
   * Generic encrypt method
   */
  public async encrypt(
    encryptionType: EciesEncryptionTypeEnum,
    recipients: Array<{ publicKey: Uint8Array }>,
    message: Uint8Array,
    preamble?: Uint8Array,
  ): Promise<Uint8Array> {
    if (
      (encryptionType === EciesEncryptionTypeEnum.Simple ||
        EciesEncryptionTypeEnum.Single) &&
      recipients.length === 1
    ) {
      return this.singleRecipient.encrypt(
        encryptionType === EciesEncryptionTypeEnum.Simple,
        recipients[0].publicKey,
        message,
        preamble,
      );
    } else if (
      encryptionType === EciesEncryptionTypeEnum.Multiple &&
      recipients.length > 1
    ) {
      // TODO: Implement multi-recipient encryption
      throw new Error('Multi-recipient encryption not yet implemented');
    } else {
      throw new Error(
        `Invalid encryption type or number of recipients: ${encryptionType}, ${recipients.length}`,
      );
    }
  }
}
