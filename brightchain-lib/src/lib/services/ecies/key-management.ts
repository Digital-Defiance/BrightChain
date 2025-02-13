import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import Wallet, { hdkey } from 'ethereumjs-wallet';
import { ECIES } from '../../constants';
import { EciesErrorType } from '../../enumerations/eciesErrorType';
import { EciesError } from '../../errors/eciesError';
import { IECIESConfig } from '../../interfaces/eciesConfig';
import { ISimpleKeyPairBuffer } from '../../interfaces/simpleKeyPairBuffer';
import { IWalletSeed } from '../../interfaces/walletSeed';
import { SecureBuffer } from '../../secureBuffer';
import { SecureString } from '../../secureString';

/**
 * Key management functions for ECIES
 */
export class EciesKeyManagement {
  private readonly config: IECIESConfig;

  constructor(config: IECIESConfig) {
    this.config = config;
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
}
