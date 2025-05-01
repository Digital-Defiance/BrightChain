import Wallet from 'ethereumjs-wallet';
import { BrightChainMember } from '../../brightChainMember';
import { ECIES } from '../../constants';
import { IECIESConfig } from '../../interfaces/eciesConfig';
import { IEncryptionLength } from '../../interfaces/encryptionLength';
import { IMultiEncryptedMessage } from '../../interfaces/multiEncryptedMessage';
import { IMultiEncryptedParsedHeader } from '../../interfaces/multiEncryptedParsedHeader';
import { ISingleEncryptedParsedHeader } from '../../interfaces/singleEncryptedParsedHeader';
import { IWalletSeed } from '../../interfaces/walletSeed';
import { SecureString } from '../../secureString';
import { HexString, SignatureBuffer, SignatureString } from '../../types';

// Import all the modular components
import { EciesCryptoCore } from './crypto-core';
import { EciesKeyManagement } from './key-management';
import { EciesMultiRecipient } from './multi-recipient';
import { EciesSignature } from './signature';
import { EciesUtilities } from './utilities';

// Re-export all modules so consumers can access them directly if needed
export { EciesCryptoCore } from './crypto-core';
export { EciesKeyManagement } from './key-management';
export { EciesMultiRecipient } from './multi-recipient';
export { EciesSignature } from './signature';
export { EciesUtilities } from './utilities';

/**
 * Unified ECIES service that integrates all the modular components
 */
export class ECIESService {
  private readonly config: IECIESConfig;
  private readonly keyManagement: EciesKeyManagement;
  private readonly cryptoCore: EciesCryptoCore;
  private readonly signature: EciesSignature;
  private readonly multiRecipient: EciesMultiRecipient;
  private readonly utilities: EciesUtilities;

  constructor(config?: Partial<IECIESConfig>) {
    this.config = {
      curveName: ECIES.CURVE_NAME,
      primaryKeyDerivationPath: ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: ECIES.SYMMETRIC.ALGORITHM,
      symmetricKeyBits: ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: ECIES.SYMMETRIC.MODE,
      ...config,
    };

    // Initialize all components
    this.keyManagement = new EciesKeyManagement(this.config);
    this.cryptoCore = new EciesCryptoCore(this.config);
    this.signature = new EciesSignature(this.cryptoCore);
    this.multiRecipient = new EciesMultiRecipient(this.cryptoCore);
    this.utilities = new EciesUtilities();
  }

  /**
   * The name of the elliptic curve used for ECIES encryption/decryption
   */
  public get curveName(): string {
    return this.config.curveName;
  }

  // === Key Management Methods ===

  public generateNewMnemonic(): SecureString {
    return this.keyManagement.generateNewMnemonic();
  }

  public walletFromSeed(seed: Buffer): Wallet {
    return this.keyManagement.walletFromSeed(seed);
  }

  public walletAndSeedFromMnemonic(mnemonic: SecureString): IWalletSeed {
    return this.keyManagement.walletAndSeedFromMnemonic(mnemonic);
  }

  public walletToSimpleKeyPairBuffer(wallet: Wallet) {
    return this.keyManagement.walletToSimpleKeyPairBuffer(wallet);
  }

  public seedToSimpleKeyPairBuffer(seed: Buffer) {
    return this.keyManagement.seedToSimpleKeyPairBuffer(seed);
  }

  public mnemonicToSimpleKeyPairBuffer(mnemonic: SecureString) {
    return this.keyManagement.mnemonicToSimpleKeyPairBuffer(mnemonic);
  }

  // === Core Encryption/Decryption Methods ===

  public encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    return this.cryptoCore.encrypt(receiverPublicKey, message);
  }

  public parseSingleEncryptedHeader(
    data: Buffer,
  ): ISingleEncryptedParsedHeader {
    return this.cryptoCore.parseSingleEncryptedHeader(data);
  }

  public decryptSingleWithHeader(
    privateKey: Buffer,
    encryptedData: Buffer,
  ): Buffer {
    return this.cryptoCore.decryptSingleWithHeader(privateKey, encryptedData);
  }

  public decryptSingleWithHeaderEx(
    privateKey: Buffer,
    encryptedData: Buffer,
  ): { decrypted: Buffer; consumedBytes: number } {
    return this.cryptoCore.decryptSingleWithHeaderEx(privateKey, encryptedData);
  }

  public decryptSingleWithComponents(
    privateKey: Buffer,
    ephemeralPublicKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    encrypted: Buffer,
  ): { decrypted: Buffer; ciphertextLength?: number } {
    const decrypted = this.cryptoCore.decryptSingleWithComponents(
      privateKey,
      ephemeralPublicKey,
      iv,
      authTag,
      encrypted,
    );

    // Return an object with a 'decrypted' property for compatibility with existing code
    return { decrypted, ciphertextLength: encrypted.length };
  }

  // === Signature Methods ===

  public signMessage(privateKey: Buffer, data: Buffer): SignatureBuffer {
    return this.signature.signMessage(privateKey, data);
  }

  public verifyMessage(
    publicKey: Buffer,
    data: Buffer,
    signature: SignatureBuffer,
  ): boolean {
    return this.signature.verifyMessage(publicKey, data, signature);
  }

  public signatureStringToSignatureBuffer(
    signatureString: HexString,
  ): SignatureBuffer {
    return this.signature.signatureStringToSignatureBuffer(signatureString);
  }

  public signatureBufferToSignatureString(
    signatureBuffer: SignatureBuffer,
  ): SignatureString {
    return this.signature.signatureBufferToSignatureString(signatureBuffer);
  }

  // === Multi-Recipient Methods ===

  public encryptMultiple(
    recipients: BrightChainMember[],
    message: Buffer,
  ): IMultiEncryptedMessage {
    return this.multiRecipient.encryptMultiple(recipients, message);
  }

  public decryptMultipleECIEForRecipient(
    encryptedData: IMultiEncryptedMessage,
    recipient: BrightChainMember,
  ): Buffer {
    return this.multiRecipient.decryptMultipleECIEForRecipient(
      encryptedData,
      recipient,
    );
  }

  public calculateECIESMultipleRecipientOverhead(
    recipientCount: number,
    includeMessageOverhead: boolean,
  ): number {
    return this.multiRecipient.calculateECIESMultipleRecipientOverhead(
      recipientCount,
      includeMessageOverhead,
    );
  }

  public buildECIESMultipleRecipientHeader(
    data: IMultiEncryptedMessage,
  ): Buffer {
    return this.multiRecipient.buildECIESMultipleRecipientHeader(data);
  }

  public parseMultiEncryptedHeader(data: Buffer): IMultiEncryptedParsedHeader {
    return this.multiRecipient.parseMultiEncryptedHeader(data);
  }

  public parseMultiEncryptedBuffer(data: Buffer): IMultiEncryptedMessage {
    return this.multiRecipient.parseMultiEncryptedBuffer(data);
  }

  // === Utility Methods ===

  public computeEncryptedLengthFromDataLength(
    dataLength: number,
    blockSize: number,
  ): IEncryptionLength {
    return this.utilities.computeEncryptedLengthFromDataLength(
      dataLength,
      blockSize,
    );
  }

  public computeDecryptedLengthFromEncryptedDataLength(
    encryptedDataLength: number,
    blockSize: number,
    padding?: number,
  ): number {
    return this.utilities.computeDecryptedLengthFromEncryptedDataLength(
      encryptedDataLength,
      blockSize,
      padding,
    );
  }
}
