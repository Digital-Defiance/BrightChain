import { SecureBuffer } from '@digitaldefiance/ecies-lib';
import { Wallet } from '@ethereumjs/wallet';

export interface IWalletSeed {
  wallet: Wallet;
  seed: SecureBuffer;
}
