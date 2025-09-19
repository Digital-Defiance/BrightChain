import { Wallet } from '@ethereumjs/wallet';
import { secp256k1 } from '@noble/curves/secp256k1';
import { HDKey } from '@scure/bip32';
import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic,
} from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { ECIES } from '../../constants';
import { IECIESConfig } from '../../interfaces/eciesConfig';
import { SecureString } from '../../secureString';
import { ISimpleKeyPair, IWalletSeed } from './interfaces';

/**
 * Browser-compatible crypto core for ECIES operations
 * Uses @scure libraries for browser compatibility
 */
export class EciesCryptoCore {
  private readonly _config: IECIESConfig;

  constructor(config: IECIESConfig) {
    this._config = config;
  }

  public get config(): IECIESConfig {
    return this._config;
  }

  /**
   * Validates and normalizes a public key for ECIES operations
   */
  public normalizePublicKey(publicKey: Uint8Array): Uint8Array {
    if (!publicKey) {
      throw new Error('Received null or undefined public key');
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
      const result = new Uint8Array(ECIES.PUBLIC_KEY_LENGTH);
      result[0] = ECIES.PUBLIC_KEY_MAGIC;
      result.set(publicKey, 1);
      return result;
    }

    throw new Error(`Invalid public key format or length: ${keyLength}`);
  }

  /**
   * Generate a new mnemonic
   */
  public generateNewMnemonic(): SecureString {
    return new SecureString(
      generateMnemonic(wordlist, this._config.mnemonicStrength),
    );
  }

  /**
   * Generate wallet and seed from mnemonic
   */
  public walletAndSeedFromMnemonic(mnemonic: SecureString): IWalletSeed {
    if (!mnemonic || !validateMnemonic(mnemonic.value ?? '', wordlist)) {
      throw new Error('Invalid mnemonic');
    }

    const seed = mnemonicToSeedSync(mnemonic.value ?? '');
    const hdKey = HDKey.fromMasterSeed(seed);
    const derivedKey = hdKey.derive(this._config.primaryKeyDerivationPath);

    if (!derivedKey.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const privateKey = derivedKey.privateKey;

    const wallet = new Wallet(privateKey);

    return {
      wallet,
      seed,
    };
  }

  /**
   * Create a simple key pair from a seed
   */
  public seedToSimpleKeyPair(seed: Uint8Array): ISimpleKeyPair {
    const hdKey = HDKey.fromMasterSeed(seed);
    const derivedKey = hdKey.derive(this._config.primaryKeyDerivationPath);

    if (!derivedKey.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const privateKey = derivedKey.privateKey;
    const publicKey = secp256k1.getPublicKey(privateKey, false); // uncompressed with 0x04 prefix

    return {
      privateKey,
      publicKey,
    };
  }

  /**
   * Create a simple key pair from a mnemonic
   */
  public mnemonicToSimpleKeyPair(mnemonic: SecureString): ISimpleKeyPair {
    const { seed } = this.walletAndSeedFromMnemonic(mnemonic);
    return this.seedToSimpleKeyPair(seed);
  }

  /**
   * Generate a random private key
   */
  public generatePrivateKey(): Uint8Array {
    return secp256k1.utils.randomSecretKey();
  }

  /**
   * Get public key from private key
   */
  public getPublicKey(privateKey: Uint8Array): Uint8Array {
    const publicKeyPoint = secp256k1.getPublicKey(privateKey, false); // uncompressed
    // publicKeyPoint already includes the 0x04 prefix, so return as-is
    return publicKeyPoint;
  }

  /**
   * Generate ephemeral key pair for ECIES
   */
  public async generateEphemeralKeyPair(): Promise<ISimpleKeyPair> {
    const privateKey = this.generatePrivateKey();
    const publicKey = this.getPublicKey(privateKey);
    return { privateKey, publicKey };
  }

  /**
   * Compute ECDH shared secret
   */
  public computeSharedSecret(
    privateKey: Uint8Array,
    publicKey: Uint8Array,
  ): Uint8Array {
    // Normalize the public key to ensure it has the correct format
    const normalizedPublicKey = this.normalizePublicKey(publicKey);

    // Use uncompressed shared secret to match Node.js ECDH behavior
    // Node.js ECDH.computeSecret() returns the x-coordinate of the shared point
    const sharedSecret = secp256k1.getSharedSecret(privateKey, normalizedPublicKey, false);
    // Return only the x-coordinate (first 32 bytes after the 0x04 prefix)
    return sharedSecret.slice(1, 33);
  }
}
