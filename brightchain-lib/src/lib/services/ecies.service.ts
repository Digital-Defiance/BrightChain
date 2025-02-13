import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import {
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
import { BrightChainMember } from '../brightChainMember';
import { ECIES, SYMMETRIC_ALGORITHM_CONFIGURATION } from '../constants';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { EciesError } from '../errors/eciesError';
import { GuidV4 } from '../guid';
import { IECIESConfig } from '../interfaces/eciesConfig';
import { IEncryptionLength } from '../interfaces/encryptionLength';
import { MultiRecipientEncryption as IMultiRecipientEncryption } from '../interfaces/multiRecipientEncryption';
import { ISimpleKeyPairBuffer } from '../interfaces/simpleKeyPairBuffer';
import { SecureBuffer } from '../secureBuffer';
import { SerializableBuffer } from '../serializableBuffer';
import {
  HexString,
  RawGuidBuffer,
  SignatureBuffer,
  SignatureString,
} from '../types';

export class ECIESService {
  private readonly config: IECIESConfig;

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
  }

  // Getters for constants
  public get curveName(): string {
    return this.config.curveName;
  }

  public get publicKeyLength(): number {
    return ECIES.PUBLIC_KEY_LENGTH;
  }

  public get ivLength(): number {
    return ECIES.IV_LENGTH;
  }

  public get authTagLength(): number {
    return ECIES.AUTH_TAG_LENGTH;
  }

  public get signatureLength(): number {
    return ECIES.SIGNATURE_LENGTH;
  }

  public get eciesOverheadLength(): number {
    return ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH;
  }

  public get eciesMultipleMessageOverheadLength(): number {
    return ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH;
  }

  public generateNewMnemonic(): string {
    return generateMnemonic(this.config.mnemonicStrength);
  }

  public walletFromSeed(seed: Buffer): Wallet {
    const hdWallet = hdkey.fromMasterSeed(seed);
    return hdWallet
      .derivePath(this.config.primaryKeyDerivationPath)
      .getWallet();
  }

  public walletAndSeedFromMnemonic(mnemonic: string): {
    seed: SecureBuffer;
    wallet: Wallet;
  } {
    if (!validateMnemonic(mnemonic)) {
      throw new EciesError(EciesErrorType.InvalidMnemonic);
    }

    const seed = mnemonicToSeedSync(mnemonic);
    const wallet = this.walletFromSeed(seed);

    return {
      seed: new SecureBuffer(seed),
      wallet,
    };
  }

  public walletToSimpleKeyPairBuffer(wallet: Wallet): ISimpleKeyPairBuffer {
    const privateKey = wallet.getPrivateKey();
    const buf04 = new Uint8Array(1);
    buf04[0] = ECIES.PUBLIC_KEY_MAGIC;
    const publicKey = Buffer.concat([buf04, wallet.getPublicKey()]);

    return {
      privateKey: privateKey as SerializableBuffer,
      publicKey: publicKey as SerializableBuffer,
    };
  }

  public seedToSimpleKeyPairBuffer(seed: Buffer): ISimpleKeyPairBuffer {
    const wallet = this.walletFromSeed(seed);
    return this.walletToSimpleKeyPairBuffer(wallet);
  }

  public mnemonicToSimpleKeyPairBuffer(mnemonic: string): ISimpleKeyPairBuffer {
    const { seed } = this.walletAndSeedFromMnemonic(mnemonic);
    return this.seedToSimpleKeyPairBuffer(seed.value);
  }

  public encrypt(receiverPublicKey: Buffer, message: Buffer): Buffer {
    const ecdh = createECDH(this.config.curveName);
    ecdh.generateKeys();

    let sharedSecret: Buffer;
    try {
      let publicKeyForSecret: Buffer;
      if (receiverPublicKey.length === ECIES.PUBLIC_KEY_LENGTH) {
        if (receiverPublicKey[0] !== ECIES.PUBLIC_KEY_MAGIC) {
          throw new EciesError(EciesErrorType.InvalidEphemeralPublicKey);
        }
        publicKeyForSecret = receiverPublicKey;
      } else if (receiverPublicKey.length === ECIES.RAW_PUBLIC_KEY_LENGTH) {
        publicKeyForSecret = Buffer.concat([
          Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
          receiverPublicKey,
        ]);
      } else {
        throw new EciesError(EciesErrorType.InvalidEphemeralPublicKey);
      }

      sharedSecret = ecdh.computeSecret(publicKeyForSecret);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (
          'code' in error &&
          error.code === 'ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY'
        ) {
          throw new EciesError(EciesErrorType.InvalidEphemeralPublicKey);
        }
        throw new EciesError(
          EciesErrorType.InvalidEphemeralPublicKey,
          undefined,
          {
            error: error.message,
          },
        );
      }
      throw new EciesError(EciesErrorType.InvalidEphemeralPublicKey);
    }

    const ephemeralPublicKey = ecdh.getPublicKey();
    const iv = randomBytes(ECIES.IV_LENGTH);
    const cipher = createCipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      sharedSecret.subarray(0, ECIES.SYMMETRIC.KEY_LENGTH),
      iv,
    );
    cipher.setAutoPadding(true);

    let encrypted = cipher.update(message);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([ephemeralPublicKey, iv, authTag, encrypted]);
  }

  public decryptWithComponents(
    privateKey: Buffer,
    ephemeralPublicKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    encrypted: Buffer,
  ): Buffer {
    try {
      if (
        ephemeralPublicKey.length !== ECIES.PUBLIC_KEY_LENGTH ||
        ephemeralPublicKey[0] !== ECIES.PUBLIC_KEY_MAGIC
      ) {
        throw new EciesError(EciesErrorType.InvalidEphemeralPublicKey);
      }

      const ecdh = createECDH(this.config.curveName);
      ecdh.setPrivateKey(privateKey);
      const sharedSecret = ecdh.computeSecret(ephemeralPublicKey);

      const decipher = createDecipheriv(
        SYMMETRIC_ALGORITHM_CONFIGURATION,
        sharedSecret.subarray(0, ECIES.SYMMETRIC.KEY_LENGTH),
        iv,
      );

      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (
          'code' in error &&
          error.code === 'ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY'
        ) {
          throw new EciesError(EciesErrorType.InvalidEphemeralPublicKey);
        }
        throw new EciesError(
          EciesErrorType.InvalidEphemeralPublicKey,
          undefined,
          {
            error: error.message,
          },
        );
      }
      throw new EciesError(EciesErrorType.InvalidEphemeralPublicKey);
    }
  }

  public decrypt(privateKey: Buffer, encryptedData: Buffer): Buffer {
    return this.decryptWithHeader(privateKey, encryptedData);
  }

  public decryptWithHeader(
    privateKey: Buffer,
    encryptedDataWithHeader: Buffer,
  ): Buffer {
    const ephemeralPublicKey = encryptedDataWithHeader.subarray(
      0,
      ECIES.PUBLIC_KEY_LENGTH,
    );
    const iv = encryptedDataWithHeader.subarray(
      ECIES.PUBLIC_KEY_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
    );
    const authTag = encryptedDataWithHeader.subarray(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
    );
    const encrypted = encryptedDataWithHeader.subarray(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
    );

    return this.decryptWithComponents(
      privateKey,
      ephemeralPublicKey,
      iv,
      authTag,
      encrypted,
    );
  }

  public encryptMultiple(
    recipients: BrightChainMember[],
    message: Buffer,
  ): IMultiRecipientEncryption {
    const Uint16BEMax = 65535;
    if (recipients.length > Uint16BEMax) {
      throw new EciesError(EciesErrorType.TooManyRecipients);
    }

    const symmetricKey = randomBytes(ECIES.SYMMETRIC.KEY_LENGTH);
    const iv = randomBytes(ECIES.IV_LENGTH);
    const cipher = createCipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    );

    const encrypted = cipher.update(message);
    const final = cipher.final();
    const authTag = cipher.getAuthTag();

    const encryptedMessage = Buffer.concat([iv, authTag, encrypted, final]);

    const encryptionResults = recipients.map((member) => ({
      id: member.id,
      encryptedKey: this.encrypt(member.publicKey, symmetricKey),
    }));

    const recipientIds = encryptionResults.map(({ id }) => id);
    const encryptedKeys = encryptionResults.map(
      ({ encryptedKey }) => encryptedKey,
    );

    if (
      message.length + this.eciesMultipleMessageOverheadLength !==
      encryptedMessage.length
    ) {
      throw new EciesError(EciesErrorType.MessageLengthMismatch);
    }

    return {
      encryptedMessage,
      recipientIds,
      encryptedKeys,
      originalMessageLength: message.length,
    };
  }

  public decryptMultipleECIEForRecipient(
    encryptedData: IMultiRecipientEncryption,
    recipient: BrightChainMember,
  ): Buffer {
    const recipientIndex = encryptedData.recipientIds.findIndex((id) =>
      id.equals(recipient.id),
    );
    if (recipientIndex === -1) {
      throw new EciesError(EciesErrorType.RecipientNotFound);
    }
    const encryptedKey = encryptedData.encryptedKeys[recipientIndex];
    const decryptedKey = this.decrypt(recipient.privateKey, encryptedKey);

    const iv = encryptedData.encryptedMessage.subarray(0, ECIES.IV_LENGTH);
    const authTag = encryptedData.encryptedMessage.subarray(
      ECIES.IV_LENGTH,
      this.eciesMultipleMessageOverheadLength,
    );
    const encrypted = encryptedData.encryptedMessage.subarray(
      this.eciesMultipleMessageOverheadLength,
    );

    const decipher = createDecipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      decryptedKey,
      iv,
    );

    decipher.setAuthTag(authTag);
    const decrypted = decipher.update(encrypted);
    const final = decipher.final();

    return Buffer.concat([decrypted, final]);
  }

  public signMessage(privateKey: Buffer, message: Buffer): SignatureBuffer {
    const messageHash = hashPersonalMessage(message);
    const signature = ecsign(messageHash, privateKey);
    return Buffer.concat([
      toBuffer(signature.r),
      toBuffer(signature.s),
      toBuffer(signature.v - 27),
    ]) as SignatureBuffer;
  }

  public verifyMessage(
    senderPublicKey: Buffer,
    message: Buffer,
    signature: SignatureBuffer,
  ): boolean {
    if (signature.length !== ECIES.SIGNATURE_LENGTH) {
      throw new EciesError(EciesErrorType.InvalidSignature);
    }

    if (
      senderPublicKey.length !== ECIES.PUBLIC_KEY_LENGTH &&
      senderPublicKey.length !== ECIES.RAW_PUBLIC_KEY_LENGTH
    ) {
      throw new EciesError(EciesErrorType.InvalidSenderPublicKey);
    }

    if (
      senderPublicKey.length === ECIES.PUBLIC_KEY_LENGTH &&
      senderPublicKey[0] !== ECIES.PUBLIC_KEY_MAGIC
    ) {
      throw new EciesError(EciesErrorType.InvalidSenderPublicKey);
    }

    const has04Prefix =
      senderPublicKey.length === ECIES.PUBLIC_KEY_LENGTH &&
      senderPublicKey[0] === ECIES.PUBLIC_KEY_MAGIC;
    const messageHash = hashPersonalMessage(message);
    const r = signature.subarray(0, 32);
    const s = signature.subarray(32, 64);
    const v = signature[64] + 27;

    const publicKey = ecrecover(messageHash, v, r, s);
    const derivedAddress = publicToAddress(publicKey);
    const knownAddress = publicToAddress(
      has04Prefix ? senderPublicKey.subarray(1) : senderPublicKey,
    );

    return derivedAddress.equals(knownAddress);
  }

  public signatureStringToSignatureBuffer(
    signatureString: HexString,
  ): SignatureBuffer {
    return Buffer.from(signatureString, 'hex') as SignatureBuffer;
  }

  public signatureBufferToSignatureString(
    signatureBuffer: SignatureBuffer,
  ): SignatureString {
    return signatureBuffer.toString('hex') as HexString as SignatureString;
  }

  public computeEncryptedLengthFromDataLength(
    dataLength: number,
    blockSize: number,
  ): IEncryptionLength {
    const capacityPerBlock = blockSize - this.eciesOverheadLength;
    const blocksNeeded = Math.ceil(dataLength / capacityPerBlock);
    const padding = capacityPerBlock - (dataLength % capacityPerBlock);
    const totalEncryptedSize = blocksNeeded * blockSize;
    const encryptedDataLength = totalEncryptedSize - padding;

    return {
      capacityPerBlock,
      blocksNeeded,
      padding,
      encryptedDataLength,
      totalEncryptedSize,
    };
  }

  public computeDecryptedLengthFromEncryptedDataLength(
    encryptedDataLength: number,
    blockSize: number,
    padding?: number,
  ): number {
    const numBlocks = Math.ceil(encryptedDataLength / blockSize);
    if (numBlocks * blockSize !== encryptedDataLength) {
      throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
    }
    const overhead = numBlocks * this.eciesOverheadLength;
    return encryptedDataLength - overhead - (padding ?? 0);
  }

  public bufferToMultiRecipientEncryption(
    data: Buffer,
  ): IMultiRecipientEncryption {
    // Check if we have enough bytes for the recipient count
    if (data.length < 2) {
      throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
    }

    // Read the number of recipients (2 bytes)
    const recipientCount = data.readUInt16BE(0);
    let offset = 2;

    // Check if we have enough bytes for all recipient IDs
    const guidLength = 16;
    const totalGuidLength = recipientCount * guidLength;
    if (offset + totalGuidLength > data.length) {
      throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
    }

    // Read encrypted keys first
    const encryptedKeys: Buffer[] = [];
    for (let i = 0; i < recipientCount; i++) {
      // Check if we have enough bytes for the key length
      if (offset + 2 > data.length) {
        throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
      }
      const keyLength = data.readUInt16BE(offset);
      offset += 2;

      // Check if we have enough bytes for the key data
      if (offset + keyLength > data.length) {
        throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
      }
      encryptedKeys.push(data.subarray(offset, offset + keyLength));
      offset += keyLength;
    }

    // Read recipient IDs after encrypted keys
    const recipientIds: GuidV4[] = [];
    for (let i = 0; i < recipientCount; i++) {
      // Check if we have enough bytes for the GUID
      if (offset + 16 > data.length) {
        throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
      }
      const guidBuffer = data.subarray(offset, offset + 16);
      recipientIds.push(new GuidV4(guidBuffer as RawGuidBuffer));
      offset += 16;
    }

    // Check if we have enough bytes for the original message length
    if (offset + 4 > data.length) {
      throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
    }

    // Read original message length
    const originalMessageLength = data.readUInt32BE(offset);
    offset += 4;

    // Check if we have any remaining data for the encrypted message
    if (offset >= data.length) {
      throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
    }

    // The rest is the encrypted message
    const encryptedMessage = data.subarray(offset);

    return {
      encryptedMessage,
      recipientIds,
      encryptedKeys,
      originalMessageLength,
    };
  }
}
