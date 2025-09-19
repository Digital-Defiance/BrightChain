import {
  ECIES,
  EciesError,
  EciesErrorType,
  IECIESConfig,
  SecureBuffer,
  SecureString,
} from '@brightchain/brightchain-lib';
import { Wallet, hdkey } from '@ethereumjs/wallet';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { ISimpleKeyPairBuffer } from '../../interfaces/simple-keypair-buffer';
import { IWalletSeed } from '../../interfaces/wallet-seed';

/**
 * Core encryption and decryption functions for ECIES
 * Includes coverage for simple and single modes, does not cover multiple mode which is in a separate module
 */
export class EciesCryptoCore {
  private readonly _config: IECIESConfig;
  public get config(): IECIESConfig {
    return this._config;
  }

  constructor(config: IECIESConfig) {
    this._config = config;
  }

  /**
   * Validates and normalizes a public key for ECIES operations
   * @param publicKey The public key to normalize
   * @returns Properly formatted public key
   */
  public normalizePublicKey(publicKey: Buffer): Buffer {
    if (!publicKey) {
      throw new EciesError(
        EciesErrorType.InvalidEphemeralPublicKey,
        undefined,
        {
          error: 'Received null or undefined public key',
        },
      );
    }

    const keyLength = publicKey.length;

    // Already in correct format (65 bytes with 0x04 prefix)
    if (
      keyLength === ECIES.PUBLIC_KEY_LENGTH &&
      publicKey[0] === ECIES.PUBLIC_KEY_MAGIC
    ) {
      return publicKey;
    }

    // Raw key without prefix (64 bytes) - add the 0x04 prefix
    if (keyLength === ECIES.RAW_PUBLIC_KEY_LENGTH) {
      return Buffer.concat([Buffer.from([ECIES.PUBLIC_KEY_MAGIC]), publicKey]);
    }

    // Invalid format
    throw new EciesError(EciesErrorType.InvalidEphemeralPublicKey, undefined, {
      error: 'Invalid public key format or length',
      keyLength: String(keyLength),
      expectedLength64: String(ECIES.RAW_PUBLIC_KEY_LENGTH),
      expectedLength65: String(ECIES.PUBLIC_KEY_LENGTH),
      keyPrefix: keyLength > 0 ? String(publicKey[0]) : 'N/A',
      expectedPrefix: String(ECIES.PUBLIC_KEY_MAGIC),
    });
  }

  /**
   * Generate a new mnemonic
   * @returns {SecureString} The new mnemonic
   */
  public generateNewMnemonic(): SecureString {
    return new SecureString(generateMnemonic(this._config.mnemonicStrength));
  }

  /**
   * Generate a new wallet from a seed
   * @param seed {Buffer} The seed to generate the wallet from
   * @returns {Wallet} The new wallet
   */
  public walletFromSeed(seed: Buffer): Wallet {
    const hdWallet = hdkey.EthereumHDKey.fromMasterSeed(seed);
    return hdWallet
      .derivePath(this._config.primaryKeyDerivationPath)
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
    const privateKey = Buffer.from(wallet.getPrivateKey());
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
    return this.seedToSimpleKeyPairBuffer(Buffer.from(seed.value));
  }
}
