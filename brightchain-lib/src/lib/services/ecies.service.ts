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
import CONSTANTS, {
  ECIES,
  SYMMETRIC_ALGORITHM_CONFIGURATION,
} from '../constants';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { EciesError } from '../errors/eciesError';
import { GuidV4 } from '../guid';
import { IECIESConfig } from '../interfaces/eciesConfig';
import { IEncryptionLength } from '../interfaces/encryptionLength';
import { IMultiEncryptedMessage } from '../interfaces/multiEncryptedMessage';
import { IMultiEncryptedParsedHeader } from '../interfaces/multiEncryptedParsedHeader';
import { ISimpleKeyPairBuffer } from '../interfaces/simpleKeyPairBuffer';
import { ISingleEncryptedParsedHeader } from '../interfaces/singleEncryptedParsedHeader';
import { IWalletSeed } from '../interfaces/walletSeed';
import { SecureBuffer } from '../secureBuffer';
import { SecureString } from '../secureString';
import {
  AuthenticatedCipher,
  AuthenticatedDecipher,
  HexString,
  RawGuidBuffer,
  SignatureBuffer,
  SignatureString,
} from '../types';
import { ServiceLocator } from './serviceLocator';

/**
 * Service for handling ECIES encryption/decryption
 */
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

  /**
   * The name of the elliptic curve used for ECIES encryption/decryption
   */
  public get curveName(): string {
    return this.config.curveName;
  }

  /**
   * Generate a new mnemonic
   * @returns {SecureString} The new mnemonic
   */
  public generateNewMnemonic(): SecureString {
    return new SecureString(generateMnemonic(this.config.mnemonicStrength));
  }

  /**
   * Generate a new wallet from a seed
   * @param seed {Buffer} The seed to generate the wallet from
   * @returns {Wallet} The new wallet
   */
  public walletFromSeed(seed: Buffer): Wallet {
    const hdWallet = hdkey.fromMasterSeed(seed);
    return hdWallet
      .derivePath(this.config.primaryKeyDerivationPath)
      .getWallet();
  }

  /**
   * Generate a new wallet and seed from a mnemonic
   * @param mnemonic {SecureString} The mnemonic to generate the wallet and seed from
   * @returns {IWalletSeed} The new wallet and seed
   */
  public walletAndSeedFromMnemonic(mnemonic: SecureString): IWalletSeed {
    if (!mnemonic.value || !validateMnemonic(mnemonic.value)) {
      throw new EciesError(EciesErrorType.InvalidMnemonic);
    }

    const seed = mnemonicToSeedSync(mnemonic.value);
    const wallet = this.walletFromSeed(seed);

    return {
      seed: new SecureBuffer(seed),
      wallet,
    };
  }

  /**
   * Generate a new wallet and seed from a mnemonic
   * @param wallet {Wallet} The wallet to generate the key pair from
   * @returns {ISimpleKeyPairBuffer} The new key pair
   */
  public walletToSimpleKeyPairBuffer(wallet: Wallet): ISimpleKeyPairBuffer {
    const privateKey = wallet.getPrivateKey();
    const buf04 = new Uint8Array(1);
    buf04[0] = ECIES.PUBLIC_KEY_MAGIC;
    const publicKey = Buffer.concat([buf04, wallet.getPublicKey()]);

    return {
      privateKey,
      publicKey,
    };
  }

  /**
   * Create a simple key pair from a seed
   * @param seed {Buffer} The seed to generate the key pair from
   * @returns {ISimpleKeyPairBuffer} The new key pair
   */
  public seedToSimpleKeyPairBuffer(seed: Buffer): ISimpleKeyPairBuffer {
    const wallet = this.walletFromSeed(seed);
    return this.walletToSimpleKeyPairBuffer(wallet);
  }

  /**
   * Create a simple key pair from a mnemonic
   * @param mnemonic {SecureString} The mnemonic to generate the key pair from
   * @returns {ISimpleKeyPairBuffer} The new key pair
   */
  public mnemonicToSimpleKeyPairBuffer(
    mnemonic: SecureString,
  ): ISimpleKeyPairBuffer {
    const { seed } = this.walletAndSeedFromMnemonic(mnemonic);
    return this.seedToSimpleKeyPairBuffer(seed.value);
  }

  /**
   * Encrypt a message with a public key
   * @param receiverPublicKey {Buffer} The public key of the receiver
   * @param message {Buffer} The message to encrypt
   * @returns {Buffer} The encrypted message
   */
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
    ) as unknown as AuthenticatedCipher;
    cipher.setAutoPadding(true);

    let encrypted = cipher.update(message);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([ephemeralPublicKey, iv, authTag, encrypted]);
  }

  /**
   * Decrypt a singly encrypted message
   * @param data - The encrypted message
   * @returns The decrypted message
   */
  public parseSingleEncryptedHeader(
    data: Buffer,
  ): ISingleEncryptedParsedHeader {
    const ephemeralPublicKey = data.subarray(0, ECIES.PUBLIC_KEY_LENGTH);
    const iv = data.subarray(
      ECIES.PUBLIC_KEY_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
    );
    const authTag = data.subarray(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH,
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
    );
    return {
      ephemeralPublicKey,
      iv,
      authTag,
      headerSize: ECIES.OVERHEAD_SIZE,
    };
  }

  /**
   * Decrypts data encrypted with ECIES using a header
   * @param privateKey The private key to decrypt the data
   * @param encryptedData The data to decrypt
   * @returns The decrypted data
   */
  public decryptSingleWithHeader(
    privateKey: Buffer,
    encryptedData: Buffer,
  ): Buffer {
    const details = this.parseSingleEncryptedHeader(encryptedData);
    const encrypted = encryptedData.subarray(
      ECIES.PUBLIC_KEY_LENGTH + ECIES.IV_LENGTH + ECIES.AUTH_TAG_LENGTH,
    );

    return this.decryptSingleWithComponents(
      privateKey,
      details.ephemeralPublicKey,
      details.iv,
      details.authTag,
      encrypted,
    );
  }

  /**
   * Decrypts data encrypted with ECIES using components
   * @param privateKey The private key to decrypt the data
   * @param ephemeralPublicKey The ephemeral public key used to encrypt the data
   * @param iv The initialization vector used to encrypt the data
   * @param authTag The authentication tag used to encrypt the data
   * @param encrypted The encrypted data
   * @returns The decrypted data
   */
  public decryptSingleWithComponents(
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
      ) as unknown as AuthenticatedDecipher;

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

  /**
   * Signs a message with the given private key.
   * @param privateKey The private key to sign the message with.
   * @param data The data to sign.
   * @returns The signature.
   */
  public signMessage(privateKey: Buffer, data: Buffer): SignatureBuffer {
    const messageHash = hashPersonalMessage(data);
    const signature = ecsign(messageHash, privateKey);
    return Buffer.concat([
      toBuffer(signature.r),
      toBuffer(signature.s),
      toBuffer(signature.v - 27),
    ]) as unknown as SignatureBuffer;
  }

  /**
   * Verifies a message with the given public key.
   * @param publicKey The public key to verify the message with.
   * @param data The data to verify.
   * @param signature The signature to verify.
   * @returns True if the signature is valid, false otherwise.
   */
  public verifyMessage(
    publicKey: Buffer,
    data: Buffer,
    signature: SignatureBuffer,
  ): boolean {
    if (signature.length !== ECIES.SIGNATURE_LENGTH) {
      throw new EciesError(EciesErrorType.InvalidSignature);
    }

    if (
      publicKey.length !== ECIES.PUBLIC_KEY_LENGTH &&
      publicKey.length !== ECIES.RAW_PUBLIC_KEY_LENGTH
    ) {
      throw new EciesError(EciesErrorType.InvalidSenderPublicKey);
    }

    if (
      publicKey.length === ECIES.PUBLIC_KEY_LENGTH &&
      publicKey[0] !== ECIES.PUBLIC_KEY_MAGIC
    ) {
      throw new EciesError(EciesErrorType.InvalidSenderPublicKey);
    }

    const has04Prefix =
      publicKey.length === ECIES.PUBLIC_KEY_LENGTH &&
      publicKey[0] === ECIES.PUBLIC_KEY_MAGIC;
    const messageHash = hashPersonalMessage(data);
    const r = signature.subarray(0, 32);
    const s = signature.subarray(32, 64);
    const v = signature[64] + 27;

    const recoveredPublicKey = ecrecover(messageHash, v, r, s);
    const derivedAddress = publicToAddress(recoveredPublicKey);
    const knownAddress = publicToAddress(
      has04Prefix ? publicKey.subarray(1) : publicKey,
    );

    return derivedAddress.equals(knownAddress);
  }

  /**
   * Encrypts a message for multiple recipients.
   * @param recipients The recipients to encrypt the message for.
   * @param message The message to encrypt.
   * @returns The encrypted message.
   * @throws EciesError if the number of recipients is greater than 65535.
   */
  public encryptMultiple(
    recipients: BrightChainMember[],
    message: Buffer,
  ): IMultiEncryptedMessage {
    if (recipients.length > CONSTANTS.UINT16_MAX) {
      throw new EciesError(EciesErrorType.TooManyRecipients);
    }

    const symmetricKey = randomBytes(ECIES.SYMMETRIC.KEY_LENGTH);
    const iv = randomBytes(ECIES.IV_LENGTH);
    const cipher = createCipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    );

    const crc16 = ServiceLocator.getServiceProvider().crcService.crc16(message);

    // crc16 goes into the encrypted message so we don't reveal anything about the message in plaintext
    const encrypted = cipher.update(Buffer.concat([crc16, message]));
    const final = cipher.final();
    const authTag = cipher.getAuthTag();

    const encryptedMessage = Buffer.concat([iv, authTag, encrypted, final]);

    const encryptionResults = recipients.map((member) => ({
      id: member.id,
      encryptedKey: this.encrypt(member.publicKey, symmetricKey),
    }));

    const recipientIds = encryptionResults.map(({ id }) => id);
    const recipientKeys = encryptionResults.map(
      ({ encryptedKey }) => encryptedKey,
    );

    if (
      message.length + ECIES.MULTIPLE.ENCRYPTED_MESSAGE_OVERHEAD_SIZE !==
      encryptedMessage.length
    ) {
      throw new EciesError(EciesErrorType.MessageLengthMismatch);
    }

    const headerSize = this.calculateECIESMultipleRecipientOverhead(
      recipients.length,
      false,
    );

    return {
      dataLength: message.length,
      recipientCount: recipients.length,
      recipientIds,
      recipientKeys,
      encryptedMessage,
      headerSize,
    };
  }

  /**
   * Decrypts a message encrypted with multiple ECIE for a recipient.
   * @param encryptedData The encrypted data.
   * @param recipient The recipient.
   * @returns The decrypted message.
   */
  public decryptMultipleECIEForRecipient(
    encryptedData: IMultiEncryptedMessage,
    recipient: BrightChainMember,
  ): Buffer {
    if (recipient.privateKey === undefined) {
      throw new EciesError(EciesErrorType.PrivateKeyNotLoaded);
    }
    const recipientIndex = encryptedData.recipientIds.findIndex((id) =>
      id.equals(recipient.id),
    );
    if (recipientIndex === -1) {
      throw new EciesError(EciesErrorType.RecipientNotFound);
    }
    const encryptedKey = encryptedData.recipientKeys[recipientIndex];
    const decryptedKey = this.decryptSingleWithHeader(
      recipient.privateKey,
      encryptedKey,
    );

    const iv = encryptedData.encryptedMessage.subarray(0, ECIES.IV_LENGTH);
    const authTag = encryptedData.encryptedMessage.subarray(
      ECIES.IV_LENGTH,
      ECIES.MULTIPLE.ENCRYPTED_MESSAGE_OVERHEAD_SIZE,
    );
    const encrypted = encryptedData.encryptedMessage.subarray(
      ECIES.MULTIPLE.ENCRYPTED_MESSAGE_OVERHEAD_SIZE,
    );

    const decipher = createDecipheriv(
      SYMMETRIC_ALGORITHM_CONFIGURATION,
      decryptedKey,
      iv,
    );

    decipher.setAuthTag(authTag);
    const decrypted = decipher.update(encrypted);
    const final = decipher.final();

    const decryptedMessage = Buffer.concat([decrypted, final]);
    if (
      decryptedMessage.length !==
      encryptedData.dataLength + CONSTANTS.UINT16_SIZE
    ) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }
    const crc16 = decryptedMessage.subarray(0, CONSTANTS.UINT16_SIZE);
    const calculatedCrc16 =
      ServiceLocator.getServiceProvider().crcService.crc16(
        decryptedMessage.subarray(CONSTANTS.UINT16_SIZE),
      );
    if (!crc16.equals(calculatedCrc16)) {
      throw new EciesError(EciesErrorType.InvalidMessageCrc);
    }
    return decryptedMessage.subarray(CONSTANTS.UINT16_SIZE);
  }

  /**
   * Calculate the overhead for a message encrypted for multiple recipients
   * @param recipientCount number of recipients
   * @param includeMessageOverhead whether to include the overhead for the encrypted message
   * @returns the overhead size in bytes
   */
  public calculateECIESMultipleRecipientOverhead(
    recipientCount: number,
    includeMessageOverhead: boolean,
  ): number {
    if (recipientCount < 2) {
      throw new EciesError(EciesErrorType.InvalidRecipientCount);
    }
    const baseOverhead =
      ECIES.MULTIPLE.DATA_LENGTH_SIZE +
      ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE +
      recipientCount * CONSTANTS.GUID_SIZE + // recipient ids
      recipientCount * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE; // recipient encrypted keys

    return includeMessageOverhead
      ? baseOverhead + ECIES.MULTIPLE.ENCRYPTED_MESSAGE_OVERHEAD_SIZE
      : baseOverhead;
  }

  /**
   * Builds the header for a message encrypted for multiple recipients
   * @param iv The initialization vector for the symmetric encryption
   * @param authTag The authentication tag for the symmetric encryption
   * @param recipients The recipients of the message
   * @param encryptedKeys The encrypted keys for the recipients
   * @param dataLength The length of the data to be encrypted
   * @returns The header buffer for the message
   * @throws EciesError if the number of recipients is greater than the maximum allowed
   * @throws EciesError if the number of encrypted keys does not match the number of recipients
   */
  public buildECIESMultipleRecipientHeader(
    data: IMultiEncryptedMessage,
  ): Buffer {
    if (data.recipientIds.length > ECIES.MULTIPLE.MAX_RECIPIENTS) {
      throw new EciesError(EciesErrorType.TooManyRecipients);
    } else if (data.recipientIds.length !== data.recipientKeys.length) {
      throw new EciesError(EciesErrorType.RecipientKeyCountMismatch);
    } else if (
      data.dataLength < 0 ||
      data.dataLength > ECIES.MULTIPLE.MAX_DATA_SIZE
    ) {
      throw new EciesError(EciesErrorType.FileSizeTooLarge);
    }
    const dataLengthBuffer = Buffer.alloc(
      CONSTANTS.ECIES.MULTIPLE.DATA_LENGTH_SIZE,
    );
    dataLengthBuffer.writeBigUInt64BE(BigInt(data.dataLength));
    const recipientCountBuffer = Buffer.alloc(
      CONSTANTS.ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE,
    );
    recipientCountBuffer.writeUInt16BE(data.recipientIds.length);
    const recipientsBuffer = Buffer.alloc(
      data.recipientIds.length * CONSTANTS.GUID_SIZE,
    );
    data.recipientIds.forEach((recipientId, index) => {
      recipientsBuffer.set(
        recipientId.asRawGuidBuffer,
        index * CONSTANTS.GUID_SIZE,
      );
    });
    // Validate encrypted key lengths
    data.recipientKeys.forEach((encryptedKey) => {
      if (encryptedKey.length !== ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE) {
        throw new EciesError(EciesErrorType.InvalidEncryptedKeyLength);
      }
    });

    const encryptedKeysBuffer = Buffer.alloc(
      data.recipientKeys.length * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE,
    );
    data.recipientKeys.forEach((encryptedKey, index) => {
      encryptedKeysBuffer.set(
        encryptedKey,
        index * ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE,
      );
    });
    return Buffer.concat([
      dataLengthBuffer,
      recipientCountBuffer,
      recipientsBuffer,
      encryptedKeysBuffer,
    ]);
  }

  /**
   * Parses a multi-encrypted header.
   * @param data - The data to parse.
   * @returns The parsed header.
   */
  public parseMultiEncryptedHeader(data: Buffer): IMultiEncryptedParsedHeader {
    // make sure there is enough data to read the block type, IV, auth tag, data length, and recipient count
    if (data.length < ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }

    let offset = 0;
    const dataLength = Number(data.readBigUInt64BE(offset));
    if (dataLength <= 0 || dataLength > ECIES.MULTIPLE.MAX_DATA_SIZE) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }
    offset += CONSTANTS.ECIES.MULTIPLE.DATA_LENGTH_SIZE;

    const recipientCount = data.readUInt16BE(offset);
    if (recipientCount <= 0 || recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS) {
      throw new EciesError(EciesErrorType.InvalidRecipientCount);
    }
    offset += CONSTANTS.ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE;

    // make sure there is enough data to read the recipient IDs and encrypted keys
    if (
      data.length <
      this.calculateECIESMultipleRecipientOverhead(recipientCount, false)
    ) {
      throw new EciesError(EciesErrorType.InvalidDataLength);
    }

    const recipientIds: GuidV4[] = [];
    for (let i = 0; i < recipientCount; i++) {
      recipientIds.push(
        new GuidV4(
          data.subarray(offset, offset + CONSTANTS.GUID_SIZE) as RawGuidBuffer,
        ),
      );
      offset += CONSTANTS.GUID_SIZE;
    }
    const recipientKeys: Buffer[] = [];
    for (let i = 0; i < recipientCount; i++) {
      recipientKeys.push(
        data.subarray(offset, offset + ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE),
      );
      offset += ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE;
    }
    return {
      dataLength,
      recipientCount,
      recipientIds,
      recipientKeys,
      headerSize: offset,
    };
  }

  /**
   * Parses a multi-encrypted buffer into its components.
   * @param data - The multi-encrypted buffer to parse.
   * @returns The parsed multi-encrypted buffer.
   */
  public parseMultiEncryptedBuffer(data: Buffer): IMultiEncryptedMessage {
    const header = this.parseMultiEncryptedHeader(data);
    const encryptedMessage = data.subarray(header.headerSize);
    return {
      ...header,
      encryptedMessage,
    };
  }

  /**
   * Converts a signature string to a signature buffer.
   * @param signatureString - The signature string to convert.
   * @returns The signature buffer.
   */
  public signatureStringToSignatureBuffer(
    signatureString: HexString,
  ): SignatureBuffer {
    return Buffer.from(signatureString, 'hex') as SignatureBuffer;
  }

  /**
   * Converts a signature buffer to a signature string.
   * @param signatureBuffer - The signature buffer to convert.
   * @returns The signature string.
   */
  public signatureBufferToSignatureString(
    signatureBuffer: SignatureBuffer,
  ): SignatureString {
    return signatureBuffer.toString('hex') as SignatureString;
  }

  /**
   * Computes the encrypted length from the data length.
   * @param dataLength - The length of the data.
   * @param blockSize - The block size.
   * @returns The encrypted length.
   */
  public computeEncryptedLengthFromDataLength(
    dataLength: number,
    blockSize: number,
  ): IEncryptionLength {
    const capacityPerBlock = blockSize - ECIES.OVERHEAD_SIZE;
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

  /**
   * Computes the decrypted length from the encrypted data length.
   * @param encryptedDataLength - The length of the encrypted data.
   * @param blockSize - The block size.
   * @param padding - The padding.
   * @returns The decrypted length.
   */
  public computeDecryptedLengthFromEncryptedDataLength(
    encryptedDataLength: number,
    blockSize: number,
    padding?: number,
  ): number {
    const numBlocks = Math.ceil(encryptedDataLength / blockSize);
    if (numBlocks * blockSize !== encryptedDataLength) {
      throw new EciesError(EciesErrorType.InvalidEncryptedDataLength);
    }
    const overhead = numBlocks * ECIES.OVERHEAD_SIZE;
    return encryptedDataLength - overhead - (padding ?? 0);
  }
}
